// commands/delete_debt.js
// 등록된 장부 기록을 조회하고, 선택하여 삭제(완료 처리)하는 슬래시 명령어

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { db, appId } = require('../firebase_config'); // Firestore db 인스턴스와 appId 가져오기
const { collection, query, where, getDocs, updateDoc, doc, getDoc } = require('firebase/firestore'); // Firestore 함수 임포트 (getDoc 추가)

module.exports = {
    // 슬래시 명령어 정의
    data: new SlashCommandBuilder()
        .setName('장부삭제') // 명령어 이름: /장부삭제
        .setDescription('등록된 미지급 장부 기록을 완료 처리하거나 삭제합니다.'),
        // 권한 설정 없음: 모든 사용자가 이 명령어를 사용할 수 있습니다.

    // 명령어 실행 로직
    run: async ({ interaction }) => {
        // 상호작용이 이미 인정되었는지 확인하고, 아닐 경우 deferReply를 수행
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: 0 }); // 공개적으로 "봇이 생각 중..." 표시
        }

        const guildId = interaction.guild.id;

        try {
            // Firestore에서 현재 길드(서버)의 미지급 장부 기록을 조회하는 쿼리 참조
            const debtRecordsRef = collection(db, 'artifacts', appId, 'public', 'data', 'debt_records');
            const outstandingDebtsQuery = query(
                debtRecordsRef,
                where('guildId', '==', guildId), // 현재 서버의 기록만 필터링
                where('isPaid', '==', false) // 아직 갚지 않은 (미지급) 기록만 필터링
            );

            // 초기 장부 목록 불러오기 및 임베드/컴포넌트 업데이트 함수 호출
            await updateMainEmbedAndComponents(interaction, outstandingDebtsQuery);

            // 컴포넌트 상호작용 수집기 설정 (초기 응답 메시지에 대한 컬렉터)
            const message = await interaction.fetchReply(); // interaction.editReply의 결과를 가져옴
            const collector = message.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id, // 명령어 실행자만 상호작용 가능
                time: 600000, // 10분 동안 유효
            });

            collector.on('collect', async i => {
                try {
                    // 모든 컴포넌트 상호작용에 대해 먼저 deferUpdate 호출
                    await i.deferUpdate(); 

                    let debtToProcessId = null;

                    // '종료' 버튼 클릭 처리
                    if (i.customId === 'exit_debt_manage') {
                        await i.editReply({ // i.update 대신 i.editReply 사용 (interaction.update)
                            content: '장부 관리 시스템을 종료합니다.',
                            embeds: [],
                            components: [],
                        });
                        collector.stop();
                        return;
                    }

                    // 드롭다운 메뉴 선택 처리
                    if (i.customId === 'select_debt_to_delete' && i.values?.[0]) {
                        debtToProcessId = i.values[0];
                    } 
                    // '갚았어요! 확인' 버튼 클릭 처리는 이제 개별 컬렉터에서 담당
                    
                    // 장부 ID가 없으면 처리 중단
                    if (!debtToProcessId) { 
                        return;
                    }

                    // Firestore에서 현재 활성화된 장부 목록을 다시 가져와서 선택된 장부를 찾습니다.
                    const currentOutstandingSnap = await getDocs(outstandingDebtsQuery);
                    const currentOutstandingDebts = [];
                    currentOutstandingSnap.forEach(d => currentOutstandingDebts.push({ id: d.id, ...d.data() }));

                    const selectedDebt = currentOutstandingDebts.find(debt => debt.id === debtToProcessId);

                    if (!selectedDebt) {
                        await interaction.followUp({
                            content: '오류: 선택된 장부 기록을 찾을 수 없거나 이미 처리되었습니다.',
                            flags: 64
                        });
                        return;
                    }

                    // 사용자가 채권자인 경우: 즉시 완료 처리
                    if (i.user.id === selectedDebt.lenderId) {
                        const debtDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'debt_records', selectedDebt.id);
                        await updateDoc(debtDocRef, {
                            isPaid: true,
                            paidAt: new Date().toISOString(),
                            paidBy: i.user.id,
                            paidByName: i.user.username
                        });
                        await updateMainEmbedAndComponents(interaction, outstandingDebtsQuery); // 메인 메시지 업데이트
                        await interaction.followUp({ // 완료 메시지 추가
                            content: `✅ 장부 완료: 채무자 \`${selectedDebt.debtorName}\`님의 **${selectedDebt.borrowedMeso}억** 장부가 완료 처리되었습니다.`,
                            flags: 64
                        });
                    } 
                    // 사용자가 채무자인 경우: 채권자에게 요청 메시지 전송 및 새로운 컬렉터 생성
                    else if (i.user.id === selectedDebt.debtorId) {
                        const confirmButton = new ButtonBuilder()
                            .setCustomId(`confirm_debt_paid_${selectedDebt.id}`) // 고유 ID로 설정
                            .setLabel('갚았어요! 확인')
                            .setStyle(ButtonStyle.Success);

                        const requestRow = new ActionRowBuilder().addComponents(confirmButton);

                        // 채권자를 멘션하여 채널에 요청 메시지 전송
                        const requestMessage = await interaction.channel.send({ // * 새로 보내는 메시지 객체를 받음
                            content: `🔔 <@${selectedDebt.lenderId}>님! 채무자 \`${selectedDebt.debtorName}\`님이 **${selectedDebt.borrowedMeso}억** (${selectedDebt.feeRate === 0 ? '수수료 없음' : `${selectedDebt.feeRate}%`}) 장부에 대한 완료를 요청합니다.\n확인 후 아래 버튼을 눌러주세요. (이 메시지는 5분까지 유지됩니다.)`,
                            components: [requestRow]
                        });

                        await interaction.followUp({
                            content: `✅ 채권자 \`${selectedDebt.lenderName}\`님께 장부 완료 요청을 보냈습니다.`,
                            flags: 64
                        });

                        // * 새로 보낸 요청 메시지에 대한 별도의 컬렉터 생성
                        const requestCollector = requestMessage.createMessageComponentCollector({
                            filter: bI => bI.customId === `confirm_debt_paid_${selectedDebt.id}` && bI.user.id === selectedDebt.lenderId,
                            time: 300000, // 5분 동안 유효
                            max: 1 // 한 번만 클릭 가능하도록
                        });

                        requestCollector.on('collect', async bI => {
                            try {
                                await bI.deferUpdate(); // 버튼 상호작용 인정

                                const debtDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'debt_records', selectedDebt.id);
                                const debtSnap = await getDoc(debtDocRef);

                                if (!debtSnap.exists() || debtSnap.data().isPaid) {
                                    await bI.followUp({ // 버튼 클릭 사용자에게 메시지
                                        content: '⚠️ 이미 처리되었거나 유효하지 않은 장부 기록입니다.',
                                        flags: 64
                                    });
                                    return;
                                }

                                await updateDoc(debtDocRef, {
                                    isPaid: true,
                                    paidAt: new Date().toISOString(),
                                    paidBy: bI.user.id,
                                    paidByName: bI.user.username
                                });

                                // 요청 메시지 업데이트 (비활성화 및 처리 완료 표시)
                                await bI.message.edit({
                                    content: `✅ 채무자 \`${selectedDebt.debtorName}\`님과 채권자 \`${selectedDebt.lenderName}\`님의 **${selectedDebt.borrowedMeso}억** 장부가 완료 처리되었습니다.`,
                                    components: [new ActionRowBuilder().addComponents(
                                        new ButtonBuilder()
                                            .setCustomId('done_processed')
                                            .setLabel('처리됨')
                                            .setStyle(ButtonStyle.Success)
                                            .setDisabled(true)
                                    )]
                                }).catch(e => console.error("확인 메시지 업데이트 실패:", e));

                                // 메인 /장부삭제 임베드 업데이트 (장부 목록 새로고침)
                                await updateMainEmbedAndComponents(interaction, outstandingDebtsQuery);
                                requestCollector.stop('processed'); // 처리 완료 후 컬렉터 종료

                            } catch (error) {
                                console.error('요청 확인 버튼 처리 중 오류 발생:', error);
                                await bI.followUp({
                                    content: '버튼 처리 중 오류가 발생했습니다. 다시 시도해 주세요.',
                                    flags: 64
                                }).catch(e => console.error("followUp 실패 (요청 버튼 오류):", e));
                                requestCollector.stop('error'); // 오류 발생 시 컬렉터 종료
                            }
                        });

                        requestCollector.on('end', async (collected, reason) => {
                            if (reason === 'time' && requestMessage && requestMessage.editable) {
                                try {
                                    // 시간 초과 시 버튼 비활성화
                                    const disabledRow = ActionRowBuilder.from(requestRow);
                                    disabledRow.components.forEach(comp => comp.setDisabled(true));
                                    await requestMessage.edit({
                                        content: `⚠️ 장부 완료 요청이 시간 초과되었습니다. 다시 요청해주세요.\n${requestMessage.content}`,
                                        components: [disabledRow]
                                    }).catch(e => console.error("요청 메시지 시간 초과 업데이트 실패:", e));
                                } catch (e) {
                                    console.error("요청 컬렉터 종료 시 메시지 업데이트 중 오류 발생:", e);
                                }
                            }
                            console.log(`[장부 삭제] 요청 컬렉터 종료. 이유: ${reason}`);
                        });
                    } 
                    // 채권자도 채무자도 아닌 경우: 권한 없음 메시지
                    else {
                        await interaction.followUp({
                            content: '❌ 이 장부는 채권자 또는 채무자만 완료 요청하거나 처리할 수 있습니다.',
                            flags: 64
                        });
                    }
                } catch (error) {
                    console.error('컬렉터 상호작용 처리 중 오류 발생:', error);
                    // DiscordAPIError: Unknown interaction (10062) 처리
                    if (error.code === 10062) {
                         await interaction.followUp({
                            content: '⚠️ 이 상호작용은 만료되었거나 이미 처리되었습니다. 다시 `/장부삭제` 명령어를 실행해주세요.',
                            flags: 64
                        }).catch(e => console.error("followUp 실패 (Unknown interaction):", e));
                    } else {
                        await interaction.followUp({
                            content: '오류가 발생했습니다. 다시 시도해 주세요.',
                            flags: 64
                        }).catch(e => console.error("followUp 실패 (일반 오류):", e));
                    }
                    collector.stop(); // 오류 발생 시 컬렉터 종료
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time' || reason === 'collectorDispose') {
                    // 컬렉터 종료 시 초기 메시지의 컴포넌트 비활성화
                    if (interaction.replied || interaction.deferred) {
                        try {
                            const currentMessage = await interaction.fetchReply(); // 현재 메시지 상태를 다시 가져옴
                            const disabledComponents = currentMessage.components.map(row => {
                                const newRow = ActionRowBuilder.from(row);
                                newRow.components.forEach(comp => comp.setDisabled(true));
                                return newRow;
                            });

                            await interaction.editReply({
                                content: currentMessage.content || '장부 관리 시간이 초과되었습니다. 버튼이 비활성화됩니다.',
                                embeds: currentMessage.embeds,
                                components: disabledComponents,
                            }).catch(e => console.error("컬렉터 종료 시 editReply 실패:", e));
                        } catch (e) {
                            console.error("컬렉터 종료 시 메시지 업데이트 중 오류 발생:", e);
                        }
                    }
                }
                console.log('⏰ 장부 관리 시스템 종료 (시간 초과 또는 완료).');
            });

        } catch (error) {
            console.error('장부 삭제/조회 명령 실행 중 오류 발생:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('❌ 장부 관리 오류')
                .setDescription('장부 목록을 가져오거나 처리하는 중 오류가 발생했습니다. 다시 시도해 주세요.\n' +
                                  `오류: \`${error.message}\``)
                .setTimestamp();
            
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], flags: 64 });
            }
        }
    },
};

