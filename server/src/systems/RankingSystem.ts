/**
 * 랭킹 시스템
 * 상위 10명 계산 및 실시간 업데이트
 * Requirements: 6.1, 6.2
 */

import { Player as IPlayer } from '@chaos-rps/shared';

/** 킬 수를 포함한 플레이어 인터페이스 (서버 내부용) */
interface PlayerWithKills extends IPlayer {
  killCount?: number;
}

/** 랭킹 엔트리 */
export interface RankingEntry {
  /** 플레이어 ID */
  playerId: string;
  /** 닉네임 */
  nickname: string;
  /** 킬 수 */
  killCount: number;
  /** 순위 (1부터 시작) */
  rank: number;
}

/** 랭킹 시스템 설정 */
export interface RankingConfig {
  /** 표시할 최대 순위 */
  maxRanks: number;
}

/** 기본 설정 */
const DEFAULT_CONFIG: RankingConfig = {
  maxRanks: 10,
};

/**
 * 플레이어 목록에서 상위 N명의 랭킹을 계산합니다.
 *
 * @param players - 플레이어 목록
 * @param maxRanks - 최대 순위 수
 * @returns 킬 수 기준 내림차순 정렬된 랭킹 목록
 */
export function calculateRanking(players: PlayerWithKills[], maxRanks: number = 10): RankingEntry[] {
  // 킬 수 기준 내림차순 정렬
  const sorted = [...players].sort((a, b) => (b.killCount ?? 0) - (a.killCount ?? 0));

  // 상위 N명만 추출하고 랭킹 엔트리로 변환
  return sorted.slice(0, maxRanks).map((player, index) => ({
    playerId: player.id,
    nickname: player.nickname,
    killCount: player.killCount ?? 0,
    rank: index + 1,
  }));
}

/**
 * 특정 플레이어의 순위를 찾습니다.
 *
 * @param players - 플레이어 목록
 * @param playerId - 찾을 플레이어 ID
 * @returns 순위 (1부터 시작) 또는 null (찾지 못한 경우)
 */
export function findPlayerRank(players: PlayerWithKills[], playerId: string): number | null {
  const sorted = [...players].sort((a, b) => (b.killCount ?? 0) - (a.killCount ?? 0));
  const index = sorted.findIndex((p) => p.id === playerId);
  return index >= 0 ? index + 1 : null;
}

/**
 * 랭킹 시스템 클래스
 * 플레이어 목록을 관리하고 실시간 랭킹 업데이트 제공
 */
export class RankingSystem {
  private readonly config: RankingConfig;
  private cachedRanking: RankingEntry[] = [];
  private lastUpdateTime: number = 0;

  constructor(config: Partial<RankingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 플레이어 목록으로 랭킹을 업데이트합니다.
   *
   * @param players - 현재 플레이어 목록
   * @returns 업데이트된 랭킹 목록
   */
  update(players: PlayerWithKills[]): RankingEntry[] {
    this.cachedRanking = calculateRanking(players, this.config.maxRanks);
    this.lastUpdateTime = Date.now();
    return this.cachedRanking;
  }

  /**
   * 현재 캐시된 랭킹을 반환합니다.
   */
  getRanking(): RankingEntry[] {
    return this.cachedRanking;
  }

  /**
   * 특정 플레이어가 상위 랭킹에 있는지 확인합니다.
   *
   * @param playerId - 플레이어 ID
   * @returns 랭킹 엔트리 또는 null
   */
  getPlayerRankingEntry(playerId: string): RankingEntry | null {
    return this.cachedRanking.find((entry) => entry.playerId === playerId) ?? null;
  }

  /**
   * 마지막 업데이트 시간을 반환합니다.
   */
  getLastUpdateTime(): number {
    return this.lastUpdateTime;
  }

  /**
   * 설정을 반환합니다.
   */
  getConfig(): RankingConfig {
    return this.config;
  }
}
