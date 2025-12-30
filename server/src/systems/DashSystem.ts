/**
 * 대시 시스템
 * 플레이어의 순간 가속(대시) 기능을 관리합니다.
 * slither.io 스타일의 부스트 기능을 구현합니다.
 */

import {
  DASH_SPEED_MULTIPLIER,
  DASH_DURATION_MS,
  DASH_COOLDOWN_MS,
} from '@chaos-rps/shared';

/** 대시 상태 인터페이스 */
export interface DashState {
  /** 대시 중 여부 */
  isDashing: boolean;
  /** 대시 종료 시간 (타임스탬프) */
  dashEndTime: number;
  /** 쿨다운 종료 시간 (타임스탬프) */
  cooldownEndTime: number;
}

/** 대시 이벤트 타입 */
export type DashEventType = 'start' | 'end' | 'cooldown_end';

/** 대시 이벤트 인터페이스 */
export interface DashEvent {
  playerId: string;
  type: DashEventType;
  timestamp: number;
}

/**
 * 대시 시스템 클래스
 * 각 플레이어의 대시 상태를 관리하고 속도 배율을 계산합니다.
 */
export class DashSystem {
  /** 플레이어별 대시 상태 맵 */
  private dashStates: Map<string, DashState> = new Map();

  /**
   * 대시를 시작합니다.
   * @param playerId - 플레이어 ID
   * @returns 대시 시작 성공 여부
   */
  startDash(playerId: string): boolean {
    const now = Date.now();
    const state = this.dashStates.get(playerId);

    // 쿨다운 중이면 대시 불가
    if (state && now < state.cooldownEndTime) {
      return false;
    }

    // 이미 대시 중이면 무시
    if (state?.isDashing) {
      return false;
    }

    // 대시 시작
    this.dashStates.set(playerId, {
      isDashing: true,
      dashEndTime: now + DASH_DURATION_MS,
      cooldownEndTime: 0,
    });

    return true;
  }

  /**
   * 대시를 종료합니다.
   * @param playerId - 플레이어 ID
   */
  endDash(playerId: string): void {
    const state = this.dashStates.get(playerId);
    if (!state || !state.isDashing) return;

    state.isDashing = false;
    state.cooldownEndTime = Date.now() + DASH_COOLDOWN_MS;
  }

  /**
   * 대시 상태를 업데이트합니다.
   * 대시 시간이 끝났으면 자동으로 종료합니다.
   * @param playerId - 플레이어 ID
   * @returns 발생한 대시 이벤트 (없으면 null)
   */
  update(playerId: string): DashEvent | null {
    const state = this.dashStates.get(playerId);
    if (!state) return null;

    const now = Date.now();

    // 대시 자동 종료 체크
    if (state.isDashing && now >= state.dashEndTime) {
      state.isDashing = false;
      state.cooldownEndTime = now + DASH_COOLDOWN_MS;
      return {
        playerId,
        type: 'end',
        timestamp: now,
      };
    }

    return null;
  }

  /**
   * 모든 플레이어의 대시 상태를 업데이트합니다.
   * @param playerIds - 플레이어 ID 목록
   * @returns 발생한 대시 이벤트 목록
   */
  updateAll(playerIds: string[]): DashEvent[] {
    const events: DashEvent[] = [];

    for (const playerId of playerIds) {
      const event = this.update(playerId);
      if (event) {
        events.push(event);
      }
    }

    return events;
  }

  /**
   * 플레이어가 쿨다운 중인지 확인합니다.
   * @param playerId - 플레이어 ID
   * @returns 쿨다운 중 여부
   */
  isOnCooldown(playerId: string): boolean {
    const state = this.dashStates.get(playerId);
    if (!state) return false;
    return Date.now() < state.cooldownEndTime;
  }

  /**
   * 플레이어가 대시 중인지 확인합니다.
   * @param playerId - 플레이어 ID
   * @returns 대시 중 여부
   */
  isDashing(playerId: string): boolean {
    const state = this.dashStates.get(playerId);
    return state?.isDashing ?? false;
  }

  /**
   * 플레이어의 대시 상태를 반환합니다.
   * @param playerId - 플레이어 ID
   * @returns 대시 상태 (없으면 기본값)
   */
  getDashState(playerId: string): DashState {
    return this.dashStates.get(playerId) ?? {
      isDashing: false,
      dashEndTime: 0,
      cooldownEndTime: 0,
    };
  }

  /**
   * 플레이어의 속도 배율을 반환합니다.
   * @param playerId - 플레이어 ID
   * @returns 속도 배율 (대시 중이면 2배, 아니면 1배)
   */
  getSpeedMultiplier(playerId: string): number {
    return this.isDashing(playerId) ? DASH_SPEED_MULTIPLIER : 1;
  }

  /**
   * 남은 쿨다운 시간을 반환합니다.
   * @param playerId - 플레이어 ID
   * @returns 남은 쿨다운 시간 (밀리초, 0이면 쿨다운 없음)
   */
  getRemainingCooldown(playerId: string): number {
    const state = this.dashStates.get(playerId);
    if (!state) return 0;

    const remaining = state.cooldownEndTime - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * 플레이어의 대시 상태를 제거합니다.
   * @param playerId - 플레이어 ID
   */
  removePlayer(playerId: string): void {
    this.dashStates.delete(playerId);
  }

  /**
   * 모든 대시 상태를 초기화합니다.
   */
  reset(): void {
    this.dashStates.clear();
  }
}

/** 기본 대시 시스템 인스턴스 */
export const dashSystem = new DashSystem();
