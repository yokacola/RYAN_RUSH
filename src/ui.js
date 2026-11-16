import { GAME_CONFIG } from './config.js?v=26';
import { drawRoundedStar } from './utils.js?v=8';

const UI_FONT = '"IBM Plex Sans KR", "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

// UI 매니저
// - 심플한 반투명 다크 캡슐 테마 (전체화면 / 나가기 / 아이 사진·이름 변경)
// - 테두리 없이 큼직한 별 아이콘 + 큰 글씨로 표시되는 우상단 스코어
// - 보더·별 없이 2배 크기로 시원하게 배치된 타이틀 텍스트 ("달려라 OO!!")
// - 도로 위 3대 차량 선택 배지 ("소방차 출동!", "구급차 출동!", "경찰차 출동!")
export class UIManager {
  constructor(game) {
    this.game = game;
    this.btnPulse = 0;

    // 상단 메뉴 공통 규격
    this.topBox = {
      w: 162,
      h: 46,
      r: 23,
      y: 42,
      fullscreenX: 105,
      exitX: 280,
      scoreX: 1175,
    };

    const uiCfg = (GAME_CONFIG && GAME_CONFIG.ui) || {};
    // 타이틀 화면 하단 [아이 사진 · 이름 변경] 버튼 (동일한 심플 테마)
    this.btnPhoto = {
      x: 640,
      y: uiCfg.btnPhotoY !== undefined ? uiCfg.btnPhotoY : 668,
      w: 246,
      h: 46,
      radius: 23
    };
  }

  update(dt) {
    this.btnPulse += dt * 4;
  }

  // 상단 [전체화면] 버튼 클릭 판정 (타이틀 및 게임 중 항상 노출)
  isFullscreenButtonClicked(x, y) {
    if (x === null || y === null || x === undefined || y === undefined) return false;
    const hw = this.topBox.w * 0.5 + 10;
    const hh = this.topBox.h * 0.5 + 10;
    return Math.abs(x - this.topBox.fullscreenX) <= hw && Math.abs(y - this.topBox.y) <= hh;
  }

  // 상단 [나가기] 버튼 클릭 판정 (게임 중에만 노출)
  isExitButtonClicked(x, y) {
    if (this.game.state === 'TITLE') return false;
    if (x === null || y === null || x === undefined || y === undefined) return false;
    const hw = this.topBox.w * 0.5 + 10;
    const hh = this.topBox.h * 0.5 + 10;
    return Math.abs(x - this.topBox.exitX) <= hw && Math.abs(y - this.topBox.y) <= hh;
  }

  // 타이틀 하단 [아이 사진 · 이름 변경] 버튼 클릭 판정 (특정 URL 프리셋 모드에서는 비활성화)
  isPhotoButtonClicked(x, y) {
    if (this.game.isPresetMode) return false;
    if (this.game.state !== 'TITLE') return false;
    if (x === null || y === null || x === undefined || y === undefined) return false;
    const bw = this.btnPhoto.w * 0.5 + 14;
    const bh = this.btnPhoto.h * 0.5 + 12;
    return Math.abs(x - this.btnPhoto.x) <= bw && Math.abs(y - this.btnPhoto.y) <= bh;
  }

  // 호환용 별칭
  isBackToTitleClicked(x, y) {
    return this.isExitButtonClicked(x, y);
  }

  draw(ctx) {
    if (this.game.state === 'TITLE') {
      this.drawTitleScreen(ctx);
    }

    this.drawTopHUD(ctx);
  }

  // 심플한 반투명 다크 네이비 캡슐 배경
  drawSimplePillBox(ctx, cx, cy, w, h, r) {
    ctx.save();
    ctx.translate(cx, cy);

    // 은은한 그림자
    ctx.fillStyle = 'rgba(10, 16, 28, 0.22)';
    ctx.beginPath();
    ctx.roundRect(-w * 0.5, -h * 0.5 + 3, w, h, r);
    ctx.fill();

    // 반투명 다크 슬레이트 배경
    ctx.fillStyle = 'rgba(24, 34, 50, 0.68)';
    ctx.beginPath();
    ctx.roundRect(-w * 0.5, -h * 0.5, w, h, r);
    ctx.fill();

    // 깔끔한 화이트 보더
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.restore();
  }

