/**
 * 플레이어 렌더러
 * 플레이어 스프라이트 생성 및 업데이트 로직을 담당합니다.
 */
import Phaser from 'phaser';
import type { Player, RPSState } from '@chaos-rps/shared';
import { SPAWN_INVINCIBILITY_MS, TRANSFORM_INTERVAL_MS, DASH_COOLDOWN_MS } from '@chaos-rps/shared';
import { useGameStore } from '../stores/gameStore';

/** RPS 상태별 색상 */
export const RPS_COLORS: Record<RPSState, number> = {
  rock: 0x4ecdc4,     // 청록색 (바위)
  paper: 0xffe66d,    // 노란색 (보)
  scissors: 0xff6b6b, // 빨간색 (가위)
};

/** RPS 상태별 이모지 */
export const RPS_EMOJI: Record<RPSState, string> = {
  rock: '✊',
  paper: '✋',
  scissors: '✌️',
};

/** 플레이어 색상 팔레트 (닉네임 해시 기반) */
const PLAYER_COLORS = [
  0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3, 0xf38181,
  0xaa96da, 0xfcbad3, 0xa8d8ea, 0xf9ed69, 0xb8de6f,
];

/**
 * 닉네임을 기반으로 고유한 색상 인덱스를 반환합니다.
 */
function getPlayerColorIndex(nickname: string): number {
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % PLAYER_COLORS.length;
}

/**
 * 플레이어 렌더러 클래스
 */
