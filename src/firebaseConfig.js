// ============================================================
// 🔥 Firebase 설정 (온라인 공유 랭킹)
// ------------------------------------------------------------
// Firebase 콘솔 > 프로젝트 설정 > 내 앱(웹) 에서 받은 값을 붙여넣으세요.
// projectId 가 비어 있으면 각 기기에만 저장되는 로컬 랭킹으로 동작합니다.
// (이 값들은 웹 앱에 공개되는 식별자이므로 커밋해도 안전합니다.
//  접근 제한은 firestore.rules 로 합니다.)
// ============================================================
const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

export default firebaseConfig;
