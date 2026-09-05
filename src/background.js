import { GAME_CONFIG } from './config.js';

// 사용자 제작 4장 배경 레이어 연동 시스템
// Layer 1: bg_city.png (하늘 배경)
// Layer 2: layer_1_sky.png (먼 산)
// Layer 3: layer_2_city.png (마을 건물)
// Layer 4: layer_3_road.png (아스팔트 도로)
export class Background {
  constructor(game) {
    this.game = game;
    this.groundY = GAME_CONFIG.player.groundY;

    // 1. 하늘 배경 (bg_city.png)
    this.img1 = new Image();
    this.img1.src = 'assets/background/bg_city.png';

    // 2. 먼 산 (layer_1_sky.png)
    this.img2 = new Image();
    this.img2.src = 'assets/background/layer_1_sky.png';

    // 3. 마을 건물 (layer_2_city.png)
    this.img3 = new Image();
    this.img3.src = 'assets/background/layer_2_city.png';

    // 4. 아스팔트 도로 (layer_3_road.png)
    this.img4 = new Image();
    this.img4.src = 'assets/background/layer_3_road.png';

    this.offset1 = 0;
    this.offset2 = 0;
    this.offset3 = 0;
    this.offset4 = 0;

    this.clouds = [
      { x: 120, y: 45, scale: 0.9, speed: 10 },
      { x: 580, y: 35, scale: 0.75, speed: 7 },
      { x: 1020, y: 60, scale: 1.1, speed: 14 }
    ];
  }

  getLayerConfig(key, altKeys, defaultY, defaultH, defaultSpeed) {
    const bg = (GAME_CONFIG && GAME_CONFIG.background) || {};
    const spd = (GAME_CONFIG && GAME_CONFIG.speed) || {};

    let bgCfg = bg[key];
    if (!bgCfg && altKeys) {
      for (const k of altKeys) {
        if (bg[k]) { bgCfg = bg[k]; break; }
      }
    }
    bgCfg = bgCfg || {};

    let speedVal = bgCfg.scrollSpeed;
    if (speedVal === undefined) {
      if (spd[key] !== undefined) speedVal = spd[key];
      else if (altKeys) {
        for (const k of altKeys) {
          if (spd[k] !== undefined) { speedVal = spd[k]; break; }
        }
      }
    }
    if (speedVal === undefined) speedVal = defaultSpeed;

    return {
      y: bgCfg.y !== undefined ? bgCfg.y : defaultY,
      height: bgCfg.height !== undefined ? bgCfg.height : defaultH,
      cropLeft: bgCfg.cropLeft || 0,
      cropRight: bgCfg.cropRight || 0,
      seamOverlap: bgCfg.seamOverlap !== undefined ? bgCfg.seamOverlap : 1.5,
      scrollSpeed: speedVal
    };
  }

  getScaledMetrics(img, layerCfg) {
    const cropL = layerCfg.cropLeft;
    const cropR = layerCfg.cropRight;
    const sw = Math.max(1, img.width - cropL - cropR);
    const sh = Math.max(1, img.height);
    const scale = layerCfg.height / sh;
    const scaledW = sw * scale;
    return { cropL, sw, sh, scaledW };
  }

