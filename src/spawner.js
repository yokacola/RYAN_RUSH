import { GAME_CONFIG } from './config.js';

// 사물 (아이템 및 장애물) 스폰 및 충돌 판정 매니저
export class Spawner {
  constructor(game) {
    this.game = game;
    this.objects = [];
    this.flyingObstacles = []; // 점프 충돌 시 날아가는 악당 목록
    this.lastSpawnX = 1350;

    this.itemImages = [];
    for (let i = 0; i < 3; i++) {
      const img = new Image();
      img.src = `assets/items/item_${i}.png`;
      this.itemImages.push(img);
    }

    this.obsImages = [];
    for (let i = 0; i < 3; i++) {
      const img = new Image();
      img.src = `assets/obstacles/obs_${i}.png`;
      this.obsImages.push(img);
    }
  }

  reset() {
    this.objects = [];
    this.flyingObstacles = [];
    this.lastSpawnX = 1350 - 350; // 시작 후 약 1초 뒤 첫 스폰 등장
  }

  update(dt, speed) {
    const itemCfg = GAME_CONFIG.items;
    const obsCfg = GAME_CONFIG.obstacles;

    // 마지막 스폰 지점도 스크롤에 맞춰 왼쪽으로 이동
    this.lastSpawnX -= speed * dt;

    if (this.game.state === 'RUNNING') {
      // 이전 사물과의 안전 거리가 확보되면 다음 웨이브 스폰
      if (this.lastSpawnX <= 1350) {
        this.spawnNextWave();
      }
    }

    const playerHitbox = this.game.player.getHitbox();

    for (let i = this.objects.length - 1; i >= 0; i--) {
      const obj = this.objects[i];
      obj.x -= speed * dt;
      obj.animTime += dt;

      if (obj.type === 'item') {
        // 아이템: 통통 튀는 바운스
        const bounce = Math.abs(Math.sin(obj.animTime * itemCfg.bounceSpeed)) * itemCfg.bounceHeight;
        obj.displayY = obj.baseY - bounce;
      } else if (obj.type === 'obstacle') {
        // 악당: 황금비 2중 사인 통 토동 점프
        const w1 = obsCfg.bounceBaseSpeed;
        const w2 = obsCfg.bounceBaseSpeed * obsCfg.goldenRatio;
        const s1 = Math.abs(Math.sin(obj.animTime * w1));
        const s2 = Math.abs(Math.sin(obj.animTime * w2));
        const bounce = s1 * s2 * obsCfg.bounceHeight;
        obj.displayY = obj.baseY - bounce;
      }

      // 충돌 판정
      if (this.game.state === 'RUNNING' && this.checkCollision(playerHitbox, obj)) {
        if (obj.type === 'item') {
          this.game.addScore(1);
          this.game.audio.playCollect();
          this.spawnColorfulStarBurst(obj.x, obj.displayY);
          this.objects.splice(i, 1);
          continue;
        } else if (obj.type === 'obstacle') {
          // 3. 점프 중에 악당과 부딪힌 경우: 악당 날리기 & 점수 +5점!
          if (!this.game.player.isGrounded) {
            this.game.addScore(5);
            this.game.audio.playJump();
            // 플레이어 살짝 위로 통 튕겨오름
            this.game.player.vy = Math.min(this.game.player.vy, -380);

            const img = this.obsImages[obj.index];
            const aspect = (img && img.complete && img.naturalWidth) ? (img.naturalWidth / img.naturalHeight) : 0.9;
            const drawH = obj.height;
            const drawW = drawH * aspect;
            const footY = obj.displayY + (obsCfg.imageYOffset || 0);

            // 날아가는 악당: 그림자 소멸, 이미지 중심 기준 시계방향 고속 회전, 4배 강력한 우상단 포물선 비행
            this.flyingObstacles.push({
              index: obj.index,
              x: obj.x,
              y: footY - drawH * 0.5,
              drawW: drawW,
              drawH: drawH,
              vx: 1550,    // 기존 대비 4배 세기의 우측 발사 속도
              vy: -1650,   // 하늘 높이 솟구치는 상향 속도
              gravity: 2400, // 매끄러운 초대형 포물선 중력
              rot: 0,
              rotSpeed: 24.0, // 박력 있는 고속 시계방향 회전
              scale: 1.0,
              targetScale: 0.4 // 원근감 있게 40%까지 축소
            });

            // 가격 시 팡 터지는 무지개 별 파티클 연출
            this.spawnColorfulStarBurst(obj.x, footY - drawH * 0.5);

            this.objects.splice(i, 1);
            continue;
          } else {
            // 지상에서 달리는 중 부딪혔을 때만 깜짝 놀람 모션
            if (!this.game.player.isSurprised) {
              this.game.player.triggerSurprise();
              this.spawnHitStars(obj.x, obj.displayY);
              this.objects.splice(i, 1);
              continue;
            }
          }
        }
      }

      if (obj.x < -350) {
        this.objects.splice(i, 1);
      }
    }

    // 날아가는 악당들 물리 및 애니메이션 업데이트
    for (let i = this.flyingObstacles.length - 1; i >= 0; i--) {
      const fo = this.flyingObstacles[i];
      fo.x += fo.vx * dt;
      fo.y += fo.vy * dt;
      fo.vy += fo.gravity * dt; // 중력 적용 (포물선 궤적)
      fo.rot += fo.rotSpeed * dt; // 시계방향 회전
      if (fo.scale > fo.targetScale) {
        fo.scale = Math.max(fo.targetScale, fo.scale - dt * 1.4); // 빠르게 축소
      }

      // 화면 밖으로 벗어나면 제거
      if (fo.x > 2200 || fo.y > 1100) {
        this.flyingObstacles.splice(i, 1);
      }
    }
  }

