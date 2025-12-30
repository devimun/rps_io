/**
 * Property 9 테스트: 방 정원 유지
 *
 * *For any* 게임 방에 대해:
 * - 플레이어 수가 20명 미만이면 봇이 추가되어 20명을 유지해야 한다
 * - 실제 플레이어가 입장하면 봇이 제거되어 자리를 만들어야 한다
 * - 총 플레이어 수(실제 + 봇)는 항상 20명이어야 한다
 *
 * **Validates: Requirements 5.1, 5.2**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { BotManager } from '../managers/BotManager';

const MAX_PLAYERS = 20;

describe('Feature: chaos-rps-io, Property 9: 방 정원 유지', () => {
  it('플레이어 수가 20명 미만이면 봇이 추가되어 20명을 유지해야 한다', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 19 }), (realPlayerCount) => {
        const botManager = new BotManager({ maxPlayers: MAX_PLAYERS });

        botManager.adjustBotCount(realPlayerCount);

        const totalCount = realPlayerCount + botManager.getBotCount();
        return totalCount === MAX_PLAYERS;
      }),
      { numRuns: 100 }
    );
  });

  it('실제 플레이어가 입장하면 봇이 제거되어 자리를 만들어야 한다', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 19 }),
        fc.integer({ min: 1, max: 10 }),
        (initialRealPlayers, newPlayers) => {
          const botManager = new BotManager({ maxPlayers: MAX_PLAYERS });

          // 초기 상태 설정
          botManager.adjustBotCount(initialRealPlayers);
          const initialBotCount = botManager.getBotCount();

          // 새 플레이어 입장
          const newRealPlayerCount = Math.min(initialRealPlayers + newPlayers, MAX_PLAYERS);
          botManager.adjustBotCount(newRealPlayerCount);

          const newBotCount = botManager.getBotCount();
          const totalCount = newRealPlayerCount + newBotCount;

          // 총 인원은 항상 20명
          // 봇 수는 감소하거나 유지
          return totalCount === MAX_PLAYERS && newBotCount <= initialBotCount;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('총 플레이어 수(실제 + 봇)는 항상 20명이어야 한다', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -5, max: 5 }), { minLength: 1, maxLength: 20 }),
        (playerChanges) => {
          const botManager = new BotManager({ maxPlayers: MAX_PLAYERS });
          let realPlayerCount = 10; // 초기 플레이어 수

          for (const change of playerChanges) {
            realPlayerCount = Math.max(0, Math.min(MAX_PLAYERS, realPlayerCount + change));
            botManager.adjustBotCount(realPlayerCount);

            const totalCount = realPlayerCount + botManager.getBotCount();
            if (totalCount !== MAX_PLAYERS) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('실제 플레이어가 20명이면 봇은 0명이어야 한다', () => {
    fc.assert(
      fc.property(fc.constant(MAX_PLAYERS), (realPlayerCount) => {
        const botManager = new BotManager({ maxPlayers: MAX_PLAYERS });

        botManager.adjustBotCount(realPlayerCount);

        return botManager.getBotCount() === 0;
      }),
      { numRuns: 100 }
    );
  });

  it('실제 플레이어가 0명이면 봇은 20명이어야 한다', () => {
    fc.assert(
      fc.property(fc.constant(0), (realPlayerCount) => {
        const botManager = new BotManager({ maxPlayers: MAX_PLAYERS });

        botManager.adjustBotCount(realPlayerCount);

        return botManager.getBotCount() === MAX_PLAYERS;
      }),
      { numRuns: 100 }
    );
  });
});

describe('BotManager 단위 테스트', () => {
  let botManager: BotManager;

  beforeEach(() => {
    botManager = new BotManager({ maxPlayers: MAX_PLAYERS });
  });

  it('addBot은 새 봇을 추가하고 반환한다', () => {
    const bot = botManager.addBot();

    expect(bot).toBeDefined();
    expect(bot.isBot).toBe(true);
    expect(botManager.getBotCount()).toBe(1);
  });

  it('removeBot은 가장 오래된 봇을 제거한다', () => {
    const bot1 = botManager.addBot();
    botManager.addBot();
    botManager.addBot();

    const removed = botManager.removeBot();

    expect(removed?.id).toBe(bot1.id);
    expect(botManager.getBotCount()).toBe(2);
  });

  it('removeBotById는 특정 봇을 제거한다', () => {
    botManager.addBot();
    const bot2 = botManager.addBot();
    botManager.addBot();

    const removed = botManager.removeBotById(bot2.id);

    expect(removed?.id).toBe(bot2.id);
    expect(botManager.getBotCount()).toBe(2);
    expect(botManager.getBotById(bot2.id)).toBeUndefined();
  });

  it('getAllBots는 모든 봇을 반환한다', () => {
    botManager.addBot();
    botManager.addBot();
    botManager.addBot();

    const bots = botManager.getAllBots();

    expect(bots.length).toBe(3);
    expect(bots.every((b) => b.isBot)).toBe(true);
  });

  it('clear는 모든 봇을 제거한다', () => {
    botManager.addBot();
    botManager.addBot();

    botManager.clear();

    expect(botManager.getBotCount()).toBe(0);
    expect(botManager.getAllBots().length).toBe(0);
  });
});
