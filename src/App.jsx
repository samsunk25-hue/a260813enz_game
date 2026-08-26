import React, { useState, useEffect, useCallback, useRef } from 'react';
import gameAudio from './gameAudio.js';

// ============================================================
// DATA & CONFIG (교과서 소화 과정 완벽 고증)
// ============================================================

// 소화기관 위치 및 라벨 (입 위치를 아래로 28%로 조정하여 충분한 반응 시간 확보)
const TARGET_ZONES = {
  mouth:     { y: 28, label: '입',       color: '#f87171', emoji: '👄' },
  stomach:   { y: 53, label: '위',       color: '#fbbf24', emoji: '🫗' },
  intestine: { y: 78, label: '작은창자', color: '#34d399', emoji: '🧬' },
};

// 🥗 초기 음식 데이터베이스 (절대 중간산물부터 시작하지 않음!)
// 1차 효소 작용 후에만 중간산물(엿당, 중간산물, 유화지방)로 변화
const RAW_FOODS = [
  // [탄수화물 / 녹말류]
  // 1차(입: 아밀레이스) -> 🍬 엿당 -> 2차(작은창자: 아밀레이스) -> ✨ 포도당
  {
    id: 'carb_bread',
    type: 'carb',
    initialEmoji: '🍞',
    initialName: '식빵 (녹말)',
    steps: [
      {
        organ: 'mouth',
        targetY: TARGET_ZONES.mouth.y,
        answer: 'amylase',
        productEmoji: '🍬',
        productName: '엿당 (중간산물)',
        actionLabel: '침 속 아밀레이스로 엿당 분해!',
      },
      {
        organ: 'intestine',
        targetY: TARGET_ZONES.intestine.y,
        answer: 'amylase',
        productEmoji: '✨',
        productName: '포도당 (최종산물)',
        actionLabel: '이자액 아밀레이스로 포도당 최종 분해!',
      },
    ],
  },
  {
    id: 'carb_rice',
    type: 'carb',
    initialEmoji: '🍚',
    initialName: '쌀밥 (녹말)',
    steps: [
      {
        organ: 'mouth',
        targetY: TARGET_ZONES.mouth.y,
        answer: 'amylase',
        productEmoji: '🍯',
        productName: '엿당 (중간산물)',
        actionLabel: '침 속 아밀레이스로 엿당 분해!',
      },
      {
        organ: 'intestine',
        targetY: TARGET_ZONES.intestine.y,
        answer: 'amylase',
        productEmoji: '✨',
        productName: '포도당 (최종산물)',
        actionLabel: '이자액 아밀레이스로 포도당 최종 분해!',
      },
    ],
  },
  {
    id: 'carb_potato',
    type: 'carb',
    initialEmoji: '🍠',
    initialName: '고구마 (녹말)',
    steps: [
      {
        organ: 'mouth',
        targetY: TARGET_ZONES.mouth.y,
        answer: 'amylase',
        productEmoji: '🍬',
        productName: '엿당 (중간산물)',
        actionLabel: '침 속 아밀레이스로 엿당 분해!',
      },
      {
        organ: 'intestine',
        targetY: TARGET_ZONES.intestine.y,
        answer: 'amylase',
        productEmoji: '✨',
        productName: '포도당 (최종산물)',
        actionLabel: '이자액 아밀레이스로 포도당 최종 분해!',
      },
    ],
  },

  // [단백질류]
  // 1차(위: 펩신) -> 🥓 단백질 중간산물 -> 2차(작은창자: 트립신) -> 💎 아미노산
  {
    id: 'protein_meat',
    type: 'protein',
    initialEmoji: '🥩',
    initialName: '소고기 (단백질)',
    steps: [
      {
        organ: 'stomach',
        targetY: TARGET_ZONES.stomach.y,
        answer: 'pepsin',
        productEmoji: '🥓',
        productName: '단백질 중간산물',
        actionLabel: '위액 펩신으로 중간산물 분해!',
      },
      {
        organ: 'intestine',
        targetY: TARGET_ZONES.intestine.y,
        answer: 'trypsin',
        productEmoji: '💎',
        productName: '아미노산 (최종산물)',
        actionLabel: '이자액 트립신으로 아미노산 최종 분해!',
      },
    ],
  },
  {
    id: 'protein_chicken',
    type: 'protein',
    initialEmoji: '🍗',
    initialName: '닭고기 (단백질)',
    steps: [
      {
        organ: 'stomach',
        targetY: TARGET_ZONES.stomach.y,
        answer: 'pepsin',
        productEmoji: '🥓',
        productName: '단백질 중간산물',
        actionLabel: '위액 펩신으로 중간산물 분해!',
      },
      {
        organ: 'intestine',
        targetY: TARGET_ZONES.intestine.y,
        answer: 'trypsin',
        productEmoji: '💎',
        productName: '아미노산 (최종산물)',
        actionLabel: '이자액 트립신으로 아미노산 최종 분해!',
      },
    ],
  },
  {
    id: 'protein_egg',
    type: 'protein',
    initialEmoji: '🥚',
    initialName: '달걀 (단백질)',
    steps: [
      {
        organ: 'stomach',
        targetY: TARGET_ZONES.stomach.y,
        answer: 'pepsin',
        productEmoji: '🥓',
        productName: '단백질 중간산물',
        actionLabel: '위액 펩신으로 중간산물 분해!',
      },
      {
        organ: 'intestine',
        targetY: TARGET_ZONES.intestine.y,
        answer: 'trypsin',
        productEmoji: '💎',
        productName: '아미노산 (최종산물)',
        actionLabel: '이자액 트립신으로 아미노산 최종 분해!',
      },
    ],
  },

  // [지방류]
  // 작은창자 1차(쓸개즙: 유화 작용) -> 🫧 유화된 지방 -> 작은창자 2차(라이페이스: 화학적 분해) -> 💧 지방산+모노글리세리드
  {
    id: 'fat_butter',
    type: 'fat',
    initialEmoji: '🧈',
    initialName: '버터 (지방)',
    steps: [
      {
        organ: 'intestine',
        targetY: TARGET_ZONES.intestine.y,
        answer: 'bile',
        productEmoji: '🫧',
        productName: '유화된 지방',
        actionLabel: '쓸개즙으로 지방 유화(물리적 소화)!',
        isImmediateCombo: true,
      },
      {
        organ: 'intestine',
        targetY: TARGET_ZONES.intestine.y,
        answer: 'lipase',
        productEmoji: '💧',
        productName: '지방산+글리세리드',
        actionLabel: '라이페이스로 지방산+모노글리세리드 최종 분해!',
      },
    ],
  },
  {
    id: 'fat_cheese',
    type: 'fat',
    initialEmoji: '🧀',
    initialName: '치즈 (지방)',
    steps: [
      {
        organ: 'intestine',
        targetY: TARGET_ZONES.intestine.y,
        answer: 'bile',
        productEmoji: '🫧',
        productName: '유화된 지방',
        actionLabel: '쓸개즙으로 지방 유화(물리적 소화)!',
        isImmediateCombo: true,
      },
      {
        organ: 'intestine',
        targetY: TARGET_ZONES.intestine.y,
        answer: 'lipase',
        productEmoji: '💧',
        productName: '지방산+글리세리드',
        actionLabel: '라이페이스로 지방산+모노글리세리드 최종 분해!',
      },
    ],
  },
  {
    id: 'fat_avocado',
    type: 'fat',
    initialEmoji: '🥑',
    initialName: '아보카도 (지방)',
    steps: [
      {
        organ: 'intestine',
        targetY: TARGET_ZONES.intestine.y,
        answer: 'bile',
        productEmoji: '🫧',
        productName: '유화된 지방',
        actionLabel: '쓸개즙으로 지방 유화(물리적 소화)!',
        isImmediateCombo: true,
      },
      {
        organ: 'intestine',
        targetY: TARGET_ZONES.intestine.y,
        answer: 'lipase',
        productEmoji: '💧',
        productName: '지방산+글리세리드',
        actionLabel: '라이페이스로 지방산+모노글리세리드 최종 분해!',
      },
    ],
  },
  // [복합 영양소 보스 음식]
  // 입(아밀레이스) -> 위(펩신) -> 작은창자(쓸개즙) -> 작은창자(라이페이스)
  {
    id: 'combo_burger',
    type: 'combo',
    initialEmoji: '🍔',
    initialName: '햄버거 (탄+단+지)',
    isBoss: true,
    steps: [
      {
        organ: 'mouth',
        targetY: TARGET_ZONES.mouth.y,
        answer: 'amylase',
        productEmoji: '🍔',
        productName: '햄버거 (단+지 남음)',
        actionLabel: '아밀레이스 콤보 1/4!',
      },
      {
        organ: 'stomach',
        targetY: TARGET_ZONES.stomach.y,
        answer: 'pepsin',
        productEmoji: '🍔',
        productName: '햄버거 (지방 남음)',
        actionLabel: '펩신 콤보 2/4!',
      },
      {
        organ: 'intestine',
        targetY: TARGET_ZONES.intestine.y,
        answer: 'bile',
        productEmoji: '🍔',
        productName: '햄버거 (유화 완료)',
        actionLabel: '쓸개즙 유화 콤보 3/4!',
        isImmediateCombo: true,
      },
      {
        organ: 'intestine',
        targetY: TARGET_ZONES.intestine.y,
        answer: 'lipase',
        productEmoji: '✨💎💧',
        productName: '완전 분해!',
        actionLabel: '퍼펙트 소화 완료!',
      },
    ],
  },
  {
    id: 'combo_pizza',
    type: 'combo',
    initialEmoji: '🍕',
    initialName: '피자 (탄+단+지)',
    isBoss: true,
    steps: [
      { organ: 'mouth', targetY: TARGET_ZONES.mouth.y, answer: 'amylase', productEmoji: '🍕', productName: '피자 (단+지 남음)', actionLabel: '아밀레이스 콤보 1/4!' },
      { organ: 'stomach', targetY: TARGET_ZONES.stomach.y, answer: 'pepsin', productEmoji: '🍕', productName: '피자 (지방 남음)', actionLabel: '펩신 콤보 2/4!' },
      { organ: 'intestine', targetY: TARGET_ZONES.intestine.y, answer: 'bile', productEmoji: '🍕', productName: '피자 (유화 완료)', actionLabel: '쓸개즙 콤보 3/4!', isImmediateCombo: true },
      { organ: 'intestine', targetY: TARGET_ZONES.intestine.y, answer: 'lipase', productEmoji: '✨💎💧', productName: '완전 분해!', actionLabel: '퍼펙트 소화 완료!' },
    ],
  },
];

