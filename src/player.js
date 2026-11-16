import { GAME_CONFIG } from './config.js?v=23';
import { drawRoundedStar } from './utils.js?v=12';

// 소방차 / 구급차 / 경찰차 + 흔드는 팔 + 아이 얼굴 + 턱끈 없는 헬멧 + 정밀 사이렌 반짝임 + 1단점프 하단 스프링 + 2단점프 앞/뒤 바퀴축 로켓불꽃 & 연기
export class Player {
  constructor(game) {
    this.game = game;
    const cfg = GAME_CONFIG.player;

    // 1. 자동차 본체 스프라이트 (URL 파라미터 ?police=1~5, ?amb=1~4 지원)
    const urlParams = new URLSearchParams(window.location.search);
    const policeType = urlParams.get('police');
    const policeFile = (policeType && ['1', '2', '3', '4', '5'].includes(policeType))
      ? `assets/player/vehicle_police_${policeType}.png?v=23`
      : 'assets/player/vehicle_police.png?v=23';

    const ambType = urlParams.get('amb');
    const ambFile = (ambType && ['1', '2', '3', '4'].includes(ambType))
      ? `assets/player/vehicle_ambulance_${ambType}.png?v=23`
      : 'assets/player/vehicle_ambulance.png?v=23';

    this.vehicleImages = {
      fire: new Image(),
      ambulance: new Image(),
      police: new Image(),
    };
    this.vehicleImages.fire.src = 'assets/player/vehicle_fire.png?v=23';
    this.vehicleImages.ambulance.src = ambFile;
    this.vehicleImages.police.src = policeFile;

    // 2. 안녕~ 흔드는 팔 스프라이트 (차량별 맞춤 소매 & 아기 손)
    this.armImages = {
      fire: new Image(),
      ambulance: new Image(),
      police: new Image(),
    };
    this.armImages.fire.src = 'assets/player/arm_fire.png?v=23';
    this.armImages.ambulance.src = 'assets/player/arm_ambulance.png?v=23';
    this.armImages.police.src = 'assets/player/arm_police.png?v=23';
    this.armImg = this.armImages.fire;

    // 2-2. 출동대원 몸통(상체 제복) 레이어 스프라이트 (차량별 맞춤 제복)
    this.bodyImages = {
      fire: new Image(),
      ambulance: new Image(),
      police: new Image(),
    };
    this.bodyImages.fire.src = 'assets/player/body_fire.png?v=23';
    this.bodyImages.ambulance.src = 'assets/player/body_ambulance.png?v=23';
    this.bodyImages.police.src = 'assets/player/body_police.png?v=23';

    // 3. 기본 아이 얼굴 & 사용자 커스텀 크롭 얼굴
    this.defaultFaceImg = new Image();
    this.defaultFaceImg.src = 'assets/player/default_face.png?v=22';
    this.customFaceImg = null;
    this.faceAspectX = 1.0;

    // 4. 턱끈을 제거한 헬멧 레이어 스프라이트
    this.helmetImages = {
      fire: new Image(),
      ambulance: new Image(),
      police: new Image(),
    };
    this.helmetImages.fire.src = 'assets/player/helmet_fire.png?v=22';
    this.helmetImages.ambulance.src = 'assets/player/helmet_ambulance.png?v=22';
    this.helmetImages.police.src = 'assets/player/helmet_police.png?v=22';

    this.selectedType = 'fire';

    this.displayWidth = cfg.width;
    this.displayHeight = cfg.height;
    this.groundY = cfg.groundY;

    this.x = 270;
    this.targetX = 235;
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

    this.animTime = 0;
    this.wheelieTilt = 0;
    this.springTimer = 0;
    this.exhaustTimer = 0;
    this.boosterSmokeTimer = 0;

    // 타이틀 화면 3대 차량 상태 (선택 후 퇴장 연출 포함)
    this.lineupCars = cfg.lineup.map((item, idx) => ({
      type: item.type,
      name: item.name,
      badgeColor: item.badgeColor,
      baseX: item.x,
      x: item.x,
      y: this.groundY,
      phase: idx * 2.1,
    }));
  }

