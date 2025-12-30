/**
 * 변신 시스템
 * 플레이어의 RPS 상태를 주기적으로 랜덤 변경합니다.
 * 각 플레이어는 개별 타이머를 가지며, 변신 시점이 서로 다릅니다.
 */

import { RPSState, TransformEvent } from '@chaos-rps/shared';
import { TRANSFORM_INTERVAL_MS } from '@chaos-rps/shared';

/**
 * 모든 RPS 상태 배열
 */
const ALL_RPS_STATES: RPSState[] = [RPSState.ROCK, RPSState.PAPER, RPSState.SCISSORS];

/**
 * 균등 분포로 랜덤 RPS 상태를 생성합니다.
 * @returns 랜덤 RPS 상태
 */
export function getRandomRPSState(): RPSState {
  const index = Math.floor(Math.random() * ALL_RPS_STATES.length);
  return ALL_RPS_STATES[index];
}

/**
 * 플레이어별 변신 타이머 상태
 */
interface PlayerTransformState {
  /** 마지막 변신 시간 (타임스탬프) */
  lastTransformTime: number;
}

/**
 * 변신 시스템 클래스
 * 각 플레이어별로 개별 변신 타이머를 관리합니다.
 */
export class TransformSystem {
  /** 변신 주기 (밀리초) */
  private readonly transformInterval: number;
  /** 플레이어별 타이머 상태 */
  private playerTimers: Map<string, PlayerTransformState> = new Map();
  /** 변신 이벤트 콜백 */
  private onTransform: ((playerId: string, newState: RPSState) => void) | null = null;

  constructor(transformInterval: number = TRANSFORM_INTERVAL_MS) {
    this.transformInterval = transformInterval;
  }

  /**
   * 변신 이벤트 핸들러를 설정합니다.
   * @param handler - 변신 시 호출될 콜백
   */
  setOnTransform(handler: (playerId: string, newState: RPSState) => void): void {
    this.onTransform = handler;
  }

  /**
   * 예고 이벤트 핸들러를 설정합니다. (더 이상 사용하지 않음)
   * @deprecated 개별 타이머 방식에서는 예고가 의미 없음
   */
  setOnWarning(_handler: (timeRemaining: number) => void): void {
    // 더 이상 사용하지 않음 - 개별 타이머 방식에서는 예고가 의미 없음
  }

  /**
   * 플레이어를 시스템에 등록합니다.
   * 랜덤한 시작 시간을 부여하여 변신 시점을 분산시킵니다.
   * @param playerId - 플레이어 ID
   */
  registerPlayer(playerId: string): void {
    if (this.playerTimers.has(playerId)) return;
    
    // 랜덤 오프셋으로 변신 시점 분산 (0 ~ transformInterval 사이)
    const randomOffset = Math.random() * this.transformInterval;
    this.playerTimers.set(playerId, {
      lastTransformTime: Date.now() - randomOffset,
    });
  }

  /**
   * 플레이어를 시스템에서 제거합니다.
   * @param playerId - 플레이어 ID
   */
  unregisterPlayer(playerId: string): void {
    this.playerTimers.delete(playerId);
  }

  /**
   * 시스템을 업데이트합니다. (매 틱마다 호출)
   * @param playerIds - 현재 활성 플레이어 ID 목록
   * @returns 변신 이벤트 목록
   */
  update(playerIds: string[]): TransformEvent[] {
    const events: TransformEvent[] = [];
    const now = Date.now();

    for (const playerId of playerIds) {
      // 등록되지 않은 플레이어는 등록
      if (!this.playerTimers.has(playerId)) {
        this.registerPlayer(playerId);
      }

      const state = this.playerTimers.get(playerId)!;
      const elapsed = now - state.lastTransformTime;

      // 변신 주기가 지났으면 변신
      if (elapsed >= this.transformInterval) {
        const newState = getRandomRPSState();
        events.push({
          playerId,
          newState,
          timestamp: now,
        });

        if (this.onTransform) {
          this.onTransform(playerId, newState);
        }

        // 타이머 리셋
        state.lastTransformTime = now;
      }
    }

    // 더 이상 존재하지 않는 플레이어 정리
    for (const playerId of this.playerTimers.keys()) {
      if (!playerIds.includes(playerId)) {
        this.playerTimers.delete(playerId);
      }
    }

    return events;
  }

  /**
   * 타이머를 리셋합니다.
   */
  reset(): void {
    this.playerTimers.clear();
  }

  /**
   * 특정 플레이어의 마지막 변신 시간을 반환합니다.
   * @param playerId - 플레이어 ID
   * @returns 마지막 변신 시간 (타임스탬프), 없으면 undefined
   */
  getLastTransformTime(playerId: string): number | undefined {
    return this.playerTimers.get(playerId)?.lastTransformTime;
  }

  /**
   * 모든 플레이어의 마지막 변신 시간을 반환합니다.
   * @returns 플레이어 ID -> 마지막 변신 시간 맵
   */
  getAllLastTransformTimes(): Map<string, number> {
    const result = new Map<string, number>();
    for (const [playerId, state] of this.playerTimers) {
      result.set(playerId, state.lastTransformTime);
    }
    return result;
  }
}

/**
 * 주어진 샘플 수만큼 랜덤 상태를 생성하고 분포를 반환합니다.
 * (테스트용 유틸리티 함수)
 * @param sampleCount - 샘플 수
 * @returns 각 상태별 출현 횟수
 */
export function getRandomDistribution(
  sampleCount: number
): Record<RPSState, number> {
  const distribution: Record<RPSState, number> = {
    [RPSState.ROCK]: 0,
    [RPSState.PAPER]: 0,
    [RPSState.SCISSORS]: 0,
  };

  for (let i = 0; i < sampleCount; i++) {
    const state = getRandomRPSState();
    distribution[state]++;
  }

  return distribution;
}
