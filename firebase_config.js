// firebase_config.js (CommonJS 형식으로 업데이트된 내용)

const { initializeApp } = require("firebase/app");
const { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } = require("firebase/auth");
const { getFirestore } = require("firebase/firestore");

// env
const firebaseConfig = {
  apiKey: process.env.FB_apiKey,
  authDomain: process.env.FB_authDomain,
  projectId: process.env.FB_projectId,
  storageBucket: process.env.FB_storageBucket,
  messagingSenderId: process.env.FB_messagingSenderId,
  appId: process.env.FB_appId,
  measurementId: process.env.FB_measurementId
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