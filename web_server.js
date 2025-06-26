// web_server.js

const express = require('express');
const { collection, getDocs } = require('firebase/firestore');
const { EmbedBuilder } = require('discord.js');
require('dotenv').config(); // .env 파일 사용

const app = express();
// CloudType.io와 같은 플랫폼에서는 PORT 환경 변수를 제공합니다.
const PORT = process.env.PORT || 3000; 

// GitHub Actions에서 사용할 비밀 키 (보안용)
// .env 파일에 BOT_NOTIFICATION_SECRET=YOUR_SECRET_KEY 형식으로 추가해야 합니다.
const BOT_NOTIFICATION_SECRET = process.env.BOT_NOTIFICATION_SECRET;

// 미들웨어 설정
app.use(express.json()); // JSON 형식의 요청 본문을 파싱합니다.

let discordClient; // Discord 클라이언트 인스턴스
let firestoreDb; // Firestore db 인스턴스
let currentAppId; // Firebase 앱 ID

// 이 함수는 index.js에서 호출되어 Discord 클라이언트와 Firestore 인스턴스를 받습니다.
function startWebServer(client, dbInstance) {
    discordClient = client;
    firestoreDb = dbInstance;
    currentAppId = require('./firebase_config').appId; // firebase_config에서 appId를 가져옵니다.

    // --- API 엔드포인트 정의 ---
    app.post('/notify-announcement', async (req, res) => {
        // 1. Secret Key 인증
        const receivedSecret = req.headers['x-notification-secret'];
        if (!receivedSecret || receivedSecret !== BOT_NOTIFICATION_SECRET) {
            console.warn('[웹 서버] 알림 요청: 유효하지 않은 Secret Key 또는 Secret Key 누락.');
            return res.status(403).send('Forbidden: Invalid or missing secret key');
        }

        // 2. 요청 본문에서 공지사항 데이터 추출
        const { title, url, date } = req.body;

        if (!title || !url) {
            console.warn('[웹 서버] 알림 요청: 제목 또는 URL이 누락되었습니다.');
            return res.status(400).send('Bad Request: Missing title or URL');
        }

        console.log(`[웹 서버] 새로운 공지사항 수신: "${title}" (${url})`);

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

            // 4. Discord 임베드 메시지 생성
            const embed = new EmbedBuilder()
                .setColor(0xFFA500) // 주황색
                .setTitle(`📢 새로운 메이플스토리 공지사항: ${title}`)
                .setURL(url)
                .setDescription('메이플스토리 공식 홈페이지에 새로운 공지사항이 등록되었습니다.')
                .addFields(
                    { name: '제목', value: title },
                    { name: '바로가기', value: `[공지사항 링크](${url})` }
                )
                .setTimestamp(date ? new Date(date) : new Date()) // 공지사항 날짜가 있다면 사용, 없으면 현재 시간
                .setFooter({ text: '메이플스토리 공식 Open API', iconURL: 'https://placehold.co/20x20/FFA500/ffffff?text=N' });

            // 5. 각 채널로 Discord 메시지 전송
            let sentCount = 0;
            for (const channelId of channelsToNotify) {
                try {
                    const channel = await discordClient.channels.fetch(channelId);
                    if (channel && channel.isTextBased()) {
                        await channel.send({ embeds: [embed] });
                        sentCount++;
                        console.log(`[웹 서버] 채널 ${channel.name} (${channel.id})에 공지사항 전송 완료.`);
                    } else {
                        console.warn(`[웹 서버] 채널 ${channelId}를 찾을 수 없거나 텍스트 채널이 아닙니다.`);
                    }
                } catch (error) {
                    console.error(`[웹 서버] 채널 ${channelId}에 메시지 전송 실패:`, error.message);
                }
            }

            return res.status(200).send(`Notification sent to ${sentCount} channels.`);

        } catch (error) {
            console.error('[웹 서버] 공지사항 전송 처리 중 오류 발생:', error);
            return res.status(500).send('Internal Server Error while processing notification.');
        }
    });

    // 웹 서버 시작
    app.listen(PORT, () => {
        console.log(`[웹 서버] 알림 수신 서버가 포트 ${PORT}에서 실행 중입니다.`);
    });
}

module.exports = { startWebServer };