  update(dt, baseSpeed) {
    const cfg1 = this.getLayerConfig('layer1Sky', ['layer1Bg'], 0, 720, 0.10);
    const cfg2 = this.getLayerConfig('layer2Mountain', ['layer2Sky'], 110, 380, 0.35);
    const cfg3 = this.getLayerConfig('layer3City', ['layer2City'], 100, 450, 1.50);
    const cfg4 = this.getLayerConfig('layer4Road', ['layer3Road'], 530, 190, 2.00);

    if (this.img1.complete && this.img1.width > 0) {
      const { scaledW } = this.getScaledMetrics(this.img1, cfg1);
      this.offset1 = (this.offset1 + baseSpeed * cfg1.scrollSpeed * dt) % scaledW;
    }

    if (this.img2.complete && this.img2.width > 0) {
      const { scaledW } = this.getScaledMetrics(this.img2, cfg2);
      this.offset2 = (this.offset2 + baseSpeed * cfg2.scrollSpeed * dt) % scaledW;
    }

    if (this.img3.complete && this.img3.width > 0) {
      const { scaledW } = this.getScaledMetrics(this.img3, cfg3);
      this.offset3 = (this.offset3 + baseSpeed * cfg3.scrollSpeed * dt) % scaledW;
    }

    if (this.img4.complete && this.img4.width > 0) {
      const { scaledW } = this.getScaledMetrics(this.img4, cfg4);
      this.offset4 = (this.offset4 + baseSpeed * cfg4.scrollSpeed * dt) % scaledW;
    }

    this.clouds.forEach(c => {
      c.x -= (c.speed + baseSpeed * 0.05) * dt;
      if (c.x < -200) c.x = 1280 + Math.random() * 150;
    });
  }

  drawLayer(ctx, img, offset, layerCfg, canvasW) {
    if (!img || !img.complete || img.width <= 0) return;

    const { cropL, sw, sh, scaledW } = this.getScaledMetrics(img, layerCfg);

    // 1. 텍스처 바이리니어 샘플링 경계 블리딩(Bilinear Edge Bleed) 방지
    // 소스 텍스처의 양 끝 0.5px을 내부로 인셋하여 마진 바깥 색상이 보간되지 않도록 차단
    const sx = cropL + 0.5;
    const sy = 0;
    const sWidth = Math.max(1, sw - 1.0);
    const sHeight = sh;

    // 2. 타일 간 서브픽셀 틈새(Seam Gap) 100% 차단 오버랩 (기본 1.5px 덧칠)
    const overlap = layerCfg.seamOverlap !== undefined ? layerCfg.seamOverlap : 1.5;
    const drawW = Math.ceil(scaledW) + overlap;

    let dx = -(offset % scaledW);
    while (dx > 0) dx -= scaledW;

    while (dx < canvasW + scaledW) {
      ctx.drawImage(
        img,
        sx, sy, sWidth, sHeight,
        Math.floor(dx), layerCfg.y, drawW, layerCfg.height
      );
      dx += scaledW;
    }
  }

  draw(ctx) {
    const w = 1280;
    const h = 720;

    ctx.fillStyle = '#84dcfb';
    ctx.fillRect(0, 0, w, h);

    const cfg1 = this.getLayerConfig('layer1Sky', ['layer1Bg'], 0, 720, 0.10);
    const cfg2 = this.getLayerConfig('layer2Mountain', ['layer2Sky'], 110, 380, 0.35);
    const cfg3 = this.getLayerConfig('layer3City', ['layer2City'], 100, 450, 1.50);
    const cfg4 = this.getLayerConfig('layer4Road', ['layer3Road'], 530, 190, 2.00);

    // 1. 하늘 (bg_city.png)
    this.drawLayer(ctx, this.img1, this.offset1, cfg1, w);

    // 보조 구름
    this.clouds.forEach(c => {
      this.drawCloud(ctx, c.x, c.y, c.scale);
    });

    // 2. 먼 산 (layer_1_sky.png)
    this.drawLayer(ctx, this.img2, this.offset2, cfg2, w);

    // 3. 마을 건물 (layer_2_city.png)
    this.drawLayer(ctx, this.img3, this.offset3, cfg3, w);

    // 4. 도로 (layer_3_road.png)
    this.drawLayer(ctx, this.img4, this.offset4, cfg4, w);
  }

  drawCloud(ctx, x, y, s) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(x, y, 24 * s, 0, Math.PI * 2);
    ctx.arc(x + 20 * s, y - 7 * s, 28 * s, 0, Math.PI * 2);
    ctx.arc(x + 42 * s, y, 24 * s, 0, Math.PI * 2);
    ctx.arc(x + 22 * s, y + 7 * s, 18 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}
