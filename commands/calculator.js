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
    )
    .addIntegerOption((option) =>
      option
        .setName("수수료")
        .setDescription("수수료율을 선택하세요 (%)")
        .setRequired(true)
        .addChoices(
          { name: '3%', value: 3 },
          { name: '5%', value: 5 }
        )
    ),
    run: async ({ interaction }) => {
      const money =  Number(interaction.options.get("빌린돈").value);
      const fee = interaction.options.get("수수료").value;
      var feeMoney =  money / (1 - (fee/ 100));
      const rounded = feeMoney.toFixed(2);
      try {
        const embed = new EmbedBuilder()
        .setDescription(`${money}억을 빌렸을때,  
          **수수료가 ${fee}%** 라면  
          ${money}억을 갚기 위해 지불해야 하는 금액은:`)
          .addFields(
            {
              name: "\u200b",
              value: `**${rounded}억** 입니다!`,
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