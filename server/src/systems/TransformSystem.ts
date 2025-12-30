/**
 * 변신 시스템 (전체 동기화 방식)
 * 모든 플레이어가 동시에 변신합니다.
 * 각 플레이어는 자신의 다음 상태를 미리 알 수 있습니다.
 */

import { RPSState, TransformEvent } from '@chaos-rps/shared';
import { TRANSFORM_INTERVAL_MS } from '@chaos-rps/shared';

/** 모든 RPS 상태 배열 */
const ALL_RPS_STATES: RPSState[] = [RPSState.ROCK, RPSState.PAPER, RPSState.SCISSORS];

/**
 * 균등 분포로 랜덤 RPS 상태를 생성합니다.
 */
export function getRandomRPSState(): RPSState {
  const index = Math.floor(Math.random() * ALL_RPS_STATES.length);
  return ALL_RPS_STATES[index];
}

/**
 * 플레이어별 다음 상태 정보
 */
interface PlayerNextState {
  /** 다음 RPS 상태 */
  nextState: RPSState;
}

/**
 * 변신 시스템 클래스 (전체 동기화)
 * 모든 플레이어가 동시에 변신하며, 각자 다음 상태를 미리 알 수 있습니다.
 */
export class TransformSystem {
  /** 변신 주기 (밀리초) */
  private readonly transformInterval: number;
  /** 마지막 전체 변신 시간 */
  private lastGlobalTransformTime: number;
  /** 플레이어별 다음 상태 */
  private playerNextStates: Map<string, PlayerNextState> = new Map();
  /** 변신 이벤트 콜백 */
  private onTransform: ((playerId: string, newState: RPSState) => void) | null = null;
  /** 전체 변신 이벤트 콜백 */
  private onGlobalTransform: ((timestamp: number) => void) | null = null;

  constructor(transformInterval: number = TRANSFORM_INTERVAL_MS) {
    this.transformInterval = transformInterval;
    this.lastGlobalTransformTime = Date.now();
  }

  /**
   * 변신 이벤트 핸들러를 설정합니다.
   */
  setOnTransform(handler: (playerId: string, newState: RPSState) => void): void {
    this.onTransform = handler;
  }

  /**
   * 전체 변신 이벤트 핸들러를 설정합니다.
   */
  setOnGlobalTransform(handler: (timestamp: number) => void): void {
    this.onGlobalTransform = handler;
  }

  /**
   * 플레이어를 시스템에 등록합니다.
   * 다음 상태를 미리 생성합니다.
   */
  registerPlayer(playerId: string): void {
    if (this.playerNextStates.has(playerId)) return;
    this.playerNextStates.set(playerId, {
      nextState: getRandomRPSState(),
    });
  }

  /**
   * 플레이어를 시스템에서 제거합니다.
   */
  unregisterPlayer(playerId: string): void {
    this.playerNextStates.delete(playerId);
  }

  /**
   * 플레이어의 다음 상태를 반환합니다.
   */
  getNextState(playerId: string): RPSState | undefined {
    return this.playerNextStates.get(playerId)?.nextState;
  }

  /**
   * 다음 변신까지 남은 시간을 반환합니다 (밀리초).
   */
  getTimeUntilNextTransform(): number {
    const elapsed = Date.now() - this.lastGlobalTransformTime;
    return Math.max(0, this.transformInterval - elapsed);
  }

  /**
   * 마지막 전체 변신 시간을 반환합니다.
   */
  getLastGlobalTransformTime(): number {
    return this.lastGlobalTransformTime;
  }

  /**
   * 시스템을 업데이트합니다. (매 틱마다 호출)
   * @returns 변신 이벤트 목록
   */
  update(playerIds: string[]): TransformEvent[] {
    const events: TransformEvent[] = [];
    const now = Date.now();

    // 새 플레이어 등록
    for (const playerId of playerIds) {
      if (!this.playerNextStates.has(playerId)) {
        this.registerPlayer(playerId);
      }
    }

    // 전체 변신 시간 체크
    const elapsed = now - this.lastGlobalTransformTime;
    if (elapsed >= this.transformInterval) {
      // 전체 변신 실행
      for (const playerId of playerIds) {
        const state = this.playerNextStates.get(playerId);
        if (state) {
          const newState = state.nextState;
          events.push({
            playerId,
            newState,
            timestamp: now,
          });

          if (this.onTransform) {
            this.onTransform(playerId, newState);
          }

          // 다음 상태 새로 생성
          state.nextState = getRandomRPSState();
        }
      }

      // 전체 변신 시간 리셋
      this.lastGlobalTransformTime = now;

      if (this.onGlobalTransform) {
        this.onGlobalTransform(now);
      }
    }

    // 더 이상 존재하지 않는 플레이어 정리
    for (const playerId of this.playerNextStates.keys()) {
      if (!playerIds.includes(playerId)) {
        this.playerNextStates.delete(playerId);
      }
    }

    return events;
  }

  /**
   * 타이머를 리셋합니다.
   */
  reset(): void {
    this.playerNextStates.clear();
    this.lastGlobalTransformTime = Date.now();
  }
}

/**
 * 주어진 샘플 수만큼 랜덤 상태를 생성하고 분포를 반환합니다.
 * (테스트용 유틸리티 함수)
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
