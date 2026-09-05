import { GAME_CONFIG } from './config.js';
import { drawRoundedStar } from './utils.js';

// 리안(Ryan) 캐릭터 클래스
export class Player {
  constructor(game) {
    this.game = game;
    const cfg = GAME_CONFIG.player;

    this.imgRun = new Image();
    this.imgRun.src = 'assets/player/player_run.png';

    this.imgJump = new Image();
    this.imgJump.src = 'assets/player/player_jump.png';

    this.imgDoubleJump = new Image();
    this.imgDoubleJump.src = 'assets/player/player_double_jump.png';

    this.imgHit = new Image();
    this.imgHit.src = 'assets/player/player_hit.png';

    this.currentFrame = 0;
    this.frameTimer = 0;
    this.frameInterval = 0.08;

    this.djumpFrame = 0;
    this.djumpTimer = 0;

    this.displayWidth = cfg.width;
    this.displayHeight = cfg.height;
    this.groundY = cfg.groundY;

    this.x = 640;
    this.targetX = 200;
    this.y = this.groundY;

    this.vy = 0;
    this.gravity = cfg.gravity;
    this.jumpForce = cfg.jumpForce;
    this.doubleJumpForce = cfg.doubleJumpForce;
    this.jumpCount = 0;
    this.isGrounded = true;

    this.isSurprised = false;
    this.surpriseTimer = 0;
    this.surpriseDuration = cfg.surpriseDuration;

    this.dustTimer = 0;
  }

  startRun() {
    this.isMovingToStart = true;
  }

  jump() {
    if (this.isSurprised) return;

    if (this.isGrounded) {
      this.vy = this.jumpForce;
      this.isGrounded = false;
      this.jumpCount = 1;
      this.currentFrame = 1;
      this.game.audio.playJump();
      this.spawnJumpDust();
    } else if (this.jumpCount === 1) {
      this.vy = this.doubleJumpForce;
      this.jumpCount = 2;
      this.djumpFrame = 0;
      this.djumpTimer = 0;
      this.game.audio.playDoubleJump();
      this.spawnJumpSparkles();
    }
  }

  triggerSurprise() {
    if (this.isSurprised) return;
    this.isSurprised = true;
    this.surpriseTimer = this.surpriseDuration;
    this.vy = -260;
    this.isGrounded = false;
    this.game.audio.playSurprise();
  }

  update(dt) {
    if (this.game.state === 'TITLE') {
      this.x = 640;
    } else if (this.game.state === 'STARTING') {
      this.x += (this.targetX - this.x) * dt * 4.0;
      if (Math.abs(this.x - this.targetX) < 5) {
        this.x = this.targetX;
        this.game.state = 'RUNNING';
      }
    } else {
      this.x = this.targetX;
    }

    if (!this.isGrounded) {
      this.vy += this.gravity * dt;
      this.y += this.vy * dt;

      if (this.y >= this.groundY) {
        this.y = this.groundY;
        this.vy = 0;
        this.isGrounded = true;
        this.jumpCount = 0;
        this.spawnLandingDust();
      }
    }

    if (this.isSurprised) {
      this.surpriseTimer -= dt;
      if (this.surpriseTimer <= 0) {
        this.isSurprised = false;
        this.surpriseTimer = 0;
      }
    }

    const cfg = GAME_CONFIG.player;
    this.frameTimer += dt;
    const seq = (cfg.runFrameSequence && cfg.runFrameSequence.length > 0)
      ? cfg.runFrameSequence
      : [0, 1, 2, 3, 4, 5, 6, 7];
    const interval = cfg.runFrameInterval || this.frameInterval || 0.085;

    if (this.frameTimer >= interval) {
      this.frameTimer = 0;
      this.animStep = ((this.animStep || 0) + 1) % seq.length;
      this.currentFrame = seq[this.animStep];
    }

    if (this.jumpCount === 2) {
      this.djumpTimer += dt;
      if (this.djumpTimer >= 0.08) {
        this.djumpTimer = 0;
        this.djumpFrame = (this.djumpFrame + 1) % 4;
      }
    }

    if (this.isGrounded && this.game.state !== 'TITLE' && !this.isSurprised) {
      this.dustTimer += dt;
      if (this.dustTimer > 0.16) {
        this.dustTimer = 0;
        this.spawnRunDust();
      }
    }
  }

  getHitbox() {
    const w = this.displayWidth * 0.6;
    const h = this.displayHeight * 0.75;
    return {
      x: this.x - w * 0.45,
      y: this.y - h,
      width: w,
      height: h
    };
  }

