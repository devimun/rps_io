/**
 * 메인 게임 씬
 * 에셋 로딩 + 게임 플레이를 모두 담당합니다.
 * 
 * [1.4.5] 단순화된 구조:
 * 1. 로딩 화면 표시
 * 2. 에셋, 텍스처, Pool 점진적 로딩 (프레임 드랍 방지)
 * 3. 완료되면 게임 화면 표시
 */
import Phaser from 'phaser';
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';
import { socketService } from '../../services/socketService';
import type { Player } from '@chaos-rps/shared';
import { WORLD_SIZE } from '@chaos-rps/shared';
import { PlayerRenderer } from '../PlayerRenderer';

/** 씬 키 상수 */
export const SCENE_KEYS = {
  MAIN: 'MainScene',
} as const;

/** 게임 월드 크기 */
const WORLD_CONFIG = { WIDTH: WORLD_SIZE, HEIGHT: WORLD_SIZE };

/** 마지막 대시 요청 시간 */
let lastDashRequestTime = 0;
const DASH_REQUEST_THROTTLE = 100;

function canDash(): boolean {
  const { isDashing, dashCooldownEndTime } = useGameStore.getState();
  if (isDashing) return false;
  if (Date.now() < dashCooldownEndTime) return false;
  return true;
}

function tryDash(): void {
  const now = Date.now();
  if (now - lastDashRequestTime < DASH_REQUEST_THROTTLE) return;
  if (canDash()) {
    lastDashRequestTime = now;
    socketService.sendDash();
  }
}

/**
 * 메인 게임 씬
 */
export class MainScene extends Phaser.Scene {
  private playerSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private readonly moveInterval = 50;
  private playerRenderer!: PlayerRenderer;

  private currentAngle = 0;
  private isGameReady = false;


  /** 로딩 UI */
  private loadingOverlay?: Phaser.GameObjects.Graphics; // [1.4.8] 전체 화면 오버레이
  private loadingText?: Phaser.GameObjects.Text;
  private loadingBar?: Phaser.GameObjects.Graphics;
  private loadingBarBg?: Phaser.GameObjects.Graphics;

  /** [1.4.7] Store 구독 해제 함수 */
  private unsubscribe?: () => void;
  private unsubscribeUI?: () => void;
  private unsubscribePhase?: () => void;

  /** [1.4.7] 임시 벡터 (GC 방지용) */
  private tempVector = new Phaser.Math.Vector2();

  /** [1.4.7] 에셋 로딩 완료 여부 */
  private isAssetsLoaded = false;
  /** [1.4.7] 게임 초기화 완료 여부 (중복 초기화 방지) */
  private isGameInitialized = false;
  /** [1.4.8] 로딩 완료 처리 중 여부 (중복 호출 방지) */
  private isLoadingCompleteTriggered = false;
  /** [1.4.7] 로딩 진행률 (0.0 ~ 1.0) */
  private loadingProgress = 0;
  private poolCreated = 0;
  private readonly POOL_TARGET = 25;
  /** [1.4.5] 최소 로딩 시간 (1초) */
  private loadingStartTime = 0;
  private readonly MIN_LOADING_TIME = 1000;

  /** 점진적 플레이어 로딩 */
  private pendingPlayers: Map<string, Player> = new Map();
  private readonly PLAYERS_PER_FRAME = 3;

  /** 프레임 연산 캐싱 */
  private cachedPlayers: Map<string, Player> = new Map();
  private cachedMyPlayer: Player | null = null;
  private cachedIsMobile = false;

  /** [1.4.7] 추가 캐싱 상태 (Game Loop 최적화) */
  private cachedRankings: any[] = []; // TODO: 타입 정의
  private cachedIsDashing = false;
  private cachedDashCooldownEndTime = 0;



  constructor() {
    super({ key: SCENE_KEYS.MAIN });
  }

