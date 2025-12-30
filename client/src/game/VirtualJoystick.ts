/**
 * 가상 조이스틱
 * 모바일 터치 입력을 위한 가상 조이스틱 컴포넌트입니다.
 */
import Phaser from 'phaser';

/** 조이스틱 설정 */
interface JoystickConfig {
  /** 조이스틱 반경 */
  radius: number;
  /** 베이스 색상 */
  baseColor: number;
  /** 스틱 색상 */
  stickColor: number;
  /** 투명도 */
  alpha: number;
}

/** 기본 설정 */
const DEFAULT_CONFIG: JoystickConfig = {
  radius: 60,
  baseColor: 0x333333,
  stickColor: 0x4ecdc4,
  alpha: 0.6,
};

/**
 * 가상 조이스틱 클래스
 * 터치 입력을 방향 벡터로 변환합니다.
 */
export class VirtualJoystick {
  private scene: Phaser.Scene;
  private config: JoystickConfig;

  /** 조이스틱 컨테이너 */
  private container: Phaser.GameObjects.Container;
  /** 베이스 그래픽 */
  private base: Phaser.GameObjects.Graphics;
  /** 스틱 그래픽 */
  private stick: Phaser.GameObjects.Graphics;

  /** 활성화 여부 */
  private isActive = false;
  /** 시작 위치 */
  private startPosition = { x: 0, y: 0 };
  /** 현재 방향 벡터 (-1 ~ 1) */
  private direction = { x: 0, y: 0 };
  /** 현재 강도 (0 ~ 1) */
  private force = 0;

  /** 터치 포인터 ID */
  private pointerId: number | null = null;

  constructor(scene: Phaser.Scene, config: Partial<JoystickConfig> = {}) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // 컨테이너 생성
    this.container = scene.add.container(0, 0);
    this.container.setDepth(1000);
    this.container.setVisible(false);
    this.container.setScrollFactor(0); // UI 레이어로 고정

    // 베이스 생성
    this.base = scene.add.graphics();
    this.drawBase();
    this.container.add(this.base);

    // 스틱 생성
    this.stick = scene.add.graphics();
    this.drawStick(0, 0);
    this.container.add(this.stick);

    // 입력 이벤트 등록
    this.setupInput();
  }

  /**
   * 베이스 그리기
   */
  private drawBase(): void {
    const { radius, baseColor, alpha } = this.config;
    this.base.clear();
    this.base.fillStyle(baseColor, alpha * 0.5);
    this.base.fillCircle(0, 0, radius);
    this.base.lineStyle(2, baseColor, alpha);
    this.base.strokeCircle(0, 0, radius);
  }

  /**
   * 스틱 그리기
   */
  private drawStick(offsetX: number, offsetY: number): void {
    const { stickColor, alpha } = this.config;
    const stickRadius = this.config.radius * 0.4;

    this.stick.clear();
    this.stick.fillStyle(stickColor, alpha);
    this.stick.fillCircle(offsetX, offsetY, stickRadius);
  }

  /**
   * 입력 이벤트 설정
   */
  private setupInput(): void {
    this.scene.input.on('pointerdown', this.onPointerDown, this);
    this.scene.input.on('pointermove', this.onPointerMove, this);
    this.scene.input.on('pointerup', this.onPointerUp, this);
  }

  /**
   * 터치 시작
   */
  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    // 이미 활성화된 경우 무시
    if (this.isActive) return;

    // 화면 왼쪽 절반에서만 조이스틱 활성화
    if (pointer.x > this.scene.cameras.main.width / 2) return;

    this.isActive = true;
    this.pointerId = pointer.id;
    this.startPosition = { x: pointer.x, y: pointer.y };

    this.container.setPosition(pointer.x, pointer.y);
    this.container.setVisible(true);
    this.drawStick(0, 0);
  }

  /**
   * 터치 이동
   */
  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isActive || pointer.id !== this.pointerId) return;

    const dx = pointer.x - this.startPosition.x;
    const dy = pointer.y - this.startPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const { radius } = this.config;

    // 최대 반경 제한
    const clampedDistance = Math.min(distance, radius);
    const angle = Math.atan2(dy, dx);

    const stickX = Math.cos(angle) * clampedDistance;
    const stickY = Math.sin(angle) * clampedDistance;

    // 방향 및 강도 계산
    this.direction = {
      x: distance > 0 ? dx / distance : 0,
      y: distance > 0 ? dy / distance : 0,
    };
    this.force = clampedDistance / radius;

    // 스틱 위치 업데이트
    this.drawStick(stickX, stickY);
  }

  /**
   * 터치 종료
   */
  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.isActive || pointer.id !== this.pointerId) return;

    this.isActive = false;
    this.pointerId = null;
    this.direction = { x: 0, y: 0 };
    this.force = 0;

    this.container.setVisible(false);
    this.drawStick(0, 0);
  }

  /**
   * 현재 방향 벡터 반환
   * @returns 정규화된 방향 벡터 (-1 ~ 1)
   */
  getDirection(): { x: number; y: number } {
    return { ...this.direction };
  }

  /**
   * 현재 강도 반환
   * @returns 강도 (0 ~ 1)
   */
  getForce(): number {
    return this.force;
  }

  /**
   * 조이스틱 활성화 여부
   */
  getIsActive(): boolean {
    return this.isActive;
  }

  /**
   * 정리
   */
  destroy(): void {
    this.scene.input.off('pointerdown', this.onPointerDown, this);
    this.scene.input.off('pointermove', this.onPointerMove, this);
    this.scene.input.off('pointerup', this.onPointerUp, this);
    this.container.destroy();
  }
}
