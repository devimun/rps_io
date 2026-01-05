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
  private lastTapTime = 0;
  private isGameReady = false;

  /** 로딩 UI */
  private loadingText?: Phaser.GameObjects.Text;
  private loadingBar?: Phaser.GameObjects.Graphics;
  private loadingBarBg?: Phaser.GameObjects.Graphics;
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
  private lastStoreCheckTime = 0;
  /** [1.4.5] Store 캐싱 주기 증가 (16ms → 32ms) */
  private readonly STORE_CHECK_INTERVAL = 32;

  constructor() {
    super({ key: SCENE_KEYS.MAIN });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    // 배경색
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // 로딩 UI 생성
    this.loadingBarBg = this.add.graphics();
    this.loadingBarBg.fillStyle(0x333333, 1);
    this.loadingBarBg.fillRect(centerX - 150, centerY, 300, 20);
    this.loadingBarBg.setDepth(100);

    this.loadingBar = this.add.graphics();
    this.loadingBar.setDepth(100);

    this.loadingText = this.add.text(centerX, centerY + 50, '에셋 로딩 중...', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(100);

    // 로딩 이벤트
    this.load.on('progress', this.onLoadProgress, this);
    this.load.on('complete', this.onAssetsLoaded, this);

    // [1.4.5] 로딩 시작 시간 기록
    this.loadingStartTime = Date.now();

    // 에셋 로딩 시작
    this.loadAssets();
  }

  /** 에셋 로딩 */
  private loadAssets(): void {
    this.load.spritesheet('rps-sprites', '/assets/images/rps.png', {
      frameWidth: 128,
      frameHeight: 128,
    });
    this.load.start();
  }

  /** 로딩 진행률 업데이트 */
  private onLoadProgress(progress: number): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    this.loadingBar?.clear();
    this.loadingBar?.fillStyle(0x4ecdc4, 1);
    this.loadingBar?.fillRect(centerX - 148, centerY + 2, 296 * progress * 0.3, 16);

    this.loadingText?.setText(`에셋 로딩 중... ${Math.floor(progress * 30)}%`);
  }

  /** 에셋 로딩 완료 → 텍스처 생성 */
  private onAssetsLoaded(): void {
    this.loadingText?.setText('텍스처 생성 중... 30%');

    // 다음 프레임에서 텍스처 생성 (프레임 드랍 방지)
    requestAnimationFrame(() => this.createTexturesProgressively());
  }

  /** 텍스처 점진적 생성 */
  private createTexturesProgressively(): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    // Step 1: 그리드 타일
    this.createGridTile();
    this.updateLoadingBar(centerX, centerY, 0.4, '그리드 생성 중... 40%');

    requestAnimationFrame(() => {
      // Step 2: 큰 그리드
      this.createBigGridTexture();
      this.updateLoadingBar(centerX, centerY, 0.5, '월드 생성 중... 50%');

      requestAnimationFrame(() => {
        // Step 3: 경계선
        this.createBorderTexture();
        this.updateLoadingBar(centerX, centerY, 0.6, '월드 생성 완료... 60%');

        // Pool 생성 시작
        this.playerRenderer = new PlayerRenderer(this);
        this.startPoolCreation();
      });
    });
  }

  /** Pool 점진적 생성 */
  private startPoolCreation(): void {
    const createOne = () => {
      if (this.poolCreated >= this.POOL_TARGET) {
        this.onLoadingComplete();
        return;
      }

      // 1개 생성
      this.playerRenderer.prewarmPoolOne();
      this.poolCreated++;

      // 진행률 업데이트
      const progress = 0.6 + (this.poolCreated / this.POOL_TARGET) * 0.4;
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
    const elapsed = Date.now() - this.loadingStartTime;
    const remaining = Math.max(0, this.MIN_LOADING_TIME - elapsed);

    this.loadingText?.setText('완료!');

    // 로딩 UI 제거 + 게임 초기화
    this.time.delayedCall(200 + remaining, () => {
      this.loadingText?.destroy();
      this.loadingBar?.destroy();
      this.loadingBarBg?.destroy();

      this.initializeGame();
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
    this.cameras.main.setZoom(isTouchDevice ? 0.6 : 1.0);

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

  private createBigGridTexture(): void {
    const worldSize = WORLD_SIZE;
    const gridSize = 500;
    const graphics = this.add.graphics();

    graphics.lineStyle(2, 0x2a3a5e, 0.8);
    for (let x = 0; x <= worldSize; x += gridSize) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, worldSize);
    }
    for (let y = 0; y <= worldSize; y += gridSize) {
      graphics.moveTo(0, y);
      graphics.lineTo(worldSize, y);
    }
    graphics.strokePath();

    graphics.generateTexture('big-grid', worldSize, worldSize);
    graphics.destroy();
  }

  private createBorderTexture(): void {
    const worldSize = WORLD_SIZE;
    const graphics = this.add.graphics();

    graphics.lineStyle(8, 0xff4444, 1);
    graphics.strokeRect(0, 0, worldSize, worldSize);

    graphics.generateTexture('world-border', worldSize, worldSize);
    graphics.destroy();
  }

  //========================================
  // 그리드 배치
  //========================================

  private createGrid(): void {
    const isMobile = useUIStore.getState().isMobile;

    if (isMobile) {
      if (this.textures.exists('big-grid')) {
        this.add.image(WORLD_CONFIG.WIDTH / 2, WORLD_CONFIG.HEIGHT / 2, 'big-grid').setDepth(-10);
      }
    } else {
      if (this.textures.exists('grid-tile')) {
        this.add.tileSprite(WORLD_CONFIG.WIDTH / 2, WORLD_CONFIG.HEIGHT / 2,
          WORLD_CONFIG.WIDTH, WORLD_CONFIG.HEIGHT, 'grid-tile').setDepth(-10);
      }
      if (this.textures.exists('big-grid')) {
        this.add.image(WORLD_CONFIG.WIDTH / 2, WORLD_CONFIG.HEIGHT / 2, 'big-grid')
          .setDepth(-9).setAlpha(0.5);
      }
    }

    if (this.textures.exists('world-border')) {
      this.add.image(WORLD_CONFIG.WIDTH / 2, WORLD_CONFIG.HEIGHT / 2, 'world-border').setDepth(-8);
    }

    if (!isMobile) {
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
    const DOUBLE_TAP_THRESHOLD = 300;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.updateAngleFromPointer(pointer);
      if (isTouchDevice) {
        const now = Date.now();
        if (now - this.lastTapTime < DOUBLE_TAP_THRESHOLD) tryDash();
        this.lastTapTime = now;
      } else if (pointer.leftButtonDown()) {
        tryDash();
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.updateAngleFromPointer(pointer);
    });
  }

  private updateAngleFromPointer(pointer: Phaser.Input.Pointer): void {
    const myPlayer = this.cachedMyPlayer || useGameStore.getState().myPlayer;
    if (!myPlayer) return;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.currentAngle = Math.atan2(worldPoint.y - myPlayer.y, worldPoint.x - myPlayer.x);
  }

  private sendCurrentDirection(): void {
    const myPlayer = this.cachedMyPlayer || useGameStore.getState().myPlayer;
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

  update(time: number): void {
    if (!this.isGameReady) return;

    // Store 캐싱
    if (time - this.lastStoreCheckTime > this.STORE_CHECK_INTERVAL) {
      const state = useGameStore.getState();
      this.cachedPlayers = state.players;
      this.cachedMyPlayer = state.myPlayer;
      this.cachedIsMobile = useUIStore.getState().isMobile;
      this.lastStoreCheckTime = time;
    }

    const players = this.cachedPlayers;
    const myPlayer = this.cachedMyPlayer;
    const isMobile = this.cachedIsMobile;
    const myPlayerId = myPlayer?.id ?? null;

    const visiblePlayers = isMobile ? this.getVisiblePlayers(players, myPlayer) : players;
    this.updatePlayerSpritesProgressive(visiblePlayers, myPlayerId, isMobile);
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

  private updatePlayerSpritesProgressive(players: Map<string, Player>, myPlayerId: string | null, isMobile: boolean): void {
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
      if (container) this.playerRenderer.updateSprite(container, player, id === myPlayerId, isMobile);
    });
  }

  private updateCamera(playerId: string | null): void {
    if (!playerId) return;
    const container = this.playerSprites.get(playerId);
    if (container) this.cameras.main.centerOn(container.x, container.y);
  }

  shutdown(): void {
    this.playerSprites.forEach((sprite) => sprite.destroy());
    this.playerSprites.clear();
    this.pendingPlayers.clear();
    this.input.off('pointermove');
    this.input.off('pointerdown');
  }
}
