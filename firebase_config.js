// firebase_config.js (CommonJS 형식으로 업데이트된 내용)

const { initializeApp } = require("firebase/app");
const { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } = require("firebase/auth");
const { getFirestore } = require("firebase/firestore");

// Canvas 환경(__app_id, __firebase_config)이 제공되지 않을 경우를 대비하여
// 로컬 개발/테스트를 위해 여기에 직접 Firebase 설정 객체를 붙여넣습니다.
// ** Firebase 콘솔에서 복사한 YOUR_FIREBASE_CONFIG_OBJECT 로 교체하세요 **
const firebaseConfig = {
  apiKey: "AIzaSyC_YOUR_API_KEY", // 실제 키로 교체
  authDomain: "your-project-id.firebaseapp.com", // 실제 도메인으로 교체
  projectId: "your-project-id", // 실제 프로젝트 ID로 교체
  storageBucket: "your-project-id.appspot.com", // 실제 버킷으로 교체
  messagingSenderId: "YOUR_SENDER_ID", // 실제 ID로 교체
  appId: "1:YOUR_APP_ID:web:YOUR_WEB_APP_ID", // 실제 앱 ID로 교체
  // measurementId: "G-YOUR_MEASUREMENT_ID" // 애널리틱스 사용 시 포함
};

// Canvas 환경 변수 우선 사용 (배포 환경)
const appId = typeof __app_id !== 'undefined' ? __app_id : firebaseConfig.projectId;

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 인증 상태 변화 리스너 설정
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Firebase Auth: User is signed in.", user.uid);
    } else {
        console.log("Firebase Auth: No user is signed in.");
    }
});

// Firestore에 익명 또는 커스텀 토큰으로 로그인
async function initializeAuth() {
    try {
        if (typeof __initial_auth_token !== 'undefined') {
            await signInWithCustomToken(auth, __initial_auth_token);
            console.log("Firebase Auth: Signed in with custom token.");
        } else {
            await signInAnonymously(auth);
            console.log("Firebase Auth: Signed in anonymously.");
        }
    } catch (error) {
        console.error("Firebase Auth 초기화 오류:", error);
    }
}

initializeAuth(); // 인증 초기화 함수 호출

module.exports = {
    db,
    auth,
    appId
};