  // 아이콘 + 텍스트를 수평·수직 정중앙에 1px 오차 없이 정렬하여 렌더링하는 헬퍼
  drawSimplePillWithIconText(ctx, cx, cy, w, h, iconType, text, textColor = '#ffffff', fontSize = 18) {
    this.drawSimplePillBox(ctx, cx, cy, w, h, h * 0.5);

    ctx.save();
    ctx.font = `600 ${fontSize}px ${UI_FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const textWidth = ctx.measureText(text).width;
    const iconSize = 18;
    const gap = 9;
    const totalW = iconSize + gap + textWidth;
    const startX = cx - totalW * 0.5;
    const iconCX = startX + iconSize * 0.5;
    const textX = startX + iconSize + gap;

    this.drawVectorIcon(ctx, iconType, iconCX, cy);

    ctx.fillStyle = textColor;
    ctx.fillText(text, textX, cy + 1);
    ctx.restore();
  }

  drawVectorIcon(ctx, iconType, cx, cy) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = '#fff9c4';
    ctx.fillStyle = '#fff9c4';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (iconType === 'fs-enter' || iconType === 'fs-exit') {
      const s = 7.5;
      const l = 4.2;
      ctx.beginPath();
      if (iconType === 'fs-enter') {
        ctx.moveTo(-s, -s + l); ctx.lineTo(-s, -s); ctx.lineTo(-s + l, -s);
        ctx.moveTo(s - l, -s);  ctx.lineTo(s, -s);  ctx.lineTo(s, -s + l);
        ctx.moveTo(s, s - l);   ctx.lineTo(s, s);   ctx.lineTo(s - l, s);
        ctx.moveTo(-s + l, s);  ctx.lineTo(-s, s);  ctx.lineTo(-s, s - l);
      } else {
        ctx.moveTo(-s, -s + l); ctx.lineTo(-s + l, -s + l); ctx.lineTo(-s + l, -s);
        ctx.moveTo(s - l, -s);  ctx.lineTo(s - l, -s + l);  ctx.lineTo(s, -s + l);
        ctx.moveTo(s, s - l);   ctx.lineTo(s - l, s - l);   ctx.lineTo(s - l, s);
        ctx.moveTo(-s + l, s);  ctx.lineTo(-s + l, s - l);  ctx.lineTo(-s, s - l);
      }
      ctx.stroke();
    } else if (iconType === 'exit') {
      const s = 7.5;
      ctx.beginPath();
      ctx.moveTo(1, -s);
      ctx.lineTo(s, -s);
      ctx.lineTo(s, s);
      ctx.lineTo(1, s);
      ctx.moveTo(3, 0);
      ctx.lineTo(-s, 0);
      ctx.moveTo(-s + 4, -4.2);
      ctx.lineTo(-s, 0);
      ctx.lineTo(-s + 4, 4.2);
      ctx.stroke();
    } else if (iconType === 'camera') {
      ctx.beginPath();
      ctx.roundRect(-8.5, -5.5, 17, 12.5, 2.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-4, -5.5);
      ctx.lineTo(-2.2, -8);
      ctx.lineTo(2.2, -8);
      ctx.lineTo(4, -5.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0.8, 3.2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawTopHUD(ctx) {
    const { w, h, y, fullscreenX, exitX } = this.topBox;
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);

    // 1. 좌측 [전체화면] (타이틀 & 게임중 공통 노출)
    this.drawSimplePillWithIconText(
      ctx,
      fullscreenX,
      y,
      w,
      h,
      isFs ? 'fs-exit' : 'fs-enter',
      isFs ? '화면축소' : '전체화면',
      '#ffffff',
      18
    );

    // 2. 게임 중에만 노출되는 [나가기] (전체화면 우측, 동일 크기·동일 포맷)
    if (this.game.state !== 'TITLE') {
      this.drawSimplePillWithIconText(
        ctx,
        exitX,
        y,
        w,
        h,
        'exit',
        '나가기',
        '#ffffff',
        18
      );
    }

    // 3. 우상단 [스코어] (테두리 박스 제거 & 수정 전 버전처럼 큼직한 별 아이콘 + 큰 숫자 표시)
    this.drawScoreHUD(ctx);
  }

  drawScoreHUD(ctx) {
    ctx.save();
    const x = 1170;
    const y = 44;

    // 큼직한 별 아이콘 (테두리 박스 없음)
    drawRoundedStar(ctx, x - 44, y, 5, 21, 10.5, 3, '#ffeb3b', '#f57f17', 2.5);

    // 큼직한 스코어 숫자
    const str = String(this.game.score);
    ctx.font = `700 36px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.lineWidth = 5;
    ctx.strokeText(str, x + 16, y + 1);

    ctx.fillStyle = '#ffeb3b';
    ctx.fillText(str, x + 16, y + 1);

    ctx.restore();
  }