// 효소 버튼 목록
const ENZYMES = [
  { id: 'amylase', name: '아밀레이스', key: 'A', color: '#06b6d4', gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
  { id: 'pepsin',  name: '펩신',      key: 'S', color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
  { id: 'trypsin', name: '트립신',     key: 'D', color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)' },
  { id: 'bile',    name: '쓸개즙',     key: 'F', color: '#f97316', gradient: 'linear-gradient(135deg, #f97316, #ea580c)' },
  { id: 'lipase',  name: '라이페이스', key: 'G', color: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899, #db2777)' },
];

const KEYBOARD_MAP = { a: 'amylase', s: 'pepsin', d: 'trypsin', f: 'bile', g: 'lipase' };

const STAGE_CONFIGS = {
  1: { speed: 0.11, targetCount: 4,  name: 'Stage 1', subtitle: '입문 (천천히)', hideLabels: false },
  2: { speed: 0.15, targetCount: 6,  name: 'Stage 2', subtitle: '초급 (소화 과정)', hideLabels: false },
  3: { speed: 0.20, targetCount: 8,  name: 'Stage 3', subtitle: '중급 (비트 업)', hideLabels: false },
  4: { speed: 0.25, targetCount: 10, name: 'Stage 4', subtitle: '상급 (스피드업)', hideLabels: false },
  5: { speed: 0.32, targetCount: 12, name: 'Stage 5', subtitle: '마스터 (장기 이름 숨김)', hideLabels: true },
};

// 새 음식 인스턴스 생성 헬퍼
const createFoodInstance = (currentStage) => {
  let pool = RAW_FOODS.filter(f => !f.isBoss);
  
  if (currentStage >= 3) {
    if (Math.random() < 0.25) {
      pool = RAW_FOODS.filter(f => f.isBoss);
    }
  }
  
  const template = pool[Math.floor(Math.random() * pool.length)];
  return {
    ...template,
    stepIndex: 0,
    currentEmoji: template.initialEmoji,
    currentName: template.initialName,
    isIntermediate: false,
    uid: Math.random().toString(36).substring(2, 9),
  };
};

// ============================================================
// SUB-COMPONENTS
// ============================================================

// 🫀 소화기관 배경 SVG (입 28%, 위 53%, 소장 78% 정밀 정렬)
const DigestiveOrganBG = React.memo(({ hideLabels, activeOrgan }) => (
  <svg viewBox="0 0 200 400" className="absolute inset-0 w-full h-full opacity-35" preserveAspectRatio="none" style={{ pointerEvents: 'none' }}>
    <defs>
      <linearGradient id="esophagusGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#f87171" stopOpacity="0.4" />
        <stop offset="35%" stopColor="#fbbf24" stopOpacity="0.4" />
        <stop offset="70%" stopColor="#34d399" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.2" />
      </linearGradient>
    </defs>
    
    {/* 중앙 관 (식도 ~ 소화관) */}
    <path d="M100,0 L100,400" stroke="url(#esophagusGrad)" strokeWidth="16" strokeLinecap="round" fill="none" opacity="0.4" />
    
    {/* 👄 1. 입 (y: 28% -> SVG y: 112) */}
    <g className={activeOrgan === 'mouth' ? 'animate-organ-highlight' : ''}>
      <ellipse cx="100" cy="112" rx="36" ry="18" fill="#f87171" opacity="0.25" />
      <ellipse cx="100" cy="112" rx="36" ry="18" fill="none" stroke="#f87171" strokeWidth="2.5" opacity="0.6" />
      {!hideLabels && (
        <text x="146" y="116" fill="#f87171" fontSize="13" fontWeight="800" opacity="0.85">입</text>
      )}
    </g>
    
    {/* 🫗 2. 위 (y: 53% -> SVG y: 212) */}
    <g className={activeOrgan === 'stomach' ? 'animate-organ-highlight' : ''}>
      <path d="M70,195 C52,195 48,228 66,242 C84,256 122,256 132,242 C144,228 136,195 118,195 Z" fill="#fbbf24" opacity="0.2" />
      <path d="M70,195 C52,195 48,228 66,242 C84,256 122,256 132,242 C144,228 136,195 118,195 Z" fill="none" stroke="#fbbf24" strokeWidth="2.5" opacity="0.6" />
      {!hideLabels && (
        <text x="146" y="217" fill="#fbbf24" fontSize="13" fontWeight="800" opacity="0.85">위</text>
      )}
    </g>

    {/* 🧪 간 & 쓸개 (위와 작은창자 사이) */}
    <g opacity="0.35">
      <ellipse cx="55" cy="272" rx="22" ry="14" fill="#f97316" opacity="0.3" />
      <ellipse cx="55" cy="272" rx="22" ry="14" fill="none" stroke="#f97316" strokeWidth="1.5" opacity="0.6" />
      {!hideLabels && (
        <text x="24" y="266" fill="#f97316" fontSize="10" fontWeight="700" opacity="0.7">쓸개</text>
      )}
    </g>
    
    {/* 🧬 3. 작은창자 (y: 78% -> SVG y: 312) */}
    <g className={activeOrgan === 'intestine' ? 'animate-organ-highlight' : ''}>
      <path d="M75,295 Q125,302 110,318 Q90,332 115,338 Q135,344 115,358" fill="none" stroke="#34d399" strokeWidth="14" strokeLinecap="round" opacity="0.3" />
      <path d="M75,295 Q125,302 110,318 Q90,332 115,338 Q135,344 115,358" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      {!hideLabels && (
        <text x="140" y="318" fill="#34d399" fontSize="12" fontWeight="800" opacity="0.85">작은창자</text>
      )}
    </g>
    
    {/* 🪱 대장 */}
    <g opacity="0.25">
      <path d="M60,375 Q40,390 80,395 Q120,400 100,408" fill="none" stroke="#94a3b8" strokeWidth="12" strokeLinecap="round" opacity="0.3" />
      {!hideLabels && (
        <text x="32" y="392" fill="#94a3b8" fontSize="10" fontWeight="600" opacity="0.6">대장</text>
      )}
    </g>
  </svg>
));

// 🎯 타겟 판정선 (히트존)
const HitZone = React.memo(({ organ, y, isActive, hideLabels }) => {
  const zone = TARGET_ZONES[organ];
  if (!zone) return null;
  return (
    <div
      className={`hit-zone ${isActive ? 'active' : ''}`}
      style={{ top: `${y}%` }}
    >
      <div className="hit-zone-inner" />
      {!hideLabels ? (
        <div className="organ-label" style={{ color: zone.color, borderColor: `${zone.color}44` }}>
          {zone.emoji} {zone.label}
        </div>
      ) : (
        <div className="organ-label" style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)' }}>
          ❓
        </div>
      )}
    </div>
  );
});

// ✨ 피드백 이펙트 (HIT / MISS & 소화 생성물 알림)
const FeedbackEffect = ({ type, y, label, productEmoji }) => (
  <div
    className="animate-fade-out-up"
    style={{
      position: 'absolute',
      left: '50%',
      top: `${y}%`,
      transform: 'translate(-50%, -50%)',
      zIndex: 50,
      pointerEvents: 'none',
      textAlign: 'center',
    }}
  >
    {type === 'hit' ? (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.25)',
          border: '3px solid #10b981',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, color: '#10b981',
          boxShadow: '0 0 25px rgba(16, 185, 129, 0.5)',
        }}>
          {productEmoji || '✓'}
        </div>
        {label && (
          <div style={{
            marginTop: 6, padding: '4px 12px', borderRadius: 14,
            background: 'rgba(16, 185, 129, 0.9)', color: '#ffffff',
            fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
          }}>
            {label}
          </div>
        )}
      </div>
    ) : (
      <div style={{
        width: 60, height: 60, borderRadius: '50%',
        background: 'rgba(239, 68, 68, 0.25)',
        border: '3px solid #ef4444',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32, color: '#ef4444',
        boxShadow: '0 0 25px rgba(239, 68, 68, 0.5)',
      }}>
        ✗
      </div>
    )}
  </div>
);

