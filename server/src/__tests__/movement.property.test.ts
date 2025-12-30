/**
 * Feature: chaos-rps-io, Property 4, 5: 이동 관련 속성
 * Validates: Requirements 3.1, 3.4
 *
 * Property 4: 이동 방향 정확성
 * - 모든 플레이어 위치와 목표 위치에 대해, 계산된 이동 벡터의 방향은
 *   플레이어에서 목표를 향하는 방향과 일치해야 합니다.
 *
 * Property 5: 크기-속도 역관계
 * - 모든 두 플레이어 A, B에 대해, A의 크기가 B보다 크면
 *   A의 최대 속도는 B보다 작거나 같아야 합니다.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { RPSState, Player } from '@chaos-rps/shared';
import {
  calculateDirection,
  calculateMaxSpeed,
  updateVelocity,
  updatePosition,
  DEFAULT_WORLD_BOUNDS,
} from '../systems/MovementSystem';

// 테스트용 플레이어 생성 헬퍼
function createTestPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'test-player',
    nickname: 'TestPlayer',
    x: 100,
    y: 100,
    rpsState: RPSState.ROCK,
    score: 0,
    size: 1,
    isBot: false,
    velocityX: 0,
    velocityY: 0,
    ...overrides,
  };
}

// 좌표 생성기 (월드 경계 내)
const coordinateArb = fc.float({
  min: DEFAULT_WORLD_BOUNDS.minX + 50,
  max: DEFAULT_WORLD_BOUNDS.maxX - 50,
  noNaN: true,
});

// 크기 생성기 (1 ~ 10)
const sizeArb = fc.float({ min: 1, max: 10, noNaN: true });

describe('Feature: chaos-rps-io, Property 4: 이동 방향 정확성', () => {
  /**
   * Property 4.1: 방향 벡터가 목표를 향함
   */
  it('계산된 방향 벡터가 목표를 향한다', () => {
    fc.assert(
      fc.property(
        coordinateArb,
        coordinateArb,
        coordinateArb,
        coordinateArb,
        (currentX, currentY, targetX, targetY) => {
          const direction = calculateDirection(currentX, currentY, targetX, targetY);

          // 같은 위치면 방향이 0
          const dx = targetX - currentX;
          const dy = targetY - currentY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 1) {
            expect(direction.dx).toBe(0);
            expect(direction.dy).toBe(0);
          } else {
            // 방향 벡터가 정규화되어 있는지 확인
            const magnitude = Math.sqrt(direction.dx ** 2 + direction.dy ** 2);
            expect(magnitude).toBeCloseTo(1, 5);

            // 방향이 목표를 향하는지 확인 (내적이 양수)
            const dotProduct = direction.dx * dx + direction.dy * dy;
            expect(dotProduct).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4.2: 속도 업데이트 후 이동 방향이 목표를 향함
   */
  it('속도 업데이트 후 이동 방향이 목표를 향한다', () => {
    fc.assert(
      fc.property(
        coordinateArb,
        coordinateArb,
        coordinateArb,
        coordinateArb,
        sizeArb,
        (playerX, playerY, targetX, targetY, size) => {
          const player = createTestPlayer({ x: playerX, y: playerY, size });
          const input = { targetX, targetY, timestamp: Date.now() };

          const velocity = updateVelocity(player, input);

          const dx = targetX - playerX;
          const dy = targetY - playerY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 1) {
            // 목표가 너무 가까우면 속도가 0
            expect(velocity.velocityX).toBe(0);
            expect(velocity.velocityY).toBe(0);
          } else {
            // 속도 방향이 목표를 향하는지 확인
            const dotProduct = velocity.velocityX * dx + velocity.velocityY * dy;
            expect(dotProduct).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: chaos-rps-io, Property 5: 크기-속도 역관계', () => {
  /**
   * Property 5.1: 크기가 크면 속도가 느림
   */
  it('크기가 큰 플레이어는 속도가 느리다', () => {
    fc.assert(
      fc.property(sizeArb, sizeArb, (sizeA, sizeB) => {
        const speedA = calculateMaxSpeed(sizeA);
        const speedB = calculateMaxSpeed(sizeB);

        if (sizeA > sizeB) {
          expect(speedA).toBeLessThanOrEqual(speedB);
        } else if (sizeA < sizeB) {
          expect(speedA).toBeGreaterThanOrEqual(speedB);
        } else {
          expect(speedA).toBeCloseTo(speedB, 5);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.2: 속도가 항상 양수
   */
  it('최대 속도는 항상 양수이다', () => {
    fc.assert(
      fc.property(sizeArb, size => {
        const speed = calculateMaxSpeed(size);
        expect(speed).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.3: 크기 1일 때 기본 속도
   */
  it('크기 1일 때 기본 속도(200)를 반환한다', () => {
    const speed = calculateMaxSpeed(1);
    expect(speed).toBe(200);
  });
});

describe('이동 시스템 단위 테스트', () => {
  it('위치 업데이트가 경계 내에서 유지된다', () => {
    fc.assert(
      fc.property(
        coordinateArb,
        coordinateArb,
        fc.float({ min: -500, max: 500, noNaN: true }),
        fc.float({ min: -500, max: 500, noNaN: true }),
        sizeArb,
        (x, y, vx, vy, size) => {
          const player = createTestPlayer({ x, y, velocityX: vx, velocityY: vy, size });
          const deltaTime = 1 / 60; // 60fps

          const newPosition = updatePosition(player, deltaTime);

          const radius = 20 * size;
          expect(newPosition.x).toBeGreaterThanOrEqual(DEFAULT_WORLD_BOUNDS.minX + radius);
          expect(newPosition.x).toBeLessThanOrEqual(DEFAULT_WORLD_BOUNDS.maxX - radius);
          expect(newPosition.y).toBeGreaterThanOrEqual(DEFAULT_WORLD_BOUNDS.minY + radius);
          expect(newPosition.y).toBeLessThanOrEqual(DEFAULT_WORLD_BOUNDS.maxY - radius);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('속도가 0이면 위치가 변하지 않는다', () => {
    const player = createTestPlayer({ x: 500, y: 500, velocityX: 0, velocityY: 0 });
    const newPosition = updatePosition(player, 1);

    expect(newPosition.x).toBe(500);
    expect(newPosition.y).toBe(500);
  });
});