  spawnNextWave() {
    const spCfg = GAME_CONFIG.spawner;
    const itemCfg = GAME_CONFIG.items;
    const obsCfg = GAME_CONFIG.obstacles;

    const minGap = spCfg.minGap || 420;
    const maxGap = spCfg.maxGap || 680;
    const gap = minGap + Math.random() * (maxGap - minGap);
    const startX = Math.max(1350, this.lastSpawnX) + gap;

    const isItem = Math.random() < itemCfg.spawnRatio;

    if (isItem) {
      // 1개 ~ 5개 아이템이 줄지어서 스폰
      const minC = itemCfg.minClusterCount || 1;
      const maxC = itemCfg.maxClusterCount || 5;
      const count = Math.floor(Math.random() * (maxC - minC + 1)) + minC;
      const spacing = itemCfg.clusterSpacing || 145;

      const isHigh = Math.random() < 0.45;
      const baseY = isHigh ? itemCfg.highY : itemCfg.lowY;
      const itemIdx = Math.floor(Math.random() * 3);

      for (let i = 0; i < count; i++) {
        const itemX = startX + i * spacing;
        this.objects.push({
          type: 'item',
          index: itemIdx,
          x: itemX,
          baseY: baseY,
          displayY: baseY,
          width: itemCfg.width,
          height: itemCfg.height,
          animTime: i * 0.4
        });
      }

      // 그룹의 가장 마지막 아이템 X 위치로 갱신하여 다음 사물과 절대 겹침 방지!
      this.lastSpawnX = startX + (count - 1) * spacing;
    } else {
      // 악당 1마리 스폰 (도로 바닥 고정)
      const baseY = obsCfg.groundY;
      const idx = Math.floor(Math.random() * 3);

      this.objects.push({
        type: 'obstacle',
        index: idx,
        x: startX,
        baseY: baseY,
        displayY: baseY,
        height: obsCfg.baseHeight,
        animTime: Math.random() * Math.PI * 2
      });

      // 몬스터 폭을 고려하여 갱신
      this.lastSpawnX = startX + 50;
    }
  }

  checkCollision(rect1, obj) {
    if (obj.type === 'item') {
      const ox = obj.x - obj.width * 0.35;
      const oy = obj.displayY - obj.height * 0.35;
      const ow = obj.width * 0.7;
      const oh = obj.height * 0.7;
      return (
        rect1.x < ox + ow &&
        rect1.x + rect1.width > ox &&
        rect1.y < oy + oh &&
        rect1.y + rect1.height > oy
      );
    } else {
      // 몬스터 히트박스: 원본 비율에 맞는 폭과 높이 기준
      const obsCfg = GAME_CONFIG.obstacles;
      const img = this.obsImages[obj.index];
      const aspect = (img && img.complete && img.naturalWidth) ? (img.naturalWidth / img.naturalHeight) : 0.9;
      const drawW = obj.height * aspect;
      const drawH = obj.height;
      const footY = obj.displayY + (obsCfg.imageYOffset || 0);

      const ox = obj.x - drawW * 0.3;
      const oy = footY - drawH * 0.85;
      const ow = drawW * 0.6;
      const oh = drawH * 0.8;
      return (
        rect1.x < ox + ow &&
        rect1.x + rect1.width > ox &&
        rect1.y < oy + oh &&
        rect1.y + rect1.height > oy
      );
    }
  }