// 🔥 콤보 게이지
const ComboGauge = ({ combo }) => {
  if (combo < 2) return null;
  return (
    <div className="animate-combo-pop" style={{
      position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
      zIndex: 45, display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 14px', borderRadius: 20,
      background: combo >= 5 ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'rgba(245, 158, 11, 0.25)',
      border: `2px solid ${combo >= 5 ? '#f59e0b' : 'rgba(245,158,11,0.5)'}`,
      color: combo >= 5 ? '#fff' : '#f59e0b',
      fontWeight: 900, fontSize: 13,
      boxShadow: combo >= 5 ? '0 0 20px rgba(245,158,11,0.5)' : 'none',
    }}>
      🔥 {combo} COMBO!
    </div>
  );
};

// 🔮 NEXT 미리보기 (다음 떨어질 음식 - 항상 원래 음식 형태!)
const NextPreview = ({ item }) => {
  if (!item) return null;
  return (
    <div className="glass-card animate-drop-bounce" style={{
      position: 'absolute', top: 10, right: 10, zIndex: 45,
      padding: '6px 10px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 2, minWidth: 68,
    }}>
      <span style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em' }}>NEXT</span>
      <div style={{
        width: 34, height: 34, borderRadius: '50%', background: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      }}>
        {item.initialEmoji}
      </div>
      <span style={{ fontSize: 9, fontWeight: 700, color: '#cbd5e1', textAlign: 'center', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.initialName}
      </span>
    </div>
  );
};

// ============================================================
// SCREEN COMPONENTS
// ============================================================

// 🏁 시작 화면 (별명 입력칸 1개 & 사전학습 & 이어하기)
const StartScreen = ({ onStart, onResume, onGuide, onRanking, nickname, setNickname, savedProgress }) => {
  const hasNickname = nickname.trim().length > 0;
  return (
    <div className="animate-slide-up" style={{
      position: 'absolute', inset: 0, zIndex: 60,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, rgba(18,24,41,0.96) 0%, rgba(10,14,26,0.98) 100%)',
      padding: 24, textAlign: 'center',
    }}>
      {/* 로고 & 타이틀 */}
      <div className="animate-float" style={{ marginBottom: 6, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <img 
          src="./og-image.jpg" 
          alt="소화 콤보 비트 배너" 
          style={{ width: '100%', maxWidth: 260, borderRadius: 16, boxShadow: '0 8px 30px rgba(0,0,0,0.6)', border: '2px solid rgba(255,255,255,0.1)' }} 
        />
      </div>
      <h1 className="gradient-text" style={{ fontSize: 30, fontWeight: 900, marginBottom: 4, marginTop: 8, lineHeight: 1.2 }}>
        소화 콤보 비트
      </h1>
      <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 18, maxWidth: 280, lineHeight: 1.5 }}>
        소화 효소 타이밍 액션!<br />
        음식을 단계별로 완전 분해하세요!
      </p>

      {/* 🏷️ 단 하나의 깔끔한 별명 입력칸 */}
      <div style={{ width: '100%', maxWidth: 280, marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 6, textAlign: 'left' }}>
          🏷️ 학생 별명 (닉네임)
        </label>
        <input
          type="text"
          placeholder="별명을 입력하세요 (10자 이내)"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={10}
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 12, textAlign: 'center',
            background: 'var(--bg-elevated)', border: '2px solid var(--border-subtle)',
            color: 'white', fontSize: 15, fontWeight: 700,
            outline: 'none', transition: 'border-color 0.2s',
          }}
          onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
          onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
        />
      </div>

      {/* 저장된 진행상황 복원 안내 */}
      {hasNickname && savedProgress && (
        <div className="animate-pop-in" style={{
          width: '100%', maxWidth: 280, marginBottom: 12,
          padding: '10px 14px', borderRadius: 12,
          background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.35)',
          textAlign: 'left',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', marginBottom: 2 }}>💾 저장된 기록 발견!</div>
          <div style={{ fontSize: 12, color: '#cbd5e1' }}>
            Stage <strong style={{ color: '#f59e0b' }}>{savedProgress.stage}</strong> · 
            점수 <strong style={{ color: '#f59e0b' }}>{savedProgress.score.toLocaleString()}</strong>점 · 
            ❤️ {savedProgress.health}
          </div>
        </div>
      )}

      {/* 버튼 액션 그룹 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 280 }}>
        {hasNickname && savedProgress && (
          <button
            onClick={onResume}
            className="btn-shimmer animate-glow-pulse"
            style={{
              padding: '13px 20px', borderRadius: 14,
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: 'white', fontWeight: 800, fontSize: 14,
              boxShadow: '0 4px 20px rgba(59,130,246,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            ▶ 이어하기 (Stage {savedProgress.stage})
          </button>
        )}
        <button
          onClick={hasNickname ? onStart : undefined}
          className="btn-shimmer"
          style={{
            padding: '13px 20px', borderRadius: 14,
            background: hasNickname
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : 'linear-gradient(135deg, #334155, #1e293b)',
            color: hasNickname ? 'white' : '#64748b',
            fontWeight: 800, fontSize: 15,
            boxShadow: hasNickname ? '0 4px 20px rgba(16,185,129,0.35)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            cursor: hasNickname ? 'pointer' : 'not-allowed',
            opacity: hasNickname ? 1 : 0.65,
          }}
        >
          {hasNickname ? '🎮 게임 시작하기' : '⬆️ 별명을 먼저 입력하세요'}
        </button>
        <button
          onClick={onGuide}
          className="btn-shimmer"
          style={{
            padding: '11px 20px', borderRadius: 14,
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#1a1a2e', fontWeight: 800, fontSize: 13,
            boxShadow: '0 4px 15px rgba(245,158,11,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          📖 사전 학습 (소화 가이드)
        </button>
        <button
          onClick={onRanking}
          style={{
            padding: '9px 20px', borderRadius: 14,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#94a3b8', fontWeight: 700, fontSize: 12,
          }}
        >
          🏆 명예의 전당 (랭킹)
        </button>
      </div>
    </div>
  );
};

// 📖 사전 학습 가이드 모달
const GuideScreen = ({ onClose, onStart }) => (
  <div className="animate-slide-up" style={{
    position: 'absolute', inset: 0, zIndex: 60,
    background: 'var(--bg-deep)',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  }}>
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)',
    }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
        📖 소화 효소 및 영양소 요약
      </h2>
      <button onClick={onClose} style={{
        padding: '4px 12px', borderRadius: 8,
        background: 'var(--bg-elevated)', color: '#94a3b8', fontSize: 12, fontWeight: 700,
        border: '1px solid var(--border-subtle)',
      }}>
        ✕ 닫기
      </button>
    </div>
    
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', paddingBottom: 90 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* 1. 탄수화물(녹말) */}
        <div className="glass-card" style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 20 }}>🍞</span>
            <span style={{ fontWeight: 800, color: '#06b6d4', fontSize: 13 }}>탄수화물 (녹말)</span>
          </div>
          <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
            • <strong>1차 (입)</strong>: <strong>침 속 아밀레이스(A)</strong>로 <strong style={{ color: '#f59e0b' }}>🍬 엿당(중간산물)</strong> 분해<br />
            • <strong>2차 (작은창자)</strong>: <strong>이자액 아밀레이스(A)</strong>로 <strong style={{ color: '#34d399' }}>✨ 포도당</strong> 최종 분해
          </p>
        </div>

        {/* 2. 단백질 */}
        <div className="glass-card" style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 20 }}>🥩</span>
            <span style={{ fontWeight: 800, color: '#8b5cf6', fontSize: 13 }}>단백질</span>
          </div>
          <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
            • <strong>1차 (위)</strong>: <strong>위액 펩신(S)</strong>으로 <strong style={{ color: '#f59e0b' }}>🥓 단백질 중간산물</strong> 분해<br />
            • <strong>2차 (작은창자)</strong>: <strong>이자액 트립신(D)</strong>으로 <strong style={{ color: '#34d399' }}>💎 아미노산</strong> 최종 분해
          </p>
        </div>

        {/* 3. 지방 */}
        <div className="glass-card" style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 20 }}>🧈</span>
            <span style={{ fontWeight: 800, color: '#f97316', fontSize: 13 }}>지방 (2연속 작용)</span>
          </div>
          <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
            • <strong>1차 (작은창자)</strong>: <strong>쓸개즙(F)</strong>으로 <strong style={{ color: '#f97316' }}>🫧 유화된 지방방울</strong>(물리적 소화)<br />
            • <strong>2차 (작은창자)</strong>: <strong>이자액 라이페이스(G)</strong>로 <strong style={{ color: '#34d399' }}>💧 지방산+모노글리세리드</strong> 최종 분해
          </p>
        </div>

        {/* 특수 아이템 */}
        <div className="glass-card" style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 20 }}>🎁</span>
            <span style={{ fontWeight: 800, color: '#facc15', fontSize: 13 }}>특수 아이템</span>
          </div>
          <p style={{ fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, margin: 0 }}>
            • <strong>🥬 식이섬유 (단축키 Q)</strong>: 1~3단계를 완벽(하트 3개)하게 깨면 획득! 4단계부터 사용 시 3.5초간 음식 하강 속도를 늦춰줍니다.<br />
            • <strong>💊 소화제 (단축키 W)</strong>: 5단계 시작 시 1개 지급! 사용 시 화면 내 음식을 조건 없이 즉시 퍼펙트 소화시킵니다.
          </p>
        </div>

        {/* 조작법 */}
        <div className="glass-card" style={{ padding: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }}>🎮</span>
            <span style={{ fontWeight: 800, color: '#e2e8f0', fontSize: 13 }}>키보드 & 터치 조작</span>
          </div>
          <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.7, margin: 0 }}>
            키보드 효소: <strong>A</strong>(아밀레이스), <strong>S</strong>(펩신), <strong>D</strong>(트립신), <strong>F</strong>(쓸개즙), <strong>G</strong>(라이페이스)<br />
            키보드 아이템: <strong>Q</strong>(식이섬유), <strong>W</strong>(소화제)<br />
            모바일: 하단 버튼 및 상단 아이템 직접 터치
          </p>
        </div>
      </div>
    </div>

    <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-deep)' }}>
      <button
        onClick={onStart}
        className="btn-shimmer"
        style={{
          width: '100%', padding: '12px 20px', borderRadius: 12,
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: 'white', fontWeight: 800, fontSize: 14,
          boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
        }}
      >
        🚀 이해 완료! 게임 시작하기
      </button>
    </div>
  </div>
);

