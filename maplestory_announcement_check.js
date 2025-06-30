// maplestory_announcement_check.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const NEXON_API_KEY = process.env.MAPLE_API;
const BOT_NOTIFICATION_URL = process.env.BOT_NOTIFICATION_URL; 
const BOT_NOTIFICATION_SECRET = process.env.BOT_NOTIFICATION_SECRET;


const MAPLESTORY_NOTICE_API_URL = 'https://open.api.nexon.com/maplestory/v1/notice';
const MAPLESTORY_EVENT_API_URL = 'https://open.api.nexon.com/maplestory/v1/notice-event';
const MAPLESTORY_UPDATE_API_URL = 'https://open.api.nexon.com/maplestory/v1/notice-update'; // *업데이트 공지 API URL
const MAPLESTORY_CASHSHOP_API_URL = 'https://open.api.nexon.com/maplestory/v1/notice-cashshop'; // *캐시샵 공지 API URL

const LAST_CHECKED_NOTICE_URL_FILE = 'last_checked_announcement_url.txt';
const LAST_CHECKED_EVENT_URL_FILE = 'last_checked_event_url.txt';
const LAST_CHECKED_UPDATE_URL_FILE = 'last_checked_update_url.txt'; // *업데이트 공지 마지막 확인 URL 파일
const LAST_CHECKED_CASHSHOP_URL_FILE = 'last_checked_cashshop_url.txt'; // *캐시샵 공지 마지막 확인 URL 파일

// 넥슨 API 헤더 설정
const NEXON_API_HEADERS = {
    'x-nxopen-api-key': NEXON_API_KEY,
};

/**
 * 특정 파일에서 마지막으로 확인한 URL을 읽어옵니다.
 */
function getLastCheckedUrl(filePath) { // *함수 일반화
    console.log(`[DEBUG] getLastCheckedUrl: ${filePath} 파일 존재 여부 확인...`);
    try {
        if (fs.existsSync(filePath)) {
            const url = fs.readFileSync(filePath, 'utf8').trim();
            console.log(`[DEBUG] getLastCheckedUrl: 파일에서 URL 읽기 성공: ${url}`);
            return url;
        } else {
            console.log(`[DEBUG] getLastCheckedUrl: ${filePath} 파일이 존재하지 않습니다.`);
        }
    } catch (error) {
        console.error(`[ERROR] getLastCheckedUrl: 마지막 확인 URL 파일 읽기 오류 (${filePath}): ${error.message}`);
    }
    return null;
}

/**
 * 특정 파일에 마지막으로 확인한 URL을 저장합니다.
 */
function setLastCheckedUrl(filePath, url) { // *함수 일반화
    console.log(`[DEBUG] setLastCheckedUrl: ${filePath} 파일에 URL 저장 시도: ${url}`);
    try {
        fs.writeFileSync(filePath, url, 'utf8');
        console.log(`[DEBUG] setLastCheckedUrl: 마지막 확인 URL 저장 완료: ${url}`);
    } catch (error) {
        console.error(`[ERROR] setLastCheckedUrl: 마지막 확인 URL 파일 쓰기 오류 (${filePath}): ${error.message}`);
    }
}

async function getLatestMapleStoryNoticeFromAPI() {
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
                date: latestNotice.date,
                type: 'notice'
            };
        } else {
            console.warn('일반 공지사항 API에서 유효한 응답을 받지 못했습니다.');
            return null;
        }
    } catch (error) {
        console.error('메이플스토리 일반 공지사항 API 호출 오류:', error.response ? error.response.data : error.message);
        return null;
    }
}

async function getLatestMapleStoryEventFromAPI() {
    if (!NEXON_API_KEY) {
        console.error('MAPLE_API 환경 변수가 설정되지 않았습니다.');
        return null;
    }
    try {
        const response = await axios.get(MAPLESTORY_EVENT_API_URL, {
            headers: NEXON_API_HEADERS,
        });

        if (response.data && response.data.event_notice && response.data.event_notice.length > 0) {
            const latestEvent = response.data.event_notice[0];
            return {
                title: latestEvent.title,
                url: latestEvent.url,
                date: latestEvent.date,
                type: 'event'
            };
        } else {
            console.warn('이벤트 공지사항 API에서 유효한 응답을 받지 못했습니다.');
            return null;
        }
    } catch (error) {
        console.error('메이플스토리 이벤트 공지사항 API 호출 오류:', error.response ? error.response.data : error.message);
        return null;
    }
}

async function getLatestMapleStoryUpdateFromAPI() { // *최신 업데이트 공지사항 API 호출 함수
    if (!NEXON_API_KEY) {
        console.error('MAPLE_API 환경 변수가 설정되지 않았습니다.');
        return null;
    }
    try {
        const response = await axios.get(MAPLESTORY_UPDATE_API_URL, {
            headers: NEXON_API_HEADERS,
        });

        if (response.data && response.data.update_notice && response.data.update_notice.length > 0) {
            const latestUpdate = response.data.update_notice[0];
            return {
                title: latestUpdate.title,
                url: latestUpdate.url,
                date: latestUpdate.date,
                type: 'update' // *업데이트 공지 타입 지정
            };
        } else {
            console.warn('업데이트 공지사항 API에서 유효한 응답을 받지 못했습니다.');
            return null;
        }
    } catch (error) {
        console.error('메이플스토리 업데이트 공지사항 API 호출 오류:', error.response ? error.response.data : error.message);
        return null;
    }
}