  draw(ctx) {
    ctx.save();
    const cfg = GAME_CONFIG.player;

    if (this.isSurprised) {
      const flash = Math.floor(this.surpriseTimer * 15) % 2 === 0;
      if (flash) ctx.globalAlpha = 0.55;
    }

    const shadowScale = Math.max(0.4, 1 - (this.groundY - this.y) / 400);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.groundY - 5, (this.displayWidth * 0.45) * shadowScale, 12 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    const dx = this.x - this.displayWidth * 0.5;
    const dy = this.y - this.displayHeight;

    const insetX = cfg.cropInsetX;
    const insetY = cfg.cropInsetY;

    // 1. 놀람/부딪힘 모션 (적정 스케일로 줄여서 잘림 방지 & 달리기와 체급 일치)
    if (this.isSurprised && this.imgHit.complete && this.imgHit.width > 0) {
      const naturalAspect = this.imgHit.naturalWidth / this.imgHit.naturalHeight;
      const hitH = this.displayHeight * cfg.hitScaleRatio;
      const hitW = hitH * naturalAspect;
      // 발이 바닥선에 자연스럽게 닿도록 렌더링
      ctx.drawImage(this.imgHit, this.x - hitW * 0.5, this.y - hitH, hitW, hitH);
      this.drawSurpriseStars(ctx, hitH);
    }
    // 2. 2단 점프 덤블링 (4x1)
    else if (this.jumpCount === 2 && this.imgDoubleJump.complete && this.imgDoubleJump.width > 0) {
      const col = this.djumpFrame % 4;
      const fw = this.imgDoubleJump.width / 4;
      const fh = this.imgDoubleJump.height;
      const sx = col * fw + insetX;
      const sy = insetY;
      const sw = fw - (insetX * 2);
      const sh = fh - (insetY * 2);
      ctx.drawImage(this.imgDoubleJump, sx, sy, sw, sh, dx - 10, dy, this.displayWidth * 1.15, this.displayHeight);
    }
    // 3. 1단 점프 (4x2)
    else if (!this.isGrounded && this.imgJump.complete && this.imgJump.width > 0) {
      let jumpFrame = 2;
      if (this.vy < -300) jumpFrame = 1;
      else if (this.vy > 200) jumpFrame = 5;
      else jumpFrame = 3;

      const col = jumpFrame % 4;
      const row = Math.floor(jumpFrame / 4);
      const fw = this.imgJump.width / 4;
      const fh = this.imgJump.height / 2;
      const sx = col * fw + insetX;
      const sy = row * fh + insetY;
      const sw = fw - (insetX * 2);
      const sh = fh - (insetY * 2);
      ctx.drawImage(this.imgJump, sx, sy, sw, sh, dx, dy, this.displayWidth, this.displayHeight);
    }
    // 4. 달리기 (4x2)
    else if (this.imgRun.complete && this.imgRun.width > 0) {
      const col = this.currentFrame % 4;
      const row = Math.floor(this.currentFrame / 4);
      const fw = this.imgRun.width / 4;
      const fh = this.imgRun.height / 2;
      const sx = col * fw + insetX;
      const sy = row * fh + insetY;
      const sw = fw - (insetX * 2);
      const sh = fh - (insetY * 2);

      const groundOffsetRatio = (cfg.frameGroundOffsets && cfg.frameGroundOffsets[this.currentFrame]) || 0;
      const groundOffset = this.displayHeight * groundOffsetRatio;

      ctx.drawImage(this.imgRun, sx, sy, sw, sh, dx, dy + groundOffset, this.displayWidth, this.displayHeight);
    }

    ctx.restore();
  }

  // 머리 위를 회전하는 귀여운 모서리가 둥근 노란 젤리별! (왼쪽 20px 이동 반영)
  drawSurpriseStars(ctx, charHeight = this.displayHeight) {
    const pCfg = GAME_CONFIG.player;
    const offsetX = (pCfg && pCfg.surpriseStarOffsetX !== undefined) ? pCfg.surpriseStarOffsetX : -20;
    const starCount = 3;
    const time = (this.surpriseDuration - this.surpriseTimer) * 7.5;
    const headY = this.y - charHeight - 16;
    const centerX = this.x + offsetX;

    for (let i = 0; i < starCount; i++) {
      const angle = time + (i * Math.PI * 2) / starCount;
      const sx = centerX + Math.cos(angle) * 38;
      const sy = headY + Math.sin(angle) * 14;

      // 둥근 젤리 별 드로잉
      drawRoundedStar(ctx, sx, sy, 5, 13, 7, 3, '#ffeb3b', '#f57f17', 2);
    }
  }

  spawnRunDust() {
    this.game.particles.push({
      type: 'circle',
      x: this.x - 25,
      y: this.groundY - 5,
      vx: -(Math.random() * 90 + 50),
      vy: -(Math.random() * 30 + 10),
      size: Math.random() * 9 + 6,
      color: 'rgba(230, 225, 215, 0.7)',
      life: 0.35,
      maxLife: 0.35
    });
  }

  spawnJumpDust() {
    for (let i = 0; i < 6; i++) {
      this.game.particles.push({
        type: 'circle',
        x: this.x + (Math.random() * 40 - 20),
        y: this.groundY - 5,
        vx: (Math.random() - 0.5) * 120,
        vy: -(Math.random() * 40 + 20),
        size: Math.random() * 10 + 6,
        color: 'rgba(255, 255, 255, 0.85)',
        life: 0.4,
        maxLife: 0.4
      });
    }
  }

  spawnLandingDust() {
    for (let i = 0; i < 8; i++) {
      this.game.particles.push({
        type: 'circle',
        x: this.x + (Math.random() * 50 - 25),
        y: this.groundY - 5,
        vx: (Math.random() - 0.5) * 160,
        vy: -(Math.random() * 50 + 20),
        size: Math.random() * 12 + 8,
        color: 'rgba(240, 235, 225, 0.9)',
        life: 0.45,
        maxLife: 0.45
      });
    }
  }

  spawnJumpSparkles() {
    for (let i = 0; i < 8; i++) {
      this.game.particles.push({
        type: 'star',
        x: this.x + (Math.random() * 30 - 15),
        y: this.y - 60 + (Math.random() * 30 - 15),
        vx: (Math.random() - 0.5) * 120,
        vy: (Math.random() - 0.5) * 120,
        size: Math.random() * 10 + 8,
        color: ['#ffeb3b', '#00e5ff', '#ff4081', '#76ff03'][i % 4],
        strokeColor: ['#f57f17', '#0091ea', '#c2185b', '#388e3c'][i % 4],
        life: 0.4,
        maxLife: 0.4
      });
    }
  }
}
