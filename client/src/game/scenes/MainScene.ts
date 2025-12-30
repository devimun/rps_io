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
 * 대시 요청 (상태 체크 후 전송)
 */
function tryDash(): void {
  if (canDash()) {
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
  private cameraInitialized = false;
  private virtualJoystick: VirtualJoystick | null = null;
  private boostButton: BoostButton | null = null;
  private isMobile = false;
  private playerRenderer!: PlayerRenderer;
  
  /** 스페이스바 눌림 상태 추적 (키 반복 방지) */
  private spaceKeyPressed = false;

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
      
      // 모바일 성능 최적화: 저사양 모드 활성화
      useUIStore.getState().setLowSpecMode(true);
    }
  }

  /**
   * 그리드 배경 및 월드 경계선 생성
   */
  private createGrid(): void {
    const graphics = this.add.graphics();
    const gridSize = this.isMobile ? 200 : 100; // 모바일: 그리드 간격 증가

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
    
    // 스페이스바: keydown/keyup으로 직접 처리 (키 반복 방지)
    this.input.keyboard?.on('keydown-SPACE', this.onSpaceDown, this);
    this.input.keyboard?.on('keyup-SPACE', this.onSpaceUp, this);
    
    // 마우스 우클릭으로 즉시 대시
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
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

  /**
   * 스페이스바 눌림 (키 반복 방지)
   */
  private onSpaceDown(): void {
    // 이미 눌린 상태면 무시 (키 반복 방지)
    if (this.spaceKeyPressed) return;
    
    this.spaceKeyPressed = true;
    tryDash();
  }

  /**
   * 스페이스바 뗌
   */
  private onSpaceUp(): void {
    this.spaceKeyPressed = false;
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.isMobile) {
      // 모바일: 조이스틱/부스트 버튼 영역 외 터치는 무시
      return;
    }

    // PC: 좌클릭은 이동만
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
    const { lowSpecMode } = useUIStore.getState();
    const myPlayerId = myPlayer?.id ?? null;

    // 모바일 부스트 버튼 업데이트
    if (this.boostButton) {
      this.boostButton.update();
    }

    this.updatePlayerSprites(players, myPlayerId, lowSpecMode);
    this.updateCamera(myPlayerId);
  }

  private updatePlayerSprites(
    players: Map<string, Player>,
    myPlayerId: string | null,
    lowSpecMode: boolean
  ): void {
    // 사라진 플레이어 제거 (사망 애니메이션)
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

      this.playerRenderer.updateSprite(container, player, id === myPlayerId, lowSpecMode);
    });
  }

  private updateCamera(playerId: string | null): void {
    if (!playerId) return;

    const container = this.playerSprites.get(playerId);
    if (container) {
      if (!this.cameraInitialized) {
        this.cameras.main.centerOn(container.x, container.y);
        this.cameraInitialized = true;
      } else {
        this.cameras.main.centerOn(container.x, container.y);
      }
    }
  }

  shutdown(): void {
    this.playerSprites.forEach((sprite) => sprite.destroy());
    this.playerSprites.clear();
    this.input.off('pointermove', this.handlePointerMove, this);
    this.input.off('pointerdown', this.handlePointerMove, this);
    
    // 키보드 이벤트 정리
    this.input.keyboard?.off('keydown-SPACE', this.onSpaceDown, this);
    this.input.keyboard?.off('keyup-SPACE', this.onSpaceUp, this);
    
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