// 🌟 융털 흡수 연출 모달
const AbsorptionScreen = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3500); // 3.5초간 연출
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="animate-slide-up" style={{
      position: 'absolute', inset: 0, zIndex: 60,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, rgba(18,24,41,0.98) 0%, #0a0e1a 100%)',
      padding: 24, textAlign: 'center',
      overflow: 'hidden'
    }}>
      <h2 style={{ fontSize: 22, fontWeight: 900, color: '#34d399', marginBottom: 30, textShadow: '0 0 10px rgba(52, 211, 153, 0.4)' }}>
        🌟 소화 완료! 영양소 흡수 중...
      </h2>
      
      <div style={{ position: 'relative', width: '100%', height: 200, display: 'flex', justifyContent: 'center', gap: 40 }}>
        
        {/* 모세혈관 (수용성 영양소) */}
        <div style={{ position: 'relative', width: 70, height: '100%', background: 'rgba(239, 68, 68, 0.2)', border: '4px solid #ef4444', borderRadius: '35px 35px 0 0' }}>
          <div style={{ position: 'absolute', bottom: -30, width: '100%', textAlign: 'center', fontSize: 11, fontWeight: 800, color: '#fca5a5' }}>모세혈관<br/>(포도당/아미노산)</div>
          
          <div className="animate-absorb" style={{ position: 'absolute', bottom: 20, left: 15, fontSize: 24, animationDelay: '0s' }}>✨</div>
          <div className="animate-absorb" style={{ position: 'absolute', bottom: 10, left: 35, fontSize: 24, animationDelay: '0.4s' }}>💎</div>
          <div className="animate-absorb" style={{ position: 'absolute', bottom: 30, left: 25, fontSize: 24, animationDelay: '0.8s' }}>✨</div>
        </div>

        {/* 암죽관 (지용성 영양소) */}
        <div style={{ position: 'relative', width: 70, height: '100%', background: 'rgba(250, 204, 21, 0.2)', border: '4px solid #facc15', borderRadius: '35px 35px 0 0' }}>
          <div style={{ position: 'absolute', bottom: -30, width: '100%', textAlign: 'center', fontSize: 11, fontWeight: 800, color: '#fde047' }}>암죽관<br/>(지방산+글리세리드)</div>
          
          <div className="animate-absorb" style={{ position: 'absolute', bottom: 15, left: 20, fontSize: 28, animationDelay: '0.2s' }}>💧</div>
          <div className="animate-absorb" style={{ position: 'absolute', bottom: 25, left: 35, fontSize: 28, animationDelay: '0.6s' }}>💧</div>
        </div>
      </div>
    </div>
  );
};

// 🎉 스테이지 클리어 모달
const StageClearScreen = ({ stage, onNext }) => (
  <div className="animate-slide-up" style={{
    position: 'absolute', inset: 0, zIndex: 60,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at center, rgba(18,24,41,0.96) 0%, rgba(10,14,26,0.98) 100%)',
    padding: 24, textAlign: 'center',
  }}>
    <div className="animate-pop-in">
      <span style={{ fontSize: 52 }}>🎉</span>
    </div>
    <h2 style={{ fontSize: 22, fontWeight: 900, color: '#f59e0b', marginTop: 10, marginBottom: 4 }}>
      {STAGE_CONFIGS[stage]?.name} 클리어!
    </h2>
    <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24 }}>
      다음 단계의 소화 효소 도전에 나섭니다
    </p>
    <button
      onClick={onNext}
      className="btn-shimmer"
      style={{
        padding: '13px 28px', borderRadius: 14,
        background: 'linear-gradient(135deg, #10b981, #059669)',
        color: 'white', fontWeight: 800, fontSize: 15,
        boxShadow: '0 4px 20px rgba(16,185,129,0.35)',
      }}
    >
      {stage + 1}단계 도전하기 →
    </button>
  </div>
);