  drawTitleScreen(ctx) {
    const w = 1280;
    const uiCfg = (GAME_CONFIG && GAME_CONFIG.ui) || {};
    const baseTitleY = uiCfg.titleY !== undefined ? uiCfg.titleY : 175;
    const childName = (this.game && this.game.childName) ? this.game.childName : '리안';
    const titleText = `달려라 ${childName}!!`;

    // 1. 상단 타이틀 텍스트 (보더 박스와 별 제거, 텍스트만 2배 크기(116px)로 시원하게 배치)
    ctx.save();
    const titleY = baseTitleY + Math.sin(this.btnPulse * 0.6) * 5;
    ctx.translate(w / 2, titleY);

    let fontSize = 116;
    ctx.font = `700 ${fontSize}px ${UI_FONT}`;
    const measuredW = ctx.measureText(titleText).width;
    if (measuredW > 1120) {
      fontSize = Math.floor(fontSize * (1120 / measuredW));
      ctx.font = `700 ${fontSize}px ${UI_FONT}`;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;

    // 입체감 있는 부드러운 드롭 섀도우
    ctx.save();
    ctx.fillStyle = 'rgba(20, 32, 56, 0.32)';
    ctx.fillText(titleText, 0, 9);
    ctx.restore();

    // 노랑·주황 글자가 선명하게 살아나는 다크 브라운/네이비 외곽선
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 14;
    ctx.strokeText(titleText, 0, 0);

    // 산뜻한 노랑 ~ 주황 그라데이션 채우기 (붉은색 배제)
    const textGrad = ctx.createLinearGradient(0, -fontSize * 0.45, 0, fontSize * 0.45);
    textGrad.addColorStop(0, '#fff59d');
    textGrad.addColorStop(0.35, '#ffeb3b');
    textGrad.addColorStop(0.70, '#ffb300');
    textGrad.addColorStop(1, '#fb8c00');
    ctx.fillStyle = textGrad;
    ctx.fillText(titleText, 0, 0);

    ctx.restore();

    // 2. 도로 위 3대 차량 각각의 상단 선택 배지 (기존 컬러 캡슐 스타일 유지)
    const cars = this.game.player.lineupCars || [];
    cars.forEach((car, idx) => {
      ctx.save();
      const pulse = Math.sin(this.btnPulse * 1.1 + idx * 1.3) * 3.5;
      const bx = car.x;
      const by = car.y - this.game.player.displayHeight - 20 + pulse;

      ctx.translate(bx, by);
      const bw = 138;
      const bh = 38;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
      ctx.beginPath();
      ctx.roundRect(-bw * 0.5, -bh * 0.5 + 3, bw, bh, 19);
      ctx.fill();

      ctx.fillStyle = car.badgeColor || '#e53935';
      ctx.beginPath();
      ctx.roundRect(-bw * 0.5, -bh * 0.5, bw, bh, 19);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.font = `600 17px ${UI_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${car.name} 출동!`, 0, 1);
      ctx.restore();
    });

    // 3. 하단 [아이 사진 · 이름 변경] 버튼 (특정 URL 프리셋 모드가 아닐 때만 노출)
    if (!this.game.isPresetMode) {
      this.drawPhotoChangeButton(ctx);
    }
  }

  drawPhotoChangeButton(ctx) {
    const scale = 1 + Math.sin(this.btnPulse * 0.8) * 0.015;
    ctx.save();
    ctx.translate(this.btnPhoto.x, this.btnPhoto.y);
    ctx.scale(scale, scale);
    this.drawSimplePillWithIconText(
      ctx,
      0,
      0,
      this.btnPhoto.w,
      this.btnPhoto.h,
      'camera',
      '아이 사진 · 이름 변경',
      '#fff9c4',
      17
    );
    ctx.restore();
  }
}
