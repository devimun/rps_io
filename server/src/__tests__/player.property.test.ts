/**
 * Feature: chaos-rps-io, Property 3: 크기-점수 비례 관계
 * Validates: Requirements 2.5
 *
 * 모든 플레이어에 대해, 점수가 증가하면 크기도 비례하여 증가해야 하며,
 * 크기 = f(점수) 함수는 단조 증가해야 합니다.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { RPSState } from '@chaos-rps/shared';
import { calculateSizeFromScore, PlayerEntity, generateSpawnPosition } from '../game/Player';

describe('Feature: chaos-rps-io, Property 3: 크기-점수 비례 관계', () => {
  /**
   * Property 3.1: 크기 함수가 단조 증가
   * 점수가 증가하면 크기도 증가해야 함
   */
  it('점수가 증가하면 크기도 증가한다 (단조 증가)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 1, max: 100 }),
        (score, increment) => {
          const size1 = calculateSizeFromScore(score);
          const size2 = calculateSizeFromScore(score + increment);

          // 점수가 증가하면 크기도 증가해야 함
          expect(size2).toBeGreaterThan(size1);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.2: 크기가 항상 양수
   */
  it('크기는 항상 양수이다', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10000 }), score => {
        const size = calculateSizeFromScore(score);
        expect(size).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.3: 점수 0일 때 기본 크기
   */
  it('점수 0일 때 기본 크기(1)를 반환한다', () => {
    const size = calculateSizeFromScore(0);
    expect(size).toBe(1);
  });

  /**
   * Property 3.4: 크기가 최소값 이상
   */
  it('크기는 항상 기본 크기(1) 이상이다', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10000 }), score => {
        const size = calculateSizeFromScore(score);
        expect(size).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.5: PlayerEntity.addScore가 크기를 올바르게 업데이트
   */
  it('addScore 호출 시 크기가 올바르게 업데이트된다', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (points1, points2) => {
          const player = new PlayerEntity({ nickname: 'Test' }, 100, 100);

          const initialSize = player.size;
          expect(initialSize).toBe(1);

          player.addScore(points1);
          const size1 = player.size;
          expect(size1).toBeGreaterThan(initialSize);
          expect(size1).toBe(calculateSizeFromScore(points1));

          player.addScore(points2);
          const size2 = player.size;
          expect(size2).toBeGreaterThan(size1);
          expect(size2).toBe(calculateSizeFromScore(points1 + points2));
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('PlayerEntity 단위 테스트', () => {
  it('생성 시 기본값이 올바르게 설정된다', () => {
    const player = new PlayerEntity({ nickname: 'TestPlayer' }, 100, 200);

    expect(player.nickname).toBe('TestPlayer');
    expect(player.x).toBe(100);
    expect(player.y).toBe(200);
    expect(player.score).toBe(0);
    expect(player.size).toBe(1);
    expect(player.isBot).toBe(false);
    expect(player.velocityX).toBe(0);
    expect(player.velocityY).toBe(0);
    expect([RPSState.ROCK, RPSState.PAPER, RPSState.SCISSORS]).toContain(player.rpsState);
  });

  it('봇 플레이어 생성이 올바르게 동작한다', () => {
    const bot = new PlayerEntity({ nickname: 'Bot1', isBot: true }, 50, 50);

    expect(bot.isBot).toBe(true);
  });

  it('reset 호출 시 상태가 초기화된다', () => {
    const player = new PlayerEntity({ nickname: 'Test' }, 100, 100);
    player.addScore(50);
    player.setVelocity(100, 100);

    player.reset(500, 500);

    expect(player.x).toBe(500);
    expect(player.y).toBe(500);
    expect(player.score).toBe(0);
    expect(player.size).toBe(1);
    expect(player.velocityX).toBe(0);
    expect(player.velocityY).toBe(0);
  });

  it('toJSON이 올바른 데이터를 반환한다', () => {
    const player = new PlayerEntity({ nickname: 'Test' }, 100, 200);
    player.addScore(10);

    const json = player.toJSON();

    expect(json.nickname).toBe('Test');
    expect(json.x).toBe(100);
    expect(json.y).toBe(200);
    expect(json.score).toBe(10);
    expect(json.size).toBe(calculateSizeFromScore(10));
  });
});

describe('generateSpawnPosition 테스트', () => {
  it('스폰 위치가 경계 내에 있다', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 500, max: 5000 }),
        fc.integer({ min: 500, max: 5000 }),
        fc.integer({ min: 50, max: 200 }),
        (width, height, margin) => {
          const pos = generateSpawnPosition(width, height, margin);

          expect(pos.x).toBeGreaterThanOrEqual(margin);
          expect(pos.x).toBeLessThanOrEqual(width - margin);
          expect(pos.y).toBeGreaterThanOrEqual(margin);
          expect(pos.y).toBeLessThanOrEqual(height - margin);
        }
      ),
      { numRuns: 100 }
    );
  });
});
