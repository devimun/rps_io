/**
 * Feature: chaos-rps-io, Property 1: 변신 랜덤 분포 균등성
 * Validates: Requirements 1.3
 *
 * 충분히 큰 변신 샘플(N >= 1000)에 대해,
 * 각 RPS 상태(가위, 바위, 보)의 출현 빈도는 전체의 33% ± 5% 범위 내에 있어야 합니다.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { RPSState } from '@chaos-rps/shared';
import { getRandomRPSState, getRandomDistribution, TransformSystem } from '../systems/TransformSystem';

describe('Feature: chaos-rps-io, Property 1: 변신 랜덤 분포 균등성', () => {
  /**
   * Property 1.1: 랜덤 상태가 유효한 RPS 상태만 반환
   */
  it('getRandomRPSState는 항상 유효한 RPS 상태를 반환한다', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), () => {
        const state = getRandomRPSState();
        expect([RPSState.ROCK, RPSState.PAPER, RPSState.SCISSORS]).toContain(state);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.2: 대량 샘플에서 균등 분포 검증
   * 1000개 샘플에서 각 상태가 28%~38% 범위 내에 있어야 함 (33% ± 5%)
   */
  it('1000개 샘플에서 각 상태가 28%~38% 범위 내에 있다', () => {
    const SAMPLE_COUNT = 1000;
    const EXPECTED_RATIO = 1 / 3;
    const TOLERANCE = 0.05;
    const MIN_RATIO = EXPECTED_RATIO - TOLERANCE;
    const MAX_RATIO = EXPECTED_RATIO + TOLERANCE;

    // 여러 번 테스트하여 통계적 신뢰성 확보
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10 }), () => {
        const distribution = getRandomDistribution(SAMPLE_COUNT);

        const rockRatio = distribution[RPSState.ROCK] / SAMPLE_COUNT;
        const paperRatio = distribution[RPSState.PAPER] / SAMPLE_COUNT;
        const scissorsRatio = distribution[RPSState.SCISSORS] / SAMPLE_COUNT;

        expect(rockRatio).toBeGreaterThanOrEqual(MIN_RATIO);
        expect(rockRatio).toBeLessThanOrEqual(MAX_RATIO);

        expect(paperRatio).toBeGreaterThanOrEqual(MIN_RATIO);
        expect(paperRatio).toBeLessThanOrEqual(MAX_RATIO);

        expect(scissorsRatio).toBeGreaterThanOrEqual(MIN_RATIO);
        expect(scissorsRatio).toBeLessThanOrEqual(MAX_RATIO);
      }),
      { numRuns: 10 } // 10번 반복하여 통계적 안정성 검증
    );
  });

  /**
   * Property 1.3: 분포 합계가 항상 샘플 수와 일치
   */
  it('분포 합계가 항상 샘플 수와 일치한다', () => {
    fc.assert(
      fc.property(fc.integer({ min: 100, max: 1000 }), sampleCount => {
        const distribution = getRandomDistribution(sampleCount);
        const total =
          distribution[RPSState.ROCK] +
          distribution[RPSState.PAPER] +
          distribution[RPSState.SCISSORS];
        expect(total).toBe(sampleCount);
      }),
      { numRuns: 100 }
    );
  });
});

describe('TransformSystem 단위 테스트', () => {
  it('초기 상태에서 변신까지 남은 시간이 양수이다', () => {
    const system = new TransformSystem(1500, 500);
    const timeRemaining = system.getTimeUntilNextTransform();
    expect(timeRemaining).toBeGreaterThan(0);
    expect(timeRemaining).toBeLessThanOrEqual(1500);
  });

  it('shouldSendWarning은 예고 시간 이내일 때 true를 반환한다', async () => {
    const system = new TransformSystem(100, 50); // 100ms 주기, 50ms 전 예고

    // 초기에는 예고 시간이 아님
    expect(system.shouldSendWarning()).toBe(false);

    // 60ms 대기 후 예고 시간 도달
    await new Promise(resolve => setTimeout(resolve, 60));
    expect(system.shouldSendWarning()).toBe(true);
  });

  it('update 호출 시 변신 이벤트가 생성된다', async () => {
    const system = new TransformSystem(50, 20); // 50ms 주기

    // 60ms 대기 후 변신 시간 도달
    await new Promise(resolve => setTimeout(resolve, 60));

    const events = system.update(['player1', 'player2']);
    expect(events.length).toBe(2);
    expect(events[0].playerId).toBe('player1');
    expect(events[1].playerId).toBe('player2');
    expect([RPSState.ROCK, RPSState.PAPER, RPSState.SCISSORS]).toContain(events[0].newState);
  });

  it('reset 호출 후 타이머가 초기화된다', () => {
    const system = new TransformSystem(1500, 500);
    system.reset();
    const timeRemaining = system.getTimeUntilNextTransform();
    expect(timeRemaining).toBeGreaterThan(1400); // 거의 전체 시간이 남아있어야 함
  });
});
