/**
 * 봇 클래스
 * AI 행동 로직을 포함한 봇 플레이어 구현
 * Requirements: 5.4
 */

import { Player as IPlayer } from '@chaos-rps/shared';
import { canBeat, SPAWN_INVINCIBILITY_MS } from '@chaos-rps/shared';
import { PlayerEntity } from './Player';

/** 봇 AI 설정 */
export interface BotConfig {
  /** 추격 속도 배율 (0~1) */
  chaseSpeedMultiplier: number;
  /** 도주 속도 배율 (0~1) */
  fleeSpeedMultiplier: number;
  /** 타겟 감지 범위 */
  detectionRange: number;
  /** 행동 업데이트 간격 (ms) */
  updateInterval: number;
}

/** 기본 봇 설정 */
const DEFAULT_BOT_CONFIG: BotConfig = {
  chaseSpeedMultiplier: 0.8,
  fleeSpeedMultiplier: 1.0,
  detectionRange: 500, // 감지 범위 확대
  updateInterval: 100,
};

/** 봇 AI 의사결정 결과 */
export interface BotDecision {
  /** 행동 타입 */
  action: 'chase' | 'flee' | 'idle';
  /** 타겟 플레이어 ID (있는 경우) */
  targetId: string | null;
  /** 이동 방향 벡터 (정규화됨) */
  direction: { x: number; y: number };
}

/**
 * 두 점 사이의 거리를 계산합니다.
 */
function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 방향 벡터를 정규화합니다.
 */
