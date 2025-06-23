const axios = require('axios');
require('dotenv').config();

const nickName = "오지환";
const encodedName = encodeURIComponent(nickName);  // 한글 인코딩
const API_KEY = process.env.MAPLE_API;

let url = `https://open.api.nexon.com/maplestory/v1/id?character_name=${encodedName}`;
axios.get(url, {
    headers: {
        "x-nxopen-api-key": API_KEY
    }
})
.then(response => {
    console.log("✅ OCID:", response.data.ocid);
    const ocid = response.data.ocid;
    url = `https://open.api.nexon.com/maplestory/v1/character/basic?ocid=${ocid}`;
    axios.get(url, {
        headers: {
          'x-nxopen-api-key': API_KEY,
        },
      })
      .then(response => {
        const data = response.data;
        console.log("✅ 캐릭터 이름:", data.character_name);
        console.log("🎮 직업:", data.character_class);
        console.log("📈 레벨:", data.character_level);
        console.log("🌍 월드:", data.world_name);

        url = `https://open.api.nexon.com/maplestory/v1/character/stat?ocid=${ocid}`;

        axios.get(url, {
        headers: {
            'x-nxopen-api-key': API_KEY,
        },
        })
        .then(response => {
        const data = response.data;
        console.log("✅ 캐릭터 스탯:");
        data.final_stat.forEach(stat => {
            console.log(`${stat.stat_name}: ${stat.stat_value}`);
        });
        })
        .catch(error => {
        if (error.response) {
            console.log("❌ 상태 코드:", error.response.status);
            console.log("❌ 응답 내용:", error.response.data);
        } else {
            console.error("❌ 요청 실패:", error.message);
        }
        });
      })
      .catch(error => {
        if (error.response) {
          console.log("❌ 상태 코드:", error.response.status);
          console.log("❌ 응답 내용:", error.response.data);
        } else {
          console.error("❌ 요청 실패:", error.message);
        }
      });
})
.catch(error => {
    if (error.response) {
        console.log("❌ 오류 발생:", error.response.status);
        console.log("🔻 응답 내용:", error.response.data);
    } else {
        console.log("❌ 요청 실패:", error.message);
    }
});
