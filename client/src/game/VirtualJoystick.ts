/**
 * 가상 조이스틱
 * 모바일 터치 입력을 위한 가상 조이스틱 컴포넌트입니다.
 * 항상 화면에 표시되며, 터치하면 조작할 수 있습니다.
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
  radius: 50,
  baseColor: 0x333333,
  stickColor: 0x4ecdc4,
  alpha: 0.7,
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
  /** 고정 위치 (화면 좌하단) */
  private fixedPosition = { x: 0, y: 0 };
  /** 현재 방향 벡터 (-1 ~ 1) */
  private direction = { x: 0, y: 0 };
  /** 현재 강도 (0 ~ 1) */
  private force = 0;

  /** 터치 포인터 ID */
  private pointerId: number | null = null;

  constructor(scene: Phaser.Scene, config: Partial<JoystickConfig> = {}) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // 고정 위치 계산 (화면 좌하단)
    const padding = 30;
    this.fixedPosition = {
      x: padding + this.config.radius,
      y: scene.cameras.main.height - padding - this.config.radius,
    };

    // 컨테이너 생성 (항상 표시)
    this.container = scene.add.container(this.fixedPosition.x, this.fixedPosition.y);
    this.container.setDepth(1000);
    this.container.setScrollFactor(0);

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
    this.base.lineStyle(3, baseColor, alpha);
    this.base.strokeCircle(0, 0, radius);
  }

  /**
   * 스틱 그리기
   */
  private drawStick(offsetX: number, offsetY: number): void {
    const { stickColor, alpha } = this.config;
    const stickRadius = this.config.radius * 0.45;

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
   * 터치가 조이스틱 영역 내인지 확인
   */
  private isInJoystickArea(x: number, y: number): boolean {
    const dx = x - this.fixedPosition.x;
    const dy = y - this.fixedPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    // 조이스틱 반경의 1.5배 영역까지 터치 허용
    return distance <= this.config.radius * 1.5;
  }

  /**
   * 터치 시작
   */
  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.isActive) return;

    // 조이스틱 영역 내 터치만 처리
    if (!this.isInJoystickArea(pointer.x, pointer.y)) return;

    this.isActive = true;
    this.pointerId = pointer.id;
    this.updateStickPosition(pointer.x, pointer.y);
  }

  /**
   * 터치 이동
   */
  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isActive || pointer.id !== this.pointerId) return;
    this.updateStickPosition(pointer.x, pointer.y);
  }

  /**
   * 스틱 위치 업데이트
   */
  private updateStickPosition(pointerX: number, pointerY: number): void {
    const dx = pointerX - this.fixedPosition.x;
    const dy = pointerY - this.fixedPosition.y;
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

    // 스틱을 중앙으로 복귀
    this.drawStick(0, 0);
  }

  /**
   * 현재 방향 벡터 반환
   */
  getDirection(): { x: number; y: number } {
    return { ...this.direction };
  }

  /**
   * 현재 강도 반환
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
