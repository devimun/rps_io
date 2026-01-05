/**
 * 게임 룸 클래스
 * 하나의 게임 세션을 관리합니다.
 */

import {
  GameRoom as IGameRoom,
  GameStateUpdate,
  CollisionResult,
  determineCollisionResult,
  RPSState,
} from '@chaos-rps/shared';
import {
  ROOM_MAX_PLAYERS,
  TRANSFORM_INTERVAL_MS,
  GAME_TICK_RATE,
  WORLD_SIZE,
} from '@chaos-rps/shared';
import { PlayerEntity } from './Player';
import { BotEntity, generateBotName, releaseBotName } from './Bot';
import { TransformSystem } from '../systems/TransformSystem';
import { checkCollision } from '../systems/CollisionSystem';
import { MovementSystem, WorldBounds } from '../systems/MovementSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { DashSystem, DashEvent } from '../systems/DashSystem';
import { calculateRanking, RankingEntry } from '../systems/RankingSystem';
import { spatialHashGrid } from '../systems/SpatialHashGrid';

const WORLD_WIDTH = WORLD_SIZE;
const WORLD_HEIGHT = WORLD_SIZE;
const WORLD_BOUNDS: WorldBounds = { minX: 0, maxX: WORLD_WIDTH, minY: 0, maxY: WORLD_HEIGHT };
const TICK_INTERVAL_MS = 1000 / GAME_TICK_RATE;

/** 킬 피드 이벤트 데이터 */
export interface KillFeedData {
  id: string;
  winnerId: string;
  winnerNickname: string;
  winnerRpsState: RPSState;
  loserId: string;
  loserNickname: string;
  loserRpsState: RPSState;
}

export class GameRoomEntity implements IGameRoom {
  readonly id: string;
  readonly code: string;
  readonly isPublic: boolean;
  readonly fillWithBots: boolean;
  readonly maxPlayers: number;
  readonly transformInterval: number;
  readonly createdAt: number;

  private players: Map<string, PlayerEntity> = new Map();
  private transformSystem: TransformSystem;
  private movementSystem: MovementSystem;
  private spawnSystem: SpawnSystem;
  private dashSystem: DashSystem;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private lastTickTime: number = 0;
  private lastBroadcastTime: number = 0;
  private readonly BROADCAST_INTERVAL = 50; // 20Hz 네트워크 동기화 (50ms)
  private lastRankingUpdate: number = 0;
  private readonly RANKING_UPDATE_INTERVAL = 1000; // 1초마다 랭킹 업데이트
  private onStateChange?: (state: GameStateUpdate) => void;
  private onPlayerEliminated?: (winnerId: string, loserId: string, winnerRpsState: RPSState, loserRpsState: RPSState, loserKillCount: number) => void;
  private onDashEvent?: (event: DashEvent) => void;
  private onKillFeed?: (data: KillFeedData) => void;
  private onRankingUpdate?: (rankings: RankingEntry[]) => void;

  constructor(id: string, code: string, options: { isPublic?: boolean; fillWithBots?: boolean } = {}) {
    this.id = id;
    this.code = code;
    this.isPublic = options.isPublic ?? false;
    this.fillWithBots = options.fillWithBots ?? true;
    this.maxPlayers = ROOM_MAX_PLAYERS;
    this.transformInterval = TRANSFORM_INTERVAL_MS;
    this.createdAt = Date.now();
    this.transformSystem = new TransformSystem();
    this.movementSystem = new MovementSystem(WORLD_BOUNDS);
    this.spawnSystem = new SpawnSystem(WORLD_WIDTH, WORLD_HEIGHT);
    this.dashSystem = new DashSystem();
  }

