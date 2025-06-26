// 1. 주요 클래스 가져오기
const { randomBytes } = require('crypto');
const { Client, Events, GatewayIntentBits, AttachmentBuilder} = require('discord.js');

//토큰은 dotenv 사용
require('dotenv').config();
const token = process.env.DISCORD_BOT_TOKEN;

//핸들러추가해봤음(잘된다)
const { CommandHandler } = require("djs-commander");
const path = require("path");


// Firestore 설정 파일 가져오기
const { db, auth } = require('./firebase_config');

// const announcementChecker = require('./announcement_checker');

// Express 서버 모듈 가져오기
const { startWebServer } = require('./web_server'); 

// 2. 클라이언트 객체 생성 (Guilds관련, 메시지관련 인텐트 추가)
const client = new Client({ intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
]});

// console.log("자동 배포 테스트2");

//핸들러 생성(commands 까지 잘된다)
new CommandHandler({
    client,
    commandsPath: path.join(__dirname, "commands"),
    eventsPath: path.join(__dirname, "events"),
  });


client.once(Events.ClientReady, async c => {
    console.log(`준비됨! ${c.user.tag} (으)로 로그인했습니다.`);
    
    // Firestore 인증 초기화 (firebase_config.js에서 이미 처리)
    // 웹 서버 초기화 및 시작
    console.log('[웹 서버] 웹 서버 초기화 중...');
    // Discord 클라이언트와 Firestore db 인스턴스를 웹 서버에 전달
    startWebServer(client, db); 
    console.log('[웹 서버] 웹 서버 초기화 완료 및 시작.');
});



// 5. 시크릿키(토큰)을 통해 봇 로그인 실행2
client.login(token);