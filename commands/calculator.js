const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const cheerio = require("cheerio");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("계산기")
    .setDescription("수수료를 포함한 빚 가격을 계산합니다")
    .addStringOption((option) =>
      option
        .setName("빌린돈")
        .setDescription("억 단위입니다!")
        .setRequired(true)
    ),
    // .addIntegerOption((option) =>
    //   option
    //     .setName("수수료")
    //     .setDescription("수수료율을 선택하세요 (%)")
    //     .setRequired(true)
    //     .addChoices(
    //       { name: '3%', value: 3 },
    //       { name: '5%', value: 5 }
    //     )
    // ),
    run: async ({ interaction }) => {
      const money =  Number(interaction.options.get("빌린돈").value);
      // const fee = interaction.options.get("수수료").value;
      feefive = 5;
      feethree = 3;
      var feeMoneyfive =  money / (1 - (feefive/ 100));
      const roundedfive = feeMoneyfive.toFixed(2);
      var feeMoneythree =  money / (1 - (feethree/ 100));
      const roundedthree = feeMoneythree.toFixed(2);
      try {
        const embed = new EmbedBuilder()
        .setDescription(`${money}억을 갚기 위해 지불해야 하는 금액을 계산합니다!`)
          .addFields(
            {
              name: "채권자가 MVP가 아니거나 PC방이 아닌 곳에서 수령할 경우,",
              value: `5%를 적용하면 약**${roundedfive}억** 입니다!`,
              inline: true,
            },
            {
              name: "채권자가 MVP거나 PC방에서 수령할 경우,",
              value: `3%를 적용하면 **${roundedthree}억** 입니다!`,
              inline: true,
            }
          )
          .setTitle('💰 빚 계산기 💸')
          .setColor(0xffc0cb)
          
        interaction.reply({ embeds: [embed] });
      } catch (error) {
        interaction.reply(`에러 발생! ${error}`);
      }
    },
};