  init(): void {
    this.loadingStartTime = Date.now();
    console.log('[MainScene] Init - Loading Start Time:', this.loadingStartTime);
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    // 배경색
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // [1.4.7] Store 구독 (Polling 제거)
    this.unsubscribe = useGameStore.subscribe((state) => {
      this.cachedPlayers = state.players;
      this.cachedMyPlayer = state.myPlayer;
      this.cachedRankings = state.rankings;
      this.cachedIsDashing = state.isDashing;
      this.cachedDashCooldownEndTime = state.dashCooldownEndTime;

      if (this.cachedMyPlayer) {
        this.isGameReady = true;
        this.checkReadyToStart();
      }
    });

    this.unsubscribeUI = useUIStore.subscribe((state) => {
      this.cachedIsMobile = state.isMobile;
    });

    // 초기 상태 동기화
    const gameState = useGameStore.getState();
    const uiState = useUIStore.getState();
    this.cachedPlayers = gameState.players;
    this.cachedMyPlayer = gameState.myPlayer;
    this.cachedRankings = gameState.rankings;
    this.cachedIsDashing = gameState.isDashing;
    this.cachedDashCooldownEndTime = gameState.dashCooldownEndTime;

    if (this.cachedMyPlayer) {
      this.isGameReady = true;
    }

    this.cachedIsMobile = uiState.isMobile;

    // 로딩 UI 생성 (처음엔 숨김)
    this.createLoadingUI(centerX, centerY);

    // [1.4.7] 게임 로딩('loading') 감지하여 로딩 시작
    let lastPhase = useGameStore.getState().phase;
    this.unsubscribePhase = useGameStore.subscribe((state) => {
      if (state.phase !== lastPhase) {
        const prevPhase = lastPhase;
        lastPhase = state.phase;

        // [1.4.7] 로비/IDLE 상태로 돌아오면 로딩 플래그 리셋 (다음 게임 로딩 준비)
        if (state.phase === 'lobby' || state.phase === 'idle') {
          this.isAssetsLoaded = false;
          useGameStore.getState().setSceneReady(false);
        }

        // [1.4.8] loading 상태로 진입 시 로딩 시작
        // 이전 phase가 idle/lobby/dead가 아니더라도 loading으로 오면 isAssetsLoaded 리셋
        if (state.phase === 'loading') {
          // 첫 로딩이 아닌 경우(재시작) isAssetsLoaded 리셋 필요
          if (prevPhase !== 'idle' && this.isGameInitialized) {
            console.log('[MainScene] Re-entering loading phase, resetting...');
            this.isAssetsLoaded = false;
          }
          if (!this.isAssetsLoaded) {
            this.startLoadingProcess();
          }
        }
      }
    });

    // 이미 loading 상태라면 즉시 시작 (재진입 등)
    if (useGameStore.getState().phase === 'loading' && !this.isAssetsLoaded) {
      this.startLoadingProcess();
    }
  }

