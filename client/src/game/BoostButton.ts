/**
 * 모바일 부스트 버튼
 * 화면 우하단에 고정된 부스트 버튼입니다.
 */
import Phaser from 'phaser';
import { useGameStore } from '../stores/gameStore';
import { DASH_COOLDOWN_MS } from '@chaos-rps/shared';

/** 버튼 설정 */
interface BoostButtonConfig {
  radius: number;
  activeColor: number;
  cooldownColor: number;
  alpha: number;
}

const DEFAULT_CONFIG: BoostButtonConfig = {
  radius: 40,
  activeColor: 0xff6b6b,
  cooldownColor: 0x666666,
  alpha: 0.8,
};

/**
 * 부스트 버튼 클래스
 */
export class BoostButton {
  private scene: Phaser.Scene;
  private config: BoostButtonConfig;
  private container: Phaser.GameObjects.Container;
  private buttonBg: Phaser.GameObjects.Graphics;
  private cooldownOverlay: Phaser.GameObjects.Graphics;
  private buttonText: Phaser.GameObjects.Text;
  private onBoost: () => void;

  constructor(scene: Phaser.Scene, onBoost: () => void, config: Partial<BoostButtonConfig> = {}) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.onBoost = onBoost;

    // 고정 위치 (화면 우하단 - 더 가깝게)
    const padding = 15;
    const x = scene.cameras.main.width - padding - this.config.radius;
    const y = scene.cameras.main.height - padding - this.config.radius;

    // 컨테이너 생성
    this.container = scene.add.container(x, y);
    this.container.setDepth(1000);
    this.container.setScrollFactor(0);

    // 버튼 배경
    this.buttonBg = scene.add.graphics();
    this.drawButton(this.config.activeColor);
    this.container.add(this.buttonBg);

    // 쿨다운 오버레이
    this.cooldownOverlay = scene.add.graphics();
    this.container.add(this.cooldownOverlay);

    // 버튼 텍스트
    this.buttonText = scene.add.text(0, 0, 'BOOST', {
      fontSize: '14px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffffff',
    });
    this.buttonText.setOrigin(0.5);
    this.container.add(this.buttonText);

    // 터치 이벤트는 MainScene에서 통합 관리
    // this.setupInput(x, y);
  }

  /**
   * 버튼 그리기
   */
  private drawButton(color: number): void {
    const { radius, alpha } = this.config;
    this.buttonBg.clear();
    this.buttonBg.fillStyle(color, alpha);
    this.buttonBg.fillCircle(0, 0, radius);
    this.buttonBg.lineStyle(3, 0xffffff, 0.5);
    this.buttonBg.strokeCircle(0, 0, radius);
  }

  /**
   * 쿨다운 오버레이 그리기 (차오르는 원형 효과)
   * progress: 0 = 쿨다운 시작, 1 = 사용 가능
   */
  private drawCooldown(progress: number): void {
    const { radius } = this.config;
    this.cooldownOverlay.clear();

    if (progress <= 0 || progress >= 1) return;

    // 쿨다운 진행률에 따라 원형 둘레가 차오르는 효과
    // 아래에서 시작해서 시계 방향으로 차오름
    const startAngle = Math.PI / 2; // 아래에서 시작
    const endAngle = startAngle - progress * Math.PI * 2; // 시계 방향으로 차오름

    // 차오르는 원형 테두리 (밝은 색상으로 눈에 띄게)
    this.cooldownOverlay.lineStyle(6, 0x4ecdc4, 1); // 청록색
    this.cooldownOverlay.beginPath();
    this.cooldownOverlay.arc(0, 0, radius - 3, startAngle, endAngle, true);
    this.cooldownOverlay.strokePath();
  }

  /**
   * 해당 좌표가 버튼 영역 내인지 확인
   */
  public contains(x: number, y: number): boolean {
    const padding = 15;
    const centerX = this.scene.cameras.main.width - padding - this.config.radius;
    const centerY = this.scene.cameras.main.height - padding - this.config.radius;

    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance <= this.config.radius * 1.3;
  }

  /**
   * 매 프레임 업데이트
   */
  update(): void {
    const { isDashing, dashCooldownEndTime } = useGameStore.getState();
    const now = Date.now();

    if (isDashing) {
      // 대시 중: 노란색
      this.drawButton(0xffeb3b);
      this.buttonText.setText('...');
      this.cooldownOverlay.clear();
    } else if (now < dashCooldownEndTime) {
      // 쿨다운 중: 회색 + 진행률 표시
      this.drawButton(this.config.cooldownColor);
      const remaining = dashCooldownEndTime - now;
      const progress = 1 - remaining / DASH_COOLDOWN_MS;
      this.drawCooldown(progress);
      this.buttonText.setText(`${Math.ceil(remaining / 1000)}s`);
    } else {
      // 사용 가능: 빨간색
      this.drawButton(this.config.activeColor);
      this.buttonText.setText('BOOST');
      this.cooldownOverlay.clear();
    }
  }

  /**
   * 정리
   */
  destroy(): void {
    this.container.destroy();
  }
}
