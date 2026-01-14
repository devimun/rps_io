/**
 * 플레이어 렌더러
 * 플레이어 스프라이트 생성 및 업데이트 로직을 담당합니다.
 * Slither.io 스타일 Entity Interpolation 적용
 * 
 * [1.4.5 최적화]
 * - Object Pool 점진적 생성
 * - Interpolation 결과 캐싱
 */
import Phaser from 'phaser';
import type { Player, RPSState } from '@chaos-rps/shared';
import { DASH_COOLDOWN_MS } from '@chaos-rps/shared';

import { getInterpolatedPosition, hasBuffer } from '../services/interpolationService';

/** RPS 상태별 색상 */
export const RPS_COLORS: Record<RPSState, number> = {
  rock: 0x4ecdc4,     // 청록색 (바위)
  paper: 0xffe66d,    // 노란색 (보)
  scissors: 0xff6b6b, // 빨간색 (가위)
};


/** RPS 상태별 스프라이트 프레임 인덱스 */
export const RPS_FRAME_INDEX: Record<RPSState, number> = {
  rock: 0,
  paper: 1,
  scissors: 2,
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
  /** Container 재사용 풀 (Object Pooling) */
  private containerPool: Phaser.GameObjects.Container[] = [];
  private readonly MAX_POOL_SIZE = 40;



  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Object Pool을 점진적으로 생성합니다 (프레임 분할로 Long Task 방지)
   * @param count - 미리 생성할 스프라이트 수
   * @param batchSize - 프레임당 생성 개수
   */
  prewarmPool(count: number = 20, batchSize: number = 1): void {
    let created = 0;

    const createBatch = () => {
      const toCreate = Math.min(batchSize, count - created);

      for (let i = 0; i < toCreate && this.containerPool.length < this.MAX_POOL_SIZE; i++) {
        const container = this.createEmptyContainer();
        container.setPosition(-9999, -9999);
        container.setVisible(false);
        container.setAlpha(0);
        this.containerPool.push(container);
        created++;
      }

      if (created < count && this.containerPool.length < this.MAX_POOL_SIZE) {
        requestAnimationFrame(createBatch);
      }
    };

    requestAnimationFrame(createBatch);
  }

  /**
   * [1.4.5] Pool에 컨테이너 1개 추가 (로딩 화면용)
   * @returns 성공 여부
   */
  prewarmPoolOne(): boolean {
    if (this.containerPool.length >= this.MAX_POOL_SIZE) return false;

    const container = this.createEmptyContainer();
    container.setPosition(-9999, -9999);
    container.setVisible(false);
    container.setAlpha(0);
    this.containerPool.push(container);
    return true;
  }

  /**
   * 빈 Container 생성 (Object Pool용)
   * 모든 하위 객체를 미리 생성해둠
   * [1.4.7] Graphics → Image 변환으로 GPU 버퍼 재할당 방지
   */
  private createEmptyContainer(): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);

    // 플레이어는 맵 위에 표시 (depth: 10)
    container.setDepth(10);

    // [1.4.7] 내 캐릭터 테두리 - Image로 변환 (Graphics strokeCircle 빈 공간 문제 해결)
    // body 뒤에 더 큰 흰색 원을 배치하여 테두리 효과
    const border = this.scene.add.image(0, 0, 'circle');
    border.setOrigin(0.5);
    border.setTint(0xffffff);
    border.setVisible(false);
    container.addAt(border, 0);  // body 뒤에 배치
    container.setData('border', border);

    // [1.4.7] 본체 - Image로 변환 (GPU 버퍼 재할당 방지)
    // Slither.io 스타일 광택 텍스처 사용
    const body = this.scene.add.image(0, 0, 'slither-body');
    body.setOrigin(0.5);
    body.setTint(0xffffff);
    body.setVisible(false);  // [1.4.7] Pool 대기 시 숨김
    container.add(body);
    container.setData('body', body);
    container.setData('playerColor', 0xffffff);
    container.setData('currentSize', 30);

    // [1.4.7] 눈 - Image x 4 (흰자 2개 + 동공 2개)
    const leftEyeWhite = this.scene.add.image(0, 0, 'circle');
    const rightEyeWhite = this.scene.add.image(0, 0, 'circle');
    const leftPupil = this.scene.add.image(0, 0, 'circle');
    const rightPupil = this.scene.add.image(0, 0, 'circle');

    leftEyeWhite.setOrigin(0.5).setVisible(false);  // [1.4.7] Pool 대기 시 숨김
    rightEyeWhite.setOrigin(0.5).setVisible(false);
    leftPupil.setOrigin(0.5).setTint(0x000000).setVisible(false);
    rightPupil.setOrigin(0.5).setTint(0x000000).setVisible(false);

    container.add([leftEyeWhite, rightEyeWhite, leftPupil, rightPupil]);
    container.setData('leftEyeWhite', leftEyeWhite);
    container.setData('rightEyeWhite', rightEyeWhite);
    container.setData('leftPupil', leftPupil);
    container.setData('rightPupil', rightPupil);

    // RPS 스프라이트 (이미지로 변경 - 성능 최적화)
    const rpsSprite = this.scene.add.sprite(0, -45, 'rps-sprites', 0);
    rpsSprite.setOrigin(0.5);
    rpsSprite.setScale(0.35);  // 128px → 약 45px 크기로 조절
    container.add(rpsSprite);
    container.setData('rpsSprite', rpsSprite);

    // 닉네임 텍스트
    const nameText = this.scene.add.text(0, -65, '', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    });
    nameText.setOrigin(0.5);
    container.add(nameText);
    container.setData('nameText', nameText);

    // 왕관 텍스트
    const crownText = this.scene.add.text(0, -90, '👑', {
      fontSize: '16px',
    });
    crownText.setOrigin(0.5);
    crownText.setVisible(false);
    container.add(crownText);
    container.setData('crownText', crownText);
    container.setData('isFirstPlace', false);

    return container;
  }

  /**
   * Container를 풀에 반환 (재사용을 위해)
   */
  returnToPool(container: Phaser.GameObjects.Container): void {
    if (this.containerPool.length < this.MAX_POOL_SIZE) {
      // 초기화하고 풀에 반환
      container.setVisible(false);
      container.setPosition(-9999, -9999);
      container.setAlpha(1);
      container.setScale(1);

      // [1.4.7] Image 요소들 숨김 (재사용 전까지)
      const body = container.getData('body') as Phaser.GameObjects.Image;
      const border = container.getData('border') as Phaser.GameObjects.Image;
      const leftEyeWhite = container.getData('leftEyeWhite') as Phaser.GameObjects.Image;
      const rightEyeWhite = container.getData('rightEyeWhite') as Phaser.GameObjects.Image;
      const leftPupil = container.getData('leftPupil') as Phaser.GameObjects.Image;
      const rightPupil = container.getData('rightPupil') as Phaser.GameObjects.Image;
      body?.setVisible(false);
      border?.setVisible(false);
      leftEyeWhite?.setVisible(false);
      rightEyeWhite?.setVisible(false);
      leftPupil?.setVisible(false);
      rightPupil?.setVisible(false);

      this.containerPool.push(container);
    } else {
      // 풀이 가득 차면 파괴
      container.destroy();
    }
  }

  /**
   * 플레이어 스프라이트 생성 (Object Pool 사용)
   */
  createSprite(player: Player, isMe: boolean): Phaser.GameObjects.Container {
    const playerColor = PLAYER_COLORS[getPlayerColorIndex(player.nickname)];

    // 풀에서 Container 가져오기 (없으면 새로 생성)
    let container: Phaser.GameObjects.Container;

    if (this.containerPool.length > 0) {
      // 풀에서 재사용
      container = this.containerPool.pop()!;
      container.setPosition(player.x, player.y);
      container.setVisible(true);
      container.setAlpha(1);
      container.setScale(1);
    } else {
      // 새로 생성 (풀이 비어있을 때)
      container = this.createEmptyContainer();
      container.setPosition(player.x, player.y);
      container.setVisible(true);
    }

    // 플레이어 데이터 업데이트
    container.setData('playerColor', playerColor);
    container.setData('currentSize', player.size);
    container.setData('lastRpsState', undefined);
    container.setData('lastSizeRounded', undefined);
    container.setData('isFirstPlace', false);

    // [1.4.7] Image 요소들 visible 활성화 (Pool에서 숨겨진 상태였음)
    const body = container.getData('body') as Phaser.GameObjects.Image;
    const leftEyeWhite = container.getData('leftEyeWhite') as Phaser.GameObjects.Image;
    const rightEyeWhite = container.getData('rightEyeWhite') as Phaser.GameObjects.Image;
    const leftPupil = container.getData('leftPupil') as Phaser.GameObjects.Image;
    const rightPupil = container.getData('rightPupil') as Phaser.GameObjects.Image;
    body.setVisible(true);
    leftEyeWhite.setVisible(true);
    rightEyeWhite.setVisible(true);
    leftPupil.setVisible(true);
    rightPupil.setVisible(true);

    // 닉네임 텍스트 업데이트
    const nameText = container.getData('nameText') as Phaser.GameObjects.Text;
    nameText.setText(player.nickname);
    nameText.setColor(isMe ? '#4ecdc4' : '#ffffff');

    // RPS 스프라이트 업데이트
    const rpsSprite = container.getData('rpsSprite') as Phaser.GameObjects.Sprite;
    if (rpsSprite) {
      rpsSprite.setFrame(RPS_FRAME_INDEX[player.rpsState]);
    }

    // 왕관 초기화
    const crownText = container.getData('crownText') as Phaser.GameObjects.Text;
    crownText.setVisible(false);

    // [1.4.8] 대시바 (내 플레이어만) - Image 기반으로 변경 (texImage2D 방지)
    if (isMe && !container.getData('dashBarBg')) {
      // 배경 바 (회색)
      const dashBarBg = this.scene.add.image(0, player.size + 20, 'dash-bar-bg');
      dashBarBg.setOrigin(0.5, 0);
      dashBarBg.setAlpha(0.8);
      container.add(dashBarBg);
      container.setData('dashBarBg', dashBarBg);

      // 진행률 바 (scale로 너비 조절, tint로 색상 변경)
      const dashBarFill = this.scene.add.image(-25, player.size + 20, 'dash-bar-fill');
      dashBarFill.setOrigin(0, 0);
      container.add(dashBarFill);
      container.setData('dashBarFill', dashBarFill);

      // 테두리 (1회만 그림)
      const dashBarBorder = this.scene.add.graphics();
      dashBarBorder.lineStyle(1, 0xffffff, 0.5);
      dashBarBorder.strokeRoundedRect(-25, player.size + 20, 50, 6, 3);
      container.add(dashBarBorder);
      container.setData('dashBarBorder', dashBarBorder);

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
   * Slither.io 스타일: 상태 버퍼에서 보간된 위치 사용
   * [1.4.7] currentAngle 추가 - 눈동자 마우스 추적용
   */
  updateSprite(
    container: Phaser.GameObjects.Container,
    player: Player,
    isMe: boolean,
    _isMobile: boolean,
    rankings: any[], // TODO: 타입 정의 필요
    isDashing: boolean,
    dashCooldownEndTime: number,
    currentAngle: number = 0
  ): void {
    // Entity Interpolation: 보간된 위치 가져오기 (단일 보간, 추가 스무딩 없음)
    let targetX = player.x;
    let targetY = player.y;
    let targetSize = player.size;

    const currentTime = Date.now();
    if (hasBuffer(player.id)) {
      const interpolated = getInterpolatedPosition(player.id, currentTime);
      if (interpolated) {
        targetX = interpolated.x;
        targetY = interpolated.y;
        targetSize = interpolated.size;
      }
    }

    // 텔레포트 감지 (거리가 너무 멀면 즉시 적용)
    const dx = targetX - container.x;
    const dy = targetY - container.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 200) {
      // 텔레포트: 즉시 적용 (정수 반올림)
      container.x = Math.round(targetX);
      container.y = Math.round(targetY);
    } else {
      // [1.4.8] 클라이언트 lerp 추가 - 프레임당 20%씩 목표에 접근
      // 네트워크 불안정/프레임 드랍 시에도 부드럽게 보이도록
      const lerpFactor = 0.2;
      const newX = container.x + dx * lerpFactor;
      const newY = container.y + dy * lerpFactor;
      container.x = Math.round(newX);
      container.y = Math.round(newY);
    }

    // 크기 적용
    container.setData('currentSize', targetSize);

    // smoothedSize 계산 (렌더링용)
    const smoothedSize = targetSize;

    const playerColor = container.getData('playerColor') as number;
    const rpsColor = RPS_COLORS[player.rpsState];

    // 무적 상태 (깜빡임 없이 반투명)
    container.setAlpha(this.calculateInvincibilityAlpha(player));

    // 상태 변경 감지 (불필요한 재렌더링 방지)
    const lastRpsState = container.getData('lastRpsState') as string | undefined;
    const lastSizeRounded = container.getData('lastSizeRounded') as number | undefined;
    const sizeRounded = Math.round(smoothedSize);
    const stateChanged = lastRpsState !== player.rpsState || lastSizeRounded !== sizeRounded;

    if (stateChanged) {
      container.setData('lastRpsState', player.rpsState);
      container.setData('lastSizeRounded', sizeRounded);

      // 본체 업데이트 (상태 변경 시에만)
      this.drawBody(container, smoothedSize, playerColor, rpsColor, isMe);
    }

    // [1.4.7] 눈 업데이트 (매 프레임 - 마우스 추적을 위해)
    this.drawEyes(container, smoothedSize, currentAngle);

    // RPS 스프라이트 업데이트 (상태 변경 시에만)
    if (stateChanged) {
      const rpsSprite = container.getData('rpsSprite') as Phaser.GameObjects.Sprite;
      if (rpsSprite) {
        const spriteScale = Math.max(0.25, Math.min(0.5, smoothedSize * 0.008)); // 크기에 비례
        rpsSprite.setFrame(RPS_FRAME_INDEX[player.rpsState]);
        rpsSprite.setScale(spriteScale);
        rpsSprite.setY(-smoothedSize - 20); // 간격 증가로 겹침 방지
      }

      const nameText = container.getData('nameText') as Phaser.GameObjects.Text;
      nameText.setY(-smoothedSize - 45); // 스프라이트와 더 멀리
    }

    // 1등 왕관 업데이트
    // const rankings = useGameStore.getState().rankings; // [1.4.7] 제거됨
    const isFirstPlace = rankings.length > 0 && rankings[0].playerId === player.id;
    const wasFirstPlace = container.getData('isFirstPlace') as boolean;

    if (isFirstPlace !== wasFirstPlace) {
      container.setData('isFirstPlace', isFirstPlace);
      const crownText = container.getData('crownText') as Phaser.GameObjects.Text;
      const nameText = container.getData('nameText') as Phaser.GameObjects.Text;

      if (isFirstPlace) {
        crownText.setVisible(true);
        crownText.setY(-smoothedSize - 65); // 더 위로
        // 1등 닉네임 금색 배경
        nameText.setBackgroundColor('#d4a017');
        nameText.setPadding(4, 2, 4, 2);
      } else {
        crownText.setVisible(false);
        nameText.setBackgroundColor('');
        nameText.setPadding(0, 0, 0, 0);
      }
    } else if (isFirstPlace) {
      // 위치 업데이트
      const crownText = container.getData('crownText') as Phaser.GameObjects.Text;
      crownText.setY(-smoothedSize - 65); // 더 위로
    }

    // 대시 효과 (글로우 + 펄스) - 리소스 효율적
    this.applyDashEffect(container, isDashing);

    // 대시바 업데이트 (내 플레이어만)
    if (isMe) {
      this.drawDashBar(container, smoothedSize, isDashing, dashCooldownEndTime);
    }
  }

  /**
   * 본체 업데이트
   * [1.4.7] Graphics → Image 변환으로 GPU 버퍼 재할당 방지
   */
  private drawBody(
    container: Phaser.GameObjects.Container,
    size: number,
    playerColor: number,
    _rpsColor: number,
    isMe: boolean
  ): void {
    const body = container.getData('body') as Phaser.GameObjects.Image;
    const border = container.getData('border') as Phaser.GameObjects.Image;

    // 정수 반올림으로 떨림 방지
    const roundedSize = Math.round(size);

    // 크기 변경 감지 - 변경 시에만 스케일 업데이트
    const lastBodySize = container.getData('lastBodySize') as number | undefined;
    if (lastBodySize !== roundedSize) {
      container.setData('lastBodySize', roundedSize);

      // 스케일 반올림 (소수점 3자리까지만)
      const bodyScale = Math.round((roundedSize / 64) * 1000) / 1000;
      body.setScale(bodyScale);

      // 자기 자신 테두리 제거 (젤리 스타일에서는 불필요)
      border.setVisible(false);
    }

    // Tint는 항상 적용 (색상 변경 가능성)
    body.setTint(playerColor);
  }

  /**
   * 눈 업데이트
   * [1.4.7] Graphics → Image 변환 + 눈동자 마우스 추적
   * 
   * 눈 크기 조정 가이드:
   * - EYE_SIZE_RATIO: 흰자 크기 비율 (본체 대비, 기본값 0.225 = 22.5%)
   * - PUPIL_SIZE_RATIO: 동공 크기 비율 (흰자 대비, 기본값 0.6 = 60%)
   * - EYE_OFFSET_RATIO: 눈 간격 비율 (본체 대비, 기본값 0.3 = 30%)
   * - MAX_PUPIL_OFFSET_RATIO: 동공 이동 범위 (흰자 대비, 기본값 0.3 = 30%)
   */
  private drawEyes(container: Phaser.GameObjects.Container, size: number, currentAngle: number = 0): void {
    // ======== 조정 가능한 상수 ========
    const EYE_SIZE_RATIO = 0.225;        // 흰자 크기 (50% 증가: 0.15 → 0.225)
    const PUPIL_SIZE_RATIO = 0.55;       // 동공 크기 (흰자 대비)
    const EYE_OFFSET_RATIO = 0.35;        // 눈 간격
    const MAX_PUPIL_OFFSET_RATIO = 0.3;  // 동공 이동 범위
    // ==================================

    // 모든 값을 정수로 반올림하여 서브픽셀 떨림 방지
    const roundedSize = Math.round(size);
    const eyeOffset = Math.round(roundedSize * EYE_OFFSET_RATIO);
    const eyeSize = Math.round(roundedSize * EYE_SIZE_RATIO);
    const eyeY = eyeSize;
    const pupilSize = Math.round(eyeSize * PUPIL_SIZE_RATIO);

    const leftEyeWhite = container.getData('leftEyeWhite') as Phaser.GameObjects.Image;
    const rightEyeWhite = container.getData('rightEyeWhite') as Phaser.GameObjects.Image;
    const leftPupil = container.getData('leftPupil') as Phaser.GameObjects.Image;
    const rightPupil = container.getData('rightPupil') as Phaser.GameObjects.Image;

    // 크기 변경 감지 - 변경 시에만 스케일 업데이트
    const lastEyeSize = container.getData('lastEyeSize') as number | undefined;
    if (lastEyeSize !== eyeSize) {
      container.setData('lastEyeSize', eyeSize);

      // 스케일도 반올림 (소수점 3자리까지만)
      const eyeWhiteScale = Math.round((eyeSize / 64) * 1000) / 1000;
      const pupilScale = Math.round((pupilSize / 64) * 1000) / 1000;

      leftEyeWhite.setScale(eyeWhiteScale);
      rightEyeWhite.setScale(eyeWhiteScale);
      leftPupil.setScale(pupilScale);
      rightPupil.setScale(pupilScale);

      // 눈 흰자 위치 (크기 변경 시에만)
      leftEyeWhite.setPosition(-eyeOffset, -eyeY);
      rightEyeWhite.setPosition(eyeOffset, -eyeY);
    }

    // 눈동자 마우스 추적 - 정수 반올림으로 떨림 방지
    const maxPupilOffset = Math.round(eyeSize * MAX_PUPIL_OFFSET_RATIO);
    const pupilOffsetX = Math.round(Math.cos(currentAngle) * maxPupilOffset);
    const pupilOffsetY = Math.round(Math.sin(currentAngle) * maxPupilOffset);

    leftPupil.setPosition(-eyeOffset + pupilOffsetX, -eyeY + pupilOffsetY);
    rightPupil.setPosition(eyeOffset + pupilOffsetX, -eyeY + pupilOffsetY);
  }

  /**
   * 대시 효과 적용 (글로우 효과 - 색상을 밝게)
   * 원래 색상을 유지하면서 밝게 만들어 부스터 효과 표현
   */
  private applyDashEffect(container: Phaser.GameObjects.Container, isDashing: boolean): void {
    const body = container.getData('body') as Phaser.GameObjects.Image;
    const lastDashing = container.getData('lastDashingState') as boolean | undefined;
    const playerColor = container.getData('playerColor') as number;

    // 상태 변경 안 됐으면 스킵
    if (lastDashing === isDashing) return;
    container.setData('lastDashingState', isDashing);

    if (isDashing) {
      // 대시 중: 원래 색상을 살짝 밝게
      const brightColor = this.brightenColor(playerColor, 0.2);
      body.setTint(brightColor);
    } else {
      // 대시 종료: 원래 색상으로 복원
      body.setTint(playerColor);
    }
  }

  /**
   * 색상을 밝게 만듭니다
   * @param color - 원래 색상 (hex)
   * @param amount - 밝기 증가량 (0~1)
   * @returns 밝아진 색상
   */
  private brightenColor(color: number, amount: number): number {
    const r = Math.min(255, ((color >> 16) & 0xff) + Math.round(255 * amount));
    const g = Math.min(255, ((color >> 8) & 0xff) + Math.round(255 * amount));
    const b = Math.min(255, (color & 0xff) + Math.round(255 * amount));
    return (r << 16) | (g << 8) | b;
  }

  /**
   * 알파값 계산 (무적 시스템 제거됨 - 항상 1 반환)
   */
  private calculateInvincibilityAlpha(_player: Player): number {
    return 1;
  }

  /**
   * [1.4.8] 대시바 업데이트 (Image 기반 - texImage2D 방지)
   * Graphics.clear() 대신 scaleX/tint로 업데이트
   */
  private drawDashBar(
    container: Phaser.GameObjects.Container,
    size: number,
    isDashing: boolean,
    dashCooldownEndTime: number
  ): void {
    const dashBarBg = container.getData('dashBarBg') as Phaser.GameObjects.Image;
    const dashBarFill = container.getData('dashBarFill') as Phaser.GameObjects.Image;
    const dashBarBorder = container.getData('dashBarBorder') as Phaser.GameObjects.Graphics;
    const boostText = container.getData('boostText') as Phaser.GameObjects.Text;

    // Image 기반 대시바가 없으면 리턴 (기존 Graphics 방식 호환)
    if (!dashBarFill) return;

    const barY = size + 20;

    // 쿨다운 진행률 계산
    const now = Date.now();
    const remaining = dashCooldownEndTime - now;
    let progress = 1;

    if (remaining > 0) {
      progress = (DASH_COOLDOWN_MS - remaining) / DASH_COOLDOWN_MS;
    }

    // 상태 캐싱: 변경 없으면 스킵
    const lastProgress = container.getData('lastDashProgress') as number | undefined;
    const lastIsDashing = container.getData('lastIsDashing') as boolean | undefined;
    const lastBarY = container.getData('lastBarY') as number | undefined;
    const progressRounded = Math.round(progress * 20) / 20; // 5% 단위로 반올림

    // 위치 업데이트 (크기 변경 시)
    if (lastBarY !== barY) {
      container.setData('lastBarY', barY);
      dashBarBg?.setY(barY);
      dashBarFill?.setY(barY);
      // 테두리는 Graphics라서 재생성 필요 (하지만 크기 변경은 드물어서 괜찮음)
      if (dashBarBorder) {
        dashBarBorder.clear();
        dashBarBorder.lineStyle(1, 0xffffff, 0.5);
        dashBarBorder.strokeRoundedRect(-25, barY, 50, 6, 3);
      }
    }

    if (lastProgress === progressRounded && lastIsDashing === isDashing) {
      // 위치만 업데이트
      if (boostText) boostText.setY(size + 32);
      return;
    }

    container.setData('lastDashProgress', progressRounded);
    container.setData('lastIsDashing', isDashing);

    // 진행률 바 업데이트 (scaleX로 너비 조절)
    const clampedProgress = Math.min(1, Math.max(0, progress));
    dashBarFill.setScale(clampedProgress, 1);

    // 색상 변경 (tint)
    if (isDashing) {
      // 대시 중: 노란색
      dashBarFill.setTint(0xffcc00);
    } else if (progress >= 1) {
      // 준비 완료: 초록색
      dashBarFill.setTint(0x44ff44);
    } else {
      // 충전 중: 파란색
      dashBarFill.setTint(0x4488ff);
    }

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
