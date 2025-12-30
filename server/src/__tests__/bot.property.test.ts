/**
 * Property 10 테스트: 봇 AI 의사결정
 *
 * *For any* 봇과 주변 플레이어 목록에 대해:
 * - 봇이 이길 수 있는 상대가 있으면 가장 가까운 약한 대상을 추격해야 한다
 * - 봇이 질 수 있는 상대만 있으면 가장 가까운 강한 대상으로부터 도주해야 한다
 *
 * **Validates: Requirements 5.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { makeBotDecision, BotDecision, generateBotName } from '../game/Bot';
import { RPSState, Player as IPlayer } from '@chaos-rps/shared';
import { canBeat } from '@chaos-rps/shared';

/**
 * 테스트용 플레이어 생성
 */
function createTestPlayer(
  id: string,
  x: number,
  y: number,
  rpsState: RPSState,
  isBot: boolean = false
): IPlayer {
  return {
    id,
    nickname: isBot ? 'Bot' : 'Player',
    x,
    y,
    rpsState,
    score: 0,
    size: 1,
    isBot,
    velocityX: 0,
    velocityY: 0,
  };
}

/**
 * 두 점 사이의 거리
 */
function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * RPS 상태 Arbitrary
 */
const rpsStateArb = fc.constantFrom(RPSState.ROCK, RPSState.PAPER, RPSState.SCISSORS);

/**
 * 위치 Arbitrary (감지 범위 내)
 */
const positionArb = fc.record({
  x: fc.float({ min: 0, max: 500, noNaN: true }),
  y: fc.float({ min: 0, max: 500, noNaN: true }),
});

