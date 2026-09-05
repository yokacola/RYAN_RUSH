import { GAME_CONFIG } from './config.js';
import { AudioManager } from './audio.js';
import { Player } from './player.js';
import { Background } from './background.js';
import { Spawner } from './spawner.js';
import { UIManager } from './ui.js';
import { drawRoundedStar } from './utils.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.width = 1280;
    this.height = 720;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.audio = new AudioManager();
    this.player = new Player(this);
    this.background = new Background(this);
    this.spawner = new Spawner(this);
    this.ui = new UIManager(this);

    this.state = 'TITLE';
    this.score = 0;

    const spdCfg = GAME_CONFIG.speed;
    this.speed = spdCfg.title;
    this.targetSpeed = spdCfg.run;

    this.particles = [];
    this.touchRipples = [];
    this.lastTime = performance.now();
  }

  addScore(pts = 1) {
    this.score += pts;
  }

  handleInput(canvasX, canvasY, isKeyboard = false) {
    this.audio.init();
    this.audio.playBGM(); // 배경음악 즉시 재생 보장

    // 키보드 입력 시에는 화면 중앙 터치 이펙트를 띄우지 않음
    if (!isKeyboard && canvasX !== null && canvasY !== null && canvasX !== undefined && canvasY !== undefined) {
      this.spawnTouchRipple(canvasX, canvasY);
    }

    if (this.state === 'TITLE') {
      // 키보드(스페이스/위) 또는 시작 버튼을 클릭했을 때만 게임 시작
      const isStartBtn = isKeyboard || (canvasX !== null && canvasY !== null && this.ui.isStartButtonClicked(canvasX, canvasY));
      if (isStartBtn) {
        this.state = 'STARTING';
        this.player.startRun();
        this.audio.playStart();
        this.spawner.reset();
      }
      return;
    } else if (this.state === 'RUNNING' || this.state === 'STARTING') {
      this.player.jump();
    }
  }

  update(dt) {
    const spdCfg = GAME_CONFIG.speed;

    if (this.state === 'TITLE') {
      this.speed = spdCfg.title;
    } else if (this.state === 'STARTING') {
      this.speed += (spdCfg.run - this.speed) * dt * 2.0;
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
      p.vy += 180 * dt;
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
    this.player.draw(this.ctx);
    this.drawParticles(this.ctx);
    this.drawTouchRipples(this.ctx);
    this.ui.draw(this.ctx);
  }

  drawParticles(ctx) {
    this.particles.forEach(p => {
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