  setFaceImage(dataUrl, ovalAspectX = 0.92) {
    this.faceAspectX = (ovalAspectX !== undefined && ovalAspectX !== null) ? (ovalAspectX / 0.92) : 1.0;
    if (!dataUrl) {
      this.customFaceImg = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      this.customFaceImg = img;
    };
    img.src = dataUrl;
  }

  getActiveFaceImage() {
    if (this.customFaceImg && this.customFaceImg.complete && this.customFaceImg.width > 0) {
      return this.customFaceImg;
    }
    return this.defaultFaceImg;
  }

  resetLineup() {
    const cfg = GAME_CONFIG.player;
    this.lineupCars = cfg.lineup.map((item, idx) => ({
      type: item.type,
      name: item.name,
      badgeColor: item.badgeColor,
      baseX: item.x,
      x: item.x,
      y: this.groundY,
      phase: idx * 2.1,
    }));
    this.y = this.groundY;
    this.vy = 0;
    this.isGrounded = true;
    this.jumpCount = 0;
    this.wheelieTilt = 0;
    this.isSurprised = false;
  }

  getClickedLineupVehicle(canvasX, canvasY) {
    if (canvasX === null || canvasY === null || canvasX === undefined || canvasY === undefined) {
      return null;
    }
    const w = this.displayWidth * 0.96;
    const h = this.displayHeight * 0.96;

    for (const car of this.lineupCars) {
      const left = car.x - w * 0.48;
      const right = car.x + w * 0.48;
      const top = car.y - h - 55;
      const bottom = car.y + 20;
      if (canvasX >= left && canvasX <= right && canvasY >= top && canvasY <= bottom) {
        return car.type;
      }
    }
    return null;
  }

  startRun(chosenType = 'fire') {
    this.selectedType = chosenType || 'fire';
    const chosenCar = this.lineupCars.find(c => c.type === this.selectedType);
    this.x = chosenCar ? chosenCar.x : 640;
    this.y = this.groundY;
    this.vy = 0;
    this.isGrounded = true;
    this.jumpCount = 0;
    this.wheelieTilt = 0;
  }

