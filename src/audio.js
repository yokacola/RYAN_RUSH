import { GAME_CONFIG } from './config.js';

// Web Audio API 기반 효과음 및 BGM 오디오 매니저
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;

    // BGM 음원 설정 (loop 활성화 및 기본 볼륨)
    const audioCfg = GAME_CONFIG.audio || {};
    this.bgm = new Audio('assets/audio/bgm.mp3');
    this.bgm.loop = true;
    this.bgm.volume = audioCfg.bgmVolume !== undefined ? audioCfg.bgmVolume : 0.45;
    this.bgmStarted = false;

    // 브라우저 탭 비활성화 시 일시정지, 복귀 시 자동 재개
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.bgm && !this.bgm.paused) {
          this.bgm.pause();
        }
      } else {
        if (this.bgm && this.bgmStarted && !this.isMuted) {
          this.bgm.play().catch(() => {});
        }
      }
    });
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // 배경음악(BGM) 재생
  playBGM() {
    this.init();
    if (this.isMuted || !this.bgm) return;

    if (!this.bgmStarted || this.bgm.paused) {
      const playPromise = this.bgm.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          this.bgmStarted = true;
        }).catch(err => {
          // 사용자 인터랙션 대기 시 무시
        });
      }
    }
  }

  // 배경음악 정지
  stopBGM() {
    if (this.bgm) {
      this.bgm.pause();
      this.bgm.currentTime = 0;
      this.bgmStarted = false;
    }
  }

  // 배경음악 일시정지
  pauseBGM() {
    if (this.bgm) {
      this.bgm.pause();
    }
  }

  // 배경음악 재개
  resumeBGM() {
    if (this.bgm && !this.isMuted && this.bgmStarted) {
      this.bgm.play().catch(() => {});
    }
  }

  setBGMVolume(volume) {
    if (this.bgm) {
      this.bgm.volume = Math.max(0, Math.min(1, volume));
    }
  }

  // 신나는 점프 소리 (통통 튀는 뿅~)
  playJump() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(750, t + 0.16);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.19);
  }

  // 2단 점프 소리 (더 높은 뾰로롱~)
  playDoubleJump() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(980, t + 0.15);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.17);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  // 아이템 획득 소리 (딸랑딸랑/반짝반짝 팅~)
  playCollect() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, High C
    const note = notes[Math.floor(Math.random() * notes.length)];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(note, t);
    osc.frequency.exponentialRampToValueAtTime(note * 1.5, t + 0.18);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.23);
  }

  // 장애물 부딪혔을 때 깜짝 놀라는 소리 (귀여운 어머!/통통 삐약)
  playSurprise() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.linearRampToValueAtTime(250, t + 0.12);
    osc.frequency.linearRampToValueAtTime(320, t + 0.25);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  // 게임 시작 버튼 눌렀을 때 팡파르 (출발~!)
  playStart() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const chord = [392.00, 523.25, 659.25, 783.99]; // G4, C5, E5, G5

    chord.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.08);

      gain.gain.setValueAtTime(0.2, t + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + i * 0.08);
      osc.stop(t + i * 0.08 + 0.32);
    });
  }
}
