// ============================================================
// 🎵 Game Audio Engine - Web Audio API 기반 고품질 동적 사운드
// ============================================================

// 화음 및 음계 주파수 테이블 (C Major / Pentatonic + Chords)
const PENTATONIC = [261.63, 293.66, 329.63, 392.00, 440.00]; // C4 D4 E4 G4 A4
const PENTATONIC_HIGH = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // C5~C6
const BASS_NOTES = [130.81, 146.83, 164.81, 174.61, 196.00, 220.00]; // C3~A3

class GameAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.isMuted = false;
    this.isPlaying = false;
    this.bgmInterval = null;
    this.currentBeat = 0;
    this.bpm = 120;
    this.initialized = false;
  }

  init() {
    if (this.initialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      
      // Master gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.6;
      this.masterGain.connect(this.ctx.destination);

      // BGM gain
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.28;
      this.bgmGain.connect(this.masterGain);

      // SFX gain
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.65;
      this.sfxGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // --- Utility: Play a note ---
  _playNote(freq, duration, type = 'sine', gainNode = null, volume = 0.3, delay = 0) {
    if (!this.ctx || this.isMuted) return;
    const target = gainNode || this.sfxGain;
    const now = this.ctx.currentTime + delay;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(target);

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  // --- Utility: Play noise (for percussion) ---
  _playNoise(duration, volume = 0.1, delay = 0) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime + delay;

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // High-pass filter for hi-hat like sound
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    source.start(now);
    source.stop(now + duration + 0.01);
  }

  // --- Utility: Kick drum ---
  _playKick(delay = 0) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime + delay;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // ============================================================
  // BGM - 스테이지별 동적 생성
  // ============================================================

  // 멜로디 패턴 (비트 인덱스 → 음계 인덱스)
  _getMelodyPattern(stage) {
    const patterns = {
      1: [0, -1, 2, -1, 3, -1, 4, -1, 3, -1, 2, -1, 0, -1, 1, -1], // 단순
      2: [0, 2, -1, 3, 4, -1, 3, 2, 0, 1, -1, 2, 3, -1, 4, 3],
      3: [0, 2, 3, -1, 4, 3, 2, 0, 1, 3, 4, -1, 3, 2, 0, 1],
      4: [4, 3, 2, 0, 3, 4, -1, 2, 0, 1, 3, 4, 2, 0, -1, 3],
      5: [4, 3, 4, 2, 3, 4, 3, 2, 0, 2, 3, 4, 3, 2, 0, 1],
    };
    return patterns[stage] || patterns[1];
  }

  // 베이스 패턴
  _getBassPattern(stage) {
    const patterns = {
      1: [0, -1, -1, -1, 2, -1, -1, -1, 3, -1, -1, -1, 0, -1, -1, -1],
      2: [0, -1, 0, -1, 2, -1, 2, -1, 3, -1, 3, -1, 0, -1, 2, -1],
      3: [0, -1, 0, 2, -1, 3, -1, 2, 0, -1, 3, -1, 2, -1, 0, -1],
      4: [0, 2, -1, 0, 3, -1, 2, 0, 3, 2, -1, 0, 2, -1, 3, 0],
      5: [0, 2, 3, 0, 2, 3, 4, 2, 0, 3, 2, 0, 3, 4, 2, 0],
    };
    return patterns[stage] || patterns[1];
  }

  // 드럼 패턴 (K=kick, H=hihat, -=rest)
  _getDrumPattern(stage) {
    const patterns = {
      1: ['K', '-', 'H', '-', 'K', '-', 'H', '-', 'K', '-', 'H', '-', 'K', '-', 'H', '-'],
      2: ['K', '-', 'H', 'H', 'K', '-', 'H', '-', 'K', '-', 'H', 'H', 'K', '-', 'H', '-'],
      3: ['K', 'H', '-', 'H', 'K', 'H', '-', 'H', 'K', 'H', '-', 'H', 'K', 'H', 'K', 'H'],
      4: ['K', 'H', 'K', 'H', 'K', 'H', '-', 'H', 'K', 'H', 'K', 'H', 'K', '-', 'K', 'H'],
      5: ['K', 'H', 'K', 'H', 'K', 'H', 'K', 'H', 'K', 'H', 'K', 'H', 'K', 'K', 'K', 'H'],
    };
    return patterns[stage] || patterns[1];
  }

  startBGM(stage = 1) {
    if (!this.ctx) return;
    this.stopBGM();
    this.resume();

    // BPM은 스테이지에 따라 증가
    const bpmMap = { 1: 100, 2: 110, 3: 120, 4: 132, 5: 144 };
    this.bpm = bpmMap[stage] || 120;
    this.currentBeat = 0;
    this.isPlaying = true;

    const melody = this._getMelodyPattern(stage);
    const bass = this._getBassPattern(stage);
    const drums = this._getDrumPattern(stage);
    const beatDuration = 60 / this.bpm / 2; // 16th note

    const playBeat = () => {
      if (!this.isPlaying || this.isMuted) return;

      const idx = this.currentBeat % 16;

      // Melody
      if (melody[idx] >= 0) {
        const freq = PENTATONIC_HIGH[melody[idx]];
        this._playNote(freq, beatDuration * 1.5, 'triangle', this.bgmGain, 0.15);
      }

      // Bass
      if (bass[idx] >= 0) {
        const freq = PENTATONIC_LOW[bass[idx]];
        this._playNote(freq, beatDuration * 2, 'sine', this.bgmGain, 0.2);
      }

      // Drums
      if (drums[idx] === 'K') {
        this._playKick();
      } else if (drums[idx] === 'H') {
        this._playNoise(0.05, 0.06);
      }

      // 코드 (매 4비트마다)
      if (idx % 4 === 0) {
        const chordRoot = PENTATONIC[bass[idx] >= 0 ? bass[idx] : 0];
        this._playNote(chordRoot, beatDuration * 4, 'sine', this.bgmGain, 0.06);
        this._playNote(chordRoot * 1.25, beatDuration * 4, 'sine', this.bgmGain, 0.04);
        this._playNote(chordRoot * 1.5, beatDuration * 4, 'sine', this.bgmGain, 0.03);
      }

      this.currentBeat++;
    };

    // Schedule beats
    this.bgmInterval = setInterval(playBeat, beatDuration * 1000);
    playBeat(); // 즉시 첫 비트 재생
  }

  stopBGM() {
    this.isPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    if (this.bgmTimeout) {
      clearTimeout(this.bgmTimeout);
      this.bgmTimeout = null;
    }
  }

  // ============================================================
  // SFX - 효과음
  // ============================================================

  // ✅ HIT - 맑은 상승 차임
  playHit() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const base = 523.25; // C5
    this._playNote(base, 0.15, 'sine', this.sfxGain, 0.4, 0);
    this._playNote(base * 1.25, 0.15, 'sine', this.sfxGain, 0.3, 0.06);
    this._playNote(base * 1.5, 0.2, 'sine', this.sfxGain, 0.25, 0.12);
  }

  // ❌ MISS - 낮은 버저 소리
  playMiss() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    this._playNote(130, 0.25, 'sawtooth', this.sfxGain, 0.2, 0);
    this._playNote(110, 0.3, 'sawtooth', this.sfxGain, 0.15, 0.1);
  }

  // 🔥 COMBO (3+ 콤보)
  playCombo(comboCount) {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const pitch = Math.min(comboCount, 10);
    const freq = 440 * Math.pow(2, pitch / 12);
    this._playNote(freq, 0.1, 'square', this.sfxGain, 0.15, 0);
    this._playNote(freq * 1.5, 0.15, 'square', this.sfxGain, 0.1, 0.05);
  }

  // 🎉 STAGE CLEAR - 승리 팡파르
  playStageClear() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
    notes.forEach((freq, i) => {
      this._playNote(freq, 0.3, 'sine', this.sfxGain, 0.35, i * 0.12);
      this._playNote(freq * 0.5, 0.3, 'sine', this.sfxGain, 0.15, i * 0.12);
    });
    // 마지막 코드 장식
    setTimeout(() => {
      if (this.isMuted) return;
      this._playNote(1046.50, 0.6, 'sine', this.sfxGain, 0.3, 0);
      this._playNote(783.99, 0.6, 'sine', this.sfxGain, 0.2, 0);
      this._playNote(659.25, 0.6, 'sine', this.sfxGain, 0.15, 0);
    }, 500);
  }

  // 🏆 VICTORY - 화려한 승리 음악
  playVictory() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const fanfare = [
      { f: 523.25, d: 0.15, t: 0 },
      { f: 523.25, d: 0.15, t: 0.15 },
      { f: 523.25, d: 0.15, t: 0.3 },
      { f: 659.25, d: 0.4,  t: 0.45 },
      { f: 523.25, d: 0.15, t: 0.9 },
      { f: 659.25, d: 0.15, t: 1.05 },
      { f: 783.99, d: 0.6,  t: 1.2 },
    ];
    fanfare.forEach(({ f, d, t }) => {
      this._playNote(f, d, 'sine', this.sfxGain, 0.35, t);
      this._playNote(f * 0.5, d, 'sine', this.sfxGain, 0.15, t);
    });
  }

  // 💔 GAME OVER - 하강하는 슬픈 톤
  playGameOver() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    const notes = [440, 392, 349.23, 293.66, 261.63];
    notes.forEach((freq, i) => {
      this._playNote(freq, 0.35, 'sine', this.sfxGain, 0.3 - i * 0.04, i * 0.2);
    });
  }

  // 🔔 UI 클릭 소리
  playClick() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    this._playNote(880, 0.06, 'sine', this.sfxGain, 0.15);
  }

  // ⏱️ 준비 카운트다운 틱
  playReady() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    this._playNote(660, 0.08, 'triangle', this.sfxGain, 0.2);
  }

  // ⚡ 지방 2단계 알림
  playMultiStep() {
    if (!this.ctx || this.isMuted) return;
    this.resume();
    this._playNote(587.33, 0.1, 'square', this.sfxGain, 0.2, 0);
    this._playNote(783.99, 0.15, 'square', this.sfxGain, 0.2, 0.1);
  }

  // ============================================================
  // Controls
  // ============================================================

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.5, this.ctx.currentTime);
    }
    if (this.isMuted) {
      this.stopBGM();
    }
    return this.isMuted;
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.5, this.ctx.currentTime);
    }
    if (muted) {
      this.stopBGM();
    }
  }

  destroy() {
    this.stopBGM();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.initialized = false;
  }
}

// Singleton instance
const gameAudio = new GameAudio();
export default gameAudio;
