// ============================================================
// 🏆 명예의 전당 - 학생별 누적 점수 랭킹
// ------------------------------------------------------------
// - 모든 플레이 기록은 이 기기의 localStorage 에 빠짐없이 누적 저장
// - Firebase 설정이 있으면 온라인(Firestore)에도 학생별 누적 점수를 더해
//   모든 태블릿이 같은 랭킹을 보게 됨
// - 화면에는 누적 점수 상위 5명만 표시
// ============================================================
import firebaseConfig from './firebaseConfig.js';

const LOCAL_KEY = 'digestion_beat_leaderboard';
const LOCAL_MAX = 5000; // 저장 공간 보호용 상한 (약 0.5MB, 한 기기에서 사실상 도달하지 않음)
export const TOP_N = 5;

export const isOnlineRanking = Boolean(firebaseConfig.projectId);

// --- 로컬 기록 ---
export const loadLocalRecords = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

const saveLocalRecords = (records) => {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(records.slice(-LOCAL_MAX))); } catch { /* */ }
};

// 기록 목록 → 학생(별명)별 누적 점수 상위 N명
export const aggregateTop = (records, n = TOP_N) => {
  const byName = new Map();
  records.forEach(r => {
    const name = (r.nickname || '익명').trim();
    const cur = byName.get(name) || { nickname: name, totalScore: 0, plays: 0 };
    cur.totalScore += Number(r.score) || 0;
    cur.plays += 1;
    byName.set(name, cur);
  });
  return [...byName.values()].sort((a, b) => b.totalScore - a.totalScore).slice(0, n);
};

// --- 온라인 (Firestore) ---
let dbPromise = null;
const getDb = () => {
  if (!isOnlineRanking) return null;
  if (!dbPromise) {
    dbPromise = (async () => {
      const { initializeApp } = await import('firebase/app');
      const fs = await import('firebase/firestore');
      const app = initializeApp(firebaseConfig);
      let db;
      try {
        // 네트워크가 끊겨도 기록이 기기에 보관됐다가 연결되면 자동 전송
        db = fs.initializeFirestore(app, {
          localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
        });
      } catch {
        db = fs.getFirestore(app);
      }
      return { db, fs };
    })();
  }
  return dbPromise;
};

// 별명을 문서 ID로 안전하게 변환 ('/' 등 금지 문자 처리)
const playerDocId = (name) => encodeURIComponent(name.trim()).replace(/\./g, '%2E');

// 점수 기록: 로컬에 항상 저장 + 온라인이면 학생 누적 점수에 더함
export const recordScore = (entry) => {
  const records = [...loadLocalRecords(), entry];
  saveLocalRecords(records);

  const dbP = getDb();
  if (dbP) {
    dbP.then(({ db, fs }) => {
      const ref = fs.doc(db, 'players', playerDocId(entry.nickname));
      return fs.setDoc(ref, {
        nickname: entry.nickname,
        totalScore: fs.increment(entry.score),
        plays: fs.increment(1),
        updatedAt: fs.serverTimestamp(),
      }, { merge: true });
    }).catch(e => console.warn('온라인 랭킹 저장 실패 (로컬에는 저장됨):', e));
  }
  return records;
};

// 온라인 상위 N명 실시간 구독. 반환값: 구독 해제 함수
export const subscribeOnlineTop = (onChange, onError) => {
  const dbP = getDb();
  if (!dbP) return () => {};
  let unsub = () => {};
  let cancelled = false;
  dbP.then(({ db, fs }) => {
    if (cancelled) return;
    const q = fs.query(fs.collection(db, 'players'), fs.orderBy('totalScore', 'desc'), fs.limit(TOP_N));
    unsub = fs.onSnapshot(q, snap => {
      onChange(snap.docs.map(d => {
        const v = d.data();
        return { nickname: v.nickname, totalScore: v.totalScore || 0, plays: v.plays || 0 };
      }));
    }, err => onError?.(err));
  }).catch(err => onError?.(err));
  return () => { cancelled = true; unsub(); };
};