  setOnStateChange(callback: (state: GameStateUpdate) => void): void { this.onStateChange = callback; }
  setOnPlayerEliminated(callback: (winnerId: string, loserId: string, winnerRpsState: RPSState, loserRpsState: RPSState, loserKillCount: number) => void): void { this.onPlayerEliminated = callback; }
  setOnDashEvent(callback: (event: DashEvent) => void): void { this.onDashEvent = callback; }
  setOnKillFeed(callback: (data: KillFeedData) => void): void { this.onKillFeed = callback; }
  setOnRankingUpdate(callback: (rankings: RankingEntry[]) => void): void { this.onRankingUpdate = callback; }

  addPlayer(nickname: string, isBot: boolean = false): PlayerEntity | null {
    // 실제 유저 입장 시 봇 1명 퇴장 (봇 스위칭)
    if (!isBot && this.players.size >= this.maxPlayers) {
      const botToRemove = this.findBotToRemove();
      if (botToRemove) {
        this.removePlayer(botToRemove.id);
      } else {
        return null; // 봇도 없고 정원 초과
      }
    } else if (this.players.size >= this.maxPlayers) {
      return null;
    }

    // 격자 기반 스폰 시스템으로 안전한 위치 찾기
    const existingPlayers = this.getPlayers().map(p => p.toJSON());
    const spawnPos = this.spawnSystem.findSafeSpawnPosition(existingPlayers);
    const player = new PlayerEntity({ nickname, isBot }, spawnPos.x, spawnPos.y);
    this.players.set(player.id, player);
    return player;
  }

  /** 퇴장시킬 봇을 찾습니다 (킬 수가 가장 낮은 봇) */
  private findBotToRemove(): PlayerEntity | null {
    let lowestKillBot: PlayerEntity | null = null;
    for (const player of this.players.values()) {
      if (player.isBot) {
        if (!lowestKillBot || player.killCount < lowestKillBot.killCount) {
          lowestKillBot = player;
        }
      }
    }
    return lowestKillBot;
  }

  removePlayer(playerId: string): boolean {
    const player = this.players.get(playerId);
    // 봇이면 닉네임 해제
    if (player && player.isBot) {
      releaseBotName(player.nickname);
    }
    this.movementSystem.removeInput(playerId);
    this.dashSystem.removePlayer(playerId);
    return this.players.delete(playerId);
  }

  getPlayer(playerId: string): PlayerEntity | undefined { return this.players.get(playerId); }
  getPlayers(): PlayerEntity[] { return Array.from(this.players.values()); }
  getPlayerCount(): number { return this.players.size; }
  getRealPlayerCount(): number { return this.getPlayers().filter(p => !p.isBot).length; }
  isFull(): boolean { return this.players.size >= this.maxPlayers; }
  isEmpty(): boolean { return this.players.size === 0; }

  /** 봇으로 정원을 채웁니다 */
  fillBotsToCapacity(): void {
    const botsNeeded = this.maxPlayers - this.players.size;
    for (let i = 0; i < botsNeeded; i++) {
      const botName = generateBotName();
      // 격자 기반 스폰 시스템으로 안전한 위치 찾기
      const existingPlayers = this.getPlayers().map(p => p.toJSON());
      const spawnPos = this.spawnSystem.findSafeSpawnPosition(existingPlayers);
      const bot = new BotEntity(botName, spawnPos.x, spawnPos.y);
      this.players.set(bot.id, bot);
    }
    console.log(`🤖 봇 ${botsNeeded}명 추가됨 (총 ${this.players.size}명)`);
  }

  startGameLoop(): void {
    if (this.tickTimer !== null) return;
    this.lastTickTime = Date.now(); // 초기화로 첫 틱에서 순간이동 방지
    this.tickTimer = setInterval(() => this.tick(), TICK_INTERVAL_MS);
  }

  stopGameLoop(): void {
    if (this.tickTimer !== null) { clearInterval(this.tickTimer); this.tickTimer = null; }
  }

  handlePlayerMove(playerId: string, angle: number, isMoving: boolean): void {
    this.movementSystem.setInput(playerId, { angle, isMoving, timestamp: Date.now() });
  }

