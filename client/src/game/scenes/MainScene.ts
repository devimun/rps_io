/**
 * 메인 게임 씬
 * 실제 게임 플레이가 이루어지는 씬입니다.
 */
import Phaser from 'phaser';
import { SCENE_KEYS } from './PreloadScene';
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';
import { socketService } from '../../services/socketService';
import type { Player } from '@chaos-rps/shared';
import { WORLD_SIZE } from '@chaos-rps/shared';
import { VirtualJoystick } from '../VirtualJoystick';
import { BoostButton } from '../BoostButton';
import { PlayerRenderer } from '../PlayerRenderer';

/** 게임 월드 크기 */
const WORLD_CONFIG = { WIDTH: WORLD_SIZE, HEIGHT: WORLD_SIZE };

/**
 * 모바일 디바이스 감지
 */
function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || ('ontouchstart' in window);
}

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
 */
export class MainScene extends Phaser.Scene {
  private playerSprites: Map<string, Phaser.GameObjects.Container> = new Map();
  private lastMoveTime = 0;
  private readonly moveInterval = 50;
  private virtualJoystick: VirtualJoystick | null = null;
  private boostButton: BoostButton | null = null;
  private isMobile = false;
  private playerRenderer!: PlayerRenderer;

  constructor() {
    super({ key: SCENE_KEYS.MAIN });
  }

  create(): void {
    this.isMobile = isMobileDevice();
    this.playerRenderer = new PlayerRenderer(this);

    this.cameras.main.setBackgroundColor('#16213e');
    this.physics.world.setBounds(0, 0, WORLD_CONFIG.WIDTH, WORLD_CONFIG.HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_CONFIG.WIDTH, WORLD_CONFIG.HEIGHT);
    this.cameras.main.setZoom(1.0);

    this.createGrid();
    this.setupInput();

    // 모바일: 조이스틱 + 부스트 버튼 (항상 표시)
    if (this.isMobile) {
      this.virtualJoystick = new VirtualJoystick(this);
      this.boostButton = new BoostButton(this, tryDash);
    }
  }

  /**
   * 그리드 배경 및 월드 경계선 생성
   */
  private createGrid(): void {
    const graphics = this.add.graphics();
    const gridSize = this.isMobile ? 200 : 100;

    // 점 패턴 배경 (모바일에서는 간소화)
    if (!this.isMobile) {
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
    if (!this.isMobile) {
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
    if (!this.isMobile) {
      const warningZone = this.add.graphics();
      warningZone.fillStyle(0xff0000, 0.1);
      const w = 50;
      warningZone.fillRect(0, 0, WORLD_CONFIG.WIDTH, w);
      warningZone.fillRect(0, WORLD_CONFIG.HEIGHT - w, WORLD_CONFIG.WIDTH, w);
      warningZone.fillRect(0, 0, w, WORLD_CONFIG.HEIGHT);
      warningZone.fillRect(WORLD_CONFIG.WIDTH - w, 0, w, WORLD_CONFIG.HEIGHT);
    }
  }

  private setupInput(): void {
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerdown', this.handlePointerDown, this);
    
    // 대시: 마우스 클릭 (PC)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isMobile && (pointer.leftButtonDown() || pointer.rightButtonDown())) {
        tryDash();
      }
    });
    
    this.time.addEvent({
      delay: this.moveInterval,
      callback: this.sendCurrentPointerPosition,
      callbackScope: this,
      loop: true,
    });
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.isMobile) return;
    this.handlePointerMove(pointer);
  }

  private sendCurrentPointerPosition(): void {
    const { playerId, myPlayer } = useGameStore.getState();
    if (!playerId || !myPlayer) return;

    if (this.isMobile && this.virtualJoystick) {
      const direction = this.virtualJoystick.getDirection();
      const force = this.virtualJoystick.getForce();

      if (this.virtualJoystick.getIsActive() && force > 0.1) {
        socketService.sendMove({
          targetX: myPlayer.x + direction.x * 200,
          targetY: myPlayer.y + direction.y * 200,
          timestamp: Date.now(),
        });
      }
      return;
    }

    const pointer = this.input.activePointer;
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    socketService.sendMove({
      targetX: worldPoint.x,
      targetY: worldPoint.y,
      timestamp: Date.now(),
    });
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    const now = Date.now();
    if (now - this.lastMoveTime < this.moveInterval) return;

    const { playerId } = useGameStore.getState();
    if (!playerId) return;

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    socketService.sendMove({
      targetX: worldPoint.x,
      targetY: worldPoint.y,
      timestamp: now,
    });
    this.lastMoveTime = now;
  }

  update(): void {
    const { players, myPlayer } = useGameStore.getState();
    const { isMobile } = useUIStore.getState();
    const myPlayerId = myPlayer?.id ?? null;

    if (this.boostButton) {
      this.boostButton.update();
    }

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
    this.input.off('pointermove', this.handlePointerMove, this);
    this.input.off('pointerdown', this.handlePointerMove, this);
    
    if (this.virtualJoystick) {
      this.virtualJoystick.destroy();
      this.virtualJoystick = null;
    }
    
    if (this.boostButton) {
      this.boostButton.destroy();
      this.boostButton = null;
    }
  }
}
