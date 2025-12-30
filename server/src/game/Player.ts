/**
 * 플레이어 클래스
 * 게임 내 플레이어(유저 또는 봇)의 상태를 관리합니다.
 */

import { Player as IPlayer, RPSState, CreatePlayerData } from '@chaos-rps/shared';
import { DEFAULT_PLAYER_SIZE, SPAWN_INVINCIBILITY_MS, MAX_PLAYER_SIZE, SPAWN_EDGE_MARGIN } from '@chaos-rps/shared';

/**
 * 균등 분포로 랜덤 RPS 상태를 생성합니다.
 * @returns 랜덤 RPS 상태
 */
function getRandomRPSState(): RPSState {
  const states = [RPSState.ROCK, RPSState.PAPER, RPSState.SCISSORS];
  return states[Math.floor(Math.random() * states.length)];
}

/**
 * 점수에 따른 크기를 계산합니다.
 * 크기는 점수에 비례하여 증가하며, 단조 증가 함수입니다.
 * 최대 크기는 MAX_PLAYER_SIZE로 제한됩니다.
 *
 * @param score - 현재 점수
 * @returns 계산된 크기 (DEFAULT_PLAYER_SIZE ~ MAX_PLAYER_SIZE)
 */
export function calculateSizeFromScore(score: number): number {
  // 공식: baseSize + log2(score + 1) * growthFactor
  // growthFactor를 2로 줄여서 성장 속도 감소
  // 점수 0 → 크기 30 (기본)
  // 점수 15 → 크기 38
  // 점수 63 → 크기 42
  // 점수 255 → 크기 46
  const growthFactor = 2;
  const calculatedSize = DEFAULT_PLAYER_SIZE + Math.log2(score + 1) * growthFactor;
  
  // 최대 크기 제한 적용
  return Math.min(calculatedSize, MAX_PLAYER_SIZE);
}

/**
 * 고유 ID를 생성합니다.
 * @returns 고유 ID 문자열
 */
function generateId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 플레이어 클래스
 */
export class PlayerEntity implements IPlayer {
  readonly id: string;
  nickname: string;
  x: number;
  y: number;
  rpsState: RPSState;
  score: number;
  size: number;
  isBot: boolean;
  velocityX: number;
  velocityY: number;
  /** 스폰 시간 (무적 판정용) */
  spawnTime: number;
  /** 마지막 변신 시간 (변신 타이머 표시용) */
  lastTransformTime?: number;

  constructor(data: CreatePlayerData, spawnX: number, spawnY: number) {
    this.id = generateId();
    this.nickname = data.nickname;
    this.x = spawnX;
    this.y = spawnY;
    this.rpsState = getRandomRPSState();
    this.score = 0;
    this.size = DEFAULT_PLAYER_SIZE;
    this.isBot = data.isBot ?? false;
    this.velocityX = 0;
    this.velocityY = 0;
    this.spawnTime = Date.now();
  }

  /**
   * 무적 상태인지 확인합니다.
   * @returns 무적 여부
   */
  isInvincible(): boolean {
    return Date.now() - this.spawnTime < SPAWN_INVINCIBILITY_MS;
  }

  /**
   * 점수를 추가하고 크기를 업데이트합니다.
   * @param points - 추가할 점수
   */
  addScore(points: number): void {
    this.score += points;
    this.size = calculateSizeFromScore(this.score);
  }

  /**
   * RPS 상태를 변경합니다.
   * @param newState - 새로운 RPS 상태
   */
  setRPSState(newState: RPSState): void {
    this.rpsState = newState;
  }

  /**
   * 위치를 설정합니다.
   * @param x - X 좌표
   * @param y - Y 좌표
   */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  /**
   * 속도를 설정합니다.
   * @param vx - X축 속도
   * @param vy - Y축 속도
   */
  setVelocity(vx: number, vy: number): void {
    this.velocityX = vx;
    this.velocityY = vy;
  }

  /**
   * 플레이어 상태를 리셋합니다. (리스폰 시 사용)
   * @param spawnX - 스폰 X 좌표
   * @param spawnY - 스폰 Y 좌표
   */
  reset(spawnX: number, spawnY: number): void {
    this.x = spawnX;
    this.y = spawnY;
    this.score = 0;
    this.size = DEFAULT_PLAYER_SIZE;
    this.rpsState = getRandomRPSState();
    this.velocityX = 0;
    this.velocityY = 0;
    this.spawnTime = Date.now(); // 리스폰 시 무적 시간 갱신
  }

  /**
   * 플레이어 데이터를 직렬화합니다.
   * @returns 직렬화된 플레이어 데이터
   */
  toJSON(): IPlayer {
    return {
      id: this.id,
      nickname: this.nickname,
      x: this.x,
      y: this.y,
      rpsState: this.rpsState,
      score: this.score,
      size: this.size,
      isBot: this.isBot,
      velocityX: this.velocityX,
      velocityY: this.velocityY,
      spawnTime: this.spawnTime,
      lastTransformTime: this.lastTransformTime,
    };
  }

  /**
   * 정적 팩토리: 기존 데이터로 플레이어 생성
   * @param data - 플레이어 데이터
   * @returns 플레이어 엔티티
   */
  static fromData(data: IPlayer): PlayerEntity {
    const player = new PlayerEntity(
      { nickname: data.nickname, isBot: data.isBot },
      data.x,
      data.y
    );
    // ID 덮어쓰기 (private 필드가 아니므로 가능)
    (player as { id: string }).id = data.id;
    player.rpsState = data.rpsState;
    player.score = data.score;
    player.size = data.size;
    player.velocityX = data.velocityX;
    player.velocityY = data.velocityY;
    return player;
  }
}

/**
 * 랜덤 스폰 위치를 생성합니다.
 * @param worldWidth - 월드 너비
 * @param worldHeight - 월드 높이
 * @param margin - 경계 여백
 * @returns 스폰 좌표 { x, y }
 */
export function generateSpawnPosition(
  worldWidth: number,
  worldHeight: number,
  margin: number = 100
): { x: number; y: number } {
  return {
    x: margin + Math.random() * (worldWidth - margin * 2),
    y: margin + Math.random() * (worldHeight - margin * 2),
  };
}

/**
 * 다른 플레이어들과 충분히 떨어진 안전한 스폰 위치를 찾습니다.
 * @param worldWidth - 월드 너비
 * @param worldHeight - 월드 높이
 * @param existingPlayers - 기존 플레이어 목록
 * @param maxAttempts - 최대 시도 횟수
 * @returns 안전한 스폰 좌표 { x, y }
 */
export function generateSafeSpawnPosition(
  worldWidth: number,
  worldHeight: number,
  existingPlayers: IPlayer[],
  maxAttempts: number = 50
): { x: number; y: number } {
  const margin = SPAWN_EDGE_MARGIN;
  const safeDistance = 200; // 안전 거리
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pos = generateSpawnPosition(worldWidth, worldHeight, margin);
    
    // 모든 기존 플레이어와의 거리 확인
    const isSafe = existingPlayers.every(player => {
      const dx = player.x - pos.x;
      const dy = player.y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance >= safeDistance;
    });
    
    if (isSafe) {
      return pos;
    }
  }
  
  // 안전한 위치를 찾지 못하면 랜덤 위치 반환
  return generateSpawnPosition(worldWidth, worldHeight, margin);
}
