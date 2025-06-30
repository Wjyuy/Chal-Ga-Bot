// commands/delete_announcement_channel.js
// 설정된 메이플스토리 공지사항 채널을 삭제하는 슬래시 명령어

const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { db, appId } = require('../firebase_config'); // Firestore db 인스턴스와 appId 가져오기
const { doc, deleteDoc, getDoc } = require('firebase/firestore'); // deleteDoc, getDoc 함수 추가

module.exports = {
    data: new SlashCommandBuilder()
        .setName('공지채널삭제') // 명령어 이름: /공지채널삭제
        .setDescription('현재 서버에 설정된 메이플스토리 공지사항 채널을 삭제합니다.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels), // 채널 관리 권한이 있는 사용자만 사용 가능
    
    run: async ({ interaction }) => {
        const guildId = interaction.guild.id; 

        try {
            // Discord에 "봇이 생각 중..."임을 알립니다.
            if (typeof interaction.deferReply === 'function') {
                await interaction.deferReply({ ephemeral: false }); // 공개적으로 "생각 중..." 표시
            } else {
                console.warn('interaction.deferReply 함수를 찾을 수 없습니다. 응답 지연 없이 진행합니다.');
            }

            // Firestore 문서 참조
            const guildSettingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'guild_settings', guildId);
            
            // 기존 채널 설정이 있는지 확인
            const docSnap = await getDoc(guildSettingsRef);
            if (!docSnap.exists() || !docSnap.data().announcementChannelId) {
                // 채널이 설정되지 않은 경우
                const infoEmbed = new EmbedBuilder()
                    .setColor(0x0099ff) // 파란색
                    .setTitle('ℹ️ 설정된 공지사항 채널 없음')
                    .setDescription('이 서버에는 현재 설정된 메이플스토리 공지사항 채널이 없습니다.')
                    .setTimestamp();
                
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ embeds: [infoEmbed] });
                } else if (typeof interaction.reply === 'function') {
                    await interaction.reply({ embeds: [infoEmbed], flags: 0 });
                } else {
                    if (interaction.channel && typeof interaction.channel.send === 'function') {
                        await interaction.channel.send({ embeds: [infoEmbed] });
                    }
                }
                return;
            }

            // 문서 삭제 (채널 설정 제거)
            await deleteDoc(guildSettingsRef);

            const embed = new EmbedBuilder()
                .setColor(0xff0000) // 빨간색 (삭제를 나타냄)
                .setTitle('🗑️ 공지사항 채널 삭제 완료')
                .setDescription('이 서버의 메이플스토리 공지사항 알림 채널이 삭제되었습니다.')
                .setTimestamp()
                .setFooter({ text: '더 이상 이 채널로 알림이 전송되지 않습니다.' });
            
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [embed] });
            } else if (typeof interaction.reply === 'function') {
                await interaction.reply({ embeds: [embed], flags: 0 });
            } else {
                if (interaction.channel && typeof interaction.channel.send === 'function') {
                    await interaction.channel.send({ embeds: [embed] });
                }
            }

        } catch (error) {
            console.error('공지 채널 삭제 중 오류 발생:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('❌ 삭제 오류')
                .setDescription('공지사항 채널을 삭제하는 데 실패했습니다. 다시 시도해 주세요.\n' +
                                  `오류: \`${error.message}\``)
                .setTimestamp();
            
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ embeds: [errorEmbed], flags: 64 });
            } else if (typeof interaction.reply === 'function') {
                await interaction.reply({ embeds: [errorEmbed], flags: 64 });
            } else {
                if (interaction.channel && typeof interaction.channel.send === 'function') {
                    await interaction.channel.send({ content: `<@${interaction.user.id}> ❌ 공지 채널 삭제 중 오류가 발생했어요.`, embeds: [errorEmbed] });
                }
            }
        }
    },
};
