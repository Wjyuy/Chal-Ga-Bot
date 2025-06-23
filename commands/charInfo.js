const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("캐릭터")
    .setDescription("캐릭터의 정보를 출력합니다.")
    .addStringOption((option) =>
      option.setName("닉네임").setDescription("정보를 가져올 캐릭터의 닉네임").setRequired(true)
    ),
  run: async ({ interaction }) => {
    const nickName = interaction.options.getString("닉네임");
    const API_KEY = process.env.MAPLE_API;

    try {
      const idRes = await axios.get("https://open.api.nexon.com/maplestory/v1/id", {
        headers: { "x-nxopen-api-key": API_KEY },
        params: { character_name: nickName },
      });
      
      const ocid = idRes.data.ocid;
      
      const basicRes = await axios.get("https://open.api.nexon.com/maplestory/v1/character/basic", {
        headers: { "x-nxopen-api-key": API_KEY },
        params: { ocid },
      });

      const popRes = await axios.get("https://open.api.nexon.com/maplestory/v1/character/popularity", {
        headers: { "x-nxopen-api-key": API_KEY },
        params: { ocid },
      });
      const statsRes = await axios.get("https://open.api.nexon.com/maplestory/v1/character/stat", {
        headers: { "x-nxopen-api-key": API_KEY },
        params: { ocid },
      });

      const data = basicRes.data;

      const sv = data.world_name;
      const level = data.character_level;
      const job = data.character_class;
      const guild = data.character_guild_name || "없음";
      const charImg = data.character_image;
      // const serverImg = data.character_class === "은월" ? "/images/silverfox.png" : "/images/default.png"; // 예시
      // console.log("📸 캐릭터 이미지 URL:", charImg);
      const popularity = popRes.data.popularity;
      const finalStat = statsRes.data.final_stat;
      const combatPower = finalStat.find(stat => stat.stat_name === '전투력').stat_value;
      
      const formatLargeNumber = n => {
        if (n < 1e3) return n
        if (n >= 1e3 && n < 1e4) return +(n / 1e3).toFixed(1) + '천'
        if (n >= 1e4 && n < 1e8) return +(n / 1e4).toFixed(1) + '만'
        if (n >= 1e8 && n < 1e12) return +(n / 1e8).toFixed(1) + '억'
        if (n >= 1e12) return +(n / 1e12).toFixed(1) + '조'
      }
      
      const embed = new EmbedBuilder()
        .setTitle(nickName)
        .setColor(0xffc0cb)
        .setImage(charImg)
        .setDescription(`[🔗maple.gg](https://maple.gg/u/${nickName})
          [🔗환산 주스탯](https://maplescouter.com/info?name=${nickName}&preset=00000)
          [🔗레벨 히스토리](https://maplehistory.kr/character/${ocid})
          [🔗chuchu.gg](https://chuchu.gg/char/${nickName})`)
        .addFields(
          {
            name: "서버",
            value: `${sv || "정보 없음"}`,
            inline: true,
          },
          {
            name: "레벨",
            value: `${level?.toString() || "??"}`,
            inline: true,
          },
          {
            name: "직업",
            value: `${job || "알 수 없음"}`,
            inline: true,
          },
          {
            name: "인기도",
            value: `${popularity?.toString() || "?"}`,
            inline: true,
          },
          {
            name: "길드",
            value: `${guild || "없음"}`, 
            inline: true,
          },
          {
            name: "전투력",
            value: formatLargeNumber(combatPower), 
            inline: true,
          },
        );
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      // console.error("❌ 오류 발생:", error);
      await interaction.reply("😥 정보를 가져오는 중 오류가 발생했어요.");
    }
  },
};