// 장부 목록을 가져와 임베드와 컴포넌트를 업데이트하는 헬퍼 함수
async function updateMainEmbedAndComponents(interaction, outstandingDebtsQuery) {
    const querySnapshot = await getDocs(outstandingDebtsQuery);
    const remainingDebts = [];
    querySnapshot.forEach(d => remainingDebts.push({ id: d.id, ...d.data() }));

    const updatedEmbed = new EmbedBuilder()
        .setColor(0x0099ff) // 파란색
        .setTitle('📋 미지급 장부 관리');

    const components = [];
    let selectMenuRow; // 선택 메뉴를 위한 ActionRow

    if (remainingDebts.length === 0) {
        updatedEmbed.setDescription('현재 이 서버에 미지급된 장부 기록이 없습니다.');
        // 선택 메뉴는 없고 종료 버튼만
    } else {
        updatedEmbed.setDescription('아래 목록에서 완료 처리하거나 삭제할 장부를 선택하세요.');

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_debt_to_delete')
            .setPlaceholder('장부 기록을 선택하세요.');

        remainingDebts.slice(0, 25).forEach((debt) => {
            const totalPayAmount = (debt.borrowedMeso / (1 - debt.feeRate / 100)).toFixed(2);
            selectMenu.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(`${debt.debtorName} ➡️ ${debt.lenderName} (${debt.borrowedMeso}억 ${debt.feeRate === 0 ? '수수료 없음' : `${debt.feeRate}%`})`)
                    .setDescription(`총 갚을 금액: ${totalPayAmount}억 (ID: ${debt.id.substring(0, 7)}...)`)
                    .setValue(debt.id)
            );
        });
        selectMenuRow = new ActionRowBuilder().addComponents(selectMenu);
        components.push(selectMenuRow); // 선택 메뉴 추가
    }

    // 종료 버튼은 항상 마지막 ActionRow에 추가
    const exitButtonRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('exit_debt_manage')
            .setLabel('종료')
            .setStyle(ButtonStyle.Secondary)
            // 모든 장부가 완료되었으면 종료 버튼 비활성화 (선택적)
            .setDisabled(remainingDebts.length === 0 && !selectMenuRow) 
    );
    components.push(exitButtonRow); // 종료 버튼 추가

    await interaction.editReply({
        embeds: [updatedEmbed],
        components: components,
    });
}
