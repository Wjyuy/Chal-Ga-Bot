// maplestory_announcement_check.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 환경 변수에서 값 가져오기 (GitHub Actions Secret 또는 .env에서 주입됨)
const NEXON_API_KEY = process.env.MAPLE_API;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// 상수 정의
const MAPLESTORY_NOTICE_API_URL = 'https://open.api.nexon.com/maplestory/v1/notice';
const LAST_CHECKED_URL_FILE = 'last_checked_announcement_url.txt'; // 마지막 확인 URL을 저장할 파일

// 넥슨 API 헤더 설정
const NEXON_API_HEADERS = {
    'x-nxopen-api-key': NEXON_API_KEY,
};

// --- 유틸리티 함수 ---

/**
 * 마지막으로 확인한 공지사항 URL을 파일에서 읽어옵니다.
 * 파일이 없으면 null을 반환합니다.
 */
function getLastCheckedUrl() {
    console.log(`[DEBUG] getLastCheckedUrl: ${LAST_CHECKED_URL_FILE} 파일 존재 여부 확인...`);
    try {
        if (fs.existsSync(LAST_CHECKED_URL_FILE)) {
            const url = fs.readFileSync(LAST_CHECKED_URL_FILE, 'utf8').trim();
            console.log(`[DEBUG] getLastCheckedUrl: 파일에서 URL 읽기 성공: ${url}`);
            return url;
        } else {
            console.log(`[DEBUG] getLastCheckedUrl: ${LAST_CHECKED_URL_FILE} 파일이 존재하지 않습니다.`);
        }
    } catch (error) {
        console.error(`[ERROR] getLastCheckedUrl: 마지막 확인 URL 파일 읽기 오류: ${error.message}`);
    }
    return null;
}

/**
 * 마지막으로 확인한 공지사항 URL을 파일에 저장합니다.
 */
function setLastCheckedUrl(url) {
    console.log(`[DEBUG] setLastCheckedUrl: ${LAST_CHECKED_URL_FILE} 파일에 URL 저장 시도: ${url}`);
    try {
        fs.writeFileSync(LAST_CHECKED_URL_FILE, url, 'utf8');
        console.log(`[DEBUG] setLastCheckedUrl: 마지막 확인 URL 저장 완료: ${url}`);
    } catch (error) {
        console.error(`[ERROR] setLastCheckedUrl: 마지막 확인 URL 파일 쓰기 오류: ${error.message}`);
    }
}

/**
 * 넥슨 API에서 최신 메이플스토리 공지사항 정보를 가져옵니다.
 */
async function getLatestMapleStoryAnnouncementFromAPI() {
    if (!NEXON_API_KEY) {
        console.error('MAPLE_API 환경 변수가 설정되지 않았습니다.');
        return null;
    }
    try {
        const response = await axios.get(MAPLESTORY_NOTICE_API_URL, {
            headers: NEXON_API_HEADERS,
        });

        if (response.data && response.data.notice && response.data.notice.length > 0) {
            const latestNotice = response.data.notice[0];
            return {
                title: latestNotice.title,
                url: latestNotice.url,
                date: latestNotice.date
            };
        } else {
            console.warn('공지사항 API에서 유효한 응답을 받지 못했습니다.');
            return null;
        }
    } catch (error) {
        console.error('메이플스토리 공지사항 API 호출 오류:', error.response ? error.response.data : error.message);
        return null;
    }
}

/**
 * Discord 웹훅으로 알림 메시지를 보냅니다.
 */
async function sendDiscordWebhook(announcement) {
    if (!DISCORD_WEBHOOK_URL) {
        console.error('DISCORD_WEBHOOK_URL 환경 변수가 설정되지 않았습니다.');
        return;
    }

    const embed = {
        color: 0xFFA500, // 주황색
        title: `📢 새로운 메이플스토리 공지사항: ${announcement.title}`,
        url: announcement.url,
        description: '메이플스토리 공식 홈페이지에 새로운 공지사항이 등록되었습니다.',
        fields: [
            { name: '제목', value: announcement.title },
            { name: '바로가기', value: `[공지사항 링크](${announcement.url})` }
        ],
        timestamp: new Date().toISOString(),
        footer: {
            text: 'Data based on Nexon Open API',
        }
    };

    try {
        await axios.post(DISCORD_WEBHOOK_URL, {
            embeds: [embed]
        });
        console.log(`Discord 웹훅으로 공지사항 전송 완료: "${announcement.title}"`);
    } catch (error) {
        console.error('Discord 웹훅 전송 오류:', error.response ? error.response.data : error.message);
    }
}

// --- 메인 실행 로직 ---
async function main() {
    console.log('GitHub Actions: 메이플스토리 공지사항 확인 시작...');

    const lastCheckedUrl = getLastCheckedUrl();
    const latestAnnouncement = await getLatestMapleStoryAnnouncementFromAPI();

    if (!latestAnnouncement) {
        console.log('최신 공지사항을 가져오지 못했습니다. 스크립트 종료.');
        return;
    }

    if (lastCheckedUrl === null) {
        // 첫 실행이거나 파일이 없는 경우, 현재 최신 URL을 저장하고 알림은 보내지 않습니다.
        console.log('[INFO] last_checked_announcement_url.txt 파일이 없거나 첫 실행입니다. 현재 공지사항 URL을 저장합니다.');
        setLastCheckedUrl(latestAnnouncement.url);
    } else if (latestAnnouncement.url !== lastCheckedUrl) {
        // 새로운 공지사항이 발견된 경우
        console.log(`[INFO] 새로운 공지사항 발견! 이전: ${lastCheckedUrl}, 현재: ${latestAnnouncement.url}`);
        await sendDiscordWebhook(latestAnnouncement);
        setLastCheckedUrl(latestAnnouncement.url); // 새로운 URL로 업데이트
    } else {
        console.log('[INFO] 새로운 공지사항이 없습니다.');
    }
    console.log('GitHub Actions: 메이플스토리 공지사항 확인 완료.');
}

main();
