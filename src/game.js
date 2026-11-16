import { GAME_CONFIG } from './config.js?v=26';
import { AudioManager } from './audio.js?v=26';
import { Player } from './player.js?v=26';
import { Background } from './background.js?v=26';
import { Spawner } from './spawner.js?v=26';
import { UIManager } from './ui.js?v=26';
import { ProfileManager } from './profile.js?v=26';
import { drawRoundedStar } from './utils.js?v=8';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.width = 1280;
    this.height = 720;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.childName = '리안';
    this.isPresetMode = false;

    this.audio = new AudioManager();
    this.player = new Player(this);
    this.background = new Background(this);
    this.spawner = new Spawner(this);
    this.ui = new UIManager(this);
    this.profile = new ProfileManager(this);

    this.state = 'TITLE';
    this.score = 0;

    const spdCfg = GAME_CONFIG.speed;
    this.speed = spdCfg.title;
    this.targetSpeed = spdCfg.run;

    this.particles = [];
    this.touchRipples = [];
    this.lastTime = performance.now();
  }

  applyProfile(childName, faceDataUrl, ovalAspectX = 0.92) {
    this.childName = (childName || '리안').trim() || '리안';
    document.title = `달려라 ${this.childName}!!`;
    this.player.setFaceImage(faceDataUrl, ovalAspectX);
  }

  returnToTitle() {
    this.state = 'TITLE';
    this.spawner.reset();
    this.player.resetLineup();
  }

  toggleFullscreen() {
    const elem = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => { });
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => { });
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }

  addScore(pts = 1) {
    this.score += pts;
  }

  handleInput(canvasX, canvasY, isKeyboard = false) {
    if (this.profile && this.profile.modal && !this.profile.modal.classList.contains('hidden')) {
      return;
    }

    this.audio.init();
    this.audio.playBGM();

    if (!isKeyboard && canvasX !== null && canvasY !== null && canvasX !== undefined && canvasY !== undefined) {
      this.spawnTouchRipple(canvasX, canvasY);

      // 0. 상단 좌측 [전체화면] 버튼 클릭 확인 (타이틀 & 게임중 공통)
      if (this.ui.isFullscreenButtonClicked(canvasX, canvasY)) {
        this.toggleFullscreen();
        return;
      }
    }

    if (this.state === 'TITLE') {
      // 1. 하단 [아이 사진 · 이름 변경] 버튼 클릭 확인 (특정 URL 프리셋 모드에서는 비활성화)
      if (!isKeyboard && !this.isPresetMode && this.ui.isPhotoButtonClicked(canvasX, canvasY)) {
        this.profile.openModal();
        return;
      }

      // 2. 도로 위 3대 차량(소방차 / 구급차 / 경찰차) 중 하나 클릭 확인
      const clickedVehicle = isKeyboard
        ? (this.player.selectedType || 'fire')
        : this.player.getClickedLineupVehicle(canvasX, canvasY);

      if (clickedVehicle) {
        this.state = 'STARTING';
        this.player.startRun(clickedVehicle);
        this.audio.playStart();
        this.spawner.reset();
      }
      return;
    } else if (this.state === 'RUNNING' || this.state === 'STARTING') {
      // 상단 [나가기] 버튼 클릭 시 타이틀(차량 선택) 화면으로 복귀
      if (!isKeyboard && this.ui.isExitButtonClicked(canvasX, canvasY)) {
        this.returnToTitle();
        return;
      }
      this.player.jump();
    }
  }

  update(dt) {
    const spdCfg = GAME_CONFIG.speed;

    if (this.state === 'TITLE') {
      this.speed = spdCfg.title;
    } else if (this.state === 'STARTING') {
      this.speed += (spdCfg.run - this.speed) * dt * 2.5;
    } else if (this.state === 'RUNNING') {
      if (this.player.isSurprised) {
        this.speed = spdCfg.surprise;
      } else {
        this.speed = spdCfg.run;
      }
    }

    this.background.update(dt, this.speed);
    this.player.update(dt);
    this.spawner.update(dt, this.speed);
    this.ui.update(dt);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.type === 'exhaust') {
        p.vy -= 22 * dt;
        p.size += (p.growRate || 22) * dt;
      } else if (p.type === 'flame') {
        // 로켓 불꽃 파티클: 뒤쪽으로 빠르게 뿜어지며 크기가 줄어듦
        p.vy -= 30 * dt;
      } else {
        p.vy += 180 * dt;
      }

      if (p.rotSpeed) {
        p.rot = (p.rot || 0) + p.rotSpeed * dt;
      }
    }

    for (let i = this.touchRipples.length - 1; i >= 0; i--) {
      const r = this.touchRipples[i];
      r.life -= dt;
      if (r.life <= 0) {
        this.touchRipples.splice(i, 1);
        continue;
      }
      r.radius += dt * 100;
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.background.draw(this.ctx);
    this.spawner.draw(this.ctx);
    this.drawExhaustParticles(this.ctx);
    this.player.draw(this.ctx);
    this.drawParticles(this.ctx);
    this.drawTouchRipples(this.ctx);
    this.ui.draw(this.ctx);
  }

  // 차량 뒤쪽 배기 연기 및 로켓 화염 파티클 렌더링
  drawExhaustParticles(ctx) {
    this.particles.forEach(p => {
      if (p.type !== 'exhaust' && p.type !== 'flame') return;
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();

      if (p.type === 'flame') {
        ctx.globalAlpha = Math.min(1, alpha * 1.15);
        const r = p.size * (0.45 + 0.55 * alpha);
        ctx.fillStyle = p.color || '#ff6d00';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = p.coreColor || '#ffea00';
        ctx.beginPath();
        ctx.arc(p.x + r * 0.2, p.y, r * 0.52, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.globalAlpha = alpha * 0.78;
        ctx.fillStyle = p.color || 'rgba(245, 248, 252, 0.85)';
        ctx.strokeStyle = p.strokeColor || 'rgba(180, 195, 210, 0.55)';
        ctx.lineWidth = 2;

        const r = p.size;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.arc(p.x - r * 0.55, p.y + r * 0.15, r * 0.72, 0, Math.PI * 2);
        ctx.arc(p.x + r * 0.45, p.y - r * 0.18, r * 0.65, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  drawParticles(ctx) {
    this.particles.forEach(p => {
      if (p.type === 'exhaust' || p.type === 'flame') return;
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.type === 'star') {
        ctx.translate(p.x, p.y);
        if (p.rot) ctx.rotate(p.rot);
        const rOuter = p.size * alpha;
        const rInner = p.size * 0.52 * alpha;
        const cornerR = Math.max(2, p.size * 0.14 * alpha);
        const strokeW = Math.max(1.5, p.size * 0.07);
        drawRoundedStar(ctx, 0, 0, 5, rOuter, rInner, cornerR, p.color, p.strokeColor, strokeW);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  }

  drawTouchRipples(ctx) {
    ctx.save();
    this.touchRipples.forEach(r => {
      const alpha = Math.max(0, r.life / r.maxLife);
      ctx.strokeStyle = `rgba(255, 235, 59, ${alpha * 0.8})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.restore();
  }

  spawnTouchRipple(x, y) {
    this.touchRipples.push({
      x: x,
      y: y,
      radius: 10,
      life: 0.35,
      maxLife: 0.35
    });

    const colors = [
      { fill: '#ffeb3b', stroke: '#f57f17' },
      { fill: '#ff4081', stroke: '#c2185b' },
      { fill: '#00e5ff', stroke: '#0091ea' }
    ];

    for (let i = 0; i < 5; i++) {
      const col = colors[i % colors.length];
      this.particles.push({
        type: 'star',
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 160,
        vy: (Math.random() - 0.5) * 160,
        size: Math.random() * 8 + 6,
        color: col.fill,
        strokeColor: col.stroke,
        life: 0.35,
        maxLife: 0.35
      });
    }
  }

  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    requestAnimationFrame(t => this.loop(t));
  }

  start() {
    this.lastTime = performance.now();
    requestAnimationFrame(t => this.loop(t));
  }
}
