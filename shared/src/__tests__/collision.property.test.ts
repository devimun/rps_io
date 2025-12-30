/**
 * Feature: chaos-rps-io, Property 2: 충돌 판정 정확성
 * Validates: Requirements 2.1, 2.2, 2.3
 *
 * 모든 RPS 상태 조합에 대해 올바른 결과를 반환하는지 검증합니다.
 * - 가위 vs 보, 보 vs 바위, 바위 vs 가위 → 첫 번째 플레이어 승리
 * - 동일 상태 → 무승부 (넉백)
 * - 그 외 → 첫 번째 플레이어 패배
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { RPSState, CollisionResult } from '../types';
import { determineCollisionResult, canBeat, getWeakAgainst, getStrongAgainst } from '../collision';

// RPS 상태 생성기
const rpsStateArb = fc.constantFrom(RPSState.ROCK, RPSState.PAPER, RPSState.SCISSORS);

describe('Feature: chaos-rps-io, Property 2: 충돌 판정 정확성', () => {
  /**
   * Property 2.1: 승리 조건 정확성
   * 가위>보, 보>바위, 바위>가위 조합에서 항상 WIN을 반환해야 함
   */
  it('승리 조건에서 항상 WIN을 반환한다', () => {
    fc.assert(
      fc.property(rpsStateArb, attacker => {
        const defender = getWeakAgainst(attacker);
        const result = determineCollisionResult(attacker, defender);
        expect(result).toBe(CollisionResult.WIN);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.2: 무승부 조건 정확성
   * 동일한 상태끼리 충돌하면 항상 DRAW를 반환해야 함
   */
  it('동일 상태 충돌에서 항상 DRAW를 반환한다', () => {
    fc.assert(
      fc.property(rpsStateArb, state => {
        const result = determineCollisionResult(state, state);
        expect(result).toBe(CollisionResult.DRAW);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.3: 패배 조건 정확성
   * 상성에서 지는 조합에서 항상 LOSE를 반환해야 함
   */
  it('패배 조건에서 항상 LOSE를 반환한다', () => {
    fc.assert(
      fc.property(rpsStateArb, attacker => {
        const defender = getStrongAgainst(attacker);
        const result = determineCollisionResult(attacker, defender);
        expect(result).toBe(CollisionResult.LOSE);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.4: 결과 완전성
   * 모든 조합에서 반드시 WIN, LOSE, DRAW 중 하나를 반환해야 함
   */
  it('모든 조합에서 유효한 결과를 반환한다', () => {
    fc.assert(
      fc.property(rpsStateArb, rpsStateArb, (attacker, defender) => {
        const result = determineCollisionResult(attacker, defender);
        expect([CollisionResult.WIN, CollisionResult.LOSE, CollisionResult.DRAW]).toContain(result);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.5: 대칭성
   * A가 B를 이기면, B는 A에게 진다
   */
  it('승패 관계가 대칭적이다', () => {
    fc.assert(
      fc.property(rpsStateArb, rpsStateArb, (a, b) => {
        const resultAB = determineCollisionResult(a, b);
        const resultBA = determineCollisionResult(b, a);

        if (resultAB === CollisionResult.WIN) {
          expect(resultBA).toBe(CollisionResult.LOSE);
        } else if (resultAB === CollisionResult.LOSE) {
          expect(resultBA).toBe(CollisionResult.WIN);
        } else {
          expect(resultBA).toBe(CollisionResult.DRAW);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.6: canBeat 함수 일관성
   * canBeat(a, b)가 true면 determineCollisionResult(a, b)는 WIN이어야 함
   */
  it('canBeat 함수와 determineCollisionResult가 일관성 있다', () => {
    fc.assert(
      fc.property(rpsStateArb, rpsStateArb, (a, b) => {
        const canWin = canBeat(a, b);
        const result = determineCollisionResult(a, b);

        if (canWin) {
          expect(result).toBe(CollisionResult.WIN);
        } else if (a === b) {
          expect(result).toBe(CollisionResult.DRAW);
        } else {
          expect(result).toBe(CollisionResult.LOSE);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// 단위 테스트: 모든 9가지 조합 명시적 검증
describe('충돌 판정 단위 테스트', () => {
  const testCases: [RPSState, RPSState, CollisionResult][] = [
    // 승리 케이스
    [RPSState.SCISSORS, RPSState.PAPER, CollisionResult.WIN],
    [RPSState.PAPER, RPSState.ROCK, CollisionResult.WIN],
    [RPSState.ROCK, RPSState.SCISSORS, CollisionResult.WIN],
    // 패배 케이스
    [RPSState.SCISSORS, RPSState.ROCK, CollisionResult.LOSE],
    [RPSState.PAPER, RPSState.SCISSORS, CollisionResult.LOSE],
    [RPSState.ROCK, RPSState.PAPER, CollisionResult.LOSE],
    // 무승부 케이스
    [RPSState.SCISSORS, RPSState.SCISSORS, CollisionResult.DRAW],
    [RPSState.PAPER, RPSState.PAPER, CollisionResult.DRAW],
    [RPSState.ROCK, RPSState.ROCK, CollisionResult.DRAW],
  ];

  testCases.forEach(([attacker, defender, expected]) => {
    it(`${attacker} vs ${defender} = ${expected}`, () => {
      expect(determineCollisionResult(attacker, defender)).toBe(expected);
    });
  });
});
