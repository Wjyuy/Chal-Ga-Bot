const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("야구게임")
    .setDescription("야구게임을 진행합니다!"),

  run: async ({ interaction }) => {
    const secretNumber = generateRandomNumber();  // 비밀 숫자 생성
    let attempts = 0;
    const maxAttempts = 9;  // 최대 시도 횟수

    // 채널이 유효한지 확인
    if (!interaction.channel || !interaction.guild) {
      return interaction.reply('이 명령어는 서버 채널에서만 실행할 수 있습니다.');
    }

    // 응답을 미리 연기
    await interaction.deferReply();

    // 초기 메시지 전송
    const startEmbed = new EmbedBuilder()
      .setTitle("야구 게임 시작!")
      .setDescription("3자리 숫자를 맞춰보세요.")
      .setColor(0x00FF00);
    interaction.editReply({ embeds: [startEmbed] });

    // 사용자가 숫자를 입력하면
    const filter = (message) => {
      return message.author.id === interaction.user.id && /^[1-9][0-9]{2}$/.test(message.content);
    };

    const collector = interaction.channel.createMessageCollector({ filter, time: 600000 });

    collector.on("collect", (message) => {
      attempts++;
      const guess = message.content;

      if (guess === secretNumber) {
        collector.stop(); // 정답을 맞히면 게임 종료
        const winEmbed = new EmbedBuilder()
          .setTitle("정답입니다! 🎉")
          .setDescription(`축하합니다! 정답은 ${secretNumber}였습니다.`)
          .setColor(0xFFCC00);
        message.reply({ embeds: [winEmbed] });
      } else {
        const { strikes, balls } = getGameResult(guess, secretNumber);

        // 임베드를 사용하여 결과를 출력
        const resultEmbed = new EmbedBuilder()
          .setTitle("게임 진행 중")
          .setDescription(`입력한 숫자: ${guess}`)
          .addFields(
            { name: "STRIKE", value: `${strikes}개`, inline: true },
            { name: "BALL", value: `${balls}개`, inline: true },
            { name: "남은 시도 횟수", value: `${9 - attempts}번`, inline: true }
          )
          .setColor(0x00BFFF);

        message.reply({ embeds: [resultEmbed] });

        if (attempts >= maxAttempts) {
          collector.stop(); // 최대 시도 횟수에 도달하면 종료
          const failEmbed = new EmbedBuilder()
            .setTitle("게임 종료")
            .setDescription(`정답은 ${secretNumber}였습니다. 아쉽게도 기회를 모두 사용했습니다.`)
            .setColor(0xFF0000);
          message.reply({ embeds: [failEmbed] });
        }
      }
    });

    collector.on("end", (collected, reason) => {
      if (reason === "time") {
        const timeoutEmbed = new EmbedBuilder()
          .setTitle("시간 초과!")
          .setDescription("게임 시간이 초과되었습니다. 다시 시도해주세요.")
          .setColor(0xFF0000);
        interaction.followUp({ embeds: [timeoutEmbed] });
      }
    });
  },
};

// 3자리 숫자 생성 함수 (중복되지 않는 숫자)
function generateRandomNumber() {
  let num;
  do {
    num = Math.floor(Math.random() * 900) + 100;  // 100 ~ 999 사이의 숫자
  } while (new Set(num.toString()).size !== num.toString().length);  // 숫자 중복 방지
  return num.toString();
}

// 게임 결과 확인 함수 (S: 스트라이크, B: 볼, O: 아웃)
function getGameResult(guess, secret) {
  let strikes = 0;
  let balls = 0;

  for (let i = 0; i < 3; i++) {
    if (guess[i] === secret[i]) {
      strikes++;
    } else if (secret.includes(guess[i])) {
      balls++;
    }
  }

  return { strikes, balls };
}
