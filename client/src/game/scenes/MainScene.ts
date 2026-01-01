/**
 * 메인 게임 씬
 * 실제 게임 플레이가 이루어지는 씬입니다.
 * Slither.io 스타일: 항상 마우스/터치 방향으로 이동
 */
import Phaser from 'phaser';
import { SCENE_KEYS } from './PreloadScene';
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';
import { socketService } from '../../services/socketService';
import type { Player } from '@chaos-rps/shared';
import { WORLD_SIZE } from '@chaos-rps/shared';
import { PlayerRenderer } from '../PlayerRenderer';

/** 게임 월드 크기 */
const WORLD_CONFIG = { WIDTH: WORLD_SIZE, HEIGHT: WORLD_SIZE };

/** 마지막 대시 요청 시간 (클라이언트 쓰로틀링) */
let lastDashRequestTime = 0;
const DASH_REQUEST_THROTTLE = 100; // 100ms 쓰로틀링

/**
 * 대시 가능 여부 확인 (클라이언트 측 체크)
 */
function canDash(): boolean {
  const { isDashing, dashCooldownEndTime } = useGameStore.getState();
  if (isDashing) return false;
  if (Date.now() < dashCooldownEndTime) return false;
  return true;
}

/**
 * 대시 요청 (상태 체크 + 쓰로틀링 후 전송)
 */
function tryDash(): void {
  const now = Date.now();

  // 클라이언트 쓰로틀링: 너무 빠른 연속 요청 방지
  if (now - lastDashRequestTime < DASH_REQUEST_THROTTLE) return;

  if (canDash()) {
    lastDashRequestTime = now;
    socketService.sendDash();
  }
}

/**
 * 메인 게임 씬 클래스
 * Slither.io 스타일: 항상 마우스/터치 방향으로 이동, 절대 멈추지 않음
 */
export class MainScene extends Phaser.Scene {
  private playerSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private readonly moveInterval = 50; // 50ms = 20Hz 입력 전송
  private playerRenderer!: PlayerRenderer;

  /** 현재 이동 방향 각도 */
  private currentAngle = 0;
  /** 마지막 터치 시간 (더블탭 감지용) */
  private lastTapTime = 0;

  constructor() {
    super({ key: SCENE_KEYS.MAIN });
  }

  create(): void {
    this.playerRenderer = new PlayerRenderer(this);

    // 모바일 감지
    const isTouchDevice = 'ontouchstart' in window;

    this.cameras.main.setBackgroundColor('#16213e');
    this.physics.world.setBounds(0, 0, WORLD_CONFIG.WIDTH, WORLD_CONFIG.HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_CONFIG.WIDTH, WORLD_CONFIG.HEIGHT);
    this.cameras.main.setZoom(isTouchDevice ? 0.6 : 1.0);

    this.createGrid();
    this.setupInput();

    // 주기적 입력 전송 (항상 이동)
    this.time.addEvent({
      delay: this.moveInterval,
      callback: this.sendCurrentDirection,
      callbackScope: this,
      loop: true,
    });
  }

