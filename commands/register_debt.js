// commands/register_debt.js
// 빌린 돈 정보를 Firestore에 등록하는 슬래시 명령어

const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { db, appId } = require('../firebase_config'); // Firestore db 인스턴스와 appId 가져오기
const { collection, addDoc } = require('firebase/firestore'); // addDoc 함수 임포트

module.exports = {
    // 슬래시 명령어 정의
    data: new SlashCommandBuilder()
        .setName('장부등록') // 명령어 이름: /장부등록
        .setDescription('빌린 돈 정보를 장부에 등록합니다.')
        .addUserOption(option => // 채권자 (유저 선택)
            option.setName('채권자')
                .setDescription('돈을 빌려준 채권자 유저를 선택하세요.')
                .setRequired(true)
        )
        .addUserOption(option => // 채무자 (유저 선택)
            option.setName('채무자')
                .setDescription('돈을 빌린 채무자 유저를 선택하세요.')
                .setRequired(true)
        )
        .addNumberOption(option => // 빌린 메소 (숫자 입력)
            option.setName('빌린메소')
                .setDescription('빌린 메소 금액 (억 단위로 입력하세요. 예: 100)')
                .setRequired(true)
                .setMinValue(1) // 최소 금액 1억
        )
        .addIntegerOption(option => // 수수료율 (선택)
            option.setName('수수료')
                .setDescription('적용된 수수료율을 선택하세요.')
                .setRequired(false) // * 필수 아님으로 변경
                .addChoices(
                    { name: '3%', value: 3 },
                    { name: '5%', value: 5 }
                )
        )
        // 이 명령어는 관리자만 사용하도록 설정 (선택 사항, 필요에 따라 제거 가능)
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels), // 예시: 채널 관리 권한이 있는 사용자만 사용

    // 명령어 실행 로직
    run: async ({ interaction }) => {
        // 이미 상호작용이 인정되었는지 확인하고, 아닐 경우 deferReply를 수행
        // djs-commander가 초기 응답을 처리하는 방식에 따라, 명시적 deferReply가 필요할 수 있습니다.
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: 0 }); // 공개적으로 "봇이 생각 중..." 표시
        }

        const lenderUser = interaction.options.getUser('채권자');
        const debtorUser = interaction.options.getUser('채무자');
        const borrowedMeso = interaction.options.getNumber('빌린메소');
        // * 수수료 옵션이 제공되지 않았을 경우 0%로 기본값 설정
        const feeRate = interaction.options.getInteger('수수료') || 0; 
        
        const guildId = interaction.guild.id;
        const channelId = interaction.channel.id; // 등록된 채널 ID (나중에 장부 조회/삭제 시 유용)

        try {
            // 채권자와 채무자의 닉네임 또는 사용자 이름 가져오기
            // 길드 멤버 정보를 페치하여 닉네임을 우선적으로 사용
            const lenderMember = await interaction.guild.members.fetch(lenderUser.id);
            const debtorMember = await interaction.guild.members.fetch(debtorUser.id);

            const lenderDisplayName = lenderMember.nickname || lenderUser.username;
            const debtorDisplayName = debtorMember.nickname || debtorUser.username;

            // Firestore에 저장할 데이터 객체 생성
            const debtRecord = {
                guildId: guildId,
                channelId: channelId, // 장부가 등록된 채널
                lenderId: lenderUser.id,
                lenderName: lenderDisplayName,
                debtorId: debtorUser.id,
                debtorName: debtorDisplayName,
                borrowedMeso: borrowedMeso, // 억 단위 그대로 저장
                feeRate: feeRate,
                registeredBy: interaction.user.id, // 누가 등록했는지 기록
                registeredByName: interaction.user.username, // 등록한 사람 이름
                timestamp: new Date().toISOString(), // 등록 시간
                isPaid: false // 초기 상태는 '갚지 않음'
            };

            // 'debt_records' 컬렉션에 새 문서 추가
            // 경로는 /artifacts/{appId}/public/data/debt_records
            const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'debt_records'), debtRecord);

            // * 수수료 0%일 때 메시지 처리 (별도 분기)
            let feeMessage = '';
            // 수수료율이 0%일 경우 totalPayAmount 계산 시 0으로 나누는 것을 방지
            let totalPayAmount = (feeRate === 0) ? borrowedMeso : (borrowedMeso / (1 - feeRate / 100));

            if (feeRate === 0) { // *여기서 (수수료 null%) 텍스트 제거
                feeMessage = `(수수료 없음)`;
            } else {
                feeMessage = `(수수료 ${feeRate}%)`;
            }

            const embed = new EmbedBuilder()
                .setColor(0x00ff00) // 초록색
                .setTitle('✅ 장부 등록 완료!')
                .setDescription(`새로운 돈 빌림 기록이 장부에 등록되었습니다.`)
                .addFields(
                    { name: '채권자', value: `<@${lenderUser.id}> (${lenderDisplayName})`, inline: true },
                    { name: '채무자', value: `<@${debtorUser.id}> (${debtorDisplayName})`, inline: true },
                    { name: '빌린 메소', value: `\`${borrowedMeso}억\` ${feeMessage}`, inline: false }, 
                    { name: '총 갚을 금액', value: `\`${totalPayAmount.toFixed(2)}억\``, inline: false }, // * 실제 갚을 금액
                    { name: '기록 ID', value: `\`${docRef.id}\``, inline: false } // 생성된 문서 ID 표시
                )
                .setTimestamp()
                .setFooter({ text: `등록자: ${interaction.user.username}` });

            // 상호작용 응답 (deferReply 후 editReply 사용)
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('장부 등록 중 오류 발생:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor(0xff0000) // 빨간색
                .setTitle('❌ 장부 등록 오류')
                .setDescription('장부 등록 중 오류가 발생했습니다. 다시 시도해 주세요.\n' +
                                  `오류: \`${error.message}\``)
                .setTimestamp();
            
            // 오류 발생 시에도 deferReply 상태를 고려하여 editReply 또는 followUp 사용
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], flags: 64 }); // 사용자에게만 보이는 임시 오류 메시지 (ephemeral 대신 flags: 64 사용)
            }
        }
    },
};
