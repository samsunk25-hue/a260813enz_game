import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, RotateCcw, Heart, Zap, Trophy, CheckCircle2, XCircle, ArrowDown, Medal, BookOpen } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, onSnapshot } from 'firebase/firestore';

// Firebase 초기화
let db, auth, appId;
try {
  const firebaseConfig = JSON.parse(__firebase_config);
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
} catch (e) {
  // 로컬 테스트 환경 예외 처리
}

// 소화기관 위치 및 라벨
const TARGET_ZONES = {
  mouth: { y: 30, label: '입' },
  stomach: { y: 60, label: '위' },
  intestine: { y: 85, label: '작은창자' }
};

// 💡 대표 음식 이모지 및 과학적 용어 적용된 퀴즈 데이터
const QUIZ_DATA = [
  { id: 1, organ: 'mouth', nutrient: '녹말', answer: 'amylase', color: 'bg-indigo-500', emoji: '🍞' },
  { id: 2, organ: 'stomach', nutrient: '단백질', answer: 'pepsin', color: 'bg-teal-500', emoji: '🥩' },
  { id: 3, organ: 'intestine', nutrient: '녹말 (남은 녹말)', answer: 'amylase', color: 'bg-indigo-500', emoji: '🍙' },
  { id: 4, organ: 'intestine', nutrient: '단백질 (중간 산물)', answer: 'trypsin', color: 'bg-teal-500', emoji: '🥓' },
  { id: 5, organ: 'intestine', nutrient: '유화된 지방', answer: 'lipase', color: 'bg-rose-400', emoji: '🧈' },
];

const ENZYMES = [
  { id: 'amylase', name: '아밀레이스', color: 'bg-cyan-600' },
  { id: 'pepsin', name: '펩신', color: 'bg-violet-600' },
  { id: 'trypsin', name: '트립신', color: 'bg-sky-600' },
  { id: 'bile', name: '쓸개즙', color: 'bg-orange-600 text-white' },
  { id: 'lipase', name: '라이페이스', color: 'bg-pink-600' },
];

const STAGE_CONFIGS = {
  1: { speed: 0.12, targetCount: 5, name: '1단계: 입문' },
  2: { speed: 0.16, targetCount: 8, name: '2단계: 초급' },
  3: { speed: 0.20, targetCount: 12, name: '3단계: 중급' },
  4: { speed: 0.25, targetCount: 15, name: '4단계: 상급' },
  5: { speed: 0.32, targetCount: 20, name: '5단계: 마스터 (하드)' },
};

const getRandomQuiz = () => {
  const q = QUIZ_DATA[Math.floor(Math.random() * QUIZ_DATA.length)];
  return { ...q, targetY: TARGET_ZONES[q.organ].y };
};

