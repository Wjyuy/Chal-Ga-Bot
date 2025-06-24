// register-commands.js 

// 필요한 모듈을 가져옵니다.
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
// const path = require('node:path');
const path = require("path");
require('dotenv').config(); // .env 파일에서 환경 변수를 로드합니다.

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.BOT_CLIENT_ID; 

// 만약 특정 길드(서버)에서만 명령어를 테스트하고 싶다면 GUILD_ID를 설정합니다.
// 전역 명령어를 등록할 것이므로, 보통 이 값은 필요 없습니다.
// const GUILD_ID = 'YOUR_GUILD_ID'; // 특정 길드 ID (선택 사항)

if (!TOKEN) {
    console.error('오류: DISCORD_BOT_TOKEN 환경 변수가 설정되지 않았습니다.');
    process.exit(1);
}
if (CLIENT_ID === 'YOUR_BOT_CLIENT_ID') {
    console.error('오류: CLIENT_ID를 봇의 애플리케이션 ID로 업데이트해야 합니다.');
    console.error('Discord 개발자 포털에서 Application ID를 확인하세요.');
    process.exit(1);
}

const commands = [];
// 봇의 명령어 파일이 있는 'commands' 디렉토리의 경로를 설정합니다.
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // 명령어 데이터에 'data' 속성이 있는지 확인합니다.
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    } else {
        console.log(`[경고] ${filePath}의 명령어에 'data' 또는 'execute' 속성이 누락되었습니다.`);
    }
}

// REST 모듈을 사용하여 Discord API와 상호작용합니다.
const rest = new REST().setToken(TOKEN);

// 명령어 등록 및 삭제 함수를 비동기적으로 실행합니다.
(async () => {
    try {
        console.log(`현재 ${commands.length}개의 (/) 명령어를 새로고침하고 있습니다.`);

        // 1. 모든 기존 전역 명령어 삭제 (매우 중요!)
        // 이렇게 하면 캐시된 오래된 명령어가 모두 제거됩니다.
        console.log('기존 전역 명령어를 삭제 중...');
        await rest.put(
            Routes.applicationCommands(CLIENT_ID), // 전역 명령어
            { body: [] }, // 빈 배열을 보내 모든 명령어를 삭제합니다.
        );
        console.log('기존 전역 명령어 삭제 완료.');

        // 2. 새로운 명령어 등록 (수수료 매개변수가 없는 최신 버전)
        const data = await rest.put(
            Routes.applicationCommands(CLIENT_ID), // 전역 명령어 등록
            { body: commands },
        );

        console.log(`성공적으로 ${data.length}개의 (/) 명령어를 다시 로드했습니다.`);
    } catch (error) {
        // 오류가 발생하면 콘솔에 기록합니다.
        console.error(error);
    }
})();