describe('Feature: chaos-rps-io, Property 10: 봇 AI 의사결정', () => {
  it('이길 수 있는 상대가 있으면 가장 가까운 약한 대상을 추격해야 한다', () => {
    fc.assert(
      fc.property(
        rpsStateArb,
        positionArb,
        fc.array(positionArb, { minLength: 1, maxLength: 5 }),
        (botState, botPos, targetPositions) => {
          // 봇이 이길 수 있는 상태 결정
          const weakState =
            botState === RPSState.ROCK
              ? RPSState.SCISSORS
              : botState === RPSState.PAPER
                ? RPSState.ROCK
                : RPSState.PAPER;

          const bot = createTestPlayer('bot', botPos.x, botPos.y, botState, true);

          // 모든 타겟을 약한 상태로 설정
          const targets = targetPositions.map((pos, i) =>
            createTestPlayer(`target${i}`, pos.x, pos.y, weakState)
          );

          const decision = makeBotDecision(bot, targets, { detectionRange: 1000 } as never);

          // 추격 행동이어야 함
          if (decision.action !== 'chase') return false;

          // 가장 가까운 타겟 찾기
          let closestTarget = targets[0];
          let minDist = distance(bot.x, bot.y, closestTarget.x, closestTarget.y);
          for (const t of targets) {
            const d = distance(bot.x, bot.y, t.x, t.y);
            if (d < minDist) {
              minDist = d;
              closestTarget = t;
            }
          }

          // 타겟이 가장 가까운 대상이어야 함
          return decision.targetId === closestTarget.id;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('질 수 있는 상대만 있으면 가장 가까운 강한 대상으로부터 도주해야 한다', () => {
    fc.assert(
      fc.property(
        rpsStateArb,
        positionArb,
        fc.array(positionArb, { minLength: 1, maxLength: 5 }),
        (botState, botPos, targetPositions) => {
          // 봇이 지는 상태 결정
          const strongState =
            botState === RPSState.ROCK
              ? RPSState.PAPER
              : botState === RPSState.PAPER
                ? RPSState.SCISSORS
                : RPSState.ROCK;

          const bot = createTestPlayer('bot', botPos.x, botPos.y, botState, true);

          // 모든 타겟을 강한 상태로 설정
          const targets = targetPositions.map((pos, i) =>
            createTestPlayer(`target${i}`, pos.x, pos.y, strongState)
          );

          const decision = makeBotDecision(bot, targets, { detectionRange: 1000 } as never);

          // 도주 행동이어야 함
          if (decision.action !== 'flee') return false;

          // 가장 가까운 타겟 찾기
          let closestTarget = targets[0];
          let minDist = distance(bot.x, bot.y, closestTarget.x, closestTarget.y);
          for (const t of targets) {
            const d = distance(bot.x, bot.y, t.x, t.y);
            if (d < minDist) {
              minDist = d;
              closestTarget = t;
            }
          }

          // 타겟이 가장 가까운 대상이어야 함
          return decision.targetId === closestTarget.id;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('무승부 상대만 있으면 대기해야 한다', () => {
    fc.assert(
      fc.property(rpsStateArb, positionArb, positionArb, (state, botPos, targetPos) => {
        const bot = createTestPlayer('bot', botPos.x, botPos.y, state, true);
        const target = createTestPlayer('target', targetPos.x, targetPos.y, state);

        const decision = makeBotDecision(bot, [target], { detectionRange: 1000 } as never);

        return decision.action === 'idle';
      }),
      { numRuns: 100 }
    );
  });

  it('주변에 아무도 없으면 대기해야 한다', () => {
    fc.assert(
      fc.property(rpsStateArb, positionArb, (state, botPos) => {
        const bot = createTestPlayer('bot', botPos.x, botPos.y, state, true);

        const decision = makeBotDecision(bot, []);

        return decision.action === 'idle' && decision.targetId === null;
      }),
      { numRuns: 100 }
    );
  });

  it('이길 수 있는 상대와 질 수 있는 상대가 모두 있으면 추격을 우선해야 한다', () => {
    fc.assert(
      fc.property(rpsStateArb, positionArb, positionArb, positionArb, (botState, botPos, weakPos, strongPos) => {
        const weakState =
          botState === RPSState.ROCK
            ? RPSState.SCISSORS
            : botState === RPSState.PAPER
              ? RPSState.ROCK
              : RPSState.PAPER;

        const strongState =
          botState === RPSState.ROCK
            ? RPSState.PAPER
            : botState === RPSState.PAPER
              ? RPSState.SCISSORS
              : RPSState.ROCK;

        const bot = createTestPlayer('bot', botPos.x, botPos.y, botState, true);
        const weakTarget = createTestPlayer('weak', weakPos.x, weakPos.y, weakState);
        const strongTarget = createTestPlayer('strong', strongPos.x, strongPos.y, strongState);

        const decision = makeBotDecision(bot, [weakTarget, strongTarget], {
          detectionRange: 1000,
        } as never);

        // 추격 행동이어야 하고, 약한 대상을 타겟으로 해야 함
        return decision.action === 'chase' && decision.targetId === 'weak';
      }),
      { numRuns: 100 }
    );
  });
});

describe('봇 유틸리티 단위 테스트', () => {
  it('generateBotName은 유효한 봇 이름을 생성한다', () => {
    for (let i = 0; i < 10; i++) {
      const name = generateBotName();
      expect(name.length).toBeGreaterThan(0);
      expect(name).toMatch(/^(Bot|AI|NPC|CPU)(Alpha|Beta|Gamma|Delta|Omega)\d+$/);
    }
  });

  it('canBeat 함수가 올바르게 동작한다', () => {
    expect(canBeat(RPSState.ROCK, RPSState.SCISSORS)).toBe(true);
    expect(canBeat(RPSState.SCISSORS, RPSState.PAPER)).toBe(true);
    expect(canBeat(RPSState.PAPER, RPSState.ROCK)).toBe(true);
    expect(canBeat(RPSState.ROCK, RPSState.PAPER)).toBe(false);
    expect(canBeat(RPSState.ROCK, RPSState.ROCK)).toBe(false);
  });
});
