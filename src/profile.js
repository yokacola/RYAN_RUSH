import { GAME_CONFIG } from './config.js?v=23';

// =========================================================================
//  아이 사진 크롭(AI 자동 얼굴 감지 + 헬멧 가이드 + 크기/각도/폭 조절), 로컬 캐시 및 특정 URL 프리셋 매니저
// =========================================================================

const STORAGE_KEY = 'ryan_rush_profile_v10';

export class ProfileManager {
  constructor(game) {
    this.game = game;
    this.modal = document.getElementById('profile-modal');
    this.cropCanvas = document.getElementById('face-crop-canvas');
    this.cropCtx = this.cropCanvas ? this.cropCanvas.getContext('2d') : null;
    this.fileInput = document.getElementById('face-file-input');
    this.zoomSlider = document.getElementById('face-zoom-slider');
    this.angleSlider = document.getElementById('face-angle-slider');
    this.aspectSlider = document.getElementById('face-aspect-slider');
    this.nameInput = document.getElementById('child-name-input');
    this.titlePreview = document.getElementById('title-preview-text');
    this.statusEl = document.getElementById('face-detect-status');
    this.saveBtn = document.getElementById('profile-save-btn');
    this.defaultBtn = document.getElementById('profile-default-btn');
    this.dragArea = document.getElementById('crop-drag-area');

    this.sourceImg = new Image();
    this.sourceLoaded = false;
    this.isDefaultPhoto = true;
    this.zoom = 1.0;
    this.angleDeg = 0;       // 회전 각도 (-45° ~ +45°)
    this.ovalAspectX = 0.92; // 좌우 타원 비율
    this.panX = 0;
    this.panY = 0;

    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;

    // 사진 등록 시 머리가 헬멧과 몸통에 딱 맞도록 맞출 수 있는 헬멧 및 몸통 가이드 이미지 로드
    this.helmetGuideImg = new Image();
    this.helmetGuideImg.onload = () => {
      this.renderCropPreview();
    };
    this.helmetGuideImg.src = 'assets/player/helmet_fire.png?v=23';

    this.bodyGuideImg = new Image();
    this.bodyGuideImg.onload = () => {
      this.renderCropPreview();
    };
    this.bodyGuideImg.src = 'assets/player/body_fire.png?v=23';

    // 기본 샘플 얼굴 로드
    this.defaultFaceImg = new Image();
    this.defaultFaceImg.onload = () => {
      if (!this.sourceLoaded || this.isDefaultPhoto) {
        this.sourceImg = this.defaultFaceImg;
        this.sourceLoaded = true;
        this.renderCropPreview();
      }
    };
    this.defaultFaceImg.src = 'assets/player/default_face.png?v=20';

    this.mpFaceDetector = null;
    this.mpLoading = false;

    this.bindEvents();
    this.initProfile();
  }

  // 특정 URL 파라미터(?preset=ryan, ?name=리안, ?photo=..., ?u=ryan, ?lock=1 등)로 바로 접속했는지 확인
  checkUrlPreset() {
    try {
      const params = new URLSearchParams(window.location.search);
      const presetKey = params.get('preset') || params.get('u') || params.get('id');
      const nameParam = params.get('name');
      const photoParam = params.get('photo') || params.get('img') || params.get('face');
      const lockParam = params.get('lock') || params.get('direct');

      const presets = (GAME_CONFIG && GAME_CONFIG.presets) || {};

      if (presetKey && presets[presetKey]) {
        const p = presets[presetKey];
        return {
          name: (nameParam || p.name || '리안').trim(),
          photo: photoParam || p.photo || 'assets/player/default_face.png?v=10',
        };
      }

      if (nameParam || photoParam || lockParam !== null) {
        let resolvedPhoto = photoParam || 'assets/player/default_face.png?v=10';
        // 파일명만 전달된 경우 (예: ?photo=mykid.png) assets/player/ 경로 자동 보정
        if (
          resolvedPhoto &&
          !resolvedPhoto.startsWith('http') &&
          !resolvedPhoto.startsWith('data:') &&
          !resolvedPhoto.startsWith('/') &&
          !resolvedPhoto.includes('/')
        ) {
          resolvedPhoto = `assets/player/${resolvedPhoto}`;
        }
        return {
          name: (nameParam || '리안').trim(),
          photo: resolvedPhoto,
        };
      }
    } catch (e) {
      console.warn('URL 파라미터 파싱 오류:', e);
    }
    return null;
  }