// 🏆 빅토리 / 게임오버 화면 (별명 입력창 없이 기존 등록된 별명으로 1-클릭 저장)
const EndScreen = ({ type, score, stage, onSave, onRanking, onRestart, onRestartStage, nickname, isSaved }) => (
  <div className="animate-slide-up" style={{
    position: 'absolute', inset: 0, zIndex: 60,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(ellipse at center, rgba(18,24,41,0.96) 0%, rgba(10,14,26,0.98) 100%)',
    padding: 24, textAlign: 'center',
  }}>
    <div className="animate-pop-in">
      <span style={{ fontSize: 52 }}>{type === 'victory' ? '🏆' : '💔'}</span>
    </div>
    <h1
      className={type === 'victory' ? 'animate-victory-glow' : ''}
      style={{
        fontSize: type === 'victory' ? 32 : 26,
        fontWeight: 900,
        color: type === 'victory' ? '#facc15' : '#ef4444',
        marginTop: 10, marginBottom: 4,
      }}
    >
      {type === 'victory' ? 'VICTORY!' : 'GAME OVER'}
    </h1>
    {type === 'victory' && (
      <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>모든 5단계를 완벽하게 클리어했습니다!</p>
    )}
    
    <div style={{
      padding: '6px 14px', borderRadius: 10, marginBottom: 6,
      background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)',
    }}>
      <span style={{ fontSize: 12, color: '#94a3b8' }}>플레이어: </span>
      <span style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0' }}>{nickname || '익명'}</span>
    </div>
    
    <p style={{ fontSize: 17, fontWeight: 800, color: '#f59e0b', marginBottom: 20 }}>
      최종 점수: {score.toLocaleString()}점 {type !== 'victory' && `(Stage ${stage})`}
    </p>

    {!isSaved ? (
      <div style={{ width: '100%', maxWidth: 260, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={onSave} className="btn-shimmer" style={{
          padding: '12px 20px', borderRadius: 12,
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          color: '#1a1a2e', fontWeight: 800, fontSize: 14,
        }}>
          🏅 랭킹에 점수 등록 ({nickname || '플레이어'})
        </button>

        {type === 'gameover' && stage >= 2 && (
          <button onClick={onRestartStage} className="btn-shimmer" style={{
            padding: '12px 20px', borderRadius: 12,
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white', fontWeight: 800, fontSize: 14,
          }}>
            🔄 현재 스테이지(Stage {stage}) 재도전
          </button>
        )}

        <button onClick={onRestart} style={{
          padding: '10px 20px', borderRadius: 12,
          background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
          color: '#94a3b8', fontWeight: 600, fontSize: 13,
        }}>
          🏠 메인으로 (처음부터)
        </button>
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 260 }}>
        <div style={{ fontSize: 12, color: '#34d399', fontWeight: 700 }}>✓ 랭킹에 성공적으로 등록되었습니다!</div>
        <button onClick={onRanking} style={{
          padding: '12px 20px', borderRadius: 12,
          background: 'linear-gradient(135deg, #10b981, #059669)',
          color: 'white', fontWeight: 800, fontSize: 14,
        }}>
          🏆 명예의 전당 확인하기
        </button>

        {type === 'gameover' && stage >= 2 && (
          <button onClick={onRestartStage} className="btn-shimmer" style={{
            padding: '12px 20px', borderRadius: 12,
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: 'white', fontWeight: 800, fontSize: 14,
          }}>
            🔄 현재 스테이지(Stage {stage}) 재도전
          </button>
        )}

        <button onClick={onRestart} style={{
          padding: '10px 20px', borderRadius: 12,
          background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
          color: '#94a3b8', fontWeight: 600, fontSize: 13,
        }}>
          🏠 메인으로 (처음부터)
        </button>
      </div>
    )}
  </div>
);

