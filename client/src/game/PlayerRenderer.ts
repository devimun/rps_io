/**
 * 플레이어 렌더러
 * 플레이어 스프라이트 생성 및 업데이트 로직을 담당합니다.
 * Slither.io 스타일 Entity Interpolation 적용
 */
import Phaser from 'phaser';
import type { Player, RPSState } from '@chaos-rps/shared';
import { DASH_COOLDOWN_MS } from '@chaos-rps/shared';
import { useGameStore } from '../stores/gameStore';
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
  private readonly MAX_POOL_SIZE = 30;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Object Pool을 점진적으로 생성합니다 (프레임 분할로 Long Task 방지)
   * MainScene.create()에서 호출됩니다.
   * @param count - 미리 생성할 스프라이트 수
   * @param batchSize - 프레임당 생성 개수 (기본값: 4)
   */
  prewarmPool(count: number = 20, batchSize: number = 4): void {
    let created = 0;

    const createBatch = () => {
      const toCreate = Math.min(batchSize, count - created);

      for (let i = 0; i < toCreate && this.containerPool.length < this.MAX_POOL_SIZE; i++) {
        const container = this.createEmptyContainer();
        // 화면 밖으로 이동 + 숨김 (완전히 보이지 않도록)
        container.setPosition(-9999, -9999);
        container.setVisible(false);
        container.setAlpha(0);
        this.containerPool.push(container);
        created++;
      }

      // 남은 개수가 있으면 다음 프레임에서 계속
      if (created < count && this.containerPool.length < this.MAX_POOL_SIZE) {
        requestAnimationFrame(createBatch);
      }
    };

    // 첫 번째 배치는 다음 프레임에서 시작
    requestAnimationFrame(createBatch);
  }

  /**
   * 빈 Container 생성 (Object Pool용)
   * 모든 하위 객체를 미리 생성해둠
   */
  private createEmptyContainer(): Phaser.GameObjects.Container {
    const container = this.scene.add.container(0, 0);

    // 플레이어는 맵 위에 표시 (depth: 10)
    container.setDepth(10);

    // 본체 Graphics
    const body = this.scene.add.graphics();
    container.add(body);
    container.setData('body', body);
    container.setData('playerColor', 0xffffff);
    container.setData('currentSize', 30);

    // 눈 Graphics
    const leftEye = this.scene.add.graphics();
    const rightEye = this.scene.add.graphics();
    container.add(leftEye);
    container.add(rightEye);
    container.setData('leftEye', leftEye);
    container.setData('rightEye', rightEye);

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
      container.setPosition(0, 0);
      container.setAlpha(1);
      container.setScale(1);
      this.containerPool.push(container);
    } else {
      // 풀이 가득 차면 파괴
      container.destroy();
    }
  }
  // 잘되는 컴퓨터도 있는데 안되는 컴퓨터도 있음. 
  // 330 mbps , 500 mbps 
  // 특정 컴퓨터에서는 타이머가 걍 꺼져있는 수준 줄어드는 게 안보임
  // 몇몇 컴퓨터는 완벽하게 잘 작동함.
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

    // 닉네임 텍스트 업데이트
    const nameText = container.getData('nameText') as Phaser.GameObjects.Text;
    nameText.setText(player.nickname);
    nameText.setColor(isMe ? '#4ecdc4' : '#ffffff');

    // RPS 스프라이트 업데이트
    const rpsSprite = container.getData('rpsSprite') as Phaser.GameObjects.Sprite;
    rpsSprite.setFrame(RPS_FRAME_INDEX[player.rpsState]);

    // 왕관 초기화
    const crownText = container.getData('crownText') as Phaser.GameObjects.Text;
    crownText.setVisible(false);

    // 대시바 (내 플레이어만) - 풀에서 가져온 경우 추가 필요할 수 있음
    if (isMe && !container.getData('dashBar')) {
      const dashBar = this.scene.add.graphics();
      container.add(dashBar);
      container.setData('dashBar', dashBar);

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
   */
  updateSprite(
    container: Phaser.GameObjects.Container,
    player: Player,
    isMe: boolean,
    _isMobile: boolean
  ): void {
    // Entity Interpolation: 버퍼에서 보간된 위치 가져오기
    let targetX = player.x;
    let targetY = player.y;
    let targetSize = player.size;
    let hasInterpolation = false;

    // 모든 플레이어에게 보간 적용
    if (hasBuffer(player.id)) {
      const interpolated = getInterpolatedPosition(player.id, Date.now());
      if (interpolated) {
        targetX = interpolated.x;
        targetY = interpolated.y;
        targetSize = interpolated.size;
        hasInterpolation = true;
      }
    }

    // 첫 프레임(버퍼 없음) 또는 거리가 너무 멀면 즉시 적용 (텔레포트 방지)
    const dx = targetX - container.x;
    const dy = targetY - container.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const shouldTeleport = !hasInterpolation || distance > 200;

    if (shouldTeleport) {
      // 즉시 적용 (게임 시작, 스폰, 큰 위치 차이)
      container.x = targetX;
      container.y = targetY;
      container.setData('currentSize', targetSize);
    } else {
      // 스무딩 적용 (부드러움 유지하면서 반응성 개선)
      const smoothFactor = 0.5;
      container.x = Phaser.Math.Linear(container.x, targetX, smoothFactor);
      container.y = Phaser.Math.Linear(container.y, targetY, smoothFactor);

      // 크기도 스무딩 적용
      const currentSize = container.getData('currentSize') as number || targetSize;
      const smoothedSize = Phaser.Math.Linear(currentSize, targetSize, smoothFactor);
      container.setData('currentSize', smoothedSize);
    }

    // smoothedSize 계산 (렌더링용)
    const smoothedSize = container.getData('currentSize') as number || targetSize;

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

      // 본체 그리기 (상태 변경 시에만)
      this.drawBody(container, smoothedSize, playerColor, rpsColor, isMe);

      // 눈 그리기 (항상 표시 - 캐릭터 정체성)
      this.drawEyes(container, smoothedSize);
    }

    // RPS 스프라이트 업데이트 (상태 변경 시에만)
    if (stateChanged) {
      const rpsSprite = container.getData('rpsSprite') as Phaser.GameObjects.Sprite;
      const spriteScale = Math.max(0.25, Math.min(0.5, smoothedSize * 0.008)); // 크기에 비례
      rpsSprite.setFrame(RPS_FRAME_INDEX[player.rpsState]);
      rpsSprite.setScale(spriteScale);
      rpsSprite.setY(-smoothedSize - 20); // 간격 증가로 겹침 방지

      const nameText = container.getData('nameText') as Phaser.GameObjects.Text;
      nameText.setY(-smoothedSize - 45); // 스프라이트와 더 멀리
    }

    // 1등 왕관 업데이트
    const rankings = useGameStore.getState().rankings;
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

    // 대시바 업데이트 (내 플레이어만)
    if (isMe) {
      this.drawDashBar(container, smoothedSize);
    }
  }

  /**
   * 본체 그리기
   */
  private drawBody(
    container: Phaser.GameObjects.Container,
    size: number,
    playerColor: number,
    _rpsColor: number, // 더 이상 사용하지 않음
    isMe: boolean
  ): void {
    const body = container.getData('body') as Phaser.GameObjects.Graphics;
    body.clear();

    // 본체만 그림 (RPS 색상 테두리 제거)
    body.fillStyle(playerColor, 1);
    body.fillCircle(0, 0, size);

    // 내 캐릭터만 흰색 테두리
    if (isMe) {
      body.lineStyle(3, 0xffffff, 1);
      body.strokeCircle(0, 0, size + 2);
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
   * 알파값 계산 (무적 시스템 제거됨 - 항상 1 반환)
   */
  private calculateInvincibilityAlpha(_player: Player): number {
    return 1;
  }

  /**
   * 대시바 그리기 (플레이어 아래에 표시)
   * 성능 최적화: 상태 변경 시에만 다시 그림
   */
  private drawDashBar(container: Phaser.GameObjects.Container, size: number): void {
    const dashBar = container.getData('dashBar') as Phaser.GameObjects.Graphics;
    const boostText = container.getData('boostText') as Phaser.GameObjects.Text;
    if (!dashBar) return;

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

    // 상태 캐싱: 변경 없으면 스킵
    const lastProgress = container.getData('lastDashProgress') as number | undefined;
    const lastIsDashing = container.getData('lastIsDashing') as boolean | undefined;
    const progressRounded = Math.round(progress * 20) / 20; // 5% 단위로 반올림

    if (lastProgress === progressRounded && lastIsDashing === isDashing) {
      // 위치만 업데이트
      if (boostText) boostText.setY(size + 32);
      return;
    }

    container.setData('lastDashProgress', progressRounded);
    container.setData('lastIsDashing', isDashing);

    dashBar.clear();

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
