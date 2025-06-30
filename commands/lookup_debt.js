// commands/lookup_debt.js
// Firestore에 등록된 미지급 장부 목록을 조회하는 슬래시 명령어

const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { db, appId } = require('../firebase_config'); // Firestore db 인스턴스와 appId 가져오기
const { collection, query, where, getDocs } = require('firebase/firestore'); // Firestore 쿼리 함수 임포트

module.exports = {
    // 슬래시 명령어 정의
    data: new SlashCommandBuilder()
        .setName('장부조회') // 명령어 이름: /장부조회
        .setDescription('현재 서버에 등록된 미지급 장부 목록을 조회합니다.'),
        // 이 명령어는 기본적으로 모든 멤버가 사용할 수 있도록 설정 (필요에 따라 권한 추가 가능)
        // .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels), // 예시: 특정 권한 필요 시 주석 해제

    // 명령어 실행 로직
    run: async ({ interaction }) => {
        // 이미 상호작용이 인정되었는지 확인하고, 아닐 경우 deferReply를 수행
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: 0 }); // 공개적으로 "봇이 생각 중..." 표시
        }

        const guildId = interaction.guild.id;

        try {
            // Firestore에서 현재 길드(서버)의 미지급 장부 기록을 조회
            const debtRecordsRef = collection(db, 'artifacts', appId, 'public', 'data', 'debt_records');
            const q = query(
                debtRecordsRef,
                where('guildId', '==', guildId), // 현재 서버의 기록만 필터링
                where('isPaid', '==', false) // 아직 갚지 않은 (미지급) 기록만 필터링
            );
            const querySnapshot = await getDocs(q);

            const outstandingDebts = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                outstandingDebts.push({ id: doc.id, ...data });
            });

            const embed = new EmbedBuilder()
                .setColor(0x0099ff) // 파란색
                .setTitle('📋 현재 미지급 장부 목록');

            if (outstandingDebts.length === 0) {
                embed.setDescription('현재 이 서버에 미지급된 장부 기록이 없습니다. 새로운 기록을 추가하려면 `/장부등록` 명령어를 사용하세요.');
            } else {
                let description = '';
                outstandingDebts.forEach((debt, index) => {
                    const totalPayAmount = (debt.borrowedMeso / (1 - debt.feeRate / 100)).toFixed(2);
                    // * 채권자 및 채무자의 저장된 이름(lenderName, debtorName)을 표시하도록 수정
                    description += `**${index + 1}.** \`${debt.debtorName}\` (채무자) ➡️ \`${debt.lenderName}\` (채권자)\n`;
                    description += `   빌린 메소: \`${debt.borrowedMeso}억\` (수수료 ${debt.feeRate}%)\n`;
                    description += `   총 갚을 금액: \`${totalPayAmount}억\`\n`;
                    description += `   등록 일시: <t:${Math.floor(new Date(debt.timestamp).getTime() / 1000)}:R>\n`; // Discord 상대 시간 형식
                    description += `   기록 ID: \`${debt.id}\`\n\n`; // 장부 삭제 시 사용할 ID
                });
                embed.setDescription(description);
            }

            embed.setTimestamp();
            embed.setFooter({ text: '장부 삭제는 `/장부삭제` 명령어를 사용하세요.' });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('장부 조회 중 오류 발생:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('❌ 장부 조회 오류')
                .setDescription('장부 목록을 가져오는 중 오류가 발생했습니다. 다시 시도해 주세요.\n' +
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
