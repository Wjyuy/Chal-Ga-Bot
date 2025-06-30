// commands/set_announcement_channel.js
// 공지사항 알림을 받을 채널을 설정하는 슬래시 명령어

const { SlashCommandBuilder, PermissionsBitField, ChannelType, EmbedBuilder, GatewayIntentBits } = require('discord.js'); // GatewayIntentBits는 불필요하지만 혹시 모를 임포트 오류 방지
const { db, appId } = require('../firebase_config'); // Firestore db 인스턴스와 appId 가져오기
const { doc, setDoc } = require('firebase/firestore');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('공지채널설정') // 명령어 이름: /공지채널설정
        .setDescription('메이플스토리 공지사항을 받을 채널을 설정합니다.')
        .addChannelOption(option =>
            option.setName('채널') // 채널 옵션
                .setDescription('공지사항을 받을 Discord 채널을 선택하세요.')
                .addChannelTypes(ChannelType.GuildText) // 텍스트 채널만 허용
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels), // 채널 관리 권한이 있는 사용자만 사용 가능
    
    run: async ({ interaction }) => {
        const channel = interaction.options.getChannel('채널'); 

        // 채널이 제대로 전달되지 않았을 경우의 예외 처리
        if (!channel) {
            console.error('오류: 채널 옵션을 찾을 수 없거나 유효하지 않습니다.');
            if (typeof interaction.reply === 'function') {
                // ephemeral: true 대신 flags: 64 (MessageFlags.Ephemeral) 사용
                await interaction.reply({ content: '⚠️ 채널 설정을 실패했습니다. 유효한 채널을 선택했는지 확인해주세요.', flags: 64 }); 
            } else if (interaction.channel && typeof interaction.channel.send === 'function') {
                await interaction.channel.send({ content: `<@${interaction.user.id}> ⚠️ 채널 설정을 실패했습니다. 유효한 채널을 선택했는지 확인해주세요.` });
            }
            return;
        }

        const guildId = interaction.guild.id; 

        try {
            // Discord에 "봇이 생각 중..."임을 알립니다. (최대 3초 응답 시간 확보)
            if (typeof interaction.deferReply === 'function') {
                // ephemeral: false 대신 flags: 0 (또는 생략) 사용
                await interaction.deferReply({ flags: 0 }); // 공개적으로 "생각 중..." 표시
            } else {
                console.warn('interaction.deferReply 함수를 찾을 수 없습니다. 응답 지연 없이 진행합니다.');
            }

            // Firestore에 채널 ID 저장
            const guildSettingsRef = doc(db, 'artifacts', appId, 'public', 'data', 'guild_settings', guildId);
            await setDoc(guildSettingsRef, {
                announcementChannelId: channel.id,
                guildName: interaction.guild.name, 
                updatedAt: new Date().toISOString()
            });

            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('✅ 공지사항 채널 설정 완료')
                .setDescription(`메이플스토리 공지사항은 이제 ${channel} 채널로 전송됩니다.`)
                .setTimestamp()
                .setFooter({ text: '설정 변경 시 다시 명령어를 사용해주세요.' });
            
            // deferReply가 성공했거나 이미 응답된 상태라면 editReply로 메시지 업데이트
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [embed] });
            } else if (typeof interaction.reply === 'function') {
                // ephemeral: false 대신 flags: 0 (또는 생략) 사용
                await interaction.reply({ embeds: [embed], flags: 0 });
            } else {
                if (interaction.channel && typeof interaction.channel.send === 'function') {
                    await interaction.channel.send({ embeds: [embed] });
                }
            }

        } catch (error) {
            console.error('공지 채널 설정 중 오류 발생:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('❌ 설정 오류')
                .setDescription('공지사항 채널을 설정하는 데 실패했습니다. 다시 시도해 주세요.\n' +
                                  `오류: \`${error.message}\``)
                .setTimestamp();
            
            // 오류 메시지 응답 (ephemeral: true 대신 flags: 64 사용)
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ embeds: [errorEmbed], flags: 64 });
            } else if (typeof interaction.reply === 'function') {
                await interaction.reply({ embeds: [errorEmbed], flags: 64 });
            } else {
                if (interaction.channel && typeof interaction.channel.send === 'function') {
                    await interaction.channel.send({ content: `<@${interaction.user.id}> ❌ 공지 채널 설정 중 오류가 발생했어요.`, embeds: [errorEmbed] });
                }
            }
        }
    },
};