  /** [1.4.7] 로딩 UI 생성 및 초기화 */
  private createLoadingUI(centerX: number, centerY: number): void {
    const { width, height } = this.cameras.main;

    // [1.4.8] 전체 화면 오버레이 (게임 콘텐츠를 완전히 가림)
    // setScrollFactor(0)으로 카메라에 고정하여 항상 화면을 덮도록 함
    this.loadingOverlay = this.add.graphics();
    this.loadingOverlay.fillStyle(0x1a1a2e, 1); // 배경색과 동일
    this.loadingOverlay.fillRect(-width, -height, width * 4, height * 4); // 충분히 크게
    this.loadingOverlay.setScrollFactor(0); // 카메라에 고정
    this.loadingOverlay.setDepth(9998);
    this.loadingOverlay.setVisible(false);

    this.loadingBarBg = this.add.graphics();
    this.loadingBarBg.fillStyle(0x333333, 1);
    this.loadingBarBg.fillRect(centerX - 150, centerY, 300, 20);
    this.loadingBarBg.setScrollFactor(0); // 카메라에 고정
    this.loadingBarBg.setDepth(9999);
    this.loadingBarBg.setVisible(false);

    this.loadingBar = this.add.graphics();
    this.loadingBar.setScrollFactor(0); // 카메라에 고정
    this.loadingBar.setDepth(9999);
    this.loadingBar.setVisible(false);

    this.loadingText = this.add.text(centerX, centerY + 50, '게임 준비 중...', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(9999); // 카메라에 고정
    this.loadingText.setVisible(false);

    // 로딩 이벤트
    this.load.on('progress', this.onLoadProgress, this);
    this.load.on('complete', this.onAssetsLoaded, this);
  }

  /** [1.4.7] 로딩 프로세스 시작 */
  private startLoadingProcess(): void {
    console.log('[MainScene] Start Loading Process...');
    this.isAssetsLoaded = true;
    this.isLoadingCompleteTriggered = false; // [1.4.8] 플래그 리셋
    this.poolCreated = 0; // [1.4.8] 풀 생성 카운트 리셋 (재시작 시 100% 초과 방지)
    this.loadingProgress = 0; // 진행률 리셋
    this.loadingStartTime = Date.now();


    // UI 표시
    this.loadingOverlay?.setVisible(true); // [1.4.8] 전체 화면 오버레이
    this.loadingBarBg?.setVisible(true);
    this.loadingBar?.setVisible(true);
    this.loadingText?.setVisible(true);
    this.loadingText?.setText('에셋 로딩 중...');

    // [1.4.7] 이미 게임이 초기화되어 있다면 가짜 로딩(연출)만 실행하여 낭비 방지
    if (this.isGameInitialized) {
      console.log('[MainScene] Game already initialized, running fake loading...');
      this.runFakeLoadingSequence();
      return;
    }

    // 에셋 로딩 시작 (처음인 경우)
    this.loadAssets();
  }

  /** [1.4.7] 재진입 시 연출용 가짜 로딩 */
  private runFakeLoadingSequence(): void {
    this.loadingProgress = 0;
    // 0.5초 동안 로딩 바 채우기 (사용자 경험 + 부드러운 전환)
    this.time.addEvent({
      delay: 25,
      repeat: 19, // 20번 실행 (초기 1회 + repeat 19회) → 0.05 * 20 = 1.0 (100%)
      callback: () => {
        this.loadingProgress += 0.05;
        this.onLoadProgress(this.loadingProgress);
        if (this.loadingProgress >= 0.99) {
          this.loadingProgress = 1;
          this.checkReadyToStart();
        }
      }
    });
  }

  /** [1.4.7] 로딩 및 데이터 수신 완료 체크 */
  private checkReadyToStart(): void {
    // [1.4.8] 이미 로딩 완료 처리 중이면 무시
    if (this.isLoadingCompleteTriggered) return;

    // 로딩이 완료되었고, 게임 데이터(내 플레이어)도 수신했다면
    if (this.loadingProgress >= 1 && this.isGameReady) {
      // 로딩바가 켜져있을 때만 완료 처리 (중복 실행 방지)
      if (this.loadingBarBg?.visible) {
        this.isLoadingCompleteTriggered = true;
        this.onLoadingComplete();
      }
    } else if (this.loadingProgress >= 1 && !this.isGameReady) {
      // 로딩은 끝났는데 데이터가 아직 안 옴
      this.loadingText?.setText('서버 접속 중...');
    }
  }

  /** 에셋 로딩 */
  private loadAssets(): void {
    // 이미 로드되어 있다면 바로 완료 처리
    if (this.textures.exists('rps-sprites')) {
      console.log('[MainScene] Assets already loaded, skipping...');
      this.onAssetsLoaded();
      return;
    }

    this.loadingProgress = 0;
    this.load.spritesheet('rps-sprites', '/assets/images/rps.png', {
      frameWidth: 128,
      frameHeight: 128,
    });
    // 눈 전용 원형 텍스처
    this.load.image('circle', '/assets/images/circle.png');
    // Slither.io 스타일 광택 텍스처 (본체 전용)
    this.load.image('slither-body', '/assets/images/slither_body.png');
    this.load.start();
  }

  /** 로딩 진행률 업데이트 */
  private onLoadProgress(progress: number): void {
    this.loadingProgress = progress;
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    this.loadingBar?.clear();
    this.loadingBar?.fillStyle(0x4ecdc4, 1);
    this.loadingBar?.fillRect(centerX - 148, centerY + 2, 296 * progress * 0.3, 16);

    this.loadingText?.setText(`에셋 로딩 중... ${Math.floor(progress * 100)}%`);
  }

  /** 에셋 로딩 완료 → 텍스처 생성 */
  private onAssetsLoaded(): void {
    this.loadingProgress = 1;
    this.loadingText?.setText('텍스처 생성 중... 100%');
    // 다음 프레임에서 텍스처 생성
    requestAnimationFrame(() => this.createTexturesProgressively());
  }

  /** 텍스처 점진적 생성 */
  private createTexturesProgressively(): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    // Step 1: 그리드 타일 (패턴용 작은 텍스처)
    this.createGridTile();
    // [1.4.8] 대시바 텍스처 생성 (texImage2D 방지)
    this.createDashBarTextures();
    this.updateLoadingBar(centerX, centerY, 0.4, '게임 리소스 생성 중... 40%');

    requestAnimationFrame(() => {
      // Step 2: Pool 생성 준비 (초대형 텍스처 생성 제거로 바로 넘어감)
      this.updateLoadingBar(centerX, centerY, 0.6, '게임 환경 구성 중... 60%');

      // Pool 생성 시작
      this.playerRenderer = new PlayerRenderer(this);
      this.startPoolCreation();
    });
  }