// 🏆 랭킹 화면
const RankingScreen = ({ leaderboard, onClose }) => (
  <div className="animate-slide-up" style={{
    position: 'absolute', inset: 0, zIndex: 60,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg-deep)',
    padding: 24, textAlign: 'center',
  }}>
    <span style={{ fontSize: 36, marginBottom: 6 }}>🏆</span>
    <h2 style={{ fontSize: 20, fontWeight: 900, marginBottom: 18, color: '#facc15' }}>소화 콤보 왕 TOP 5</h2>

    <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
      {leaderboard.length === 0 ? (
        <p style={{ fontSize: 13, color: '#64748b' }}>등록된 기록이 없습니다.</p>
      ) : (
        leaderboard.map((item, idx) => (
          <div
            key={idx}
            className="glass-card"
            style={{
              padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              border: idx === 0 ? '1px solid rgba(245,158,11,0.4)' : undefined,
            }}
          >
            <span style={{
              fontWeight: 800, fontSize: 13,
              color: idx === 0 ? '#facc15' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#c2855a' : '#94a3b8',
            }}>
              {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`} {item.nickname}
            </span>
            <span style={{ fontWeight: 800, fontSize: 13, color: 'white', fontVariantNumeric: 'tabular-nums' }}>
              {item.score?.toLocaleString()}점 <span style={{ fontSize: 10, color: '#94a3b8' }}>(S{item.stage})</span>
            </span>
          </div>
        ))
      )}
    </div>
    <button onClick={onClose} style={{
      padding: '10px 24px', borderRadius: 12,
      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
      color: '#e2e8f0', fontWeight: 700, fontSize: 13,
    }}>
      ← 메인으로 돌아가기
    </button>
  </div>
);

// ============================================================
// MAIN GAME COMPONENT
// ============================================================

export default function App() {
  // --- States ---
  const [gameState, setGameState] = useState('start');
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(3);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [stage, setStage] = useState(1);
  const [clearedCount, setClearedCount] = useState(0);

  // Active falling food & Next queue
  const [activeItem, setActiveItem] = useState(null);
  const [nextItem, setNextItem] = useState(null);
  const [dropY, setDropY] = useState(-12);
  const [isWaiting, setIsWaiting] = useState(true);

  // Visual feedback
  const [feedback, setFeedback] = useState(null); // { type: 'hit'|'miss', y, label, productEmoji }
  const [promptMessage, setPromptMessage] = useState(null); // e.g. "⚡ 라이페이스로 분해하세요!"

  // Nickname & Leaderboard
  const [nickname, setNickname] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Inventory & Effects
  const [fiberCount, setFiberCount] = useState(0);
  const [medicineCount, setMedicineCount] = useState(0);
  const [isFiberActive, setIsFiberActive] = useState(false);

  // --- Audio Handlers ---
  const initAudio = useCallback(() => {
    gameAudio.init();
    gameAudio.resume();
  }, []);

  const toggleSound = useCallback(() => {
    initAudio();
    const muted = gameAudio.toggleMute();
    setIsMuted(muted);
    if (!muted && gameStateRef.current === 'playing') {
      gameAudio.startBGM(stageRef.current);
    }
  }, [initAudio]);

  useEffect(() => {
    return () => gameAudio.destroy();
  }, []);

  // --- Refs ---
  const requestRef = useRef(null);
  const waitTimerRef = useRef(null);
  const gameStateRef = useRef(gameState);
  const activeItemRef = useRef(activeItem);
  const dropYRef = useRef(dropY);
  const isWaitingRef = useRef(isWaiting);
  const feedbackRef = useRef(feedback);
  const stageRef = useRef(stage);
  const nextItemRef = useRef(null);
  const isFiberActiveRef = useRef(isFiberActive);
  const healthRef = useRef(health);

  // Sync refs
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { activeItemRef.current = activeItem; }, [activeItem]);
  useEffect(() => { dropYRef.current = dropY; }, [dropY]);
  useEffect(() => { isWaitingRef.current = isWaiting; }, [isWaiting]);
  useEffect(() => { feedbackRef.current = feedback; }, [feedback]);
  useEffect(() => { stageRef.current = stage; }, [stage]);
  useEffect(() => { isFiberActiveRef.current = isFiberActive; }, [isFiberActive]);
  useEffect(() => { healthRef.current = health; }, [health]);

  // --- Leaderboard & Progress Management ---
  useEffect(() => {
    try {
      const saved = localStorage.getItem('digestion_beat_leaderboard');
      if (saved) setLeaderboard(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const saveToLeaderboard = useCallback((name, finalScore, finalStage, finalMaxCombo) => {
    const newEntry = {
      nickname: name,
      score: finalScore,
      stage: finalStage,
      maxCombo: finalMaxCombo,
      date: new Date().toLocaleDateString(),
    };
    setLeaderboard(prev => {
      const updated = [...prev, newEntry].sort((a, b) => b.score - a.score).slice(0, 5);
      try { localStorage.setItem('digestion_beat_leaderboard', JSON.stringify(updated)); } catch { /* */ }
      return updated;
    });
  }, []);

  const SAVE_KEY_PREFIX = 'dcb_progress_';
  const getSavedProgress = useCallback((name) => {
    if (!name?.trim()) return null;
    try {
      const data = localStorage.getItem(SAVE_KEY_PREFIX + name.trim());
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  }, []);

  const saveProgress = useCallback((name, progressData) => {
    if (!name?.trim()) return;
    try { localStorage.setItem(SAVE_KEY_PREFIX + name.trim(), JSON.stringify(progressData)); } catch { /* */ }
  }, []);

  const clearSavedProgress = useCallback((name) => {
    if (!name?.trim()) return;
    try { localStorage.removeItem(SAVE_KEY_PREFIX + name.trim()); } catch { /* */ }
  }, []);

  const [savedProgress, setSavedProgress] = useState(null);
  useEffect(() => {
    setSavedProgress(getSavedProgress(nickname));
  }, [nickname, getSavedProgress, gameState]);

  // --- Queue Next Food ---
  const queueNextItem = useCallback(() => {
    const currentStage = stageRef.current;
    const currentNext = nextItemRef.current || createFoodInstance(currentStage);
    const newNext = createFoodInstance(currentStage);

    setActiveItem(currentNext);
    setNextItem(newNext);
    nextItemRef.current = newNext;

    setDropY(-12);
    setIsWaiting(true);
    setFeedback(null);
    setPromptMessage(null);

    clearTimeout(waitTimerRef.current);
    waitTimerRef.current = setTimeout(() => {
      setIsWaiting(false);
    }, 900);
  }, []);

  // --- Start / Stage Controller ---
  const startStage = useCallback((targetStage) => {
    setStage(targetStage);
    setClearedCount(0);
    setIsSaved(false);
    setPromptMessage(null);

    // 5단계 시작 시 소화제 지급
    if (targetStage === 5) {
      setMedicineCount(1);
    }

    const initialActive = createFoodInstance(targetStage);
    const initialNext = createFoodInstance(targetStage);
    setActiveItem(initialActive);
    setNextItem(initialNext);
    nextItemRef.current = initialNext;
    setDropY(-12);
    setIsWaiting(true);
    setFeedback(null);
    setGameState('playing');

    // BGM 시작
    gameAudio.startBGM(targetStage);
    gameAudio.playReady();

    clearTimeout(waitTimerRef.current);
    waitTimerRef.current = setTimeout(() => {
      setIsWaiting(false);
    }, 900);
  }, []);

  const startGame = useCallback(() => {
    initAudio();
    clearSavedProgress(nickname);
    setScore(0);
    setHealth(3);
    setCombo(0);
    setMaxCombo(0);
    startStage(1);
  }, [startStage, clearSavedProgress, nickname, initAudio]);

  const resumeGame = useCallback(() => {
    initAudio();
    const progress = getSavedProgress(nickname);
    if (!progress) return;
    setScore(progress.score);
    setHealth(progress.health);
    setCombo(0);
    setMaxCombo(progress.maxCombo || 0);
    startStage(progress.stage);
  }, [nickname, getSavedProgress, startStage, initAudio]);

  // --- Animation & Fall Loop ---
  const updateLoop = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    if (!activeItemRef.current) return;
    if (isWaitingRef.current) {
      requestRef.current = requestAnimationFrame(updateLoop);
      return;
    }
    if (feedbackRef.current) return;

    const baseSpeed = STAGE_CONFIGS[stageRef.current].speed;
    const currentSpeed = isFiberActiveRef.current ? baseSpeed * 0.4 : baseSpeed;
    const currentItem = activeItemRef.current;
    const currentStep = currentItem.steps[currentItem.stepIndex];

    setDropY(prevY => {
      const nextY = prevY + currentSpeed;
      const targetY = currentStep.targetY;

      // Miss: 타겟 구역을 10% 이상 지나쳐버렸을 때
      if (nextY > targetY + 11) {
        cancelAnimationFrame(requestRef.current);
        setFeedback({ type: 'miss', y: targetY });
        gameAudio.playMiss();
        setCombo(0);
        setPromptMessage(null);

        setHealth(h => {
          const newHealth = h - 1;
          if (newHealth <= 0) {
            setTimeout(() => {
              gameAudio.stopBGM();
              gameAudio.playGameOver();
              setGameState('gameover');
            }, 700);
          } else {
            setTimeout(() => queueNextItem(), 700);
          }
          return newHealth;
        });
        return prevY;
      }
      return nextY;
    });

    requestRef.current = requestAnimationFrame(updateLoop);
  }, [queueNextItem]);

  useEffect(() => {
    if (gameState === 'playing' && !feedback) {
      requestRef.current = requestAnimationFrame(updateLoop);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [updateLoop, gameState, feedback, isWaiting]);

  // --- Enzyme Action (Hit Handler) ---
  const handleHit = useCallback((enzymeId) => {
    if (gameStateRef.current !== 'playing') return;
    const item = activeItemRef.current;
    if (!item || feedbackRef.current || isWaitingRef.current) return;

    const currentStep = item.steps[item.stepIndex];
    const currentY = dropYRef.current;
    const targetY = currentStep.targetY;
    const distance = Math.abs(currentY - targetY);

    // 판정 범위: 히트존 중심 기준 ±11% 이내
    if (distance > 11) {
      // ❌ 틀린 위치에서 눌렀을 때 점수 하강 (-20점)
      setScore(s => Math.max(0, s - 20));
      return;
    }

    // 효소 정답 확인
    if (enzymeId === currentStep.answer) {
      // ✅ 1차 또는 최종 소화 성공!
      cancelAnimationFrame(requestRef.current);

      const isFinalStep = item.stepIndex >= item.steps.length - 1;

      if (!isFinalStep) {
        // ----------------------------------------------------
        // [1차 소화 성공] -> 중간산물로 변신!
        // ----------------------------------------------------
        gameAudio.playHit();
        setFeedback({
          type: 'hit',
          y: currentY,
          label: currentStep.actionLabel,
          productEmoji: currentStep.productEmoji,
        });

        setScore(s => s + 100 + (combo * 10));
        setCombo(c => {
          const newCombo = c + 1;
          setMaxCombo(m => Math.max(m, newCombo));
          return newCombo;
        });

        const nextStepIndex = item.stepIndex + 1;
        const updatedItem = {
          ...item,
          stepIndex: nextStepIndex,
          currentEmoji: currentStep.productEmoji, // 중간산물 그림으로 변신!
          currentName: currentStep.productName,   // 중간산물 이름으로 변신!
          isIntermediate: true,
        };

        // 지방 2연타(유화 후 라이페이스) 또는 일반 진행
        if (currentStep.isImmediateCombo) {
          // 작은창자에서 쓸개즙 유화 후 바로 라이페이스 안내
          setTimeout(() => {
            setActiveItem(updatedItem);
            setFeedback(null);
            setPromptMessage('⚡ 라이페이스(G)로 최종 분해하세요!');
            gameAudio.playMultiStep();
            // 약간 위로 리셋하여 2차 판정 기회 제공
            setDropY(targetY - 6);
            requestRef.current = requestAnimationFrame(updateLoop);
          }, 500);
        } else {
          // 탄수화물/단백질: 1차 소화(입/위) 후 중간산물 상태로 작은창자로 계속 하강!
          setTimeout(() => {
            setActiveItem(updatedItem);
            setFeedback(null);
            setPromptMessage(null);
            setDropY(targetY + 2); // 자연스럽게 다음 기관으로 이동 계속
            requestRef.current = requestAnimationFrame(updateLoop);
          }, 450);
        }
      } else {
        // ----------------------------------------------------
        // [최종 소화 성공] -> 포도당 / 아미노산 / 지방산 완전 분해 완료!
        // ----------------------------------------------------
        gameAudio.playHit();
        setFeedback({
          type: 'hit',
          y: currentY,
          label: currentStep.actionLabel,
          productEmoji: currentStep.productEmoji,
        });
        setPromptMessage(null);

        setScore(s => s + 150 + (combo * 15));
        setCombo(c => {
          const newCombo = c + 1;
          setMaxCombo(m => Math.max(m, newCombo));
          if (newCombo >= 3) gameAudio.playCombo(newCombo);
          return newCombo;
        });

        // 스테이지 완료 체크
        setClearedCount(prev => {
          const newCleared = prev + 1;
          if (newCleared >= STAGE_CONFIGS[stageRef.current].targetCount) {
            setTimeout(() => {
              gameAudio.stopBGM();
              gameAudio.playStageClear(); // 🎵 융털 흡수 연출 시 효과음 재생
              
              // [보너스 지급 로직] 1~3단계 퍼펙트 클리어 시 식이섬유 획득
              if (stageRef.current <= 3 && healthRef.current === 3) {
                setFiberCount(f => Math.min(3, f + 1));
              }

              setGameState('absorption');
            }, 600);
          } else {
            setTimeout(() => queueNextItem(), 500);
          }
          return newCleared;
        });
      }
    } else {
      // ❌ 잘못된 소화 효소 선택!
      cancelAnimationFrame(requestRef.current);
      setFeedback({ type: 'miss', y: currentY });
      gameAudio.playMiss();
      setCombo(0);
      setPromptMessage(null);
      setScore(s => Math.max(0, s - 50)); // 틀린 효소 선택 시 -50점 감점

      setHealth(h => {
        const newHealth = h - 1;
        if (newHealth <= 0) {
          setTimeout(() => {
            gameAudio.stopBGM();
            gameAudio.playGameOver();
            setGameState('gameover');
          }, 700);
        } else {
          setTimeout(() => queueNextItem(), 700);
        }
        return newHealth;
      });
    }
  }, [combo, queueNextItem, updateLoop]);

  // --- Item Handlers ---
  const useFiber = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    if (stageRef.current < 4) return;
    if (fiberCount <= 0) return;
    if (isFiberActiveRef.current) return;

    setFiberCount(c => c - 1);
    setIsFiberActive(true);
    // 3.5초 후 효과 종료
    setTimeout(() => {
      setIsFiberActive(false);
    }, 3500);
  }, [fiberCount]);

  const useMedicine = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    if (stageRef.current !== 5) return;
    if (medicineCount <= 0) return;
    const item = activeItemRef.current;
    if (!item) return;

    setMedicineCount(c => c - 1);
    gameAudio.playHit();
    cancelAnimationFrame(requestRef.current);
    
    setFeedback({
      type: 'hit',
      y: dropYRef.current,
      label: '💊 소화제 쾌속 소화!',
      productEmoji: '✨',
    });
    setPromptMessage(null);
    setScore(s => s + 300);
    setCombo(c => {
      const newCombo = c + 1;
      setMaxCombo(m => Math.max(m, newCombo));
      if (newCombo >= 3) gameAudio.playCombo(newCombo);
      return newCombo;
    });

    setClearedCount(prev => {
      const newCleared = prev + 1;
      if (newCleared >= STAGE_CONFIGS[stageRef.current].targetCount) {
        setTimeout(() => {
          gameAudio.stopBGM();
          gameAudio.playStageClear();
          setGameState('absorption');
        }, 600);
      } else {
        setTimeout(() => queueNextItem(), 500);
      }
      return newCleared;
    });
  }, [medicineCount, queueNextItem]);

  // --- Keyboard Event Handler ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (key === 'm') {
        e.preventDefault();
        toggleSound();
        return;
      }
      if (key === 'q') {
        e.preventDefault();
        useFiber();
        return;
      }
      if (key === 'w') {
        e.preventDefault();
        useMedicine();
        return;
      }
      if (KEYBOARD_MAP[key]) {
        e.preventDefault();
        handleHit(KEYBOARD_MAP[key]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleHit, toggleSound, useFiber, useMedicine]);

  // --- Score Save Handler (별명 입력창 없이 1-클릭) ---
  const handleSaveScore = useCallback(() => {
    const playerNick = nickname.trim() || '익명';
    if (isSaved) return;
    saveToLeaderboard(playerNick, score, stage, maxCombo);
    clearSavedProgress(playerNick);
    setIsSaved(true);
  }, [nickname, isSaved, score, stage, maxCombo, saveToLeaderboard, clearSavedProgress]);

  // 스테이지 클리어 시 자동 진행상황 저장
  useEffect(() => {
    if (gameState === 'stageclear' && nickname.trim()) {
      saveProgress(nickname.trim(), { score, health, stage: stage + 1, maxCombo });
    }
    if (gameState === 'gameover' || gameState === 'victory') {
      clearSavedProgress(nickname);
    }
  }, [gameState, nickname, score, health, stage, maxCombo, saveProgress, clearSavedProgress]);

  // --- Computed UI Helpers ---
  const stageConfig = STAGE_CONFIGS[stage];
  const progressPercent = stageConfig ? (clearedCount / stageConfig.targetCount) * 100 : 0;
  const currentStep = activeItem?.steps[activeItem?.stepIndex];
  const activeOrgan = currentStep?.organ;
  const isInHitZone = activeItem && !isWaiting && currentStep && Math.abs(dropY - currentStep.targetY) <= 11;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-deep)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '8px 12px',
      userSelect: 'none',
      fontFamily: 'var(--font-main)',
    }}>
      {/* === HUD (상단 인터페이스 & 음소거 버튼) === */}
      <div style={{
        width: '100%', maxWidth: 420,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 4px', marginBottom: 6,
      }}>
        {/* 하트 체력 & 사운드 토글 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 100 }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {[1, 2, 3].map(i => (
              <span
                key={i}
                style={{
                  fontSize: 16,
                  filter: i <= health ? 'none' : 'grayscale(1) opacity(0.25)',
                  transition: 'filter 0.3s',
                }}
              >
                ❤️
              </span>
            ))}
          </div>
          {/* 🔊 음악 배경 on/off 토글 버튼 */}
          <button
            onClick={toggleSound}
            style={{
              padding: '2px 6px', borderRadius: 8,
              background: isMuted ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)',
              border: `1px solid ${isMuted ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.15)'}`,
              fontSize: 12, cursor: 'pointer',
            }}
            title={isMuted ? '음악 켜기 (M)' : '음악 끄기 (M)'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>

        {/* 점수 & 스테이지 정보 */}
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{
            fontSize: 10, fontWeight: 800, color: '#f59e0b',
            letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>
            {stageConfig?.name} · {stageConfig?.subtitle}
          </div>
          <div className="score-display" style={{ fontSize: 24, color: 'white' }}>
            {score.toString().padStart(5, '0')}
          </div>
        </div>

        {/* 진행도 게이지 */}
        <div style={{ width: 85, textAlign: 'right' }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', marginBottom: 3 }}>
            {clearedCount}/{stageConfig?.targetCount}
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      {/* === 게임 필드 === */}
      <div
        className={`${feedback?.type === 'miss' ? 'animate-shake' : ''} ${isFiberActive ? 'animate-fiber-glow' : ''}`}
        style={{
          width: '100%', maxWidth: 420,
          height: '62vh', minHeight: 410,
          background: feedback?.type === 'miss'
            ? 'linear-gradient(180deg, rgba(239,68,68,0.1) 0%, var(--bg-card) 30%)'
            : isFiberActive 
              ? 'linear-gradient(180deg, rgba(52,211,153,0.15) 0%, var(--bg-card) 30%)'
              : 'var(--bg-card)',
          borderRadius: 20,
          border: `2px solid ${feedback?.type === 'miss' ? 'rgba(239,68,68,0.5)' : isFiberActive ? 'rgba(52,211,153,0.6)' : 'var(--border-subtle)'}`,
          position: 'relative',
          overflow: 'hidden',
          transition: 'border-color 0.3s, background 0.3s',
          boxShadow: isFiberActive ? '0 0 30px rgba(52,211,153,0.3)' : '0 10px 40px rgba(0,0,0,0.4)',
        }}
      >
        {/* 배경 소화기관 모식도 (입 28%, 위 53%, 소장 78% 정밀 정렬) */}
        <DigestiveOrganBG
          hideLabels={stageConfig?.hideLabels}
          activeOrgan={activeOrgan}
        />

        {/* 콤보 게이지 */}
        {gameState === 'playing' && <ComboGauge combo={combo} />}

        {/* NEXT 미리보기 (다음 음식은 언제나 처음 음식 형태) */}
        {gameState === 'playing' && <NextPreview item={nextItem} />}

        {/* 1초 대기 알림 */}
        {gameState === 'playing' && isWaiting && (
          <div style={{
            position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
            zIndex: 35, padding: '4px 14px', borderRadius: 20,
            background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)',
            fontSize: 11, fontWeight: 800, color: '#f59e0b',
            animation: 'pulse-ring 1.5s ease-in-out infinite',
          }}>
            준비 중...
          </div>
        )}

        {/* 특수 안내 메시지 (지방 라이페이스 분해 등) */}
        {gameState === 'playing' && promptMessage && (
          <div style={{
            position: 'absolute', top: 44, left: '50%', transform: 'translateX(-50%)',
            zIndex: 45, padding: '5px 14px', borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(249,115,22,0.3), rgba(236,72,153,0.3))',
            border: '2px solid rgba(249,115,22,0.6)',
            fontSize: 11, fontWeight: 800, color: '#f97316',
            animation: 'glow-pulse 1s ease-in-out infinite',
            whiteSpace: 'nowrap',
          }}>
            {promptMessage}
          </div>
        )}

        {/* 현재 목표 기관 타겟 판정선 (히트존) */}
        {gameState === 'playing' && currentStep && (
          <HitZone
            organ={currentStep.organ}
            y={currentStep.targetY}
            isActive={isInHitZone}
            hideLabels={stageConfig?.hideLabels}
          />
        )}

        {/* 떨어지는 음식 (1차 소화 후 중간산물 그림으로 변신!) */}
        {gameState === 'playing' && activeItem && !feedback && (
          <div style={{
            position: 'absolute',
            left: '50%',
            top: `${dropY}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 30,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transition: 'none',
          }}>
            <div className="food-item" style={{
              boxShadow: activeItem.isIntermediate
                ? '0 0 22px rgba(245,158,11,0.6), 0 4px 20px rgba(0,0,0,0.4)'
                : isInHitZone
                  ? '0 0 20px rgba(16,185,129,0.5), 0 4px 20px rgba(0,0,0,0.4)'
                  : '0 4px 20px rgba(0,0,0,0.3)',
              border: activeItem.isIntermediate ? '3px solid #f59e0b' : '3px solid rgba(255,255,255,0.2)',
            }}>
              {activeItem.currentEmoji}
            </div>
            <span style={{
              marginTop: 4, padding: '2px 8px', borderRadius: 8,
              background: activeItem.isIntermediate ? 'rgba(245,158,11,0.85)' : 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(4px)',
              fontSize: 10, fontWeight: 800,
              color: activeItem.isIntermediate ? '#1a1a2e' : '#e2e8f0',
              whiteSpace: 'nowrap',
            }}>
              {activeItem.currentName}
            </span>
          </div>
        )}

        {/* Hit / Miss 피드백 오버레이 */}
        {feedback && (
          <FeedbackEffect
            type={feedback.type}
            y={feedback.y}
            label={feedback.label}
            productEmoji={feedback.productEmoji}
          />
        )}

        {/* === 오버레이 화면들 === */}
        {gameState === 'start' && (
          <StartScreen
            onStart={startGame}
            onResume={resumeGame}
            onGuide={() => setGameState('guide')}
            onRanking={() => setGameState('ranking')}
            nickname={nickname}
            setNickname={setNickname}
            savedProgress={savedProgress}
          />
        )}

        {gameState === 'guide' && (
          <GuideScreen
            onClose={() => setGameState('start')}
            onStart={startGame}
          />
        )}

        {gameState === 'absorption' && (
          <AbsorptionScreen
            onComplete={() => {
              if (stage >= 5) {
                gameAudio.playVictory();
                setGameState('victory');
              } else {
                setGameState('stageclear');
              }
            }}
          />
        )}

        {gameState === 'stageclear' && (
          <StageClearScreen
            stage={stage}
            onNext={() => startStage(stage + 1)}
          />
        )}

        {(gameState === 'victory' || gameState === 'gameover') && (
          <EndScreen
            type={gameState}
            score={score}
            stage={stage}
            nickname={nickname}
            isSaved={isSaved}
            onSave={handleSaveScore}
            onRanking={() => setGameState('ranking')}
            onRestart={() => setGameState('start')}
            onRestartStage={() => {
              setHealth(3);
              setCombo(0);
              startStage(stage);
            }}
          />
        )}

        {gameState === 'ranking' && (
          <RankingScreen
            leaderboard={leaderboard}
            onClose={() => setGameState('start')}
          />
        )}
      </div>

      {/* === 아이템 (태블릿/PC) 버튼 === */}
      {(stage >= 4) && (
        <div style={{
          width: '100%', maxWidth: 420,
          marginTop: 8, display: 'flex', gap: 10, justifyContent: 'center'
        }}>
          {stage >= 4 && (
            <button
              onClick={useFiber}
              disabled={fiberCount <= 0 || isFiberActive || gameState !== 'playing'}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 12,
                background: fiberCount > 0 && !isFiberActive ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.05)',
                color: fiberCount > 0 && !isFiberActive ? 'white' : '#64748b',
                border: '1px solid rgba(255,255,255,0.1)',
                fontWeight: 800, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: (gameState !== 'playing' || isFiberActive) ? 0.5 : 1,
              }}
            >
              🥬 식이섬유 <span style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 8 }}>{fiberCount}</span> 
              <span style={{ fontSize: 10, opacity: 0.7 }}>(Q)</span>
            </button>
          )}
          {stage >= 5 && (
            <button
              onClick={useMedicine}
              disabled={medicineCount <= 0 || gameState !== 'playing'}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 12,
                background: medicineCount > 0 ? 'linear-gradient(135deg, #f43f5e, #e11d48)' : 'rgba(255,255,255,0.05)',
                color: medicineCount > 0 ? 'white' : '#64748b',
                border: '1px solid rgba(255,255,255,0.1)',
                fontWeight: 800, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: gameState !== 'playing' ? 0.5 : 1,
              }}
            >
              💊 소화제 <span style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: 8 }}>{medicineCount}</span>
              <span style={{ fontSize: 10, opacity: 0.7 }}>(W)</span>
            </button>
          )}
        </div>
      )}

      {/* === 효소 조작 아케이드 버튼 === */}
      <div style={{
        width: '100%', maxWidth: 420,
        marginTop: 10,
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 6,
      }}>
        {ENZYMES.map(enzyme => (
          <button
            key={enzyme.id}
            className="enzyme-btn"
            disabled={gameState !== 'playing' || feedback !== null || isWaiting}
            onClick={() => handleHit(enzyme.id)}
            style={{
              background: enzyme.gradient,
              opacity: gameState !== 'playing' || feedback || isWaiting ? 0.4 : 1,
            }}
          >
            <span className="key-hint">{enzyme.key}</span>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 800, lineHeight: 1.2 }}>{enzyme.name}</span>
          </button>
        ))}
      </div>

      {/* 콤보 & 키보드 안내 바 */}
      {gameState === 'playing' && (
        <div style={{
          width: '100%', maxWidth: 420, marginTop: 6,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0 4px',
        }}>
          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>
            현재 콤보: <span style={{ color: combo >= 3 ? '#f59e0b' : '#94a3b8' }}>{combo}</span>
          </span>
          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>
            최대 콤보: <span style={{ color: '#94a3b8' }}>{maxCombo}</span>
          </span>
        </div>
      )}
    </div>
  );
}