  jump() {
    if (this.isSurprised) return;

    if (this.isGrounded) {
      // 1단 점프: 자동차 하단 중앙에서 스프링이 띠용~ 튀어나오며 점프!
      this.vy = this.jumpForce;
      this.isGrounded = false;
      this.jumpCount = 1;
      this.springTimer = 0;
      this.wheelieTilt = 0;
      this.game.audio.playJump();
      this.spawnJumpDust();
    } else if (this.jumpCount === 1) {
      // 2단 점프: 앞바퀴를 높이 들며(Wheelie) 하부 앞바퀴 축 & 뒷바퀴 축에서 뾰족한 로켓 불꽃 + 연기 분사!
      this.vy = this.doubleJumpForce;
      this.jumpCount = 2;
      this.wheelieTilt = -0.44;
      this.boosterSmokeTimer = 0;
      this.game.audio.playDoubleJump();
      this.spawnBoosterSmokeBurst();
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
    this.animTime += dt;
    this.exhaustTimer += dt;

    if (this.game.state === 'TITLE') {
      this.lineupCars.forEach(car => {
        car.x = car.baseX + Math.sin(this.animTime * 2.2 + car.phase) * 5;
      });
      if (this.exhaustTimer >= 0.085) {
        this.exhaustTimer = 0;
        const w = this.displayWidth * 0.95;
        this.lineupCars.forEach(car => {
          this.spawnExhaustPuff(car.x - w * 0.42, car.y - 26, 0.78);
        });
      }
      return;
    }

    if (this.game.state === 'STARTING') {
      this.lineupCars.forEach(car => {
        if (car.type !== this.selectedType) {
          car.x -= 850 * dt;
        }
      });

      this.x += (this.targetX - this.x) * dt * 4.5;
      if (Math.abs(this.x - this.targetX) < 6) {
        this.x = this.targetX;
        this.game.state = 'RUNNING';
      }
    } else {
      this.x = this.targetX;
    }

    // 지상 주행 시 일반 연기 파티클 생성
    if (this.isGrounded && this.exhaustTimer >= 0.065) {
      this.exhaustTimer = 0;
      this.spawnExhaustPuff(this.x - this.displayWidth * 0.42, this.y - 28, 1.0);
    }

    if (!this.isGrounded) {
      this.vy += this.gravity * dt;
      this.y += this.vy * dt;

      if (this.y >= this.groundY) {
        this.y = this.groundY;
        this.vy = 0;
        this.isGrounded = true;
        this.jumpCount = 0;
        this.springTimer = 0;
        this.wheelieTilt = 0;
        this.spawnLandingDust();
      }
    }

    // 1단 점프 중: 하단 스프링 타이머 업데이트
    if (this.jumpCount === 1 && !this.isGrounded) {
      this.springTimer += dt;
    }

    // 2단 점프 중: 앞바퀴를 높이 든 자세 유지 + 앞바퀴축/뒷바퀴축 부스터 불꽃 뒤로 뭉게뭉게 연기 분사
    if (this.jumpCount === 2 && !this.isGrounded) {
      const targetWheelie = this.vy < 180 ? -0.43 : -0.26;
      this.wheelieTilt += (targetWheelie - this.wheelieTilt) * Math.min(1, dt * 12);

      this.boosterSmokeTimer += dt;
      if (this.boosterSmokeTimer >= 0.042) {
        this.boosterSmokeTimer = 0;
        this.spawnBoosterSmokeStream();
      }
    } else {
      this.wheelieTilt = 0;
    }

    if (this.isSurprised) {
      this.surpriseTimer -= dt;
      if (this.surpriseTimer <= 0) {
        this.isSurprised = false;
        this.surpriseTimer = 0;
      }
    }
  }

  getHitbox() {
    const w = this.displayWidth * 0.60;
    const h = this.displayHeight * 0.72;
    return {
      x: this.x - w * 0.5,
      y: this.y - h,
      width: w,
      height: h
    };
  }

  // 차량 지붕 위 사이렌(경광등) 이미지 위치에 1px 오차 없이 맞춘 반짝임 & 빛줄기 이펙트
  drawSirenFlash(ctx, type, dx, dy, width, height, wavePhase = 0) {
    const sirenMap = (GAME_CONFIG.player && GAME_CONFIG.player.sirenSlots) || {};
    const sCfg = sirenMap[type] || {
      leftX: 0.555,
      leftY: 0.122,
      rightX: 0.655,
      rightY: 0.128,
      leftColor: '#ff1744',
      rightColor: '#00e5ff'
    };

    const cycle = this.animTime * 10.0 + wavePhase;
    const isLeftActive = Math.sin(cycle) >= 0;
    const pulse = 0.72 + 0.28 * Math.abs(Math.sin(cycle * 2));

    const activeX = dx + width * (isLeftActive ? sCfg.leftX : sCfg.rightX);
    const activeY = dy + height * (isLeftActive ? (sCfg.leftY || 0.122) : (sCfg.rightY || 0.128));
    const activeColor = isLeftActive ? sCfg.leftColor : sCfg.rightColor;

    // 왼쪽 빨간 램프는 좌상단 바깥으로, 오른쪽 파란 램프는 우상단 바깥으로 빛줄기 방사
    const rayAngles = isLeftActive
      ? [-2.42, -2.02, -1.65]
      : [-1.48, -1.10, -0.70];

    ctx.save();
    ctx.translate(activeX, activeY);

    // 1. 경광등 돔 내부 & 주변 네온 글로우 후광
    const glowR = width * 0.062 * pulse;
    const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, glowR);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.42, activeColor);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fill();

    // 2. 경광등 돔 바깥으로 뻗어 나가는 선명한 빛줄기 (Light Rays)
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    const r1 = width * 0.036;
    const r2 = width * 0.068 * pulse;
    for (let i = 0; i < rayAngles.length; i++) {
      const ang = rayAngles[i];
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
      ctx.lineTo(Math.cos(ang) * r2, Math.sin(ang) * r2);
      ctx.stroke();
    }

