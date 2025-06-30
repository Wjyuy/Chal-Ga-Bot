// web_server.js

const express = require('express');
const { collection, getDocs } = require('firebase/firestore');
const { EmbedBuilder } = require('discord.js');
require('dotenv').config(); // .env 파일 사용

const app = express();
const PORT = process.env.PORT || 3000; 

const BOT_NOTIFICATION_SECRET = process.env.BOT_NOTIFICATION_SECRET;

// 웹 서버 시작 시 BOT_NOTIFICATION_SECRET의 길이를 로그로 출력
if (BOT_NOTIFICATION_SECRET) {
    console.log(`[DEBUG] Web Server: BOT_NOTIFICATION_SECRET length: ${BOT_NOTIFICATION_SECRET.length}, first 5 chars: ${BOT_NOTIFICATION_SECRET.substring(0, 5)}`);
} else {
    console.error('[DEBUG] Web Server: BOT_NOTIFICATION_SECRET 환경 변수가 로드되지 않았습니다.');
}


// 미들웨어 설정
app.use(express.json()); // JSON 형식의 요청 본문을 파싱합니다.

let discordClient; // Discord 클라이언트 인스턴스
let firestoreDb; // Firestore db 인스턴스
let currentAppId; // Firebase 앱 ID

// 이 함수는 index.js에서 호출되어 Discord 클라이언트와 Firestore 인스턴스를 받습니다.
function startWebServer(client, dbInstance) {
    discordClient = client;
    firestoreDb = dbInstance;
    // firebase_config 모듈을 동적으로 가져와서 appId를 사용합니다.
    // 이는 firebase_config가 먼저 초기화되도록 보장합니다.
    currentAppId = require('./firebase_config').appId; 

    // --- API 엔드포인트 정의 ---
    app.post('/notify-announcement', async (req, res) => {
        const receivedSecret = req.headers['x-notification-secret'];

        // 요청 받은 Secret Key의 길이와 첫 몇 글자를 로그로 출력
        console.log(`[DEBUG] Web Server: Received secret length: ${receivedSecret ? receivedSecret.length : 'N/A'}, first 5 chars: ${receivedSecret ? receivedSecret.substring(0, 5) : 'N/A'}`);

        // 1. Secret Key 인증
        if (!receivedSecret || receivedSecret !== BOT_NOTIFICATION_SECRET) {
            console.warn('[웹 서버] 알림 요청: 유효하지 않은 Secret Key 또는 Secret Key 누락.');
            return res.status(403).send('Forbidden: Invalid or missing secret key');
        }

        // 2. 요청 본문에서 공지사항 데이터 추출
        const { title, url, date, type } = req.body; // type 속성 추가

        if (!title || !url || !type) { // type도 필수적으로 확인
            console.warn('[웹 서버] 알림 요청: 제목, URL, 또는 타입이 누락되었습니다.');
            return res.status(400).send('Bad Request: Missing title, URL, or type');
        }

        console.log(`[웹 서버] 새로운 공지사항 수신: "${title}" (${url}) - 타입: ${type}`);

        try {
            // 3. Firestore에서 알림 채널 ID 목록 조회
            const channelsToNotify = [];
            // public/data/{appId}/guild_settings 컬렉션에서 채널 ID를 가져옵니다.
            const querySnapshot = await getDocs(collection(firestoreDb, 'artifacts', currentAppId, 'public', 'data', 'guild_settings'));
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.announcementChannelId) {
                    channelsToNotify.push(data.announcementChannelId);
                }
            });

            if (channelsToNotify.length === 0) {
                console.log('[웹 서버] 알림 요청: 설정된 알림 채널이 없습니다.');
                return res.status(200).send('No notification channels configured.');
            }

            // 임베드 제목을 타입에 따라 다르게 설정
            let embedTitlePrefix = '📢 새로운 메이플스토리 ';
            if (type === 'notice') {
                embedTitlePrefix += '공지사항: ';
            } else if (type === 'event') {
                embedTitlePrefix += '이벤트 공지: ';
            } else if (type === 'update') { // *업데이트 공지 타입 추가
                embedTitlePrefix += '업데이트 공지: ';
            } else if (type === 'cashshop') { // *캐시샵 공지 타입 추가
                embedTitlePrefix += '캐시샵 공지: ';
            } else {
                embedTitlePrefix += '알림: '; // 알 수 없는 타입
            }

            const embed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle(`${embedTitlePrefix}${title}`)
                .setURL(url)
                .setDescription('메이플스토리 공식 홈페이지에 새로운 알림이 등록되었습니다.')
                .addFields(
                    { name: '제목', value: title },
                    { name: '바로가기', value: `[알림 링크](${url})` }
                )
                .setTimestamp(date ? new Date(date) : new Date())
                .setFooter({ text: '메이플스토리 공식 Open API', iconURL: 'https://placehold.co/20x20/FFA500/ffffff?text=N' });

            let sentCount = 0;
            for (const channelId of channelsToNotify) {
                try {
                    const channel = await discordClient.channels.fetch(channelId);
                    if (channel && channel.isTextBased()) {
                        await channel.send({ embeds: [embed] });
                        sentCount++;
                        console.log(`[웹 서버] 채널 ${channel.name} (${channel.id})에 알림 전송 완료. (타입: ${type})`);
                    } else {
                        console.warn(`[웹 서버] 채널 ${channelId}를 찾을 수 없거나 텍스트 채널이 아닙니다.`);
                    }
                } catch (error) {
                    console.error(`[웹 서버] 채널 ${channelId}에 메시지 전송 실패:`, error.message);
                }
            }

            return res.status(200).send(`Notification sent to ${sentCount} channels.`);

        } catch (error) {
            console.error('[웹 서버] 알림 전송 처리 중 오류 발생:', error);
            return res.status(500).send('Internal Server Error while processing notification.');
        }
    });

    app.listen(PORT, () => {
        console.log(`[웹 서버] 알림 수신 서버가 포트 ${PORT}에서 실행 중입니다.`);
    });
}

module.exports = { startWebServer };
