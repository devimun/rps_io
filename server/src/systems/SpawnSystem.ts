/**
 * 스폰 시스템
 * 모든 플레이어로부터 가장 먼 위치에 스폰합니다.
 * 간단하고 성능 좋은 "가장 안전한 위치" 알고리즘
 */

import type { Player } from '@chaos-rps/shared';
import { WORLD_SIZE, SPAWN_EDGE_MARGIN } from '@chaos-rps/shared';

/** 스폰 위치 인터페이스 */
interface SpawnPosition {
  x: number;
  y: number;
}

/**
 * 스폰 시스템 클래스
 * 가장 안전한 위치(모든 플레이어로부터 가장 먼 곳)에 스폰합니다.
 */
export class SpawnSystem {
  private readonly worldWidth: number;
  private readonly worldHeight: number;
  private readonly edgeMargin: number;

  constructor(
    worldWidth: number = WORLD_SIZE,
    worldHeight: number = WORLD_SIZE,
    edgeMargin: number = SPAWN_EDGE_MARGIN
  ) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.edgeMargin = edgeMargin;
  }

  /**
   * 가장 안전한 스폰 위치를 찾습니다.
   * 모든 플레이어로부터 가장 먼 위치를 반환합니다.
   * 
   * @param existingPlayers - 기존 플레이어 목록
   * @param candidateCount - 테스트할 후보 위치 수 (기본 30)
   * @returns 스폰 위치 { x, y }
   */
  findSafeSpawnPosition(
    existingPlayers: Player[],
    candidateCount: number = 30
  ): SpawnPosition {
    // 플레이어가 없으면 맵 중앙
    if (existingPlayers.length === 0) {
      return {
        x: this.worldWidth / 2,
        y: this.worldHeight / 2,
      };
    }

    let bestPosition: SpawnPosition = this.randomPosition();
    let maxMinDistance = 0;

    // 여러 후보 위치 중 가장 안전한 위치 선택
    for (let i = 0; i < candidateCount; i++) {
      const candidate = this.randomPosition();
      const minDistance = this.getMinDistanceToPlayers(candidate, existingPlayers);

      if (minDistance > maxMinDistance) {
        maxMinDistance = minDistance;
        bestPosition = candidate;
      }
    }

    return bestPosition;
  }

  /**
   * 후보 위치에서 가장 가까운 플레이어까지의 거리를 계산합니다.
   */
  private getMinDistanceToPlayers(pos: SpawnPosition, players: Player[]): number {
    let minDistance = Infinity;

    for (const player of players) {
      const dx = player.x - pos.x;
      const dy = player.y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    return minDistance;
  }

  /**
   * 경계 여백 내 랜덤 위치를 생성합니다.
   */
  private randomPosition(): SpawnPosition {
    return {
      x: this.edgeMargin + Math.random() * (this.worldWidth - this.edgeMargin * 2),
      y: this.edgeMargin + Math.random() * (this.worldHeight - this.edgeMargin * 2),
    };
  }
}

/** 기본 스폰 시스템 인스턴스 */
export const spawnSystem = new SpawnSystem();
