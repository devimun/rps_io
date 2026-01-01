/**
 * 이동 시스템
 * 플레이어의 위치 업데이트 및 속도 계산을 처리합니다.
 */

import { Player, PlayerMoveInput } from '@chaos-rps/shared';
import { DEFAULT_PLAYER_SPEED } from '@chaos-rps/shared';

/**
 * 게임 월드 경계
 */
export interface WorldBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * 기본 월드 경계 (2000x2000)
 */
export const DEFAULT_WORLD_BOUNDS: WorldBounds = {
  minX: 0,
  maxX: 2000,
  minY: 0,
  maxY: 2000,
};

/**
 * 플레이어의 최대 속도를 반환합니다.
 * 현재 모든 플레이어는 크기와 관계없이 동일한 속도를 갖습니다.
 *
 * @param _size - 플레이어 크기 (현재 사용되지 않음)
 * @returns 최대 속도 (DEFAULT_PLAYER_SPEED)
 */
export function calculateMaxSpeed(_size: number): number {
  // 모든 플레이어가 동일한 속도를 가짐 (MIN_SPEED_RATIO = 1.0)
  return DEFAULT_PLAYER_SPEED;
}

/**
 * 플레이어 크기에 따른 속도를 계산합니다. (별칭)
 * @param size - 플레이어 크기 (픽셀)
 * @returns 계산된 속도
 */
export function calculateSpeedFromSize(size: number): number {
  return calculateMaxSpeed(size);
}

/**
 * 목표 위치를 향한 이동 방향 벡터를 계산합니다.
 *
 * @param currentX - 현재 X 좌표
 * @param currentY - 현재 Y 좌표
 * @param targetX - 목표 X 좌표
 * @param targetY - 목표 Y 좌표
 * @returns 정규화된 방향 벡터 { dx, dy }
 */
export function calculateDirection(
  currentX: number,
  currentY: number,
  targetX: number,
  targetY: number
): { dx: number; dy: number } {
  const dx = targetX - currentX;
  const dy = targetY - currentY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // 거리가 매우 작으면 이동하지 않음
  if (distance < 1) {
    return { dx: 0, dy: 0 };
  }

  // 정규화
  return {
    dx: dx / distance,
    dy: dy / distance,
  };
}

/**
 * 플레이어의 속도를 방향 각도 기반으로 계산합니다.
 *
 * @param angle - 이동 방향 각도 (라디안)
 * @param speed - 이동 속도
 * @returns 속도 벡터 { velocityX, velocityY }
 */
export function calculateVelocityFromAngle(
  angle: number,
  speed: number
): { velocityX: number; velocityY: number } {
  return {
    velocityX: Math.cos(angle) * speed,
    velocityY: Math.sin(angle) * speed,
  };
}

/**
 * 플레이어의 위치를 업데이트합니다.
 *
 * @param player - 플레이어 객체
 * @param deltaTime - 경과 시간 (초)
 * @param bounds - 월드 경계
 * @returns 업데이트된 위치 { x, y }
 */
export function updatePosition(
  player: Player,
  deltaTime: number,
  bounds: WorldBounds = DEFAULT_WORLD_BOUNDS
): { x: number; y: number } {
  // 새 위치 계산
  let newX = player.x + player.velocityX * deltaTime;
  let newY = player.y + player.velocityY * deltaTime;

  // 플레이어 반경 (size가 이미 픽셀 반지름)
  const radius = player.size;

  // 경계 제한
  newX = Math.max(bounds.minX + radius, Math.min(bounds.maxX - radius, newX));
  newY = Math.max(bounds.minY + radius, Math.min(bounds.maxY - radius, newY));

  return { x: newX, y: newY };
}

/**
 * 이동 시스템 클래스
 * 게임 룸 내 모든 플레이어의 이동을 관리합니다.
 */
export class MovementSystem {
  /** 월드 경계 */
  private bounds: WorldBounds;
  /** 플레이어별 이동 입력 */
  private inputs: Map<string, PlayerMoveInput>;

  constructor(bounds: WorldBounds = DEFAULT_WORLD_BOUNDS) {
    this.bounds = bounds;
    this.inputs = new Map();
  }

  /**
   * 플레이어의 이동 입력을 설정합니다.
   * @param playerId - 플레이어 ID
   * @param input - 이동 입력
   */
  setInput(playerId: string, input: PlayerMoveInput): void {
    this.inputs.set(playerId, input);
  }

  /**
   * 플레이어의 이동 입력을 제거합니다.
   * @param playerId - 플레이어 ID
   */
  removeInput(playerId: string): void {
    this.inputs.delete(playerId);
  }

  /**
   * 플레이어의 이동 입력을 가져옵니다.
   * @param playerId - 플레이어 ID
   * @returns 이동 입력 또는 undefined
   */
  getInput(playerId: string): PlayerMoveInput | undefined {
    return this.inputs.get(playerId);
  }

  /**
   * 플레이어의 속도와 위치를 업데이트합니다.
   * @param player - 플레이어 객체 (변경됨)
   * @param deltaTime - 경과 시간 (초)
   * @param speedMultiplier - 속도 배율 (대시 등)
   */
  updatePlayer(player: Player, deltaTime: number, speedMultiplier: number = 1): void {
    const input = this.inputs.get(player.id);

    if (input && input.isMoving) {
      // 방향 기반 속도 계산
      const speed = calculateMaxSpeed(player.size) * speedMultiplier;
      const velocity = calculateVelocityFromAngle(input.angle, speed);
      player.velocityX = velocity.velocityX;
      player.velocityY = velocity.velocityY;
    } else {
      // 입력이 없거나 정지 상태면 감속
      player.velocityX *= 0.9;
      player.velocityY *= 0.9;

      // 매우 작은 속도는 0으로
      if (Math.abs(player.velocityX) < 0.1) player.velocityX = 0;
      if (Math.abs(player.velocityY) < 0.1) player.velocityY = 0;
    }

    // 위치 업데이트
    const position = updatePosition(player, deltaTime, this.bounds);
    player.x = position.x;
    player.y = position.y;
  }

  /**
   * 모든 플레이어의 이동을 업데이트합니다.
   * @param players - 플레이어 목록
   * @param deltaTime - 경과 시간 (초)
   * @param getSpeedMultiplier - 플레이어별 속도 배율을 반환하는 콜백 (선택)
   */
  update(
    players: Player[],
    deltaTime: number,
    getSpeedMultiplier?: (playerId: string) => number
  ): void {
    for (const player of players) {
      const multiplier = getSpeedMultiplier ? getSpeedMultiplier(player.id) : 1;
      this.updatePlayer(player, deltaTime, multiplier);
    }
  }

  /**
   * 월드 경계를 설정합니다.
   * @param bounds - 새 월드 경계
   */
  setBounds(bounds: WorldBounds): void {
    this.bounds = bounds;
  }

  /**
   * 현재 월드 경계를 반환합니다.
   * @returns 월드 경계
   */
  getBounds(): WorldBounds {
    return this.bounds;
  }
}