export class PlayerRenderer {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 플레이어 스프라이트 생성
   */
  createSprite(player: Player, isMe: boolean): Phaser.GameObjects.Container {
    const container = this.scene.add.container(player.x, player.y);
    const playerColor = PLAYER_COLORS[getPlayerColorIndex(player.nickname)];

    // 변신 타이머 아크 (가장 뒤에 배치)
    const timerArc = this.scene.add.graphics();
    container.add(timerArc);
    container.setData('timerArc', timerArc);

    // 본체 원
    const body = this.scene.add.graphics();
    container.add(body);
    container.setData('body', body);
    container.setData('playerColor', playerColor);
    container.setData('currentSize', player.size);

    // 눈 (왼쪽, 오른쪽)
    const leftEye = this.scene.add.graphics();
    const rightEye = this.scene.add.graphics();
    container.add(leftEye);
    container.add(rightEye);
    container.setData('leftEye', leftEye);
    container.setData('rightEye', rightEye);

    // RPS 이모지 텍스트
    const emojiText = this.scene.add.text(0, -player.size - 10, RPS_EMOJI[player.rpsState], {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
    });
    emojiText.setOrigin(0.5);
    container.add(emojiText);
    container.setData('emojiText', emojiText);

    // 닉네임 텍스트
    const nameText = this.scene.add.text(0, -player.size - 35, player.nickname, {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: isMe ? '#4ecdc4' : '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    });
    nameText.setOrigin(0.5);
    container.add(nameText);
    container.setData('nameText', nameText);

    // 대시바 (내 플레이어만)
    if (isMe) {
      const dashBar = this.scene.add.graphics();
      container.add(dashBar);
      container.setData('dashBar', dashBar);

      // BOOST 텍스트
      const boostText = this.scene.add.text(0, player.size + 32, 'BOOST', {
        fontSize: '10px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      });
      boostText.setOrigin(0.5);
      container.add(boostText);
      container.setData('boostText', boostText);
    }

    return container;
  }

  /**
   * 플레이어 스프라이트 업데이트
   */
  updateSprite(
    container: Phaser.GameObjects.Container,
    player: Player,
    isMe: boolean,
    lowSpecMode: boolean
  ): void {
    // 위치 보간
    const lerpFactor = lowSpecMode ? 0.4 : 0.25;
    container.x = Phaser.Math.Linear(container.x, player.x, lerpFactor);
    container.y = Phaser.Math.Linear(container.y, player.y, lerpFactor);

    // 크기 보간
    const currentSize = container.getData('currentSize') as number;
    const sizeLerpFactor = lowSpecMode ? 0.2 : 0.1;
    const interpolatedSize = Phaser.Math.Linear(currentSize, player.size, sizeLerpFactor);
    container.setData('currentSize', interpolatedSize);

    const playerColor = container.getData('playerColor') as number;
    const rpsColor = RPS_COLORS[player.rpsState];

    // 무적 상태 깜빡임
    container.setAlpha(this.calculateInvincibilityAlpha(player));

    // 변신 타이머 아크
    this.drawTransformTimerArc(container, player, interpolatedSize, rpsColor);

    // 본체 그리기
    this.drawBody(container, interpolatedSize, playerColor, rpsColor, isMe);

    // 눈 그리기
    this.drawEyes(container, interpolatedSize);

    // 텍스트 업데이트
    const emojiText = container.getData('emojiText') as Phaser.GameObjects.Text;
    emojiText.setText(RPS_EMOJI[player.rpsState]);
    emojiText.setY(-interpolatedSize - 15);

    const nameText = container.getData('nameText') as Phaser.GameObjects.Text;
    nameText.setY(-interpolatedSize - 40);

    // 대시바 업데이트 (내 플레이어만)
    if (isMe) {
      this.drawDashBar(container, interpolatedSize);
    }
  }

  /**
   * 본체 그리기
   */
  private drawBody(
    container: Phaser.GameObjects.Container,
    size: number,
    playerColor: number,
    rpsColor: number,
    isMe: boolean
  ): void {
    const body = container.getData('body') as Phaser.GameObjects.Graphics;
    body.clear();
    body.fillStyle(rpsColor, 1);
    body.fillCircle(0, 0, size + 4);
    body.fillStyle(playerColor, 1);
    body.fillCircle(0, 0, size);

    if (isMe) {
      body.lineStyle(3, 0xffffff, 1);
      body.strokeCircle(0, 0, size + 6);
    }
  }

  /**
   * 눈 그리기
   */
  private drawEyes(container: Phaser.GameObjects.Container, size: number): void {
    const eyeOffset = size * 0.3;
    const eyeSize = size * 0.15;
    const pupilSize = eyeSize * 0.6;

    const leftEye = container.getData('leftEye') as Phaser.GameObjects.Graphics;
    leftEye.clear();
    leftEye.fillStyle(0xffffff, 1);
    leftEye.fillCircle(-eyeOffset, -eyeSize, eyeSize);
    leftEye.fillStyle(0x000000, 1);
    leftEye.fillCircle(-eyeOffset, -eyeSize, pupilSize);

    const rightEye = container.getData('rightEye') as Phaser.GameObjects.Graphics;
    rightEye.clear();
    rightEye.fillStyle(0xffffff, 1);
    rightEye.fillCircle(eyeOffset, -eyeSize, eyeSize);
    rightEye.fillStyle(0x000000, 1);
    rightEye.fillCircle(eyeOffset, -eyeSize, pupilSize);
  }

  /**
   * 변신 타이머 아크 그리기
   */
  private drawTransformTimerArc(
    container: Phaser.GameObjects.Container,
    player: Player,
    size: number,
    rpsColor: number
  ): void {
    const timerArc = container.getData('timerArc') as Phaser.GameObjects.Graphics;
    timerArc.clear();

    if (!player.lastTransformTime) return;

    const elapsed = Date.now() - player.lastTransformTime;
    const progress = Math.min(elapsed / TRANSFORM_INTERVAL_MS, 1);
    const arcRadius = size + 10;
    const arcWidth = 4;

    // 배경 원
    timerArc.lineStyle(arcWidth, 0x333333, 0.5);
    timerArc.strokeCircle(0, 0, arcRadius);

    // 진행률 아크
    if (progress > 0) {
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (progress * Math.PI * 2);
      timerArc.lineStyle(arcWidth, rpsColor, 0.9);
      timerArc.beginPath();
      timerArc.arc(0, 0, arcRadius, startAngle, endAngle, false);
      timerArc.strokePath();
    }

    // 변신 임박 깜빡임 (마지막 0.3초)
    const remaining = TRANSFORM_INTERVAL_MS - elapsed;
    if (remaining > 0 && remaining < 300) {
      if (Math.floor(Date.now() / 100) % 2 === 0) {
        timerArc.lineStyle(arcWidth + 2, 0xffffff, 0.8);
        timerArc.strokeCircle(0, 0, arcRadius);
      }
    }
  }

  /**
   * 무적 상태 알파값 계산 (깜빡임 없이 반투명)
   */
  private calculateInvincibilityAlpha(player: Player): number {
    if (!player.spawnTime) return 1;

    const elapsed = Date.now() - player.spawnTime;
    const remaining = SPAWN_INVINCIBILITY_MS - elapsed;

    if (remaining <= 0) return 1;

    // 무적 상태: 반투명 (깜빡임 없음)
    return 0.6;
  }

  /**
   * 대시바 그리기 (플레이어 아래에 표시)
   */
  private drawDashBar(container: Phaser.GameObjects.Container, size: number): void {
    const dashBar = container.getData('dashBar') as Phaser.GameObjects.Graphics;
    const boostText = container.getData('boostText') as Phaser.GameObjects.Text;
    if (!dashBar) return;

    dashBar.clear();

    const { isDashing, dashCooldownEndTime } = useGameStore.getState();
    const barWidth = 50;
    const barHeight = 6;
    const barY = size + 20;

    // 쿨다운 진행률 계산
    const now = Date.now();
    const remaining = dashCooldownEndTime - now;
    let progress = 1;

    if (remaining > 0) {
      progress = (DASH_COOLDOWN_MS - remaining) / DASH_COOLDOWN_MS;
    }

    // 배경 바
    dashBar.fillStyle(0x333333, 0.8);
    dashBar.fillRoundedRect(-barWidth / 2, barY, barWidth, barHeight, 3);

    // 진행률 바
    const fillWidth = barWidth * Math.min(1, Math.max(0, progress));
    if (isDashing) {
      // 대시 중: 노란색
      dashBar.fillStyle(0xffcc00, 1);
    } else if (progress >= 1) {
      // 준비 완료: 초록색
      dashBar.fillStyle(0x44ff44, 1);
    } else {
      // 충전 중: 파란색
      dashBar.fillStyle(0x4488ff, 1);
    }
    dashBar.fillRoundedRect(-barWidth / 2, barY, fillWidth, barHeight, 3);

    // 테두리
    dashBar.lineStyle(1, 0xffffff, 0.5);
    dashBar.strokeRoundedRect(-barWidth / 2, barY, barWidth, barHeight, 3);

    // BOOST 텍스트 업데이트
    if (boostText) {
      boostText.setY(size + 32);
      if (isDashing) {
        boostText.setText('⚡ BOOST!');
        boostText.setColor('#ffcc00');
      } else if (progress >= 1) {
        boostText.setText('READY');
        boostText.setColor('#44ff44');
      } else {
        boostText.setText('BOOST');
        boostText.setColor('#aaaaaa');
      }
    }
  }
}
