const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("목말라")
    .setDescription("물 가격을 알려드립니다!")
    .addStringOption((option) =>
      option
        .setName("개수")
        .setDescription("구매 개수")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("비율")
        .setDescription("예시: 1900/2000 등")
        .setRequired(true)
    ),

  run: async ({ interaction }) => {
    const water = interaction.options.get("비율").value;
    const number_water = interaction.options.get("개수").value;
    const total_won = number_water * water;

    // 총 금액 포맷팅 (1,000 단위로 쉼표 추가)
    const formattedTotalWon = total_won.toLocaleString();

    var feeMoneythree = number_water - (number_water * (3 / 100));
    const roundedthree = feeMoneythree.toFixed(2);
    console.log(feeMoneythree);
    console.log(roundedthree);
    var feeMoneyfive = number_water - (number_water * (5 / 100));
    const roundedfive = feeMoneyfive.toFixed(2);
    console.log(feeMoneyfive);
    console.log(roundedfive);

    try {
      const embed = new EmbedBuilder()
        .addFields(
          {
            name: "💧 현재 물 가격 안내",
            value: `**${water}:1 **인 경우, ${number_water}개는 **${formattedTotalWon}원**입니다!\n`,
          },
          {
            name: "📈 경매장 계산",
            value: `3%인 경우, 약 **${roundedthree}억**을 받으실 수 있겠네요!`,
          },
          {
            name: "📈 교환 계산",
            value: `5%인 경우, 약 **${roundedfive}억**을 받으실 수 있겠네요!`,
          }
        )
        .setTitle('물 계산기')
        .setColor(0xffc0cb);

      interaction.reply({ embeds: [embed] });
    } catch (error) {
      interaction.reply(`⚠️ 에러 발생! ${error}`);
    }
  },
};
