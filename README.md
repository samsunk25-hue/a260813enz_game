# 소화 콤보 비트 (Digestion Combo Beat)

중학교 과학 소화기관·소화 효소 학습용 리듬 액션 게임입니다.

- 사이트: https://samsunk25-hue.github.io/a260813enz_game/
- 개발 서버: `npm run dev` / 배포: `npm run deploy` (GitHub Pages)

## 명예의 전당 (누적 점수 TOP 5)

학생이 "랭킹에 점수 등록"을 누를 때마다 그 점수가 학생(별명)별 **누적 점수**에 더해지고,
누적 점수 상위 5명이 명예의 전당에 표시됩니다. 기록은 지워지지 않고 계속 쌓입니다.

- 모든 태블릿의 점수가 온라인(Firebase Firestore, 프로젝트 `enz-combo-beat`, 서울 리전)에 모여
  모든 사용자가 같은 순위를 실시간으로 봅니다.
- 인터넷이 잠시 끊겨도 기록은 태블릿에 보관됐다가 연결되면 자동으로 전송됩니다.
- 온라인 도입 전에 각 태블릿에 저장돼 있던 기록은 그 태블릿에서 게임을 처음 열 때 한 번 자동으로 올라갑니다.

> 같은 별명은 같은 학생으로 합산됩니다. 학생마다 서로 다른 별명(예: 번호+이름)을 쓰게 해 주세요.

### 관리

- 기록 확인/삭제: https://console.firebase.google.com/project/enz-combo-beat/firestore (`players` 컬렉션)
- 보안 규칙: [`firestore.rules`](firestore.rules) — 점수는 더하기만 가능, 학생 화면에서 삭제·감소 불가.
  수정 후 `firebase deploy --only firestore:rules`
- 앱 설정값: [`src/firebaseConfig.js`](src/firebaseConfig.js)

무료 요금제(Spark) 한도(하루 읽기 5만, 쓰기 2만 회)는 한 학급 수업에 충분합니다.