  draw(ctx) {
    const obsCfg = GAME_CONFIG.obstacles;

    this.objects.forEach(obj => {
      ctx.save();

      if (obj.type === 'item') {
        ctx.translate(obj.x, obj.displayY);
        const img = this.itemImages[obj.index];
        if (img && img.complete && img.width > 0) {
          ctx.drawImage(img, -obj.width * 0.5, -obj.height * 0.5, obj.width, obj.height);
        }
      } else {
        // 악당 렌더링: 원본 종횡비 100% 유지 & 발과 그림자 완벽 밀착!
        const img = this.obsImages[obj.index];
        if (img && img.complete && img.width > 0) {
          const naturalAspect = img.naturalWidth / img.naturalHeight;
          const drawH = obj.height;
          const drawW = drawH * naturalAspect; // 원본 비율 그대로 계산하여 찌그러짐 방지!

          // 1. 바닥 그림자 (기준선 baseY + shadowYOffset 에 위치)
          const shadowY = obj.baseY + (obsCfg.shadowYOffset || 0);
          const shadowDist = obj.baseY - obj.displayY;
          const shadowScale = Math.max(0.65, 1 - shadowDist / 35);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
          ctx.beginPath();
          // 발 크기 및 형태에 맞춘 타원 그림자
          ctx.ellipse(obj.x, shadowY, (drawW * 0.42) * shadowScale, 12 * shadowScale, 0, 0, Math.PI * 2);
          ctx.fill();

          // 2. 악당 본체 (발바닥이 displayY + imageYOffset에 정확히 닿아 그림자와 틈 없이 밀착)
          const footY = obj.displayY + (obsCfg.imageYOffset || 0);
          ctx.translate(obj.x, footY);
          ctx.drawImage(img, -drawW * 0.5, -drawH, drawW, drawH);
        }
      }

      ctx.restore();
    });

    // 3. 우상단으로 날아가는 악당 (그림자 완전 소멸, 이미지 중심 기준 시계방향 회전, 50% 축소)
    this.flyingObstacles.forEach(fo => {
      const img = this.obsImages[fo.index];
      if (img && img.complete && img.width > 0) {
        ctx.save();
        ctx.translate(fo.x, fo.y);
        ctx.rotate(fo.rot);
        ctx.scale(fo.scale, fo.scale);
        ctx.drawImage(img, -fo.drawW * 0.5, -fo.drawH * 0.5, fo.drawW, fo.drawH);
        ctx.restore();
      }
    });
  }

  // 2. 먹었을 때 나오는 별파티클 (범위 및 지속시간 65%로 감소)
  spawnColorfulStarBurst(x, y) {
    const colors = [
      { fill: '#ff4081', stroke: '#c2185b' },
      { fill: '#ffeb3b', stroke: '#f57f17' },
      { fill: '#00e5ff', stroke: '#0091ea' },
      { fill: '#b388ff', stroke: '#651fff' },
      { fill: '#76ff03', stroke: '#388e3c' },
      { fill: '#ff9100', stroke: '#e65100' }
    ];

    const starCount = 22;
    for (let i = 0; i < starCount; i++) {
      const col = colors[i % colors.length];
      const baseSize = (Math.random() * 12 + 10) * 3;
      // 터지는 범위 65% 수준으로 감소 (4.0 * 0.65 = 2.6)
      const speedMult = 2.6;
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 260 + 80) * speedMult;

      this.game.particles.push({
        type: 'star',
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        size: baseSize,
        color: col.fill,
        strokeColor: col.stroke,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 12,
        // 지속시간 65% 수준으로 단축 (0.80s * 0.65 = 0.52s)
        life: 0.52,
        maxLife: 0.52
      });
    }
  }

  // 지상 부딪힘 파티클 (범위 및 지속시간 65%로 감소)
  spawnHitStars(x, y) {
    for (let i = 0; i < 5; i++) {
      this.game.particles.push({
        type: 'circle',
        x: x,
        y: y - 80,
        vx: (Math.random() - 0.5) * 130,
        vy: -(Math.random() * 90 + 35),
        size: Math.random() * 9 + 6,
        color: '#ff9800',
        life: 0.30,
        maxLife: 0.30
      });
    }
  }
}
