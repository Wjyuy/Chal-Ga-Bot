const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const path = require("path");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("도움말")
    .setDescription("봇의 명령어를 가져옵니다!"),
  run: async ({ interaction }) => {
    try {
      // 파일 경로를 지정할 때 path.join을 사용해 경로를 해결
      const filePath = path.join(__dirname, "..", "img", "hummingbird.jpg");
      const file = new AttachmentBuilder(filePath);

      const embed = new EmbedBuilder()
        .addFields(
          {
            name: "/캐릭터",
            value: '메이플스토리 캐릭터의 정보를 가져옵니다.',
          },
          {
            name: "/안성재",
            value: '안성재 셰프에게 통과,보류,탈락을 받습니다.',
          },
          {
            name: "/목말라",
            value: '물 가격을 알려드려요!',
          },
          {
            name: "/계산기",
            value: '수수료를 포함한 빚 가격을 계산합니다!',
          },
          {
            name: "/스타포스시뮬레이터",
            value: '30성의 주인이 되어보세요!',
          },
          {
            name: "/야구게임",
            value: '야구게임을 진행합니다!',
          }
        )
        .setColor(0xffc0cb)
        .setAuthor({
          name: '챌가봇 명령어',
          iconURL: 'attachment://hummingbird.jpg', // 첨부된 파일을 iconURL로 사용
        });

      // 이미지와 함께 응답
      interaction.reply({
        embeds: [embed],
        files: [file], // 첨부된 이미지 전송
      });
    } catch (error) {
      interaction.reply(`에러 발생! ${error}`);
    }
  },
};
