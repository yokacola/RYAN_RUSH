import { Game } from './game.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const game = new Game(canvas);

  // 16:9 반응형 캔버스 크기 조정
  function resizeCanvas() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const targetAspect = 16 / 9;
    const windowAspect = windowWidth / windowHeight;

    let displayWidth, displayHeight;
    if (windowAspect > targetAspect) {
      displayHeight = windowHeight;
      displayWidth = windowHeight * targetAspect;
    } else {
      displayWidth = windowWidth;
      displayHeight = windowWidth / targetAspect;
    }

    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    const wrapper = document.getElementById('canvas-wrapper');
    if (wrapper) {
      wrapper.style.width = `${displayWidth}px`;
      wrapper.style.height = `${displayHeight}px`;
    }
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // 화면 좌표 -> 게임 가상 좌표(1280 x 720) 변환
  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  // 마우스 클릭 / 터치 입력
  canvas.addEventListener('mousedown', (e) => {
    const coords = getCanvasCoords(e);
    game.handleInput(coords.x, coords.y);
  });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const coords = getCanvasCoords(e);
    game.handleInput(coords.x, coords.y);
  }, { passive: false });

  // 키보드 조작 (PC 스페이스바 / 방향키 위)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') {
      e.preventDefault();
      game.handleInput(null, null, true);
    }
  });

  // 좌상단 전체화면 버튼 토글 로직
  const fsBtn = document.getElementById('fullscreen-btn');
  const iconEnter = document.getElementById('fs-icon-enter');
  const iconExit = document.getElementById('fs-icon-exit');

  function updateFsIcon() {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (iconEnter && iconExit) {
      iconEnter.style.display = isFs ? 'none' : 'block';
      iconExit.style.display = isFs ? 'block' : 'none';
    }
    resizeCanvas();
  }

  function toggleFullscreen() {
    const elem = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(() => {});
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }

  if (fsBtn) {
    fsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      toggleFullscreen();
    });
    fsBtn.addEventListener('touchstart', (e) => {
      e.stopPropagation();
    }, { passive: false });
    fsBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
    });
  }

  document.addEventListener('fullscreenchange', updateFsIcon);
  document.addEventListener('webkitfullscreenchange', updateFsIcon);

  // 게임 시작
  // 타이틀 화면부터 즉시 BGM 재생 시도 및 브라우저 첫 터치/키 즉시 언락
  game.audio.playBGM();

  const unlockBgmOnFirstInteract = () => {
    game.audio.playBGM();
    window.removeEventListener('pointerdown', unlockBgmOnFirstInteract);
    window.removeEventListener('keydown', unlockBgmOnFirstInteract);
    window.removeEventListener('touchstart', unlockBgmOnFirstInteract);
  };
  window.addEventListener('pointerdown', unlockBgmOnFirstInteract, { passive: true });
  window.addEventListener('keydown', unlockBgmOnFirstInteract, { passive: true });
  window.addEventListener('touchstart', unlockBgmOnFirstInteract, { passive: true });

  // 게임 루프 시작
  game.start();
});
