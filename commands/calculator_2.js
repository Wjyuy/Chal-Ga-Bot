const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const cheerio = require("cheerio");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("돈빌려줘")
    .setDescription("얼마를 빌려야 필요한 금액이 되는지 계산합니다!")
    .addStringOption((option) =>
      option
        .setName("필요메소")
        .setDescription("억 단위입니다!")
        .setRequired(true)
    ),
    run: async ({ interaction }) => {
      const money =  Number(interaction.options.get("필요메소").value);
      feefive = 5;
      feethree = 3;

      // 수수료 계산
      // 5퍼일때 금액
      var feeMoneyfive =  money / (1 - (feefive/ 100));
      // 5퍼일때 금액 기준으로 올림
      const roundedfive = Math.ceil(feeMoneyfive);
      // 5퍼일때 금액 기준으로 올림한금액을빌리면 받는금액
      var feeMoneyfiverecive =  roundedfive - (roundedfive* (feefive/ 100));
      // 5퍼일때 금액 기준으로 올림한금액을빌리면 받는금액을2자리쳐내기
      const roundedfiveFix = feeMoneyfiverecive.toFixed(2);

      // 3퍼일때 금액
      var feeMoneythree =  money / (1 - (feethree/ 100));
      const roundedthree = Math.ceil(feeMoneythree);
      var feeMoneythreerecive =  roundedthree - (roundedthree* (feethree/ 100));
      const roundedthreeFix = feeMoneythreerecive.toFixed(2);
      try {
        const embed = new EmbedBuilder()
        .setDescription(`**${money}억**을 받기위해 빌려야 하는 금액을 계산합니다!`)
          .addFields(
            {
              name: "**5%** 적용 시",
              value: `**${roundedfive}억** 을 빌리면, 약 **${roundedfiveFix}억**을 수령합니다!`,
              inline: true,
            },
            {
              name: "**3%** 적용 시",
              value: `**${roundedthree}억** 을 빌리면, 약 **${roundedthreeFix}억**을 수령합니다!`,
              inline: true,
            }
          )
          .setTitle('💰 돈 빌려줘 💸')
          .setColor(0xffc0cb)
          
        interaction.reply({ embeds: [embed] });
      } catch (error) {
        interaction.reply(`에러 발생! ${error}`);
      }
    },
};