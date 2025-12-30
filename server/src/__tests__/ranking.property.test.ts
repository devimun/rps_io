/**
 * Property 11 테스트: 랭킹 정확성
 *
 * *For any* 플레이어 목록에 대해, 랭킹 시스템이 반환하는 상위 10명은
 * 점수 기준 내림차순으로 정렬되어야 하며, 점수 변경 후에도 이 순서가 유지되어야 한다.
 *
 * **Validates: Requirements 6.1, 6.2**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { calculateRanking, findPlayerRank, RankingSystem } from '../systems/RankingSystem';
import { Player as IPlayer, RPSState } from '@chaos-rps/shared';

/**
 * 테스트용 플레이어 생성
 */
function createTestPlayer(id: string, nickname: string, score: number): IPlayer {
  return {
    id,
    nickname,
    x: 0,
    y: 0,
    rpsState: RPSState.ROCK,
    score,
    size: 1,
    isBot: false,
    velocityX: 0,
    velocityY: 0,
  };
}

/**
 * 플레이어 Arbitrary
 */
const playerArb = fc.record({
  id: fc.uuid(),
  nickname: fc.string({ minLength: 1, maxLength: 12 }),
  score: fc.integer({ min: 0, max: 10000 }),
});

describe('Feature: chaos-rps-io, Property 11: 랭킹 정확성', () => {
  it('랭킹은 점수 기준 내림차순으로 정렬되어야 한다', () => {
    fc.assert(
      fc.property(
        fc.array(playerArb, { minLength: 1, maxLength: 30 }),
        (playerData) => {
          const players = playerData.map((p) => createTestPlayer(p.id, p.nickname, p.score));

          const ranking = calculateRanking(players, 10);

          // 내림차순 정렬 확인
          for (let i = 1; i < ranking.length; i++) {
            if (ranking[i].score > ranking[i - 1].score) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('랭킹은 최대 10명까지만 반환해야 한다', () => {
    fc.assert(
      fc.property(
        fc.array(playerArb, { minLength: 0, maxLength: 50 }),
        (playerData) => {
          const players = playerData.map((p) => createTestPlayer(p.id, p.nickname, p.score));

          const ranking = calculateRanking(players, 10);

          return ranking.length <= 10 && ranking.length <= players.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('랭킹의 rank 값은 1부터 순차적으로 증가해야 한다', () => {
    fc.assert(
      fc.property(
        fc.array(playerArb, { minLength: 1, maxLength: 20 }),
        (playerData) => {
          const players = playerData.map((p) => createTestPlayer(p.id, p.nickname, p.score));

          const ranking = calculateRanking(players, 10);

          for (let i = 0; i < ranking.length; i++) {
            if (ranking[i].rank !== i + 1) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('점수 변경 후에도 정렬 순서가 유지되어야 한다', () => {
    fc.assert(
      fc.property(
        fc.array(playerArb, { minLength: 2, maxLength: 20 }),
        fc.integer({ min: 0, max: 19 }),
        fc.integer({ min: 0, max: 10000 }),
        (playerData, changeIndex, newScore) => {
          const players = playerData.map((p) => createTestPlayer(p.id, p.nickname, p.score));

          // 점수 변경
          const idx = changeIndex % players.length;
          players[idx].score = newScore;

          const ranking = calculateRanking(players, 10);

          // 변경 후에도 내림차순 정렬 확인
          for (let i = 1; i < ranking.length; i++) {
            if (ranking[i].score > ranking[i - 1].score) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('상위 10명에 포함된 플레이어는 실제로 상위 점수를 가져야 한다', () => {
    fc.assert(
      fc.property(
        fc.array(playerArb, { minLength: 11, maxLength: 30 }),
        (playerData) => {
          const players = playerData.map((p) => createTestPlayer(p.id, p.nickname, p.score));

          const ranking = calculateRanking(players, 10);

          // 랭킹에 포함된 최저 점수
          const lowestRankedScore = ranking[ranking.length - 1].score;

          // 랭킹에 포함되지 않은 플레이어들의 점수
          const rankedIds = new Set(ranking.map((r) => r.playerId));
          const unrankedPlayers = players.filter((p) => !rankedIds.has(p.id));

          // 랭킹 외 플레이어들은 랭킹 내 최저 점수보다 낮거나 같아야 함
          return unrankedPlayers.every((p) => p.score <= lowestRankedScore);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('RankingSystem 단위 테스트', () => {
  let rankingSystem: RankingSystem;

  beforeEach(() => {
    rankingSystem = new RankingSystem({ maxRanks: 10 });
  });

  it('update는 랭킹을 계산하고 캐시한다', () => {
    const players = [
      createTestPlayer('1', 'Alice', 100),
      createTestPlayer('2', 'Bob', 200),
      createTestPlayer('3', 'Charlie', 150),
    ];

    const ranking = rankingSystem.update(players);

    expect(ranking.length).toBe(3);
    expect(ranking[0].nickname).toBe('Bob');
    expect(ranking[1].nickname).toBe('Charlie');
    expect(ranking[2].nickname).toBe('Alice');
  });

  it('getRanking은 캐시된 랭킹을 반환한다', () => {
    const players = [createTestPlayer('1', 'Alice', 100)];

    rankingSystem.update(players);
    const cached = rankingSystem.getRanking();

    expect(cached.length).toBe(1);
    expect(cached[0].nickname).toBe('Alice');
  });

  it('getPlayerRankingEntry는 특정 플레이어의 랭킹 엔트리를 반환한다', () => {
    const players = [
      createTestPlayer('1', 'Alice', 100),
      createTestPlayer('2', 'Bob', 200),
    ];

    rankingSystem.update(players);
    const entry = rankingSystem.getPlayerRankingEntry('1');

    expect(entry).not.toBeNull();
    expect(entry?.rank).toBe(2);
    expect(entry?.nickname).toBe('Alice');
  });

  it('findPlayerRank는 플레이어의 순위를 반환한다', () => {
    const players = [
      createTestPlayer('1', 'Alice', 100),
      createTestPlayer('2', 'Bob', 200),
      createTestPlayer('3', 'Charlie', 150),
    ];

    expect(findPlayerRank(players, '2')).toBe(1);
    expect(findPlayerRank(players, '3')).toBe(2);
    expect(findPlayerRank(players, '1')).toBe(3);
    expect(findPlayerRank(players, 'unknown')).toBeNull();
  });
});