  /** 플레이어 대시 처리 */
  handlePlayerDash(playerId: string): boolean {
    const success = this.dashSystem.startDash(playerId);
    if (success && this.onDashEvent) {
      this.onDashEvent({
        playerId,
        type: 'start',
        timestamp: Date.now(),
      });
    }
    return success;
  }

  /** 플레이어의 대시 상태 조회 */
  getDashState(playerId: string) {
    return this.dashSystem.getDashState(playerId);
  }

  private tick(): void {
    const now = Date.now();
    // 실제 경과 시간 기반 deltaTime (최대 100ms로 제한 - 순간이동 방지)
    const actualDelta = (now - this.lastTickTime) / 1000;
    const deltaTime = Math.min(actualDelta, 0.1); // 최대 100ms
    this.lastTickTime = now;

    // 물리 연산 (60Hz)
    this.updateBotAI(now);
    this.updateDash();
    this.movementSystem.update(this.getPlayers(), deltaTime, (id) => this.dashSystem.getSpeedMultiplier(id));
    this.updateTransforms();
    this.checkCollisions();
    this.maintainBotCount();

    // 네트워크 브로드캐스트 (20Hz - 50ms 간격)
    if (now - this.lastBroadcastTime >= this.BROADCAST_INTERVAL) {
      this.lastBroadcastTime = now;
      this.broadcastState();
      this.updateRanking(now);
    }
  }

  /** 봇 수를 유지합니다 (20명 유지) */
  private maintainBotCount(): void {
    if (!this.fillWithBots) return;

    const currentCount = this.players.size;
    if (currentCount < this.maxPlayers) {
      // 한 틱에 1명씩만 추가 (급격한 변화 방지)
      const botName = generateBotName();
      const existingPlayers = this.getPlayers().map(p => p.toJSON());
      const spawnPos = this.spawnSystem.findSafeSpawnPosition(existingPlayers);
      const bot = new BotEntity(botName, spawnPos.x, spawnPos.y);
      this.players.set(bot.id, bot);
    }
  }

  /** 랭킹 업데이트 */
  private updateRanking(now: number): void {
    if (now - this.lastRankingUpdate < this.RANKING_UPDATE_INTERVAL) return;
    this.lastRankingUpdate = now;

    const players = this.getPlayers().map(p => p.toJSON());
    const rankings = calculateRanking(players, 10);
    this.onRankingUpdate?.(rankings);
  }

  /** 대시 상태 업데이트 */
  private updateDash(): void {
    const playerIds = this.getPlayers().map(p => p.id);
    const events = this.dashSystem.updateAll(playerIds);
    for (const event of events) {
      this.onDashEvent?.(event);
    }
  }

  /** 봇 AI 업데이트 */
  private updateBotAI(currentTime: number): void {
    const allPlayers = this.getPlayers();
    for (const player of allPlayers) {
      if (player instanceof BotEntity) {
        player.updateAI(allPlayers.map(p => p.toJSON()), currentTime);
        const decision = player.getDecision();
        // 방향 벡터에서 각도 계산
        const angle = Math.atan2(decision.direction.y, decision.direction.x);
        const isMoving = decision.action !== 'idle' ||
          (decision.direction.x !== 0 || decision.direction.y !== 0);
        this.movementSystem.setInput(player.id, { angle, isMoving, timestamp: currentTime });
      }
    }
  }

  private updateTransforms(): void {
    const playerIds = this.getPlayers().map(p => p.id);
    const events = this.transformSystem.update(playerIds);

    // 변신 이벤트 처리
    for (const event of events) {
      const player = this.players.get(event.playerId);
      if (player) player.setRPSState(event.newState);
    }

    // 모든 플레이어의 lastTransformTime을 전역 시간으로 설정
    const lastGlobalTime = this.transformSystem.getLastGlobalTransformTime();
    for (const player of this.players.values()) {
      player.lastTransformTime = lastGlobalTime;
    }
  }

