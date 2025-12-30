/**
 * 충돌 판정 로직
 * 가위바위보 상성에 따른 승패 결정
 */

import { RPSState, CollisionResult } from './types';

/**
 * 승리 조건 매핑
 * key가 value를 이김 (가위 > 보, 보 > 바위, 바위 > 가위)
 */
const WIN_CONDITIONS: Record<RPSState, RPSState> = {
  [RPSState.SCISSORS]: RPSState.PAPER,
  [RPSState.PAPER]: RPSState.ROCK,
  [RPSState.ROCK]: RPSState.SCISSORS,
};

/**
 * 두 플레이어의 충돌 결과를 판정합니다.
 *
 * @param attacker - 공격자의 RPS 상태
 * @param defender - 방어자의 RPS 상태
 * @returns 충돌 결과 (WIN: 공격자 승, LOSE: 공격자 패, DRAW: 무승부)
 *
 * @example
 * ```typescript
 * // 가위 vs 보 → 가위 승리
 * determineCollisionResult(RPSState.SCISSORS, RPSState.PAPER) // CollisionResult.WIN
 *
 * // 가위 vs 바위 → 가위 패배
 * determineCollisionResult(RPSState.SCISSORS, RPSState.ROCK) // CollisionResult.LOSE
 *
 * // 가위 vs 가위 → 무승부
 * determineCollisionResult(RPSState.SCISSORS, RPSState.SCISSORS) // CollisionResult.DRAW
 * ```
 */
export function determineCollisionResult(
  attacker: RPSState,
  defender: RPSState
): CollisionResult {
  // 같은 상태면 무승부
  if (attacker === defender) {
    return CollisionResult.DRAW;
  }

  // 공격자가 이기는 조건인지 확인
  if (WIN_CONDITIONS[attacker] === defender) {
    return CollisionResult.WIN;
  }

  // 그 외의 경우 공격자 패배
  return CollisionResult.LOSE;
}

/**
 * 주어진 RPS 상태가 다른 상태를 이기는지 확인합니다.
 *
 * @param state - 확인할 RPS 상태
 * @param target - 대상 RPS 상태
 * @returns 이기면 true, 아니면 false
 */
export function canBeat(state: RPSState, target: RPSState): boolean {
  return WIN_CONDITIONS[state] === target;
}

/**
 * 주어진 RPS 상태가 이길 수 있는 상태를 반환합니다.
 *
 * @param state - RPS 상태
 * @returns 해당 상태가 이길 수 있는 상태
 */
export function getWeakAgainst(state: RPSState): RPSState {
  return WIN_CONDITIONS[state];
}

/**
 * 주어진 RPS 상태에게 지는 상태를 반환합니다.
 *
 * @param state - RPS 상태
 * @returns 해당 상태에게 지는 상태
 */
export function getStrongAgainst(state: RPSState): RPSState {
  // 역방향 조회: 누가 나를 이기는가?
  const entries = Object.entries(WIN_CONDITIONS) as [RPSState, RPSState][];
  const found = entries.find(([_, loser]) => loser === state);
  return found ? found[0] : state;
}
