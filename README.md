# 소화 콤보 비트 (Digestion Combo Beat)

중학교 과학 소화기관·소화 효소 학습용 리듬 액션 게임입니다.

- 사이트: https://samsunk25-hue.github.io/a260813enz_game/
- 개발 서버: `npm run dev` / 배포: `npm run deploy` (GitHub Pages)

## 명예의 전당 (누적 점수 TOP 5)

학생이 "랭킹에 점수 등록"을 누를 때마다 그 점수가 학생(별명)별 **누적 점수**에 더해지고,
누적 점수 상위 5명이 명예의 전당에 표시됩니다. 기록은 지워지지 않고 계속 쌓입니다.

- **Firebase 설정 전:** 각 태블릿에만 저장됩니다(그 태블릿을 쓴 학생들끼리의 순위).
- **Firebase 설정 후:** 모든 태블릿의 점수가 한곳에 모여 반 전체 순위가 실시간으로 표시됩니다.
  인터넷이 잠시 끊겨도 기록은 태블릿에 보관됐다가 연결되면 자동으로 전송됩니다.

> 같은 별명은 같은 학생으로 합산됩니다. 학생마다 서로 다른 별명(예: 번호+이름)을 쓰게 해 주세요.

### 온라인 공유 랭킹 켜기 (Firebase, 무료)

1. https://console.firebase.google.com 에서 Google 계정으로 로그인 → **프로젝트 추가** (Google 애널리틱스는 꺼도 됨)
2. 왼쪽 메뉴 **빌드 > Firestore Database** → **데이터베이스 만들기** → 위치 `asia-northeast3 (서울)` → **프로덕션 모드**
3. Firestore의 **규칙** 탭에 이 저장소의 [`firestore.rules`](firestore.rules) 내용을 붙여넣고 **게시**
4. **프로젝트 설정(톱니바퀴) > 내 앱 > 웹(`</>`)** 으로 앱 등록 → 나오는 `firebaseConfig` 값을
   [`src/firebaseConfig.js`](src/firebaseConfig.js)에 붙여넣기
5. 다시 배포 (`npm run deploy`) → 명예의 전당에 "🌐 전체 태블릿 공유"가 표시되면 완료

무료 요금제(Spark) 한도(하루 읽기 5만, 쓰기 2만 회)는 한 학급 수업에 충분합니다.