  initProfile() {
    // 1순위: 특정 URL 파라미터(프리셋/이름/사진)로 접속한 경우
    // -> 사진·이름 변경 메뉴 숨김(isPresetMode = true) & 등록 모달 없이 즉시 시작!
    const urlPreset = this.checkUrlPreset();
    if (urlPreset) {
      this.game.isPresetMode = true;
      this.game.applyProfile(urlPreset.name, urlPreset.photo);
      this.closeModal();
      return;
    }

    this.game.isPresetMode = false;

    // 2순위: 기기 캐시(localStorage)에 저장된 프로필이 있는 경우
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) {
          const name = (parsed.childName || '리안').trim() || '리안';
          if (this.nameInput) this.nameInput.value = name;
          if (parsed.ovalAspectX !== undefined) {
            this.ovalAspectX = parseFloat(parsed.ovalAspectX) || 0.92;
            if (this.aspectSlider) this.aspectSlider.value = String(this.ovalAspectX);
          }
          this.updateTitlePreview();

          // 기본 사진을 그대로 사용하는 경우: 재크롭된 이미지를 덮어쓰지 않고 항상 원본 default_face.png 사용!
          if (parsed.isDefaultPhoto || !parsed.faceDataUrl) {
            this.isDefaultPhoto = true;
            this.zoom = parseFloat(parsed.zoom) || 1.0;
            this.angleDeg = parseFloat(parsed.angleDeg) || 0;
            this.panX = parseFloat(parsed.panX) || 0;
            this.panY = parseFloat(parsed.panY) || 0;
            if (this.zoomSlider) this.zoomSlider.value = String(this.zoom.toFixed(2));
            if (this.angleSlider) this.angleSlider.value = String(this.angleDeg);

            this.sourceImg = this.defaultFaceImg;
            this.sourceLoaded = true;
            this.renderCropPreview();
            this.game.applyProfile(name, parsed.faceDataUrl || null, this.ovalAspectX);
            return;
          }

          // 사용자가 직접 업로드한 커스텀 사진인 경우
          this.isDefaultPhoto = false;
          this.game.applyProfile(name, parsed.faceDataUrl, this.ovalAspectX);

          const cachedImg = new Image();
          cachedImg.onload = () => {
            this.sourceImg = cachedImg;
            this.sourceLoaded = true;
            this.zoom = 1.0;
            this.angleDeg = 0;
            this.panX = 0;
            this.panY = 0;
            if (this.zoomSlider) this.zoomSlider.value = '1.00';
            if (this.angleSlider) this.angleSlider.value = '0';
            this.renderCropPreview();
          };
          cachedImg.src = parsed.faceDataUrl;
          return;
        }
      }
    } catch (err) {
      console.warn('캐시 로드 실패:', err);
    }

    // 3순위: 저장된 사진이 없으면 최초 접속 시 전체화면 등록 모달 오픈
    this.game.applyProfile('리안', null);
    this.openModal();
  }

  openModal() {
    // 특정 URL 프리셋 모드일 때는 사진·이름 변경 모달 열기 차단
    if (this.game && this.game.isPresetMode) return;
    if (!this.modal) return;
    this.modal.classList.remove('hidden');
    if (this.nameInput) {
      this.nameInput.value = this.game.childName || '리안';
    }
    this.updateTitlePreview();
    this.renderCropPreview();
    this.ensureMediaPipeDetector();
  }

  closeModal() {
    if (!this.modal) return;
    this.modal.classList.add('hidden');
  }

  updateTitlePreview() {
    if (!this.titlePreview || !this.nameInput) return;
    const name = this.nameInput.value.trim() || '리안';
    this.titlePreview.textContent = `달려라 ${name}!!`;
  }

  resetCropToImage(img, faceBox = null) {
    const cw = this.cropCanvas ? this.cropCanvas.width : 240;
    const ch = this.cropCanvas ? this.cropCanvas.height : 240;
    const iw = img.naturalWidth || img.width || 240;
    const ih = img.naturalHeight || img.height || 240;

    if (faceBox) {
      const faceSize = Math.max(faceBox.width, faceBox.height);
      const desiredSize = cw * 0.72;
      const baseScale = Math.max(cw / iw, ch / ih);
      const targetScale = desiredSize / Math.max(faceSize, 16);
      this.zoom = Math.min(3.0, Math.max(0.5, targetScale / baseScale));

      const faceCenterX = faceBox.x + faceBox.width * 0.5;
      const faceCenterY = faceBox.y + faceBox.height * 0.48;
      const actualScale = baseScale * this.zoom;

      this.panX = (iw * 0.5 - faceCenterX) * actualScale;
      this.panY = (ih * 0.5 - faceCenterY) * actualScale;
    } else {
      this.zoom = 1.0;
      this.panX = 0;
      this.panY = 0;
    }
    this.angleDeg = 0;

    if (this.zoomSlider) {
      this.zoomSlider.value = String(this.zoom.toFixed(2));
    }
    if (this.angleSlider) {
      this.angleSlider.value = '0';
    }
  }

  async ensureMediaPipeDetector() {
    if (this.mpFaceDetector || this.mpLoading) return this.mpFaceDetector;
    this.mpLoading = true;
    try {
      const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs');
      const filesetResolver = await vision.FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );
      this.mpFaceDetector = await vision.FaceDetector.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
          delegate: 'GPU'
        },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.45
      });
    } catch (e) {
      this.mpFaceDetector = null;
    } finally {
      this.mpLoading = false;
    }
    return this.mpFaceDetector;
  }

  async detectFaceBounds(img) {
    try {
      const detector = await this.ensureMediaPipeDetector();
      if (detector) {
        const result = detector.detect(img);
        if (result && result.detections && result.detections.length > 0) {
          let best = result.detections[0].boundingBox;
          for (const d of result.detections) {
            if (d.boundingBox.width * d.boundingBox.height > best.width * best.height) {
              best = d.boundingBox;
            }
          }
          return {
            x: best.originX,
            y: best.originY,
            width: best.width,
            height: best.height
          };
        }
      }
    } catch (e) {
      // ignore
    }

    if ('FaceDetector' in window) {
      try {
        // eslint-disable-next-line no-undef
        const nativeDetector = new FaceDetector({ fastMode: true, maxDetectedFaces: 3 });
        const faces = await nativeDetector.detect(img);
        if (faces && faces.length > 0) {
          const box = faces[0].boundingBox;
          return { x: box.x, y: box.y, width: box.width, height: box.height };
        }
      } catch (e) {
        // ignore
      }
    }

    return null;
  }

  bindEvents() {
    if (this.nameInput) {
      this.nameInput.addEventListener('input', () => this.updateTitlePreview());
      this.nameInput.addEventListener('keydown', (e) => e.stopPropagation());
    }

    if (this.fileInput) {
      this.fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        if (this.statusEl) {
          this.statusEl.textContent = '🔍 AI가 아이 얼굴 위치를 찾는 중...';
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = new Image();
          img.onload = async () => {
            this.sourceImg = img;
            this.sourceLoaded = true;
            this.isDefaultPhoto = false;

            const faceBox = await this.detectFaceBounds(img);
            this.resetCropToImage(img, faceBox);
            this.renderCropPreview();

            if (this.statusEl) {
              this.statusEl.textContent = faceBox
                ? '✅ 아이 얼굴을 자동으로 맞췄어요! (드래그로 조절 가능)'
                : '👆 사진을 드래그하거나 슬라이더로 얼굴을 맞춰주세요!';
            }
          };
          img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    if (this.zoomSlider) {
      this.zoomSlider.addEventListener('input', () => {
        this.zoom = parseFloat(this.zoomSlider.value) || 1.0;
        this.renderCropPreview();
      });
    }

    if (this.angleSlider) {
      this.angleSlider.addEventListener('input', () => {
        this.angleDeg = parseFloat(this.angleSlider.value) || 0;
        this.renderCropPreview();
      });
      this.angleSlider.addEventListener('dblclick', () => {
        this.angleDeg = 0;
        this.angleSlider.value = '0';
        this.renderCropPreview();
      });
    }

    if (this.aspectSlider) {
      this.aspectSlider.addEventListener('input', () => {
        this.ovalAspectX = parseFloat(this.aspectSlider.value) || 0.92;
        this.renderCropPreview();
      });
    }

    if (this.dragArea) {
      this.dragArea.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.06 : -0.06;
        this.zoom = Math.min(3.0, Math.max(0.5, this.zoom + delta));
        if (this.zoomSlider) this.zoomSlider.value = String(this.zoom.toFixed(2));
        this.renderCropPreview();
      }, { passive: false });

      const startDrag = (clientX, clientY) => {
        this.isDragging = true;
        this.dragStartX = clientX - this.panX;
        this.dragStartY = clientY - this.panY;
      };
      const moveDrag = (clientX, clientY) => {
        if (!this.isDragging) return;
        this.panX = clientX - this.dragStartX;
        this.panY = clientY - this.dragStartY;
        this.renderCropPreview();
      };
      const endDrag = () => {
        this.isDragging = false;
      };

      this.dragArea.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startDrag(e.clientX, e.clientY);
      });
      window.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
      window.addEventListener('mouseup', endDrag);

      this.dragArea.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          e.preventDefault();
          startDrag(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: false });
      window.addEventListener('touchmove', (e) => {
        if (this.isDragging && e.touches.length === 1) {
          moveDrag(e.touches[0].clientX, e.touches[0].clientY);
        }
      }, { passive: false });
      window.addEventListener('touchend', endDrag);
    }

    if (this.saveBtn) {
      this.saveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.saveProfile(false);
      });
    }

    if (this.defaultBtn) {
      this.defaultBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.saveProfile(true);
      });
    }

    if (this.modal) {
      this.modal.addEventListener('mousedown', (e) => e.stopPropagation());
      this.modal.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false });
    }
  }

  drawTransformedPhoto(ctx, centerX, centerY, targetBoxSize, panScale = 1.0) {
    if (!this.sourceLoaded || !this.sourceImg) return;

    const iw = this.sourceImg.naturalWidth || this.sourceImg.width || 256;
    const ih = this.sourceImg.naturalHeight || this.sourceImg.height || 256;
    const baseScale = targetBoxSize / Math.min(iw, ih);
    const scale = baseScale * this.zoom;

    const drawW = iw * scale;
    const drawH = ih * scale;

    ctx.save();
    ctx.translate(centerX + this.panX * panScale, centerY + this.panY * panScale);
    if (this.angleDeg !== 0) {
      ctx.rotate((this.angleDeg * Math.PI) / 180);
    }
    ctx.drawImage(this.sourceImg, -drawW * 0.5, -drawH * 0.5, drawW, drawH);
    ctx.restore();
  }

  renderCropPreview() {
    if (!this.cropCtx || !this.cropCanvas) return;
    const ctx = this.cropCtx;
    const w = this.cropCanvas.width;
    const h = this.cropCanvas.height;

    // GAME_CONFIG.player.faceSlot (960x664 기준)과 1:1 정밀 매칭
    const slot = (GAME_CONFIG && GAME_CONFIG.player && GAME_CONFIG.player.faceSlot) || {
      cxRatio: 0.4573,
      cyRatio: 0.3580,
      rxRatio: 0.0950,
      ryRatio: 0.1717,
    };
    const targetRY = 664.0 * slot.ryRatio;
    const targetRX = 960.0 * slot.rxRatio;
    const targetCY = 664.0 * slot.cyRatio;
    const targetCX = 960.0 * slot.cxRatio;

    const s = (h * 0.38) / targetRY; // 240px 캔버스 안에서 헬멧 상단~턱 끝이 한눈에 보이도록 스케일링
    const cx = w * 0.50;
    const cy = h * 0.58;
    const ry = targetRY * s;
    const rx = (targetRX * s) * (this.ovalAspectX / 0.92);
    const fSizePreview = Math.max(rx, ry) * 2.08;

    // 1. 배경을 차량 실내 색상(#38444c)으로 채움
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#38444c';
    ctx.fillRect(0, 0, w, h);

    // 2. 몸통 가이드 오버레이 (실제 튜닝된 몸통 크기/위치와 1:1 일치)
    const tune = (GAME_CONFIG && GAME_CONFIG.player && GAME_CONFIG.player.tuning && GAME_CONFIG.player.tuning.fire) || null;
    const bodyCfg = (tune && tune.body) || { x: 0, y: 0, scale: 1.0 };
    if (this.bodyGuideImg && this.bodyGuideImg.complete && this.bodyGuideImg.width > 0) {
      const bldW = 960.0 * s;
      const bldH = 664.0 * s;
      const bodyCenterX = cx + (480.0 + bodyCfg.x - targetCX) * s;
      const bodyCenterY = cy + (332.0 + bodyCfg.y - targetCY) * s;
      ctx.save();
      ctx.translate(bodyCenterX, bodyCenterY);
      ctx.scale(bodyCfg.scale, bodyCfg.scale);
      ctx.drawImage(this.bodyGuideImg, -bldW * 0.5, -bldH * 0.5, bldW, bldH);
      ctx.restore();
    }

    // 3. 타원 바깥 영역은 어둡게 반투명 처리하고 타원 안쪽만 선명하게 보여줌
    ctx.save();
    ctx.globalAlpha = 0.25;
    this.drawTransformedPhoto(ctx, cx, cy, fSizePreview, 1.0);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    this.drawTransformedPhoto(ctx, cx, cy, fSizePreview, 1.0);
    ctx.restore();

    // 4. 타원 자르기 가이드 점선 표시
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 235, 59, 0.90)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 5. 실제 헬멧 가이드 오버레이 표시 (머리가 헬멧과 몸통 사이에 쏙 들어가도록 조절!)
    if (this.helmetGuideImg && this.helmetGuideImg.complete && this.helmetGuideImg.width > 0) {
      const helmW = 960.0 * s;
      const helmH = 664.0 * s;
      const helmX = cx - targetCX * s;
      const helmY = cy - targetCY * s;
      ctx.drawImage(this.helmetGuideImg, helmX, helmY, helmW, helmH);
    }
  }

  exportCroppedDataUrl() {
    const outCanvas = document.createElement('canvas');
    outCanvas.width = 256;
    outCanvas.height = 256;
    const outCtx = outCanvas.getContext('2d');

    const slot = (GAME_CONFIG && GAME_CONFIG.player && GAME_CONFIG.player.faceSlot) || {
      cxRatio: 0.4573,
      cyRatio: 0.3193,
      rxRatio: 0.0792,
      ryRatio: 0.1265,
    };
    const targetRY = 664.0 * slot.ryRatio;
    const targetRX = 960.0 * slot.rxRatio;

    const h = this.cropCanvas ? this.cropCanvas.height : 240;
    const s = (h * 0.38) / targetRY;
    const ry = targetRY * s;
    const rx = (targetRX * s) * (this.ovalAspectX / 0.92);
    const fSizePreview = Math.max(rx, ry) * 2.08;
    const exportRatio = 256.0 / fSizePreview;

    // 배경을 차량 실내 어두운 색상(#38444c)으로 채우고, 타원 재마스킹 없이 정사각형 전체에 렌더링!
    // (이중 타원 클리핑으로 인해 재실행/재저장할 때마다 얼굴이 점점 잘려나가는 현상 100% 방지)
    outCtx.fillStyle = '#38444c';
    outCtx.fillRect(0, 0, 256, 256);

    this.drawTransformedPhoto(outCtx, 128, 128, 256, exportRatio);

    return outCanvas.toDataURL('image/png');
  }

  saveProfile(useDefault = false) {
    const name = (this.nameInput && this.nameInput.value.trim()) ? this.nameInput.value.trim() : '리안';

    if (useDefault && this.defaultFaceImg && this.defaultFaceImg.complete) {
      this.sourceImg = this.defaultFaceImg;
      this.sourceLoaded = true;
      this.isDefaultPhoto = true;
      this.ovalAspectX = 0.92;
      if (this.aspectSlider) this.aspectSlider.value = '0.92';
      this.resetCropToImage(this.defaultFaceImg);
    }

    // 기본 사진을 변형 없이 그대로 쓰는 경우 null을 전달하여 원본 default_face.png를 무손실로 직접 사용
    const isUnmodifiedDefault = (
      this.isDefaultPhoto &&
      Math.abs(this.zoom - 1.0) < 0.01 &&
      Math.abs(this.angleDeg) < 0.5 &&
      Math.abs(this.panX) < 1 &&
      Math.abs(this.panY) < 1
    );
    const faceDataUrl = isUnmodifiedDefault ? null : this.exportCroppedDataUrl();

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        childName: name,
        isDefaultPhoto: this.isDefaultPhoto,
        faceDataUrl: faceDataUrl,
        ovalAspectX: this.ovalAspectX,
        zoom: this.zoom,
        angleDeg: this.angleDeg,
        panX: this.panX,
        panY: this.panY
      }));
    } catch (err) {
      console.warn('localStorage 저장 실패:', err);
    }

    this.game.applyProfile(name, faceDataUrl, this.ovalAspectX);
    this.closeModal();
  }
}
