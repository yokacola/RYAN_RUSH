import { GAME_CONFIG } from './config.js';
import { drawRoundedStar } from './utils.js';

// UI 매니저 - 타이틀 화면 및 점수판
export class UIManager {
  constructor(game) {
    this.game = game;

    this.imgTitle = new Image();
    this.imgTitle.src = 'assets/ui/title.png';

    this.btnPulse = 0;

    const uiCfg = (GAME_CONFIG && GAME_CONFIG.ui) || {};
    this.btnStart = {
      x: 640,
      y: uiCfg.btnStartY !== undefined ? uiCfg.btnStartY : 630,
      w: 220,
      h: 76,
      radius: 38
    };
  }

  update(dt) {
    this.btnPulse += dt * 4;
  }

  isStartButtonClicked(x, y) {
    if (x === null || y === null || x === undefined || y === undefined) return false;
    const bw = this.btnStart.w * 0.5 + 30; // 넉넉한 터치 판정 (반경 + 30px)
    const bh = this.btnStart.h * 0.5 + 25;
    return Math.abs(x - this.btnStart.x) <= bw && Math.abs(y - this.btnStart.y) <= bh;
  }

  draw(ctx) {
    if (this.game.state === 'TITLE') {
      this.drawTitleScreen(ctx);
    }

    this.drawScoreHUD(ctx);
  }

  drawTitleScreen(ctx) {
    const w = 1280;
    const uiCfg = (GAME_CONFIG && GAME_CONFIG.ui) || {};
    const baseTitleY = uiCfg.titleY !== undefined ? uiCfg.titleY : 100;

    // 1. 타이틀 이미지 (config.js의 titleY 수치 반영)
    ctx.save();
    const titleY = baseTitleY + Math.sin(this.btnPulse * 0.5) * 8;
    ctx.translate(w / 2, titleY);

    if (this.imgTitle.complete && this.imgTitle.width > 0) {
      const tw = uiCfg.titleWidth || 480;
      const th = tw * (this.imgTitle.height / this.imgTitle.width);
      ctx.drawImage(this.imgTitle, -tw * 0.5, -th * 0.5, tw, th);
    } else {
      ctx.textAlign = 'center';
      ctx.font = '900 52px "Arial Black", sans-serif';
      ctx.fillStyle = '#ff9800';
      ctx.fillText('달려라 리안!', 0, 0);
    }
    ctx.restore();

    // 2. 시작 버튼 (붉은 둥근 버튼 + "시작" 텍스트)
    ctx.save();
    const scale = 1 + Math.sin(this.btnPulse) * 0.05;
    ctx.translate(this.btnStart.x, this.btnStart.y);
    ctx.scale(scale, scale);

    const bw = this.btnStart.w;
    const bh = this.btnStart.h;
    const br = this.btnStart.radius;

    // 외곽 부드러운 붉은 후광
    ctx.fillStyle = 'rgba(255, 64, 129, 0.35)';
    ctx.beginPath();
    ctx.roundRect(-bw * 0.5 - 8, -bh * 0.5 - 8, bw + 16, bh + 16, br + 6);
    ctx.fill();

    // 메인 버튼 바디: 코랄 레드 / 딸기 핑크 그라데이션
    const btnGrad = ctx.createLinearGradient(0, -bh * 0.5, 0, bh * 0.5);
    btnGrad.addColorStop(0, '#ff3366');   // 밝은 스트로베리 레드
    btnGrad.addColorStop(0.5, '#e91e63'); // 선명한 핑크 레드
    btnGrad.addColorStop(1, '#c2185b');   // 딥 라즈베리 레드
    ctx.fillStyle = btnGrad;
    ctx.beginPath();
    ctx.roundRect(-bw * 0.5, -bh * 0.5, bw, bh, br);
    ctx.fill();

    // 굵고 매끄러운 흰색 라운드 테두리
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.stroke();

    // 상단 젤리 반짝 하이라이트
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.roundRect(-bw * 0.45, -bh * 0.42, bw * 0.9, bh * 0.38, br * 0.5);
    ctx.fill();

    // 가운데 "시작" 텍스트 렌더링
    ctx.font = '900 38px "Jua", "Pretendard", "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 텍스트 그림자
    ctx.fillStyle = '#880e4f';
    ctx.fillText('시작', 0, 4);

    // 메인 텍스트 (순백색)
    ctx.fillStyle = '#ffffff';
    ctx.fillText('시작', 0, 1);

    ctx.restore();
  }

  drawScoreHUD(ctx) {
    ctx.save();
    const x = 1130;
    const y = 60;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.roundRect(x - 90, y - 35, 190, 70, 35);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();

    drawRoundedStar(ctx, x - 55, y, 5, 22, 11, 4, '#ffeb3b', '#f57f17', 2);
    this.drawNumberDigits(ctx, this.game.score, x + 15, y);

    ctx.restore();
  }

  drawNumberDigits(ctx, num, cx, cy) {
    const str = String(num);
    ctx.font = '900 46px "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = '#212121';
    ctx.lineWidth = 7;
    ctx.strokeText(str, cx, cy + 2);

    ctx.fillStyle = '#ffeb3b';
    ctx.fillText(str, cx, cy);
  }
}