async function getLatestMapleStoryCashshopFromAPI() { // *최신 캐시샵 공지사항 API 호출 함수
    if (!NEXON_API_KEY) {
        console.error('MAPLE_API 환경 변수가 설정되지 않았습니다.');
        return null;
    }
    try {
        const response = await axios.get(MAPLESTORY_CASHSHOP_API_URL, {
            headers: NEXON_API_HEADERS,
        });

        if (response.data && response.data.cashshop_notice && response.data.cashshop_notice.length > 0) {
            const latestCashshop = response.data.cashshop_notice[0];
            return {
                title: latestCashshop.title,
                url: latestCashshop.url,
                date: latestCashshop.date,
                type: 'cashshop' // *캐시샵 공지 타입 지정
            };
        } else {
            console.warn('캐시샵 공지사항 API에서 유효한 응답을 받지 못했습니다.');
            return null;
        }
    } catch (error) {
        console.error('메이플스토리 캐시샵 공지사항 API 호출 오류:', error.response ? error.response.data : error.message);
        return null;
    }
}

async function sendNotificationToBot(announcement) {
    if (!BOT_NOTIFICATION_URL) {
        console.error('BOT_NOTIFICATION_URL 환경 변수가 설정되지 않았습니다.');
        return;
    }
    if (!BOT_NOTIFICATION_SECRET) {
        console.error('BOT_NOTIFICATION_SECRET 환경 변수가 설정되지 않았습니다.');
        return;
    }

    console.log(`[DEBUG] Sending to bot: BOT_NOTIFICATION_SECRET length: ${BOT_NOTIFICATION_SECRET.length}, first 5 chars: ${BOT_NOTIFICATION_SECRET.substring(0, 5)}`);

    try {
        await axios.post(BOT_NOTIFICATION_URL, announcement, {
            headers: {
                'Content-Type': 'application/json',
                'x-notification-secret': BOT_NOTIFICATION_SECRET
            }
        });
        console.log(`Discord 봇 API로 알림 전송 완료: "${announcement.title}" (타입: ${announcement.type})`);
    } catch (error) {
        console.error('Discord 봇 API 전송 오류:', error.response ? error.response.data : error.message);
        if (error.response) {
            console.error('봇 API 응답 상태:', error.response.status);
            console.error('봇 API 응답 데이터:', error.response.data);
        }
    }
}

// *공지사항 체크 및 알림 전송을 일반화한 헬퍼 함수
async function checkAndNotify(apiFetcher, lastCheckedFile, typeName) {
    console.log(`[INFO] ${typeName} 공지사항 확인 시작...`);
    const lastCheckedUrl = getLastCheckedUrl(lastCheckedFile);
    const latestAnnouncement = await apiFetcher();

    if (!latestAnnouncement) {
        console.log(`[INFO] ${typeName} 공지사항을 가져오지 못했습니다. (API 에러 또는 데이터 없음)`);
    } else if (lastCheckedUrl === null) {
        console.log(`[INFO] ${lastCheckedFile} 파일이 없거나 첫 실행입니다. 현재 ${typeName} 공지사항 URL을 저장합니다.`);
        setLastCheckedUrl(lastCheckedFile, latestAnnouncement.url);
    } else if (latestAnnouncement.url !== lastCheckedUrl) {
        console.log(`[INFO] 새로운 ${typeName} 공지사항 발견! 이전: ${lastCheckedUrl}, 현재: ${latestAnnouncement.url}`);
        await sendNotificationToBot(latestAnnouncement);
        setLastCheckedUrl(lastCheckedFile, latestAnnouncement.url);
    } else {
        console.log(`[INFO] 새로운 ${typeName} 공지사항이 없습니다.`);
    }
}

// --- 메인 실행 로직 ---
async function main() {
    console.log('GitHub Actions: 모든 메이플스토리 공지사항 확인 시작...');

    await checkAndNotify(getLatestMapleStoryNoticeFromAPI, LAST_CHECKED_NOTICE_URL_FILE, '일반'); // *일반 공지사항 확인
    await checkAndNotify(getLatestMapleStoryEventFromAPI, LAST_CHECKED_EVENT_URL_FILE, '이벤트'); // *이벤트 공지사항 확인
    await checkAndNotify(getLatestMapleStoryUpdateFromAPI, LAST_CHECKED_UPDATE_URL_FILE, '업데이트'); // *업데이트 공지사항 확인
    await checkAndNotify(getLatestMapleStoryCashshopFromAPI, LAST_CHECKED_CASHSHOP_URL_FILE, '캐시샵'); // *캐시샵 공지사항 확인

    console.log('GitHub Actions: 모든 메이플스토리 공지사항 확인 완료.');
}

main();
