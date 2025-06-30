const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: {
    name: '스타포스시뮬레이터',
    description: '30성의 주인이 되어보세요!',
  },

  run: async ({ interaction, client }) => {
    try {
      if (!interaction.isChatInputCommand()) return;

      // 최고 기록 파일 경로
      const recordPath = path.join(process.cwd(), 'highest_record.json');

      // 최고 기록 파일 없으면 초기화
      if (!fs.existsSync(recordPath)) {
        const initialData = {
          highestLevel: 15,
          username: '없음'
        };
        fs.writeFileSync(recordPath, JSON.stringify(initialData, null, 2));
      }

      // 현재 최고 기록 불러오기
      const record = JSON.parse(fs.readFileSync(recordPath, 'utf-8'));
      const highestLevel = record.highestLevel;
      const highestUser = record.username;

      const startLevel = 15;

      const embed = new EmbedBuilder()
        .setTitle('🌟 스타포스 시뮬레이터 시작!')
        .setDescription(`강화를 시작합니다!\n\n**현재 강화 수치**: ${startLevel}성\n\n**🏆 최고 기록: ${highestLevel}성 \n${highestUser} 님!**`)
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

      await interaction.reply({
        embeds: [embed],
        components: [row],
      });

      const collector = interaction.channel.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        time: 600000, 
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
            await i.deferUpdate();
            return;
          }

          // 유저의 별명 가져오기
          const member = await interaction.guild.members.fetch(i.user.id);
          const nickname = member.nickname || i.user.username;  // 별명이 없으면 기본 사용자 이름 사용

          // Restart 시뮬레이터
          if (i.customId.startsWith('restart_')) {
            const restartLevel = parseInt(i.customId.split('_')[1]);

            const embed = new EmbedBuilder()
              .setTitle('🌟 스타포스 시뮬레이터 재시작!')
              .setDescription(`강화를 시작합니다!\n\n**현재 강화 수치**: ${restartLevel}성\n\n**🏆 최고 기록: ${highestLevel}성 \n${highestUser} 님!**`)
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

              // 30성 찍었으면 최고 기록 갱신
              updateRecord(30, nickname);

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

              // 성공했을 때 최고 기록 갱신
              updateRecord(nextLevel, nickname);

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

            const resultEmbed = new EmbedBuilder()
              .setTitle('⭐ 강화 결과')
              .setColor(resultType === 'success' ? 0x00ff00 : 0xff0000)
              .setDescription(`${description}\n\n🏆 최고 기록: ${record.highestLevel}성 | 유저: ${record.username}`);

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

      // 🛠️ 최고 기록 업데이트 함수
      function updateRecord(newLevel, username) {
        const currentRecord = JSON.parse(fs.readFileSync(recordPath, 'utf-8'));
        if (newLevel > currentRecord.highestLevel) {
          const newRecord = {
            highestLevel: newLevel,
            username: username
          };
          fs.writeFileSync(recordPath, JSON.stringify(newRecord, null, 2));
          console.log(`🎉 새로운 최고 기록 갱신: ${newLevel}성 by ${username}`);
        }
      }
    } catch (error) {
      console.error('시뮬레이터 실행 중 오류 발생:', error);
      await interaction.reply({
        content: '시뮬레이터 실행 중 오류가 발생했습니다. 다시 시도해 주세요.',
        embeds: [],
        components: [],
      });
    }
  },
};