  /** Pool 점진적 생성 */
  private startPoolCreation(): void {
    const createOne = () => {
      if (this.poolCreated >= this.POOL_TARGET) {
        this.loadingProgress = 1;
        this.checkReadyToStart();
        return;
      }

      // 1개 생성
      this.playerRenderer.prewarmPoolOne();
      this.poolCreated++;

      // 진행률 업데이트
      const progress = 0.6 + (this.poolCreated / this.POOL_TARGET) * 0.4;
      this.loadingProgress = progress; // [1.4.7] 진행률 동기화

      const { width, height } = this.cameras.main;
      this.updateLoadingBar(width / 2, height / 2, progress,
        `게임 준비 중... ${Math.floor(progress * 100)}%`);

      // 다음 프레임
      requestAnimationFrame(createOne);
    };

    requestAnimationFrame(createOne);
  }

  /** 로딩 바 업데이트 */
  private updateLoadingBar(centerX: number, centerY: number, progress: number, text: string): void {
    this.loadingBar?.clear();
    this.loadingBar?.fillStyle(0x4ecdc4, 1);
    this.loadingBar?.fillRect(centerX - 148, centerY + 2, 296 * progress, 16);
    this.loadingText?.setText(text);
  }

  /** 모든 로딩 완료 */
  private onLoadingComplete(): void {
    // [1.4.5] 최소 1초 로딩 시간 보장
    const now = Date.now();
    const elapsed = now - this.loadingStartTime;
    const remaining = Math.max(0, this.MIN_LOADING_TIME - elapsed);

    console.log(`[MainScene] Loading Complete. Elapsed: ${elapsed}ms, Remaining Wait: ${remaining}ms, MinTime: ${this.MIN_LOADING_TIME}ms`);

    this.loadingText?.setText('완료!');

    // 로딩 UI 제거 + 게임 초기화
    this.time.delayedCall(200 + remaining, () => {
      this.loadingOverlay?.setVisible(false); // [1.4.8] 오버레이 숨김
      this.loadingText?.setVisible(false);
      this.loadingBar?.setVisible(false);
      this.loadingBarBg?.setVisible(false);

      if (!this.isGameInitialized) {
        this.initializeGame();
        this.isGameInitialized = true;
      }

      // [1.4.7] 씬 로딩 완료 플래그 설정
      useGameStore.getState().setSceneReady(true);
      console.log('[MainScene] Scene ready, isSceneReady = true');

      // [1.4.8] UI 준비 완료 대기 후 게임 시작
      const waitForUI = () => {
        if (useUIStore.getState().isUIReady) {
          console.log('[MainScene] UI ready, transitioning to playing phase');
          useGameStore.getState().setPhase('playing');
        } else {
          requestAnimationFrame(waitForUI);
        }
      };
      waitForUI();
    });
  }