  private checkCollisions(): void {
    const players = this.getPlayers();
    const toRemove: string[] = [];

    // Spatial Hash Grid로 O(n) 충돌 검사
    const potentialPairs = spatialHashGrid.getPotentialCollisionPairs(players);

    for (const [p1, p2] of potentialPairs) {
      if (toRemove.includes(p1.id) || toRemove.includes(p2.id)) continue;

      if (!checkCollision(p1, p2)) continue;

      const result = determineCollisionResult(p1.rpsState, p2.rpsState);
      this.handleCollisionResult(p1 as PlayerEntity, p2 as PlayerEntity, result, toRemove);
    }

    for (const id of toRemove) { this.movementSystem.removeInput(id); this.players.delete(id); }
  }

  private handleCollisionResult(p1: PlayerEntity, p2: PlayerEntity, result: CollisionResult, toRemove: string[]): void {
    switch (result) {
      case CollisionResult.WIN:
        p1.addKill(); // 킬 수 증가 (크기도 자동 증가)
        toRemove.push(p2.id);
        this.onPlayerEliminated?.(p1.id, p2.id, p1.rpsState, p2.rpsState, p2.killCount);
        this.emitKillFeed(p1, p2);
        break;
      case CollisionResult.LOSE:
        p2.addKill(); // 킬 수 증가 (크기도 자동 증가)
        toRemove.push(p1.id);
        this.onPlayerEliminated?.(p2.id, p1.id, p2.rpsState, p1.rpsState, p1.killCount);
        this.emitKillFeed(p2, p1);
        break;
      case CollisionResult.DRAW:
        this.applyKnockback(p1, p2);
        break;
    }
  }

  /** 킬 피드 이벤트 발생 */
  private emitKillFeed(winner: PlayerEntity, loser: PlayerEntity): void {
    if (!this.onKillFeed) return;
    this.onKillFeed({
      id: `kill_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      winnerId: winner.id,
      winnerNickname: winner.nickname,
      winnerRpsState: winner.rpsState,
      loserId: loser.id,
      loserNickname: loser.nickname,
      loserRpsState: loser.rpsState,
    });
  }

  private applyKnockback(p1: PlayerEntity, p2: PlayerEntity): void {
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
    const knockbackForce = 50, nx = dx / distance, ny = dy / distance;
    p1.setPosition(this.clampX(p1.x - nx * knockbackForce, p1.size), this.clampY(p1.y - ny * knockbackForce, p1.size));
    p2.setPosition(this.clampX(p2.x + nx * knockbackForce, p2.size), this.clampY(p2.y + ny * knockbackForce, p2.size));
  }

  private clampX(x: number, size: number): number { return Math.max(size, Math.min(WORLD_WIDTH - size, x)); }
  private clampY(y: number, size: number): number { return Math.max(size, Math.min(WORLD_HEIGHT - size, y)); }

  private broadcastState(): void {
    if (!this.onStateChange) return;

    // 각 플레이어의 nextRpsState 포함
    const playersWithNext = this.getPlayers().map(p => {
      const json = p.toJSON();
      // 자기 자신의 다음 상태 포함 (다른 플레이어 것은 클라이언트에서 필터링)
      json.nextRpsState = this.transformSystem.getNextState(p.id);
      return json;
    });

    // [1.4.5] 다음 변신까지 남은 시간 포함
    const transformTimeRemaining = this.transformSystem.getTimeUntilNextTransform();

    this.onStateChange({ players: playersWithNext, timestamp: Date.now(), transformTimeRemaining });
  }

  toJSON(): IGameRoom {
    return { id: this.id, code: this.code, isPublic: this.isPublic, fillWithBots: this.fillWithBots, maxPlayers: this.maxPlayers, transformInterval: this.transformInterval, createdAt: this.createdAt };
  }
}