    // 3. 램프 중심 하이라이트 코어
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, width * 0.016 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 1단 점프 시 자동차 하단 중앙에서 띠용~ 튀어나오는 카툰 코일 스프링 연출
  drawJumpSpring(ctx, dx, dy, width, height) {
    const t = this.springTimer || 0;
    const popIn = Math.min(1.0, t * 14.0);
    const boing = Math.exp(-t * 4.2) * Math.cos(t * 28.0) * 0.38;
    const springLen = Math.max(18, height * 0.35 * popIn * (1.0 + boing));
    const coilW = 19;
    const coils = 5;

    const sx = dx + width * 0.485;
    const sy = dy + height * 0.77;

    ctx.save();
    ctx.translate(sx, sy);

    // 1. 차체 하부 장착 플레이트
    ctx.fillStyle = '#263238';
    ctx.strokeStyle = '#11171a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-coilW - 2, -4, (coilW + 2) * 2, 8, 3);
    ctx.fill();
    ctx.stroke();

    // 2. 지그재그 강철 코일 스프링 (외곽 검정 테두리 + 내부 메탈릭 실버)
    const stepY = springLen / (coils * 2);
    const drawCoilPath = () => {
      ctx.beginPath();
      ctx.moveTo(0, 3);
      for (let i = 0; i < coils * 2; i++) {
        const dir = (i % 2 === 0) ? 1 : -1;
        const nx = dir * coilW;
        const ny = 3 + (i + 0.5) * stepY;
        ctx.lineTo(nx, ny);
      }
      ctx.lineTo(0, 3 + springLen);
    };

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.strokeStyle = '#1c242b';
    ctx.lineWidth = 9.0;
    drawCoilPath();
    ctx.stroke();

    ctx.strokeStyle = '#cfd8dc';
    ctx.lineWidth = 4.6;
    drawCoilPath();
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    drawCoilPath();
    ctx.stroke();

    // 3. 스프링 하단 레드/옐로우 점프 패드
    const padY = 3 + springLen;
    ctx.fillStyle = '#ff1744';
    ctx.strokeStyle = '#1c242b';
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.roundRect(-coilW - 5, padY - 3, (coilW + 5) * 2, 11, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffea00';
    ctx.beginPath();
    ctx.roundRect(-coilW + 2, padY - 1, (coilW - 2) * 2, 4, 2);
    ctx.fill();

    ctx.restore();
  }

  // 2단 점프 중 자동차 하부 앞바퀴 축 & 뒷바퀴 축에서 뿜어져 나오는 뾰족한 3중 로켓 부스터 불꽃 이펙트
  drawSingleAxleBooster(ctx, ax, ay, scale = 1.0, phaseOffset = 0) {
    const flicker = 0.86 + Math.sin(this.animTime * 58 + phaseOffset) * 0.18;
    const flameLen = 88 * scale * flicker;

    ctx.save();
    ctx.translate(ax, ay);
    // 바퀴 축 하부에서 뒤쪽·아래쪽 대각선으로 강하게 분사
    ctx.rotate(-0.52);

    // 1. 외부 레드-오렌지 뾰족한 불꽃
    const outerGrad = ctx.createLinearGradient(0, 0, -flameLen, 0);
    outerGrad.addColorStop(0, '#ff9100');
    outerGrad.addColorStop(0.58, '#ff3d00');
    outerGrad.addColorStop(1, 'rgba(213, 0, 0, 0)');
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.moveTo(6, -13 * scale);
    ctx.quadraticCurveTo(-flameLen * 0.42, -21 * scale * flicker, -flameLen, 0);
    ctx.quadraticCurveTo(-flameLen * 0.42, 21 * scale * flicker, 6, 13 * scale);
    ctx.closePath();
    ctx.fill();

    // 2. 중간 골드-옐로우 뾰족한 불꽃
    const midLen = flameLen * 0.72;
    ctx.fillStyle = '#ffea00';
    ctx.beginPath();
    ctx.moveTo(6, -9 * scale);
    ctx.quadraticCurveTo(-midLen * 0.42, -13 * scale * flicker, -midLen, 0);
    ctx.quadraticCurveTo(-midLen * 0.42, 13 * scale * flicker, 6, 9 * scale);
    ctx.closePath();
    ctx.fill();

    // 3. 내부 화이트 코어 뾰족한 불꽃
    const coreLen = flameLen * 0.42;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(6, -5 * scale);
    ctx.quadraticCurveTo(-coreLen * 0.42, -7 * scale, -coreLen, 0);
    ctx.quadraticCurveTo(-coreLen * 0.42, 7 * scale, 6, 5 * scale);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawRocketBoosterFlame(ctx, dx, dy, width, height) {
    // 뒷바퀴 축(x=0.325, y=0.809) 및 앞바퀴 축(x=0.644, y=0.809) 하부에서 동시 분사!
    const rearAxleX = dx + width * 0.325;
    const rearAxleY = dy + height * 0.81;
    const frontAxleX = dx + width * 0.644;
    const frontAxleY = dy + height * 0.81;

    this.drawSingleAxleBooster(ctx, rearAxleX, rearAxleY, 1.0, 0);
    this.drawSingleAxleBooster(ctx, frontAxleX, frontAxleY, 0.95, 1.7);
  }

  // 레이어 순서: 1. 자동차 본체(차) -> 2. 좌우 양팔(팔) -> 3. 출동대원 몸통(몸통) -> 4. 아이 얼굴(머리) -> 5. 턱끈 없는 헬멧(헬멧) -> 6. 사이렌 반짝임
  drawVehicleWithFace(ctx, type, centerX, footY, width, height, tiltRad = 0, bounceY = 0, isFlashing = false, wavePhase = 0, isRocketBoost = false, isSpringJump = false) {
    const vehImg = this.vehicleImages[type] || this.vehicleImages.fire;
    const helmImg = this.helmetImages[type] || this.helmetImages.fire;
    const bodyImg = (this.bodyImages && this.bodyImages[type]) || (this.bodyImages && this.bodyImages.fire);
    const faceImg = this.getActiveFaceImage();
    const slot = GAME_CONFIG.player.faceSlot;
    const armPivotCfg = GAME_CONFIG.player.armPivot || { pxRatio: 0.4042, pyRatio: 0.4367 };

    ctx.save();
    if (isFlashing) {
      ctx.globalAlpha = 0.6;
    }

    // 0. 도로 바닥 타원 그림자
    const airDist = Math.max(0, this.groundY - footY);
    const shadowScale = Math.max(0.42, 1 - airDist / 380);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.26)';
    ctx.beginPath();
    ctx.ellipse(centerX, this.groundY - 4, (width * 0.36) * shadowScale, 12 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    const pivotX = centerX;
    const pivotY = footY - height * 0.48 + bounceY;
    ctx.translate(pivotX, pivotY);
    if (tiltRad !== 0) {
      ctx.rotate(tiltRad);
    }

    const dx = -width * 0.5;
    const dy = -height * 0.48;

    // [1단 점프 시 자동차 하단 스프링 연출]
    if (isSpringJump) {
      this.drawJumpSpring(ctx, dx, dy, width, height);
    }

    // [2단 점프 시 앞바퀴 축 & 뒷바퀴 축 하부 뾰족한 로켓 부스터 불꽃 (차체 뒤쪽 레이어)]
    if (isRocketBoost) {
      this.drawRocketBoosterFlame(ctx, dx, dy, width, height);
    }

    // [Layer 1] 자동차 본체 (차)
    const tune = (GAME_CONFIG.player.tuning && GAME_CONFIG.player.tuning[type]) || (GAME_CONFIG.player.tuning && GAME_CONFIG.player.tuning.fire) || null;

    if (vehImg && vehImg.complete && vehImg.width > 0) {
      if (tune && tune.vehicle && (tune.vehicle.scale !== 1 || tune.vehicle.x !== 0 || tune.vehicle.y !== 0)) {
        ctx.save();
        ctx.translate(dx + width * 0.5 + (tune.vehicle.x / 960) * width, dy + height * 0.5 + (tune.vehicle.y / 664) * height);
        ctx.scale(tune.vehicle.scale, tune.vehicle.scale);
        ctx.drawImage(vehImg, -width * 0.5, -height * 0.5, width, height);
        ctx.restore();
      } else {
        ctx.drawImage(vehImg, dx, dy, width, height);
      }
    }

    // [2단 점프 시 바퀴 축 중심 코어 불꽃이 타이어 허브에서도 선명히 보이도록 하이라이트]
    if (isRocketBoost) {
      ctx.save();
      ctx.globalAlpha = 0.72;
      this.drawRocketBoosterFlame(ctx, dx, dy, width, height);
      ctx.restore();
    }

    // [Layer 1.5] 지붕 경광등(사이렌) 정밀 반짝임 이펙트 (자동차와 캐릭터 사이 레이어)
    this.drawSirenFlash(ctx, type, dx, dy, width, height, wavePhase);

    const faceCX = dx + width * (tune && tune.face ? tune.face.cx / 960 : slot.cxRatio);
    const faceCY = dy + height * (tune && tune.face ? tune.face.cy / 664 : slot.cyRatio);
    const faceRX = width * (tune && tune.face ? tune.face.rx / 960 : slot.rxRatio) * (this.faceAspectX || 1.0);
    const faceRY = height * (tune && tune.face ? tune.face.ry / 664 : slot.ryRatio);

    const armImg = (this.armImages && this.armImages[type]) || this.armImg;

    // [Layer 2] 좌우 양팔 (팔 - 왼쪽 팔 & 오른쪽 대칭 팔)
    if (armImg && armImg.complete && armImg.width > 0) {
      const armCfg = tune && tune.arm ? tune.arm : null;
      const pivotXRatio = armCfg ? armCfg.pivotX / 960 : armPivotCfg.pxRatio;
      const pivotYRatio = armCfg ? armCfg.pivotY / 664 : armPivotCfg.pyRatio;
      const armScale = armCfg ? armCfg.scale : 1.0;
      const baseAngle = armCfg ? armCfg.baseAngle : 0;
      const waveAmp = armCfg ? armCfg.waveAmp : 0.24;

      const leftPivotX = dx + width * pivotXRatio;
      const leftPivotY = dy + height * pivotYRatio;
      const rightPivotX = faceCX + (faceCX - leftPivotX);
      const rightPivotY = leftPivotY;
      const waveAngle = baseAngle + Math.sin(this.animTime * 8.5 + wavePhase) * waveAmp;

      // 왼쪽 팔
      ctx.save();
      ctx.translate(leftPivotX, leftPivotY);
      ctx.rotate(waveAngle);
      ctx.scale(armScale, armScale);
      ctx.drawImage(armImg, -width * pivotXRatio, -height * pivotYRatio, width, height);
      ctx.restore();

      // 오른쪽 팔 (좌우 대칭)
      ctx.save();
      ctx.translate(rightPivotX, rightPivotY);
      ctx.scale(-armScale, armScale);
      ctx.rotate(waveAngle);
      ctx.drawImage(armImg, -width * pivotXRatio, -height * pivotYRatio, width, height);
      ctx.restore();
    }

    // [Layer 3] 출동대원 몸통 (몸통 - 팔의 어깨 축을 깔끔하게 덮어줌)
    if (bodyImg && bodyImg.complete && bodyImg.width > 0) {
      if (tune && tune.body) {
        const bodyCenterX = dx + width * 0.5 + (tune.body.x / 960) * width;
        const bodyCenterY = dy + height * 0.5 + (tune.body.y / 664) * height;
        ctx.save();
        ctx.translate(bodyCenterX, bodyCenterY);
        ctx.scale(tune.body.scale, tune.body.scale);
        ctx.drawImage(bodyImg, -width * 0.5, -height * 0.5, width, height);
        ctx.restore();
      } else {
        ctx.drawImage(bodyImg, dx, dy, width, height);
      }
    }

    // [Layer 4] 아이 얼굴 (머리 - 몸통 옷깃 위에 자연스럽게 안착)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(faceCX, faceCY, faceRX, faceRY, 0, 0, Math.PI * 2);
    ctx.clip();

    if (faceImg && faceImg.complete && faceImg.width > 0) {
      const isDefault = (faceImg === this.defaultFaceImg) || (faceImg.src && faceImg.src.includes('default_face.png'));
      if (!isDefault) {
        // [사용자 커스텀 등록 사진 / DAWON 프리셋] 모달 크롭 창에서 노란 점선 타원에 맞춘 비율(2.08)과 타원 중심(faceCX, faceCY)에 1:1 정밀 일치!
        const fSize = Math.max(faceRX, faceRY) * 2.08;
        ctx.drawImage(faceImg, faceCX - fSize * 0.5, faceCY - fSize * 0.5, fSize, fSize);
      } else {
        // [기본 샘플 사진 default_face.png] 에셋 튜너에서 조율한 전용 스케일(3.5)과 오프셋(+5, -28) 적용
        const fScale = tune && tune.face ? tune.face.scale : 2.08;
        const fSize = Math.max(faceRX, faceRY) * fScale;
        const offX = tune && tune.face ? (tune.face.offsetX / 960) * width : 0;
        const offY = tune && tune.face ? (tune.face.offsetY / 664) * height : 0;
        ctx.drawImage(faceImg, faceCX - fSize * 0.5 + offX, faceCY - fSize * 0.5 + offY, fSize, fSize);
      }
    }
    ctx.restore();

    // [Layer 5] 턱끈 없는 헬멧 (헬멧)
    if (helmImg && helmImg.complete && helmImg.width > 0) {
      ctx.drawImage(helmImg, dx, dy, width, height);
    }

    ctx.restore();
  }

  draw(ctx) {
    if (this.game.state === 'TITLE') {
      const w = this.displayWidth * 0.95;
      const h = this.displayHeight * 0.95;
      this.lineupCars.forEach(car => {
        const bounce = Math.sin(this.animTime * 14 + car.phase) * 3.0;
        this.drawVehicleWithFace(ctx, car.type, car.x, car.y, w, h, 0, bounce, false, car.phase, false, false);
      });
      return;
    }

    if (this.game.state === 'STARTING') {
      const w = this.displayWidth * 0.95;
      const h = this.displayHeight * 0.95;
      this.lineupCars.forEach(car => {
        if (car.type !== this.selectedType && car.x > -250) {
          const bounce = Math.sin(this.animTime * 14 + car.phase) * 3.0;
          this.drawVehicleWithFace(ctx, car.type, car.x, car.y, w, h, 0, bounce, false, car.phase, false, false);
        }
      });
    }

    let tilt = 0;
    let bounce = 0;
    let isFlashing = false;
    const isSpringJump = (this.jumpCount === 1 && !this.isGrounded);
    const isRocketBoost = (this.jumpCount === 2 && !this.isGrounded);

    if (this.isSurprised) {
      isFlashing = Math.floor(this.surpriseTimer * 15) % 2 === 0;
      tilt = -0.20;
    } else if (!this.isGrounded) {
      if (this.jumpCount === 2) {
        tilt = this.wheelieTilt;
      } else {
        tilt = Math.max(-0.24, Math.min(0.18, this.vy * 0.00032));
      }
    } else {
      bounce = Math.sin(this.animTime * 16) * 2.8;
    }

    this.drawVehicleWithFace(
      ctx,
      this.selectedType,
      this.x,
      this.y,
      this.displayWidth,
      this.displayHeight,
      tilt,
      bounce,
      isFlashing,
      0,
      isRocketBoost,
      isSpringJump
    );

    if (this.isSurprised) {
      this.drawSurpriseStars(ctx, this.displayHeight * 0.92);
    }
  }

  drawSurpriseStars(ctx, charHeight = this.displayHeight) {
    const pCfg = GAME_CONFIG.player;
    const offsetX = (pCfg && pCfg.surpriseStarOffsetX !== undefined) ? pCfg.surpriseStarOffsetX : 0;
    const starCount = 3;
    const time = (this.surpriseDuration - this.surpriseTimer) * 7.5;
    const headY = this.y - charHeight - 10;
    const centerX = this.x + offsetX;

    for (let i = 0; i < starCount; i++) {
      const angle = time + (i * Math.PI * 2) / starCount;
      const sx = centerX + Math.cos(angle) * 42;
      const sy = headY + Math.sin(angle) * 14;
      drawRoundedStar(ctx, sx, sy, 5, 13, 7, 3, '#ffeb3b', '#f57f17', 2);
    }
  }

  // 차량 뒤쪽 배기구에서 뭉게뭉게 피어오르는 연기 파티클
  spawnExhaustPuff(ex, ey, scale = 1.0) {
    this.game.particles.push({
      type: 'exhaust',
      x: ex + (Math.random() * 8 - 4),
      y: ey + (Math.random() * 8 - 4),
      vx: -(Math.random() * 95 + 115),
      vy: -(Math.random() * 28 + 10),
      size: (Math.random() * 7 + 9) * scale,
      growRate: 26 * scale,
      color: 'rgba(245, 248, 252, 0.82)',
      strokeColor: 'rgba(180, 195, 210, 0.55)',
      life: 0.46,
      maxLife: 0.46
    });
  }

  // 2단 점프 순간 앞바퀴 축 & 뒷바퀴 축 부스터 불꽃 뒤로 뿜어져 나오는 연기 폭발
  spawnBoosterSmokeBurst() {
    const axleOffsets = [
      { x: -this.displayWidth * 0.28, y: 26 }, // 뒷바퀴 축 부스터 끝
      { x: this.displayWidth * 0.04, y: 12 },  // 앞바퀴 축 부스터 끝
    ];

    for (const off of axleOffsets) {
      const ex = this.x + off.x;
      const ey = this.y + off.y;
      for (let i = 0; i < 6; i++) {
        this.game.particles.push({
          type: 'exhaust',
          x: ex + (Math.random() * 20 - 10),
          y: ey + (Math.random() * 16 - 8),
          vx: -(Math.random() * 210 + 150),
          vy: Math.random() * 85 + 20,
          size: Math.random() * 9 + 10,
          growRate: 32,
          color: 'rgba(245, 248, 252, 0.88)',
          strokeColor: 'rgba(180, 195, 210, 0.58)',
          life: 0.44,
          maxLife: 0.44
        });
      }
    }
  }

  // 2단 점프 비행 중 앞바퀴 축 & 뒷바퀴 축 부스터 불꽃 끝에서 연속으로 피어오르는 연기 스트림
  spawnBoosterSmokeStream() {
    const axleOffsets = [
      { x: -this.displayWidth * 0.28, y: 28 }, // 뒷바퀴 축 부스터 끝
      { x: this.displayWidth * 0.04, y: 14 },  // 앞바퀴 축 부스터 끝
    ];

    for (const off of axleOffsets) {
      this.game.particles.push({
        type: 'exhaust',
        x: this.x + off.x + (Math.random() * 10 - 5),
        y: this.y + off.y + (Math.random() * 10 - 5),
        vx: -(Math.random() * 170 + 145),
        vy: Math.random() * 65 + 15,
        size: Math.random() * 8 + 9,
        growRate: 28,
        color: 'rgba(245, 248, 252, 0.85)',
        strokeColor: 'rgba(180, 195, 210, 0.55)',
        life: 0.42,
        maxLife: 0.42
      });
    }
  }

  spawnJumpDust() {
    for (let i = 0; i < 6; i++) {
      this.game.particles.push({
        type: 'exhaust',
        x: this.x - 40 + (Math.random() * 60 - 30),
        y: this.groundY - 8,
        vx: -(Math.random() * 140 + 60),
        vy: -(Math.random() * 60 + 15),
        size: Math.random() * 8 + 9,
        growRate: 22,
        color: 'rgba(245, 248, 252, 0.85)',
        strokeColor: 'rgba(180, 195, 210, 0.5)',
        life: 0.38,
        maxLife: 0.38
      });
    }
  }

  spawnLandingDust() {
    for (let i = 0; i < 7; i++) {
      this.game.particles.push({
        type: 'exhaust',
        x: this.x + (Math.random() * 90 - 45),
        y: this.groundY - 6,
        vx: (Math.random() - 0.6) * 160,
        vy: -(Math.random() * 50 + 10),
        size: Math.random() * 8 + 8,
        growRate: 20,
        color: 'rgba(245, 248, 252, 0.85)',
        strokeColor: 'rgba(180, 195, 210, 0.5)',
        life: 0.36,
        maxLife: 0.36
      });
    }
  }
}