  /** 게임 초기화 */
  private initializeGame(): void {
    const isTouchDevice = 'ontouchstart' in window;
    this.cachedIsMobile = isTouchDevice;

    // 배경색 변경
    this.cameras.main.setBackgroundColor('#16213e');

    // 물리, 카메라 설정
    this.physics.world.setBounds(0, 0, WORLD_CONFIG.WIDTH, WORLD_CONFIG.HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_CONFIG.WIDTH, WORLD_CONFIG.HEIGHT);
    this.cameras.main.setZoom(isTouchDevice ? 0.75 : 0.9);

    // 그리드 배치
    this.createGrid();



    // 입력 설정
    this.setupInput();

    // 주기적 입력 전송
    this.time.addEvent({
      delay: this.moveInterval,
      callback: this.sendCurrentDirection,
      callbackScope: this,
      loop: true,
    });

    this.isGameReady = true;
  }

  //========================================
  // 텍스처 생성
  //========================================

  private createGridTile(): void {
    const tileSize = 500;
    const gridSize = 100;
    const graphics = this.add.graphics();

    graphics.fillStyle(0x000000, 0);
    graphics.fillRect(0, 0, tileSize, tileSize);

    graphics.fillStyle(0x2a3a5e, 1);
    for (let x = 0; x <= tileSize; x += gridSize) {
      for (let y = 0; y <= tileSize; y += gridSize) {
        graphics.fillCircle(x, y, 4);
      }
    }

    graphics.lineStyle(1, 0x1e2d4a, 0.5);
    for (let x = 0; x <= tileSize; x += gridSize) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, tileSize);
    }
    for (let y = 0; y <= tileSize; y += gridSize) {
      graphics.moveTo(0, y);
      graphics.lineTo(tileSize, y);
    }
    graphics.strokePath();

    graphics.generateTexture('grid-tile', tileSize, tileSize);
    graphics.destroy();
  }

  /**
   * [1.4.8] 대시바용 텍스처 생성 (한 번만 생성하여 texImage2D 호출 방지)
   * - white-pixel: 1x1 흰색 픽셀 (scale + tint로 바 렌더링)
   * - dash-bar-bg: 둥근 모서리 배경
   * - dash-bar-fill: 둥근 모서리 진행률 바
   */
  private createDashBarTextures(): void {
    // 이미 생성되어 있으면 스킵
    if (this.textures.exists('white-pixel')) return;

    // 1x1 흰색 픽셀
    const pixelGraphics = this.add.graphics();
    pixelGraphics.fillStyle(0xffffff, 1);
    pixelGraphics.fillRect(0, 0, 1, 1);
    pixelGraphics.generateTexture('white-pixel', 1, 1);
    pixelGraphics.destroy();

    // 둥근 모서리 바 배경 (50x6)
    const barBgGraphics = this.add.graphics();
    barBgGraphics.fillStyle(0x333333, 1);
    barBgGraphics.fillRoundedRect(0, 0, 50, 6, 3);
    barBgGraphics.generateTexture('dash-bar-bg', 50, 6);
    barBgGraphics.destroy();

    // 둥근 모서리 바 진행률 (50x6)
    const barFillGraphics = this.add.graphics();
    barFillGraphics.fillStyle(0xffffff, 1);
    barFillGraphics.fillRoundedRect(0, 0, 50, 6, 3);
    barFillGraphics.generateTexture('dash-bar-fill', 50, 6);
    barFillGraphics.destroy();
  }

  // [1.4.7] createBigGridTexture, createBorderTexture 삭제됨 (성능 최적화: TileSprite/Graphics 직접 사용)

  //========================================
  // 그리드 배치
  //========================================

  private createGrid(): void {
    const isMobile = this.cachedIsMobile;

    if (this.textures.exists('grid-tile')) {
      // [1.4.7] 성능 최적화: 4000x4000 텍스처 대신 500x500 패턴 반복 사용 (메모리 절약)
      this.add.tileSprite(
        WORLD_CONFIG.WIDTH / 2,
        WORLD_CONFIG.HEIGHT / 2,
        WORLD_CONFIG.WIDTH,
        WORLD_CONFIG.HEIGHT,
        'grid-tile'
      ).setDepth(-10);
    }

    // [1.4.7] 성능 최적화: 경계선은 텍스처 대신 Graphics로 직접 그리기
    const border = this.add.graphics();
    border.lineStyle(8, 0xff4444, 1);
    border.strokeRect(0, 0, WORLD_CONFIG.WIDTH, WORLD_CONFIG.HEIGHT);
    border.setDepth(-8);

    if (!isMobile) {
      // 큰 그리드(big-grid) 대신 Graphics로 가볍게 그림
      const bigGrid = this.add.graphics();
      bigGrid.lineStyle(2, 0x2a3a5e, 0.5); // 투명도 낮춤
      const worldSize = WORLD_SIZE;
      const gridSize = 500;

      for (let x = 0; x <= worldSize; x += gridSize) {
        bigGrid.moveTo(x, 0);
        bigGrid.lineTo(x, worldSize);
      }
      for (let y = 0; y <= worldSize; y += gridSize) {
        bigGrid.moveTo(0, y);
        bigGrid.lineTo(worldSize, y);
      }
      bigGrid.strokePath();
      bigGrid.setDepth(-9);

      const warningZone = this.add.graphics();
      warningZone.fillStyle(0xff0000, 0.1);
      const w = 50;
      warningZone.fillRect(0, 0, WORLD_CONFIG.WIDTH, w);
      warningZone.fillRect(0, WORLD_CONFIG.HEIGHT - w, WORLD_CONFIG.WIDTH, w);
      warningZone.fillRect(0, 0, w, WORLD_CONFIG.HEIGHT);
      warningZone.fillRect(WORLD_CONFIG.WIDTH - w, 0, w, WORLD_CONFIG.HEIGHT);
    }
  }

  //========================================
  // 입력 처리
  //========================================

  private setupInput(): void {
    const isTouchDevice = 'ontouchstart' in window;

    // 포인터 다운 (이동 + PC 대시)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (isTouchDevice) {
        // 모바일: 더블탭으로 대시 사용 (부스터 버튼 제거됨)
        this.updateAngleFromPointer(pointer);
      } else {
        // PC: 클릭 시 이동 + 좌클릭 대시
        this.updateAngleFromPointer(pointer);
        if (pointer.leftButtonDown()) {
          tryDash();
        }
      }
    });

    // 포인터 이동 (방향 업데이트)
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // 터치 중이거나 마우스 이동 시
      if (pointer.isDown || !isTouchDevice) {
        this.updateAngleFromPointer(pointer);
      }
    });
  }

  /** [1.4.7] GC 최적화: Vector2 재사용 및 Store 호출 제거 */
  private updateAngleFromPointer(pointer: Phaser.Input.Pointer): void {
    const myPlayer = this.cachedMyPlayer;
    if (!myPlayer) return;

    // getWorldPoint에 tempVector 전달하여 객체 생성 방지
    this.cameras.main.getWorldPoint(pointer.x, pointer.y, this.tempVector);
    this.currentAngle = Math.atan2(
      this.tempVector.y - myPlayer.y,
      this.tempVector.x - myPlayer.x
    );
  }

  private sendCurrentDirection(): void {
    const myPlayer = this.cachedMyPlayer;
    if (!myPlayer) return;
    socketService.sendMove({
      angle: this.currentAngle,
      isMoving: true,
      timestamp: Date.now(),
    });
  }

  //========================================
  // 게임 루프
  //========================================

  update(_time: number): void {
    if (!this.isGameReady) return;

    // [1.4.7] Store Polling 제거 - Subscribe로 대체됨

    const players = this.cachedPlayers;
    const myPlayer = this.cachedMyPlayer;
    const isMobile = this.cachedIsMobile;
    const myPlayerId = myPlayer?.id ?? null;

    const visiblePlayers = isMobile ? this.getVisiblePlayers(players, myPlayer) : players;
    this.updatePlayerSpritesProgressive(
      visiblePlayers,
      myPlayerId,
      isMobile,
      this.cachedRankings,
      this.cachedIsDashing,
      this.cachedDashCooldownEndTime
    );
    this.updateCamera(myPlayerId);

  }

  /** [1.4.5] 화면 내 플레이어 필터링 - sqrt 제거로 성능 개선 */
  private getVisiblePlayers(players: Map<string, Player>, myPlayer: Player | null): Map<string, Player> {
    if (!myPlayer) return players;
    const viewDistanceSq = 600 * 600; // sqrt 제거
    const visiblePlayers = new Map<string, Player>();
    players.forEach((player, id) => {
      const dx = player.x - myPlayer.x;
      const dy = player.y - myPlayer.y;
      // [1.4.5] 제곱 비교로 sqrt 호출 제거
      if (id === myPlayer.id || (dx * dx + dy * dy) < viewDistanceSq) {
        visiblePlayers.set(id, player);
      }
    });
    return visiblePlayers;
  }

  private updatePlayerSpritesProgressive(
    players: Map<string, Player>,
    myPlayerId: string | null,
    isMobile: boolean,
    rankings: any[],
    isDashing: boolean,
    dashCooldownEndTime: number
  ): void {
    // 제거
    this.playerSprites.forEach((container, id) => {
      if (!players.has(id)) {
        this.tweens.add({
          targets: container,
          scaleX: 0, scaleY: 0, alpha: 0,
          duration: 200,
          ease: 'Power2',
          onComplete: () => this.playerRenderer.returnToPool(container),
        });
        this.playerSprites.delete(id);
        this.pendingPlayers.delete(id);
      }
    });

    // 대기열 추가
    players.forEach((player, id) => {
      if (!this.playerSprites.has(id) && !this.pendingPlayers.has(id)) {
        this.pendingPlayers.set(id, player);
      }
    });

    // 점진적 생성
    let created = 0;
    const entries = Array.from(this.pendingPlayers.entries());

    // 내 플레이어 우선
    for (const [id, player] of entries) {
      if (id === myPlayerId && !this.playerSprites.has(id)) {
        this.playerSprites.set(id, this.playerRenderer.createSprite(player, true));
        this.pendingPlayers.delete(id);
        created++;
        break;
      }
    }

    for (const [id, player] of entries) {
      if (created >= this.PLAYERS_PER_FRAME || this.playerSprites.has(id)) continue;
      this.playerSprites.set(id, this.playerRenderer.createSprite(player, id === myPlayerId));
      this.pendingPlayers.delete(id);
      created++;
    }

    // 업데이트
    players.forEach((player, id) => {
      const container = this.playerSprites.get(id);
      if (container) {
        this.playerRenderer.updateSprite(
          container,
          player,
          id === myPlayerId,
          isMobile,
          rankings,
          isDashing,
          dashCooldownEndTime,
          this.currentAngle  // [1.4.7] 눈동자 마우스 추적용
        );
      }
    });
  }

  private updateCamera(playerId: string | null): void {
    if (!playerId) return;
    const container = this.playerSprites.get(playerId);
    if (container) this.cameras.main.centerOn(container.x, container.y);
  }

  shutdown(): void {
    // [1.4.7] 구독 해제
    this.unsubscribe?.();
    this.unsubscribeUI?.();
    this.unsubscribePhase?.();

    this.playerSprites.forEach((sprite) => sprite.destroy());
    this.playerSprites.clear();
    this.pendingPlayers.clear();
    this.input.off('pointermove');
    this.input.off('pointerdown');
  }
}
