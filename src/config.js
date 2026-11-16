// =========================================================================
//  [달려라 리안!] 게임 수치 조절 설정 파일 (GAME CONFIG)
// =========================================================================

export const GAME_CONFIG = {
  // -----------------------------------------------------------------------
  // 0. 특정 URL 바로 접속 프리셋 설정
  //    예: ?preset=ryan 또는 ?name=리안 또는 ?name=리안&photo=assets/player/default_face.png
  //    위 URL로 접속 시 등록 창 없이 즉시 시작되며, 사진·이름 변경 메뉴가 숨겨집니다.
  // -----------------------------------------------------------------------
  presets: {
    ryan: {
      name: '리안',
      photo: 'assets/player/default_face.png',
    },
  },

  // -----------------------------------------------------------------------
  // 1. 캐릭터 자동차 (소방차 / 구급차 / 경찰차 + 흔드는 팔 + 아이 얼굴 + 헬멧) 설정
  // -----------------------------------------------------------------------
  player: {
    width: 300,             // 차량 가로 크기 (960:664 비율 유지)
    height: 208,            // 차량 세로 크기
    groundY: 580,           // 도로 위 타이어 접지 높이
    gravity: 1450,
    jumpForce: -690,
    doubleJumpForce: -640,
    surpriseDuration: 0.95,
    hitScaleRatio: 0.9,
    surpriseStarOffsetX: -10,
    // 960x664 차량 스프라이트 내 아이 얼굴 및 몸통 배치 상대 좌표 (자동차 -> 좌우 양팔 -> 출동대원 몸통 -> 얼굴 -> 헬멧 순서)
    faceSlot: {
      cxRatio: 0.4740,      // 차량 좌측 상단 기준 얼굴 중심 X 비율 (455 / 960)
      cyRatio: 0.2636,      // 차량 좌측 상단 기준 얼굴 중심 Y 비율 (175 / 664 - 소방/경찰/구급차 맞춤 안착)
      rxRatio: 0.0953,      // 얼굴 가로 반경 비율 (91.5 / 960)
      ryRatio: 0.1518,      // 얼굴 세로 반경 비율 (100.8 / 664)
    },
    // 흔드는 팔 회전축 상대 좌표 (새 제복 어깨 회전축에 정밀 일치: 453/960, 241/664)
    armPivot: {
      pxRatio: 0.4719,      // 453 / 960
      pyRatio: 0.3630,      // 241 / 664
    },
    // 에셋 튜너 정밀 조율 데이터 (차량, 몸통 위치/스케일, 양팔 피벗/스케일/각도, 얼굴 타원/크기/오프셋, 헬멧)
    tuning: {
      fire: {
        vehicle: { x: 0, y: 0, scale: 1 },
        body: { x: 4, y: -40, scale: 0.7 },
        arm: { pivotX: 453, pivotY: 241, scale: 0.5, baseAngle: -0.22, waveAmp: 0.1 },
        face: { cx: 455, cy: 175, rx: 91.5, ry: 100.8, scale: 3.5, offsetX: 5, offsetY: -28 },
        helmet: { cx: 454, cy: 81, width: 236, height: 153, rotation: 0, type: "cand_1", isCustom: false }
      },
      ambulance: {
        vehicle: { x: 0, y: 0, scale: 1 },
        body: { x: 4, y: -41, scale: 0.7 },
        arm: { pivotX: 453, pivotY: 241, scale: 0.5, baseAngle: -0.22, waveAmp: 0.1 },
        face: { cx: 455, cy: 175, rx: 91.5, ry: 100.8, scale: 3.5, offsetX: 5, offsetY: -28 },
        helmet: { cx: 453, cy: 90, width: 211, height: 104, rotation: 0, type: "restored", isCustom: false }
      },
      police: {
        vehicle: { x: 0, y: 0, scale: 1 },
        body: { x: 5, y: -35, scale: 0.75 },
        arm: { pivotX: 453, pivotY: 241, scale: 0.5, baseAngle: -0.22, waveAmp: 0.1 },
        face: { cx: 455, cy: 175, rx: 91.5, ry: 100.8, scale: 3.5, offsetX: 5, offsetY: -28 },
        helmet: { cx: 455, cy: 90, width: 211, height: 104, rotation: 0, type: "restored", isCustom: false }
      }
    },
    // 각 차량 지붕 경광등(사이렌) 반짝임 정밀 상대 좌표 (960x664 픽셀 실측 기준)
    sirenSlots: {
      fire: { leftX: 0.555, leftY: 0.122, rightX: 0.655, rightY: 0.128, leftColor: '#ff1744', rightColor: '#00e5ff' },
      ambulance: { leftX: 0.557, leftY: 0.121, rightX: 0.655, rightY: 0.128, leftColor: '#ff1744', rightColor: '#00e5ff' },
      police: { leftX: 0.554, leftY: 0.125, rightX: 0.653, rightY: 0.129, leftColor: '#ff1744', rightColor: '#00e5ff' },
    },
    // 타이틀 화면 도로 위 3대 차량 가로 배치
    lineup: [
      { type: 'fire', name: '소방차', badgeColor: '#e53935', x: 270 },
      { type: 'ambulance', name: '구급차', badgeColor: '#00897b', x: 640 },
      { type: 'police', name: '경찰차', badgeColor: '#1e88e5', x: 1010 },
    ]
  },

  // -----------------------------------------------------------------------
  // 2. 아이템 (사탕, 쿠키, 빵) 설정
  // -----------------------------------------------------------------------
  items: {
    width: 160,             // 가로 크기
    height: 130,            // 세로 크기
    lowY: 425,              // 바닥 쪽 높이
    highY: 245,             // 공중 쪽 높이
    spawnRatio: 0.75,       // 등장 확률
    bounceSpeed: 4.5,       // 상하 바운스 속도
    bounceHeight: 16,       // 바운스 높이 (px)
    minClusterCount: 1,     // 줄지어 나오는 최소 개수 (1개)
    maxClusterCount: 5,     // 줄지어 나오는 최대 개수 (5개)
    clusterSpacing: 145,    // 줄지어 나올 때 아이템 간격 (px)
  },

  // -----------------------------------------------------------------------
  // 3. 악당 장애물 설정
  // -----------------------------------------------------------------------
  obstacles: {
    baseHeight: 180,        // 기준 세로 높이
    groundY: 575,           // 도로 바닥 접지선
    imageYOffset: 8,        // 몬스터 이미지를 아래로 내려 그림자와 완벽 밀착 (px)
    shadowYOffset: 4,       // 그림자 Y 오프셋 (px)
    bounceBaseSpeed: 4.5,
    goldenRatio: 1.61803398875,
    bounceHeight: 9,
  },

  // -----------------------------------------------------------------------
  // 4. 스폰 간격
  // -----------------------------------------------------------------------
  spawner: {
    minGap: 420,
    maxGap: 680,
  },

  // -----------------------------------------------------------------------
  // 5. 게임 주행 속도 및 배경 레이어 속도 비율
  // -----------------------------------------------------------------------
  speed: {
    run: 380,
    title: 150,
    surprise: 180,
    layer1Sky: 0.20,
    layer2Mountain: 0.60,
    layer3City: 1.50,
    layer4Road: 2.00,
  },

  // -----------------------------------------------------------------------
  // 6. 사운드 및 배경음악 설정
  // -----------------------------------------------------------------------
  audio: {
    bgmVolume: 0.45,
  },

  // -----------------------------------------------------------------------
  // 7. UI 설정
  // -----------------------------------------------------------------------
  ui: {
    titleY: 175,
    btnPhotoY: 668,
  },

  // -----------------------------------------------------------------------
  // 8. 배경 레이어 설정
  // -----------------------------------------------------------------------
  background: {
    layer1Sky: {
      y: 0,
      height: 720,
      cropLeft: 2,
      cropRight: 2,
      seamOverlap: 2,
      scrollSpeed: 0.10,
    },
    layer2Mountain: {
      y: 45,
      height: 380,
      cropLeft: 0,
      cropRight: 0,
      seamOverlap: 2,
      scrollSpeed: 0.45,
    },
    layer3City: {
      y: 100,
      height: 450,
      cropLeft: 5,
      cropRight: 5,
      seamOverlap: 2,
      scrollSpeed: 0.95,
    },
    layer4Road: {
      y: 500,
      height: 220,
      cropLeft: 5,
      cropRight: 5,
      seamOverlap: 2,
      scrollSpeed: 1.5,
    }
  }
};