  /**
   * 그리드 배경 및 월드 경계선 생성
   */
  private createGrid(): void {
    const graphics = this.add.graphics();
    const isMobile = useUIStore.getState().isMobile;
    const gridSize = isMobile ? 200 : 100;

    // 점 패턴 배경 (모바일에서는 간소화)
    if (!isMobile) {
      graphics.fillStyle(0x2a3a5e, 1);
      for (let x = 0; x <= WORLD_CONFIG.WIDTH; x += gridSize) {
        for (let y = 0; y <= WORLD_CONFIG.HEIGHT; y += gridSize) {
          graphics.fillCircle(x, y, 4);
        }
      }
    }

    // 큰 그리드 선 (500px 간격)
    graphics.lineStyle(2, 0x2a3a5e, 0.8);
    for (let x = 0; x <= WORLD_CONFIG.WIDTH; x += 500) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, WORLD_CONFIG.HEIGHT);
    }
    for (let y = 0; y <= WORLD_CONFIG.HEIGHT; y += 500) {
      graphics.moveTo(0, y);
      graphics.lineTo(WORLD_CONFIG.WIDTH, y);
    }
    graphics.strokePath();

    // 작은 그리드 선 (모바일에서는 생략)
    if (!isMobile) {
      graphics.lineStyle(1, 0x1e2d4a, 0.5);
      for (let x = 0; x <= WORLD_CONFIG.WIDTH; x += gridSize) {
        graphics.moveTo(x, 0);
        graphics.lineTo(x, WORLD_CONFIG.HEIGHT);
      }
      for (let y = 0; y <= WORLD_CONFIG.HEIGHT; y += gridSize) {
        graphics.moveTo(0, y);
        graphics.lineTo(WORLD_CONFIG.WIDTH, y);
      }
      graphics.strokePath();
    }

    // 월드 경계선
    const border = this.add.graphics();
    border.lineStyle(8, 0xff4444, 1);
    border.strokeRect(0, 0, WORLD_CONFIG.WIDTH, WORLD_CONFIG.HEIGHT);

    // 경계 경고 영역 (모바일에서는 생략)
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

  /**
   * 입력 설정 - Slither.io 스타일
   */
  private setupInput(): void {
    const isTouchDevice = 'ontouchstart' in window;
    const DOUBLE_TAP_THRESHOLD = 300; // 300ms 이내 더블탭

    // 포인터 다운 (터치 시작 또는 마우스 클릭)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // 방향 업데이트
      this.updateAngleFromPointer(pointer);

      if (isTouchDevice) {
        // 모바일: 더블탭으로 대시
        const now = Date.now();
        if (now - this.lastTapTime < DOUBLE_TAP_THRESHOLD) {
          tryDash();
        }
        this.lastTapTime = now;
      } else {
        // PC: 좌클릭으로 대시
        if (pointer.leftButtonDown()) {
          tryDash();
        }
      }
    });

    // 포인터 이동 - 항상 방향 업데이트
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.updateAngleFromPointer(pointer);
    });

    // 터치 이동 (모바일)
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown || !isTouchDevice) {
        this.updateAngleFromPointer(pointer);
      }
    });
  }

  /**
   * 포인터 위치에서 방향 각도 계산
   */
  private updateAngleFromPointer(pointer: Phaser.Input.Pointer): void {
    const { myPlayer } = useGameStore.getState();
    if (!myPlayer) return;

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const dx = worldPoint.x - myPlayer.x;
    const dy = worldPoint.y - myPlayer.y;

    // 방향 업데이트 (거리와 상관없이)
    this.currentAngle = Math.atan2(dy, dx);
  }

  /**
   * 현재 방향을 서버에 전송 - 항상 이동중 (isMoving: true)
   */
  private sendCurrentDirection(): void {
    const { myPlayer } = useGameStore.getState();
    if (!myPlayer) return;

    // Slither.io 스타일: 항상 이동
    socketService.sendMove({
      angle: this.currentAngle,
      isMoving: true,  // 절대 멈추지 않음!
      timestamp: Date.now(),
    });
  }

  update(): void {
    const { players, myPlayer } = useGameStore.getState();
    const { isMobile } = useUIStore.getState();
    const myPlayerId = myPlayer?.id ?? null;

    // 모바일 성능 최적화: 화면 밖 플레이어 업데이트 스킵
    const visiblePlayers = isMobile
      ? this.getVisiblePlayers(players, myPlayer)
      : players;

    this.updatePlayerSprites(visiblePlayers, myPlayerId, isMobile);
    this.updateCamera(myPlayerId);
  }

  /**
   * 화면에 보이는 플레이어만 필터링 (모바일 최적화)
   */
  private getVisiblePlayers(
    players: Map<string, Player>,
    myPlayer: Player | null
  ): Map<string, Player> {
    if (!myPlayer) return players;

    const viewDistance = 600; // 화면 반경
    const visiblePlayers = new Map<string, Player>();

    players.forEach((player, id) => {
      const dx = player.x - myPlayer.x;
      const dy = player.y - myPlayer.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 내 플레이어 또는 화면 내 플레이어만 포함
      if (id === myPlayer.id || distance < viewDistance) {
        visiblePlayers.set(id, player);
      }
    });

    return visiblePlayers;
  }

  private updatePlayerSprites(
    players: Map<string, Player>,
    myPlayerId: string | null,
    isMobile: boolean
  ): void {
    // 사라진 플레이어 제거
    this.playerSprites.forEach((container, id) => {
      if (!players.has(id)) {
        this.tweens.add({
          targets: container,
          scaleX: 0,
          scaleY: 0,
          alpha: 0,
          duration: 200,
          ease: 'Power2',
          onComplete: () => container.destroy(),
        });
        this.playerSprites.delete(id);
      }
    });

    // 플레이어 스프라이트 생성/업데이트
    players.forEach((player, id) => {
      let container = this.playerSprites.get(id);

      if (!container) {
        container = this.playerRenderer.createSprite(player, id === myPlayerId);
        this.playerSprites.set(id, container);
      }

      this.playerRenderer.updateSprite(container, player, id === myPlayerId, isMobile);
    });
  }

  private updateCamera(playerId: string | null): void {
    if (!playerId) return;

    const container = this.playerSprites.get(playerId);
    if (container) {
      this.cameras.main.centerOn(container.x, container.y);
    }
  }

  shutdown(): void {
    this.playerSprites.forEach((sprite) => sprite.destroy());
    this.playerSprites.clear();
    this.input.off('pointermove');
    this.input.off('pointerdown');
  }
}