// 장기 일러스트 SVG (표정 제거)
const DigestiveBackground = () => (
  <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-40 z-0" preserveAspectRatio="none">
    <path d="M50,0 L50,100" stroke="#475569" strokeWidth="8" strokeLinecap="round" strokeDasharray="2 4" />
    <ellipse cx="50" cy="30" rx="15" ry="8" fill="#f8d7da" stroke="#dc3545" strokeWidth="2" />
    <text x="30" y="32" fill="#dc3545" fontSize="5" fontWeight="bold">입</text>
    <path d="M50,55 C35,55 35,65 50,65 C60,65 60,55 50,55 Z" fill="#fff3cd" stroke="#ffc107" strokeWidth="2" />
    <text x="30" y="62" fill="#d39e00" fontSize="5" fontWeight="bold">위</text>
    <path d="M55,75 Q65,75 65,82 Q55,85 45,80 Z" fill="#e2e3e5" stroke="#6c757d" strokeWidth="1" />
    <path d="M50,85 Q60,88 50,90 Q40,92 50,95" fill="none" stroke="#d4edda" strokeWidth="6" strokeLinecap="round" />
    <text x="22" y="90" fill="#28a745" fontSize="5" fontWeight="bold">작은창자</text>
  </svg>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState('start'); 
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(3);
  const [combo, setCombo] = useState(0);
  
  const [stage, setStage] = useState(1);
  const [clearedCount, setClearedCount] = useState(0);

  const [activeItem, setActiveItem] = useState(null);
  const [nextItem, setNextItem] = useState(null);
  const [dropY, setDropY] = useState(-20);
  const [isWaiting, setIsWaiting] = useState(true);
  const [feedback, setFeedback] = useState(null); 
  
  const [nickname, setNickname] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [isSaved, setIsSaved] = useState(false);

  const requestRef = useRef();
  const waitTimerRef = useRef();

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error(e);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    try {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'rankings'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = [];
        snapshot.forEach((doc) => doc.data() && docs.push(doc.data()));
        docs.sort((a, b) => b.score - a.score);
        setLeaderboard(docs.slice(0, 5));
      }, (error) => console.error(error));
      return () => unsubscribe();
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const startNextItem = useCallback(() => {
    if (!nextItem) return;
    setActiveItem(nextItem);
    setNextItem(getRandomQuiz());
    setDropY(-20); 
    setIsWaiting(true);
    setFeedback(null);

    clearTimeout(waitTimerRef.current);
    waitTimerRef.current = setTimeout(() => {
      setIsWaiting(false);
    }, 1000);
  }, [nextItem]);

  const startStage = (targetStage) => {
    setStage(targetStage);
    setClearedCount(0);
    setIsSaved(false);

    const initialActive = getRandomQuiz();
    const initialNext = getRandomQuiz();
    setActiveItem(initialActive);
    setNextItem(initialNext);
    setDropY(-20);
    setIsWaiting(true);
    
    setGameState('playing');

    clearTimeout(waitTimerRef.current);
    waitTimerRef.current = setTimeout(() => {
      setIsWaiting(false);
    }, 1000);
  };

  const startGame = () => {
    setScore(0);
    setHealth(3);
    setCombo(0);
    startStage(1);
  };

  const updateLoop = useCallback(() => {
    if (gameState !== 'playing' || !activeItem || isWaiting) return;

    const currentSpeed = STAGE_CONFIGS[stage].speed;

    setDropY((prevY) => {
      const nextY = prevY + currentSpeed;
      if (nextY > activeItem.targetY + 15) {
        handleMiss();
        return prevY; 
      }
      return nextY;
    });

    requestRef.current = requestAnimationFrame(updateLoop);
  }, [gameState, activeItem, isWaiting, stage]);

  useEffect(() => {
    if (gameState === 'playing' && !feedback) {
      requestRef.current = requestAnimationFrame(updateLoop);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [updateLoop, gameState, feedback, isWaiting]);

  const handleHit = (enzymeId) => {
    if (!activeItem || feedback || isWaiting) return;

    const distance = Math.abs(dropY - activeItem.targetY);
    if (distance <= 10) {
      if (enzymeId === activeItem.answer) {
        cancelAnimationFrame(requestRef.current);
        setFeedback({ type: 'hit', y: dropY });
        setScore(s => s + 100 + (combo * 10));
        setCombo(c => c + 1);

        const newCleared = clearedCount + 1;
        setClearedCount(newCleared);

        if (newCleared >= STAGE_CONFIGS[stage].targetCount) {
          setTimeout(() => {
            if (stage >= 5) {
              setGameState('victory');
            } else {
              setGameState('stageclear');
            }
          }, 600);
        } else {
          setTimeout(startNextItem, 500);
        }
      } else {
        handleMiss();
      }
    }
  };

  const handleMiss = () => {
    cancelAnimationFrame(requestRef.current);
    setFeedback({ type: 'miss', y: dropY });
    setCombo(0);
    setHealth(h => {
      const newHealth = h - 1;
      if (newHealth <= 0) {
        setTimeout(() => setGameState('gameover'), 800);
      } else {
        setTimeout(startNextItem, 800);
      }
      return newHealth;
    });
  };

  const saveScoreToLeaderboard = async (e) => {
    e.preventDefault();
    if (!nickname.trim() || !user || isSaved) return;

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'rankings'), {
        nickname: nickname.trim(),
        score: score,
        date: new Date().toLocaleDateString()
      });
      setIsSaved(true);
      setGameState('ranking');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col items-center justify-center p-4 select-none">
      
      <div className="w-full max-w-md flex justify-between items-center mb-4 px-2">
        <div className="flex space-x-1 text-red-500 w-20">
          {[1, 2, 3].map(i => (
            <Heart key={i} size={20} fill={i <= health ? "currentColor" : "none"} className={i <= health ? "animate-pulse" : "text-slate-700"} />
          ))}
        </div>
        <div className="text-center flex-1">
          <div className="text-xs text-amber-400 font-bold uppercase tracking-wider">{STAGE_CONFIGS[stage]?.name}</div>
          <div className="text-2xl font-black text-white font-mono">{score.toString().padStart(5, '0')}</div>
        </div>
        <div className="text-right w-20">
          <div className="text-[10px] text-slate-400 font-bold">진행도: {clearedCount}/{STAGE_CONFIGS[stage]?.targetCount}</div>
        </div>
      </div>

      <div className={`w-full max-w-md h-[65vh] min-h-[450px] bg-slate-800 rounded-2xl shadow-2xl border-4 relative overflow-hidden transition-colors ${
        feedback?.type === 'miss' ? 'border-red-500 bg-red-950/30' : 'border-slate-700'
      }`}>
        
        {/* NEXT 미리보기 창 */}
        {gameState === 'playing' && nextItem && (
          <div className="absolute top-4 right-4 bg-slate-900/80 p-2 rounded-xl border-2 border-slate-600 z-40 flex flex-col items-center shadow-lg backdrop-blur-sm">
            <span className="text-[10px] text-slate-400 font-bold mb-1 tracking-widest">NEXT</span>
            <div className="w-8 h-8 flex items-center justify-center bg-white shadow-sm rounded-full text-xl">
               {nextItem.emoji}
            </div>
            <span className="text-[9px] font-bold mt-1 text-slate-300 text-center max-w-[80px] truncate">{nextItem.nutrient}</span>
          </div>
        )}

        {/* 메인 시작 화면 */}
        {gameState === 'start' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 z-50 p-6 text-center backdrop-blur-sm">
            <Zap size={48} className="text-amber-400 mb-4 animate-bounce" />
            <h1 className="text-3xl font-black mb-2">소화 콤보 비트</h1>
            <p className="text-slate-300 text-sm mb-6 break-keep leading-relaxed">
              교과서 영양소 소화 과정을 리듬 액션으로 완벽 마스터하세요!
            </p>
            <div className="flex flex-col space-y-3 w-full max-w-xs">
              <button onClick={() => setGameState('guide')} className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-3 px-6 rounded-full text-base shadow-[0_0_15px_rgba(245,158,11,0.5)] active:scale-95 transition-transform flex items-center justify-center">
                <BookOpen size={18} className="mr-2" /> 사전 학습 (요약 가이드)
              </button>
              <button onClick={startGame} className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 px-6 rounded-full text-base shadow-lg active:scale-95 transition-transform flex items-center justify-center">
                <Play size={18} className="mr-2" /> 바로 게임 시작
              </button>
              <button onClick={() => setGameState('ranking')} className="text-slate-400 hover:text-white text-xs underline mt-2">
                명예의 전당 보기
              </button>
            </div>
          </div>
        )}

        {/* 사전 학습 요약 가이드 화면 */}
        {gameState === 'guide' && (
          <div className="absolute inset-0 flex flex-col bg-slate-900 z-50 p-5 overflow-y-auto text-left">
            <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
              <h2 className="text-lg font-black text-amber-400 flex items-center">
                <BookOpen size={20} className="mr-2" /> 소화기관 및 효소 요약 가이드
              </h2>
              <button onClick={() => setGameState('start')} className="text-slate-400 hover:text-white text-xs bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                닫기 ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed pb-6">
              <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                <strong className="text-amber-300 block mb-1">1. 입 (아밀레이스)</strong>
                <p>음식을 씹는 과정에서 침 속의 <strong>아밀레이스</strong>가 분비되어 <strong>녹말 🍞</strong>을 엿당으로 분해합니다.</p>
              </div>

              <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                <strong className="text-amber-300 block mb-1">2. 위 (펩신)</strong>
                <p>위액에서 분비되는 <strong>펩신</strong>이 작용하여 <strong>단백질 🥩</strong>을 중간 산물로 분해합니다.</p>
              </div>

              <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                <strong className="text-amber-300 block mb-1">3. 작은창자 (이자액 & 쓸개즙)</strong>
                <ul className="list-disc pl-4 space-y-1.5 mt-1">
                  <li><strong>녹말 분해:</strong> 이자액의 <strong>아밀레이스</strong>가 남은 녹말 🍙을 포도당으로 분해합니다.</li>
                  <li><strong>단백질 분해:</strong> 이자액의 <strong>트립신</strong>이 단백질 중간 산물 🥓을 아미노산으로 분해합니다.</li>
                  <li><strong>지방 분해:</strong> 쓸개즙이 지방을 <strong>유화된 지방</strong>으로 만들고, 이자액의 <strong>라이페이스</strong>가 지방산과 모노글리세리드 🧈로 분해합니다.</li>
                </ul>
              </div>
            </div>

            <button onClick={startGame} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 rounded-xl text-sm shadow-lg active:scale-95 transition-transform mt-auto">
              준비 완료! 게임 시작하기 🚀
            </button>
          </div>
        )}

        {/* 스테이지 클리어 */}
        {gameState === 'stageclear' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 z-50 p-6 text-center backdrop-blur-sm">
            <Trophy size={48} className="text-amber-400 mb-2 animate-bounce" />
            <h2 className="text-2xl font-black mb-1 text-amber-400">{STAGE_CONFIGS[stage].name} 클리어!</h2>
            <p className="text-slate-300 text-sm mb-6">다음 단계로 이동합니다.</p>
            <button onClick={() => startStage(stage + 1)} className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 px-8 rounded-full text-lg shadow-lg active:scale-95 transition-transform">
              {stage + 1}단계 도전하기
            </button>
          </div>
        )}

        {/* 빅토리 (올클리어) */}
        {gameState === 'victory' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 z-50 p-6 text-center backdrop-blur-sm">
            <Trophy size={56} className="text-yellow-400 mb-2 animate-bounce" />
            <h1 className="text-3xl font-black mb-1 text-yellow-400">VICTORY!</h1>
            <p className="text-slate-200 text-sm mb-4">모든 5단계를 완벽하게 클리어했습니다!</p>
            <p className="text-xl mb-6 font-mono font-bold text-amber-400">최종 점수: {score}점</p>
            
            {!isSaved ? (
              <form onSubmit={saveScoreToLeaderboard} className="w-full flex flex-col space-y-3 px-4">
                <input 
                  type="text" 
                  placeholder="닉네임 입력" 
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={10}
                  className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-center text-white focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                  required
                />
                <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-2.5 rounded-xl text-sm transition-transform active:scale-95">
                  랭킹에 점수 등록하기
                </button>
              </form>
            ) : (
              <div className="flex flex-col space-y-2 w-full px-4">
                <button onClick={() => setGameState('ranking')} className="bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-sm">
                  랭킹 확인하기
                </button>
                <button onClick={() => setGameState('start')} className="bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-xs">
                  메인으로
                </button>
              </div>
            )}
          </div>
        )}

        {/* 게임 오버 */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95 z-50 p-6 text-center backdrop-blur-sm">
            <XCircle size={48} className="text-red-500 mb-2" />
            <h1 className="text-2xl font-black mb-1">GAME OVER</h1>
            <p className="text-lg mb-4">점수: <span className="text-amber-400 font-bold">{score}점</span></p>
            
            {!isSaved ? (
              <form onSubmit={saveScoreToLeaderboard} className="w-full flex flex-col space-y-3 px-4">
                <input 
                  type="text" 
                  placeholder="닉네임 입력" 
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={10}
                  className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-center text-white focus:outline-none focus:ring-2 focus:ring-amber-400 text-sm"
                  required
                />
                <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold py-2.5 rounded-xl text-sm transition-transform active:scale-95">
                  랭킹에 점수 등록하기
                </button>
              </form>
            ) : (
              <div className="flex flex-col space-y-2 w-full px-4">
                <button onClick={() => setGameState('ranking')} className="bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-sm">
                  랭킹 확인하기
                </button>
                <button onClick={() => setGameState('start')} className="bg-slate-700 text-slate-300 font-bold py-2 rounded-xl text-xs">
                  메인으로
                </button>
              </div>
            )}
          </div>
        )}

        {/* 랭킹 화면 */}
        {gameState === 'ranking' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-50 p-6 text-center">
            <Medal size={40} className="text-amber-400 mb-2" />
            <h2 className="text-xl font-black mb-4">소화 왕 랭킹 TOP 5</h2>
            <div className="w-full max-w-xs space-y-2 mb-6">
              {leaderboard.length === 0 ? (
                <p className="text-xs text-slate-400">등록된 랭킹 기록이 없습니다.</p>
              ) : (
                leaderboard.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-700 text-sm">
                    <span className="font-bold text-amber-400">{idx + 1}위. {item.nickname}</span>
                    <span className="font-mono font-bold text-white">{item.score}점</span>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => setGameState('start')} className="bg-white text-slate-900 font-bold py-2 px-6 rounded-full text-sm active:scale-95 transition-transform">
              메인으로 돌아가기
            </button>
          </div>
        )}

        <DigestiveBackground />
        
        {/* 1초 대기 UI */}
        {gameState === 'playing' && isWaiting && (
          <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-amber-500/90 text-slate-900 px-3 py-1 rounded-full text-xs font-black animate-pulse z-30 shadow-md">
            준비 중... (1초 대기)
          </div>
        )}

        {/* 타겟 판정선 */}
        {gameState === 'playing' && activeItem && (
          <div 
            className="absolute left-1/2 w-36 h-12 -ml-18 border-2 border-white/40 rounded-full flex items-center justify-center z-10 transition-all duration-300"
            style={{ 
              top: `${activeItem.targetY}%`, 
              transform: 'translate(-50%, -50%)',
              borderColor: Math.abs(dropY - activeItem.targetY) <= 10 && !isWaiting ? '#fbbf24' : 'rgba(255,255,255,0.4)'
            }}
          >
            <div className={`absolute inset-0 rounded-full ${Math.abs(dropY - activeItem.targetY) <= 10 && !isWaiting ? 'bg-amber-400/20 animate-ping' : ''}`} />
            
            {stage !== 5 && (
              <div className="absolute -left-12 text-[10px] font-bold text-white bg-slate-900/80 px-2 py-1 rounded shadow-lg border border-slate-700">
                {TARGET_ZONES[activeItem.organ].label}
              </div>
            )}
            {stage === 5 && (
              <div className="absolute -left-12 text-[10px] font-bold text-amber-400 bg-slate-900/90 px-2 py-1 rounded shadow-lg border border-amber-500/50">
                ? (비밀)
              </div>
            )}
          </div>
        )}

        {/* 떨어지는 음식 (이모지 적용) */}
        {gameState === 'playing' && activeItem && !feedback && (
          <div 
            className="absolute left-1/2 -ml-7 flex flex-col items-center z-20 transition-transform"
            style={{ top: `${dropY}%`, transform: 'translateY(-50%)' }}
          >
            {dropY < 0 && isWaiting && <ArrowDown size={16} className="text-amber-400 animate-bounce absolute -bottom-6" />}
            <div className="w-14 h-14 flex items-center justify-center bg-white shadow-lg rounded-full text-4xl">
               {activeItem.emoji}
            </div>
            <span className="mt-1 text-[9px] font-bold text-white bg-slate-800/90 px-2 py-0.5 rounded shadow-sm whitespace-nowrap">{activeItem.nutrient}</span>
          </div>
        )}

        {/* Hit / Miss 피드백 효과 */}
        {feedback && (
          <div 
            className="absolute left-1/2 -ml-12 w-24 h-24 flex items-center justify-center z-30"
            style={{ top: `${feedback.y}%`, transform: 'translateY(-50%)' }}
          >
            {feedback.type === 'hit' ? (
              <CheckCircle2 size={72} className="text-green-400 animate-out fade-out zoom-out duration-500 drop-shadow-lg" />
            ) : (
              <XCircle size={72} className="text-red-500 animate-out fade-out zoom-out duration-500 drop-shadow-lg" />
            )}
          </div>
        )}
      </div>

      <div className="w-full max-w-md mt-6 grid grid-cols-3 gap-2">
        {ENZYMES.map((enzyme) => (
          <button
            key={enzyme.id}
            disabled={gameState !== 'playing' || feedback !== null || isWaiting}
            onClick={() => handleHit(enzyme.id)}
            className={`${enzyme.color} text-white font-bold py-4 px-1 rounded-xl shadow-md transition-transform active:scale-90 disabled:opacity-50 disabled:active:scale-100 flex flex-col items-center justify-center border-b-4 border-black/30 active:border-b-0 active:translate-y-1`}
          >
            <span className="text-[13px] tracking-tight">{enzyme.name}</span>
          </button>
        ))}
        <div className="bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl flex items-center justify-center opacity-70 p-2">
          <span className="text-[10px] text-slate-400 text-center leading-tight">
            {stage === 5 ? '🔥 5단계: 하드모드' : 'NEXT 음식 확인!'}
          </span>
        </div>
      </div>
      
    </div>
  );
}