function normalize(x: number, y: number): { x: number; y: number } {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

/**
 * 플레이어가 무적 상태인지 확인합니다.
 */
function isPlayerInvincible(player: IPlayer): boolean {
  if (!player.spawnTime) return false;
  return Date.now() - player.spawnTime < SPAWN_INVINCIBILITY_MS;
}

/**
 * 봇 AI 의사결정 함수
 * 주변 플레이어를 분석하여 추격/도주/배회 결정
 * 무적 상태인 플레이어는 무시합니다.
 *
 * @param bot - 봇 플레이어
 * @param nearbyPlayers - 주변 플레이어 목록
 * @param config - 봇 설정
 * @returns 봇 의사결정 결과
 */
export function makeBotDecision(
  bot: IPlayer,
  nearbyPlayers: IPlayer[],
  config: BotConfig = DEFAULT_BOT_CONFIG
): BotDecision {
  // 감지 범위 내 플레이어 필터링 (무적 플레이어 제외)
  const playersInRange = nearbyPlayers.filter(
    (p) => p.id !== bot.id && 
           distance(bot.x, bot.y, p.x, p.y) <= config.detectionRange &&
           !isPlayerInvincible(p)
  );

  // 이길 수 있는 대상 (약한 대상) 찾기
  const weakTargets = playersInRange.filter((p) => canBeat(bot.rpsState, p.rpsState));

  // 질 수 있는 대상 (강한 대상) 찾기
  const strongTargets = playersInRange.filter((p) => canBeat(p.rpsState, bot.rpsState));

  // 1. 이길 수 있는 대상이 있으면 가장 가까운 대상 추격
  if (weakTargets.length > 0) {
    const closest = findClosestPlayer(bot, weakTargets);
    const dir = normalize(closest.x - bot.x, closest.y - bot.y);
    return {
      action: 'chase',
      targetId: closest.id,
      direction: dir,
    };
  }

  // 2. 질 수 있는 대상만 있으면 가장 가까운 대상으로부터 도주
  if (strongTargets.length > 0) {
    const closest = findClosestPlayer(bot, strongTargets);
    // 반대 방향으로 도주
    const dir = normalize(bot.x - closest.x, bot.y - closest.y);
    return {
      action: 'flee',
      targetId: closest.id,
      direction: dir,
    };
  }

  // 3. 주변에 아무도 없거나 무승부 대상만 있으면 랜덤 배회
  const randomAngle = Math.random() * Math.PI * 2;
  return {
    action: 'idle',
    targetId: null,
    direction: { x: Math.cos(randomAngle), y: Math.sin(randomAngle) },
  };
}

/**
 * 가장 가까운 플레이어를 찾습니다.
 */
function findClosestPlayer(bot: IPlayer, players: IPlayer[]): IPlayer {
  let closest = players[0];
  let minDist = distance(bot.x, bot.y, closest.x, closest.y);

  for (let i = 1; i < players.length; i++) {
    const dist = distance(bot.x, bot.y, players[i].x, players[i].y);
    if (dist < minDist) {
      minDist = dist;
      closest = players[i];
    }
  }

  return closest;
}

/**
 * 봇 엔티티 클래스
 * PlayerEntity를 확장하여 AI 행동 로직 추가
 */
export class BotEntity extends PlayerEntity {
  private readonly config: BotConfig;
  private lastDecisionTime: number = 0;
  private currentDecision: BotDecision = {
    action: 'idle',
    targetId: null,
    direction: { x: 0, y: 0 },
  };
  /** 배회 방향 변경 간격 (ms) */
  private wanderChangeInterval: number = 2000;
  private lastWanderChange: number = 0;

  constructor(nickname: string, spawnX: number, spawnY: number, config?: Partial<BotConfig>) {
    super({ nickname, isBot: true }, spawnX, spawnY);
    this.config = { ...DEFAULT_BOT_CONFIG, ...config };
    // 봇마다 다른 배회 패턴을 위해 랜덤 오프셋
    this.lastWanderChange = Date.now() - Math.random() * this.wanderChangeInterval;
    
    // 초기 점수 부여 (0~50 랜덤) - 게임이 진행 중인 느낌을 주기 위함
    const initialScore = Math.floor(Math.random() * 51);
    this.addScore(initialScore);
  }

  /**
   * 봇 AI 업데이트
   * @param nearbyPlayers - 주변 플레이어 목록
   * @param currentTime - 현재 시간 (ms)
   */
  updateAI(nearbyPlayers: IPlayer[], currentTime: number): void {
    // 업데이트 간격 체크
    if (currentTime - this.lastDecisionTime < this.config.updateInterval) {
      return;
    }

    this.lastDecisionTime = currentTime;
    const newDecision = makeBotDecision(this.toJSON(), nearbyPlayers, this.config);
    
    // idle 상태일 때 배회 방향 유지 (일정 시간마다 변경)
    if (newDecision.action === 'idle') {
      if (currentTime - this.lastWanderChange > this.wanderChangeInterval) {
        this.lastWanderChange = currentTime;
        this.currentDecision = newDecision;
      }
      // 기존 방향 유지 (direction이 0,0이 아닌 경우)
      if (this.currentDecision.direction.x === 0 && this.currentDecision.direction.y === 0) {
        this.currentDecision = newDecision;
      }
    } else {
      this.currentDecision = newDecision;
    }
  }

  /**
   * 현재 AI 의사결정 결과를 반환합니다.
   */
  getDecision(): BotDecision {
    return this.currentDecision;
  }

  /**
   * 봇 설정을 반환합니다.
   */
  getConfig(): BotConfig {
    return this.config;
  }
}

/**
 * 실제 플레이어처럼 보이는 봇 닉네임 풀
 * 다양한 스타일의 닉네임을 포함합니다.
 */
const BOT_NICKNAMES = [
  // 영어 닉네임 (게이머 스타일)
  'Shadow', 'Phoenix', 'Storm', 'Blaze', 'Frost', 'Thunder', 'Viper', 'Wolf',
  'Dragon', 'Ninja', 'Hawk', 'Tiger', 'Lion', 'Bear', 'Eagle', 'Shark',
  'Ace', 'King', 'Queen', 'Jack', 'Joker', 'Knight', 'Rogue', 'Mage',
  'Hunter', 'Sniper', 'Tank', 'Healer', 'Warrior', 'Archer', 'Wizard', 'Paladin',
  // 숫자 조합 스타일
  'Pro123', 'Gamer99', 'Player1', 'NoobKing', 'MVP2024', 'Legend77', 'Master42',
  'Elite88', 'Boss666', 'Hero007', 'Star555', 'Flash99', 'Speed100', 'Power50',
  // 재미있는 닉네임
  'Potato', 'Banana', 'Cookie', 'Noodle', 'Pickle', 'Waffle', 'Taco', 'Pizza',
  'Sushi', 'Ramen', 'Burger', 'Donut', 'Mochi', 'Kimchi', 'Tofu', 'Curry',
  // 감정/상태 표현
  'Sleepy', 'Hungry', 'Happy', 'Angry', 'Chill', 'Hyper', 'Lazy', 'Crazy',
  'Lucky', 'Unlucky', 'Brave', 'Sneaky', 'Speedy', 'Mighty', 'Tiny', 'Giant',
  // 한국어 로마자 스타일
  'Daebak', 'Hwaiting', 'Jjang', 'Oppa', 'Noona', 'Hyung', 'Unnie', 'Maknae',
  'Aegyo', 'Bbang', 'Chikin', 'Ramyun', 'Soju', 'Makgeolli', 'Tteok', 'Gimbap',
  // 동물 + 형용사
  'FastCat', 'SlowDog', 'BigBird', 'SmolFish', 'CoolFox', 'HotBear', 'IcyWolf',
  'FireAnt', 'WaterBug', 'WindOwl', 'EarthMole', 'SkyHawk', 'SeaShark', 'MoonBat',
  // 색상 + 명사
  'RedStar', 'BlueMoon', 'GreenLeaf', 'YellowSun', 'PinkRose', 'BlackNight',
  'WhiteSnow', 'GoldCoin', 'SilverKey', 'PurpleGem', 'OrangeJuice', 'CyanWave',
  // 직업/역할
  'Chef', 'Doctor', 'Pilot', 'Artist', 'Coder', 'Gamer', 'Streamer', 'Singer',
  'Dancer', 'Writer', 'Builder', 'Farmer', 'Fisher', 'Miner', 'Trader', 'Racer',
  // 신화/판타지
  'Zeus', 'Odin', 'Thor', 'Loki', 'Athena', 'Apollo', 'Hades', 'Poseidon',
  'Merlin', 'Arthur', 'Gandalf', 'Frodo', 'Legolas', 'Gimli', 'Aragorn', 'Sauron',
  // 우주/과학
  'Cosmos', 'Galaxy', 'Nebula', 'Quasar', 'Pulsar', 'Nova', 'Comet', 'Meteor',
  'Atom', 'Proton', 'Neutron', 'Photon', 'Quantum', 'Plasma', 'Fusion', 'Laser',
];

/** 사용된 닉네임 추적 (중복 방지) */
const usedNicknames = new Set<string>();

/**
 * 랜덤 봇 이름을 생성합니다.
 * 실제 플레이어처럼 보이는 다양한 닉네임을 반환합니다.
 */
export function generateBotName(): string {
  // 사용 가능한 닉네임 찾기
  const availableNames = BOT_NICKNAMES.filter(name => !usedNicknames.has(name));
  
  let nickname: string;
  
  if (availableNames.length > 0) {
    // 사용 가능한 닉네임 중 랜덤 선택
    nickname = availableNames[Math.floor(Math.random() * availableNames.length)];
  } else {
    // 모든 닉네임이 사용 중이면 숫자 접미사 추가
    const baseName = BOT_NICKNAMES[Math.floor(Math.random() * BOT_NICKNAMES.length)];
    const suffix = Math.floor(Math.random() * 1000);
    nickname = `${baseName}${suffix}`;
  }
  
  usedNicknames.add(nickname);
  
  // 일정 시간 후 닉네임 해제 (재사용 가능하도록)
  setTimeout(() => {
    usedNicknames.delete(nickname);
  }, 60000); // 1분 후 해제
  
  return nickname;
}
