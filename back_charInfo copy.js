const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const cheerio = require("cheerio");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("캐릭터")
    .setDescription("캐릭터의 정보를 출력합니다.")
    .addStringOption((option) =>
      option
        .setName("닉네임")
        .setDescription("정보를 가져올 캐릭터의 닉네임")
        .setRequired(true)
    ),
    run: async ({ interaction }) => {
      const nickName = interaction.options.get("닉네임").value;
      try {
        
        
        let html = await axios.get(`https://maple.gg/u/${nickName}`);
        let $ = cheerio.load(html.data);

        const levelAndClass = $("div.sc-d7179172-7.ejquIv").text();
        const sv = $("div.world").text();
        
        const level =levelAndClass.match(/[0-9]{2,}/);
        const job = String(levelAndClass.match(/[^\d\w\s]{2,}[인$]/)).slice(0,-1);
        let fame =String(levelAndClass.match(/[0-9]{1,}/g)).split(',');
        if(fame.length==3){
          fame = fame[1]+','+fame[2];
        }else{
          fame = fame[1];
        }
        const guild =String(levelAndClass.match(/[0-9$][가-힣]{2,}|[0-9$][A-z]{2,}/g)).split(',')[1].slice(1);
  
        const charImg = $("img.character-image").attr("src");
        const serverImg = $("div.world img").attr("src");
  
        // //환산
        // html = await axios.get(`https://maplescouter.com/info?name=${nickName}&preset=00000`);
        // $ = cheerio.load(html.data);
        // const da = $("main.ant-layout-content flex-1 bg-body-green  css-1rh9l92").text();
        // console.log(da);

        const embed = new EmbedBuilder()
          .addFields(
            {
              name: "서버",
              value: `${sv}`,
              inline: true,
            },
            {
              name: "레벨",
              value: `${level}`,
              inline: true,
            },
            {
              name: "직업",
              value: `${job}`,
              inline: true,
            },
            {
              name: "인기도",
              value: `${fame}`,
              inline: true,
            },
            {
              name: "길드",
              value: `${guild}`,
              inline: true,
            }
          )
          .setTitle(nickName)
          .setThumbnail(`https:${serverImg}`)
          .setColor(0xffc0cb)
          .setImage(charImg)
          .setAuthor({
            name: 'maple.gg로 이동' ,
            url:`https://maple.gg/u/${nickName}`,
            // iconURL: charImg,
          });
        interaction.reply({ embeds: [embed] });
      } catch (error) {
        interaction.reply(`에러 발생! ${error}`);
      }
    },
};