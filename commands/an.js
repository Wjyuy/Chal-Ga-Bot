const { SlashCommandBuilder,EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("안성재")
    .setDescription("안성재에게 평가받아보세요.")
    .addStringOption((option) => 
      option
        .setName("셰프이름") //option의 이름
        .setDescription("문자형") //option의 설명
        .setRequired(true) //필수로 입력되어야 하는지 여부
    ),
    run: ({ interaction }) => {
        const chefname = interaction.options.get("셰프이름").value; 
        let String="";
        let i=3*Math.random();
        if(i<1){
            String=(chefname+'님은 통과입니다.');
        }else if(i<2){
            String=(chefname+'님은 탈락입니다.');
        }else{
            String=(chefname+'님은 보류입니다.');
        }
        try {
            const embed = new EmbedBuilder()
                .addFields(
                {
                    name: "안성재:",
                    value: String,
                },
                )
                .setColor(0xffc0cb);
            interaction.reply({ embeds: [embed] });
            } catch (error) {
            interaction.reply(`에러 발생! ${error}`);
            }
    },
  
};