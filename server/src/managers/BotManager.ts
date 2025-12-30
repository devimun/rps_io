/**
 * 봇 매니저
 * 게임 룸의 봇 정원 유지 로직 담당
 * Requirements: 5.1, 5.2, 5.3
 */

import { BotEntity, generateBotName } from '../game/Bot';
import { generateSpawnPosition } from '../game/Player';

/** 봇 매니저 설정 */
export interface BotManagerConfig {
  /** 방 최대 정원 */
  maxPlayers: number;
  /** 월드 너비 */
  worldWidth: number;
  /** 월드 높이 */
  worldHeight: number;
  /** 스폰 여백 */
  spawnMargin: number;
}

/** 기본 설정 */
const DEFAULT_CONFIG: BotManagerConfig = {
  maxPlayers: 20,
  worldWidth: 2000,
  worldHeight: 2000,
  spawnMargin: 100,
};

/**
 * 봇 매니저 인터페이스
 * 룸에서 봇 관리에 필요한 메서드 정의
 */
export interface IBotManager {
  /** 봇 추가 */
  addBot(): BotEntity;
  /** 봇 제거 (가장 오래된 봇) */
  removeBot(): BotEntity | null;
  /** 정원 맞추기 (봇 추가/제거) */
  adjustBotCount(currentRealPlayerCount: number): BotEntity[];
  /** 현재 봇 수 */
  getBotCount(): number;
  /** 모든 봇 반환 */
  getAllBots(): BotEntity[];
}

/**
 * 봇 매니저 클래스
 * 20명 정원 유지를 위한 봇 추가/제거 로직
 */
export class BotManager implements IBotManager {
  private readonly config: BotManagerConfig;
  private bots: Map<string, BotEntity> = new Map();
  private botCreationOrder: string[] = []; // 생성 순서 추적

  constructor(config: Partial<BotManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 새 봇을 추가합니다.
   * @returns 생성된 봇 엔티티
   */
  addBot(): BotEntity {
    const name = generateBotName();
    const spawn = generateSpawnPosition(
      this.config.worldWidth,
      this.config.worldHeight,
      this.config.spawnMargin
    );

    const bot = new BotEntity(name, spawn.x, spawn.y);
    this.bots.set(bot.id, bot);
    this.botCreationOrder.push(bot.id);

    return bot;
  }

  /**
   * 가장 오래된 봇을 제거합니다.
   * @returns 제거된 봇 또는 null
   */
  removeBot(): BotEntity | null {
    if (this.botCreationOrder.length === 0) {
      return null;
    }

    // 가장 먼저 생성된 봇 제거
    const oldestBotId = this.botCreationOrder.shift()!;
    const bot = this.bots.get(oldestBotId);

    if (bot) {
      this.bots.delete(oldestBotId);
      return bot;
    }

    return null;
  }

  /**
   * 특정 봇을 ID로 제거합니다.
   * @param botId - 제거할 봇 ID
   * @returns 제거된 봇 또는 null
   */
  removeBotById(botId: string): BotEntity | null {
    const bot = this.bots.get(botId);
    if (!bot) return null;

    this.bots.delete(botId);
    this.botCreationOrder = this.botCreationOrder.filter((id) => id !== botId);

    return bot;
  }

  /**
   * 실제 플레이어 수에 맞춰 봇 수를 조정합니다.
   * 총 인원(실제 플레이어 + 봇)이 maxPlayers가 되도록 유지
   *
   * @param currentRealPlayerCount - 현재 실제 플레이어 수
   * @returns 추가된 봇 목록 (제거 시 빈 배열)
   */
  adjustBotCount(currentRealPlayerCount: number): BotEntity[] {
    const targetBotCount = Math.max(0, this.config.maxPlayers - currentRealPlayerCount);
    const currentBotCount = this.bots.size;
    const addedBots: BotEntity[] = [];

    if (currentBotCount < targetBotCount) {
      // 봇 추가 필요
      const botsToAdd = targetBotCount - currentBotCount;
      for (let i = 0; i < botsToAdd; i++) {
        addedBots.push(this.addBot());
      }
    } else if (currentBotCount > targetBotCount) {
      // 봇 제거 필요
      const botsToRemove = currentBotCount - targetBotCount;
      for (let i = 0; i < botsToRemove; i++) {
        this.removeBot();
      }
    }

    return addedBots;
  }

  /**
   * 현재 봇 수를 반환합니다.
   */
  getBotCount(): number {
    return this.bots.size;
  }

  /**
   * 모든 봇을 반환합니다.
   */
  getAllBots(): BotEntity[] {
    return Array.from(this.bots.values());
  }

  /**
   * 특정 봇을 ID로 조회합니다.
   */
  getBotById(botId: string): BotEntity | undefined {
    return this.bots.get(botId);
  }

  /**
   * 모든 봇을 제거합니다.
   */
  clear(): void {
    this.bots.clear();
    this.botCreationOrder = [];
  }

  /**
   * 설정을 반환합니다.
   */
  getConfig(): BotManagerConfig {
    return this.config;
  }
}
