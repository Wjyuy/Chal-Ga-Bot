// commands/스타포스시뮬레이터.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
// fs와 path는 더 이상 최고 기록 저장에 사용되지 않으므로 제거하거나 주석 처리할 수 있습니다.
// const fs = require('fs');
// const path = require('path');

// Firebase Firestore 관련 모듈 임포트
const { db, appId } = require('../firebase_config');
const { doc, getDoc, setDoc } = require('firebase/firestore');

module.exports = {
    // djs-commander가 SlashCommandBuilder를 기대하므로 data를 직접 객체 대신 인스턴스로 제공
    data: new SlashCommandBuilder()
        .setName('스타포스시뮬레이터')
        .setDescription('30성의 주인이 되어보세요! (채널별 최고 기록 저장)'),

    run: async ({ interaction }) => { // client는 현재 사용되지 않아 제거
        if (!interaction.isChatInputCommand()) return;

        // 채널별 기록 저장을 위한 문서 참조 경로
        const channelId = interaction.channel.id;
        const recordRef = doc(db, 'artifacts', appId, 'public', 'data', 'starforce_records', channelId);

        let highestLevel = 15;
        let highestUser = '없음';

        try {
            // Firestore에서 현재 채널의 최고 기록 불러오기
            const docSnap = await getDoc(recordRef);

            if (docSnap.exists()) {
                const recordData = docSnap.data();
                highestLevel = recordData.highestLevel || 15;
                highestUser = recordData.username || '없음';
            } else {
                // 문서가 없으면 초기 기록 설정 (Firestore에 문서 생성)
                const initialData = {
                    highestLevel: 15,
                    username: '없음'
                };
                await setDoc(recordRef, initialData);
                console.log(`[스타포스] 채널 ${channelId}의 초기 기록이 Firestore에 설정되었습니다.`);
            }
        } catch (firebaseError) {
            console.error('Firestore 기록 불러오기/초기화 오류:', firebaseError);
            // 오류 발생 시 사용자에게 바로 응답
            return {
                content: '😥 최고 기록을 불러오는 중 오류가 발생했어요. 다시 시도해 주세요.',
                ephemeral: true
            };
        }

        const startLevel = 15; // 항상 15성부터 시작

        const embed = new EmbedBuilder()
            .setTitle('🌟 스타포스 시뮬레이터 시작!')
            .setDescription(`강화를 시작합니다!\n\n**현재 강화 수치**: ${startLevel}성\n\n**🏆 이 채널 최고 기록: ${highestLevel}성 ${highestUser} 님!**`)
            .setColor(0x0099ff);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`enhance_${startLevel}`)
                .setLabel('강화하기')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('exit')
                .setLabel('종료')
                .setStyle(ButtonStyle.Secondary)
        );

        // * djs-commander가 초기 응답을 처리하도록 객체를 반환
        const messageResponse = await interaction.reply({ // await interaction.reply()로 초기 응답을 보냅니다.
            embeds: [embed],
            components: [row],
            fetchReply: true // collector가 메시지를 수집할 수 있도록 메시지 객체를 가져옵니다.
        });

        // collector를 생성할 때 메시지 객체를 전달합니다.
        const collector = messageResponse.createMessageComponentCollector({
            filter: (i) => i.user.id === interaction.user.id,
            time: 600000, // 10분
        });

        // ⭐ 레벨별 확률 테이블
        const rates = {
            15: { success: 30, destroy: 2.1 },
            16: { success: 30, destroy: 2.1 },
            17: { success: 15, destroy: 6.8 },
            18: { success: 15, destroy: 6.8 },
            19: { success: 15, destroy: 8.5 },
            20: { success: 30, destroy: 10.5 },
            21: { success: 15, destroy: 12.75 },
            22: { success: 15, destroy: 17 },
            23: { success: 10, destroy: 18 },
            24: { success: 10, destroy: 18 },
            25: { success: 10, destroy: 18 },
            26: { success: 7, destroy: 18 },
            27: { success: 5, destroy: 19 },
            28: { success: 3, destroy: 19.4 },
            29: { success: 1, destroy: 19.8 },
        };

        collector.on('collect', async (i) => {
            try {
                if (i.user.id !== interaction.user.id) {
                    await i.deferUpdate(); // 다른 사용자의 버튼 클릭 무시
                    return;
                }

                const member = await interaction.guild.members.fetch(i.user.id);
                const nickname = member.nickname || i.user.username;

                // Restart 시뮬레이터 (재시작 시 현재 최고 기록 다시 로드)
                if (i.customId.startsWith('restart_')) {
                    const restartLevel = 15; // 파괴 시 무조건 15성부터 재시작

                    // 재시작 시 최고 기록 다시 불러오기
                    const currentRecordSnap = await getDoc(recordRef);
                    const currentHighestLevel = currentRecordSnap.exists() ? currentRecordSnap.data().highestLevel : 15;
                    const currentHighestUser = currentRecordSnap.exists() ? currentRecordSnap.data().username : '없음';


                    const embed = new EmbedBuilder()
                        .setTitle('🌟 스타포스 시뮬레이터 재시작!')
                        .setDescription(`강화를 시작합니다!\n\n**현재 강화 수치**: ${restartLevel}성\n\n**🏆 이 채널 최고 기록: ${currentHighestLevel}성 ${currentHighestUser} 님!**`)
                        .setColor(0x0099ff);

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`enhance_${restartLevel}`)
                            .setLabel('강화하기')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('exit')
                            .setLabel('종료')
                            .setStyle(ButtonStyle.Secondary)
                    );

                    await i.update({
                        embeds: [embed],
                        components: [row],
                    });
                    return;
                }

                // 강화하기 버튼 클릭 시
                if (i.customId.startsWith('enhance_')) {
                    const currentLevel = parseInt(i.customId.split('_')[1]);

                    // 30성 달성 시 축하 메시지
                    if (currentLevel >= 30) {
                        await i.update({
                            content: '🎉 30성 강화 완료! 축하합니다! 🎉',
                            embeds: [],
                            components: [],
                        });

                        // 30성 찍었으면 최고 기록 갱신 (Firebase)
                        await updateRecord(30, nickname, channelId, recordRef);

                        collector.stop();
                        return;
                    }

                    const { success, destroy } = rates[currentLevel] || { success: 1, destroy: 0 };

                    const rand = Math.random() * 100;
                    let resultType;
                    if (rand < success) {
                        resultType = 'success';
                    } else if (rand < success + destroy) {
                        resultType = 'destroy';
                    } else {
                        resultType = 'fail';
                    }

                    let nextLevel;
                    let description = `**현재 강화 수치**: ${currentLevel}성\n**성공 확률**: ${success}%\n**파괴 확률**: ${destroy}%\n\n`;

                    if (resultType === 'success') {
                        nextLevel = currentLevel + 1;
                        description += `🎉 강화에 성공했습니다! \n${currentLevel}성 → ${nextLevel}성`;

                        // 성공했을 때 최고 기록 갱신 (Firebase)
                        await updateRecord(nextLevel, nickname, channelId, recordRef);

                        // 추가된 이펙트
                        if (nextLevel === 20) {
                            description += '\n🔥 20성 달성! 축하드립니다!';
                        } else if (nextLevel >= 24 && nextLevel <= 30) {
                            description += `\n🌟 ${nextLevel}성 달성! 정말 대단합니다!`;
                        }

                    } else if (resultType === 'fail') {
                        nextLevel = currentLevel;
                        description += `😥 강화에 실패했습니다. 등급은 유지됩니다.`;

                    } else if (resultType === 'destroy') {
                        nextLevel = 15;
                        description += `💥 강화 실패 + 아이템이 파괴되었습니다!\n\n재시작하거나 종료할 수 있습니다.`;

                        const resultEmbed = new EmbedBuilder()
                            .setTitle('⭐ 강화 결과')
                            .setColor(0xff0000)
                            .setDescription(description);

                        const resultRow = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId(`restart_${nextLevel}`)
                                .setLabel('재시작')
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setCustomId('exit')
                                .setLabel('종료')
                                .setStyle(ButtonStyle.Secondary)
                        );

                        await i.update({
                            embeds: [resultEmbed],
                            components: [resultRow],
                        });
                        return;
                    }

                    // 현재 채널의 최신 최고 기록 다시 불러오기
                    const currentRecordSnap = await getDoc(recordRef);
                    const currentHighestLevel = currentRecordSnap.exists() ? currentRecordSnap.data().highestLevel : 15;
                    const currentHighestUser = currentRecordSnap.exists() ? currentRecordSnap.data().username : '없음';

                    const resultEmbed = new EmbedBuilder()
                        .setTitle('⭐ 강화 결과')
                        .setColor(resultType === 'success' ? 0x00ff00 : 0xff0000)
                        .setDescription(`${description}\n\n🏆 이 채널 최고 기록: ${currentHighestLevel}성 | 유저: ${currentHighestUser}`);

                    const resultRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`enhance_${nextLevel}`)
                            .setLabel('강화하기')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId('exit')
                            .setLabel('종료')
                            .setStyle(ButtonStyle.Secondary)
                    );

                    await i.update({
                        embeds: [resultEmbed],
                        components: [resultRow],
                    });
                }

                // 종료 버튼 클릭 시
                if (i.customId === 'exit') {
                    await i.update({
                        content: '강화 시뮬레이터를 종료합니다.',
                        embeds: [],
                        components: [],
                    });
                    collector.stop();
                }
            } catch (error) {
                console.error('오류 발생:', error);
                await i.update({
                    content: '오류가 발생했습니다. 다시 시도해 주세요.',
                    embeds: [],
                    components: [],
                });
                collector.stop();
            }
        });

        collector.on('end', () => {
            console.log('⏰ 강화 시뮬레이터 종료 (시간 초과 or 완료)');
        });

        // 🛠️ 최고 기록 업데이트 함수 (Firestore 사용)
        async function updateRecord(newLevel, username, channelId, recordDocRef) {
            try {
                const currentRecordSnap = await getDoc(recordDocRef);
                let currentHighestLevel = 15;
                let currentUsername = '없음';

                if (currentRecordSnap.exists()) {
                    const recordData = currentRecordSnap.data();
                    currentHighestLevel = recordData.highestLevel;
                    currentUsername = recordData.username;
                }

                if (newLevel > currentHighestLevel) {
                    const newRecord = {
                        highestLevel: newLevel,
                        username: username,
                        updatedAt: new Date().toISOString()
                    };
                    await setDoc(recordDocRef, newRecord);
                    console.log(`[스타포스] 채널 ${channelId}에서 새로운 최고 기록 갱신: ${newLevel}성 by ${username}`);
                }
            } catch (error) {
                console.error(`[스타포스] 최고 기록 업데이트 중 Firestore 오류:`, error);
            }
        }
    },
};
