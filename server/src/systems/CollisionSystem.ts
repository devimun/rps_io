/**
 * 충돌 판정 시스템
 * 플레이어 간 충돌 감지 및 상성 판정을 처리합니다.
 */
import {
  Player,
  CollisionResult,
  CollisionEvent,
  PlayerEliminatedEvent,
  determineCollisionResult,
} from '@chaos-rps/shared';
import { KNOCKBACK_FORCE } from '@chaos-rps/shared';

/**
 * 두 플레이어 간 거리를 계산합니다.
 * @param p1 - 첫 번째 플레이어
 * @param p2 - 두 번째 플레이어
 * @returns 두 플레이어 간 거리
 */
function getDistance(p1: Player, p2: Player): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 두 플레이어의 충돌 반경 합을 계산합니다.
 * 플레이어 size가 이미 픽셀 반지름이므로 그대로 사용합니다.
 * @param p1 - 첫 번째 플레이어
 * @param p2 - 두 번째 플레이어
 * @returns 충돌 반경 합
 */
function getCollisionRadius(p1: Player, p2: Player): number {
  // size가 이미 픽셀 반지름이므로 그대로 합산
  return p1.size + p2.size;
}

/**
 * 두 플레이어가 충돌했는지 확인합니다.
 * @param p1 - 첫 번째 플레이어
 * @param p2 - 두 번째 플레이어
 * @returns 충돌 여부
 */
export function checkCollision(p1: Player, p2: Player): boolean {
  const distance = getDistance(p1, p2);
  const collisionRadius = getCollisionRadius(p1, p2);
  return distance < collisionRadius;
}

/**
 * 충돌 처리 결과 인터페이스
 */
export interface CollisionProcessResult {
  /** 충돌 이벤트 (발생한 경우) */
  collisionEvent: CollisionEvent | null;
  /** 제거 이벤트 (플레이어가 제거된 경우) */
  eliminatedEvent: PlayerEliminatedEvent | null;
  /** 넉백 적용 대상 플레이어 ID 목록 */
  knockbackTargets: string[];
  /** 승자 ID (있는 경우) */
  winnerId: string | null;
  /** 패자 ID (있는 경우) */
  loserId: string | null;
}

/**
 * 사망 메시지를 생성합니다.
 * @param eliminatorNickname - 제거한 플레이어 닉네임
 * @returns 랜덤 사망 메시지
 */
function generateDeathMessage(eliminatorNickname: string): string {
  const messages = [
    `${eliminatorNickname}님의 주먹에 찌그러짐 ㅋㅋ`,
    `${eliminatorNickname}에게 털림 ㅠㅠ`,
    `${eliminatorNickname}한테 당했다...`,
    `${eliminatorNickname}의 먹이가 됨`,
    `${eliminatorNickname}에게 흡수당함!`,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * 두 플레이어 간 충돌을 처리합니다.
 * @param attacker - 공격자 (먼저 충돌한 플레이어)
 * @param defender - 방어자
 * @returns 충돌 처리 결과
 */
export function processCollision(
  attacker: Player,
  defender: Player
): CollisionProcessResult {
  const result = determineCollisionResult(attacker.rpsState, defender.rpsState);
  const timestamp = Date.now();

  const collisionEvent: CollisionEvent = {
    winnerId: result === CollisionResult.WIN ? attacker.id : defender.id,
    loserId: result === CollisionResult.WIN ? defender.id : attacker.id,
    result,
    timestamp,
  };

  // 무승부: 넉백만 적용
  if (result === CollisionResult.DRAW) {
    return {
      collisionEvent,
      eliminatedEvent: null,
      knockbackTargets: [attacker.id, defender.id],
      winnerId: null,
      loserId: null,
    };
  }

  // 승패 결정
  const winner = result === CollisionResult.WIN ? attacker : defender;
  const loser = result === CollisionResult.WIN ? defender : attacker;

  const eliminatedEvent: PlayerEliminatedEvent = {
    eliminatedId: loser.id,
    eliminatorId: winner.id,
    eliminatorNickname: winner.nickname,
    eliminatorRpsState: winner.rpsState,
    eliminatedRpsState: loser.rpsState,
    deathMessage: generateDeathMessage(winner.nickname),
    killCount: 0, // CollisionSystem에서는 킬 수를 모름, GameRoom에서 설정
  };

  return {
    collisionEvent,
    eliminatedEvent,
    knockbackTargets: [],
    winnerId: winner.id,
    loserId: loser.id,
  };
}

/**
 * 넉백 벡터를 계산합니다.
 * @param from - 밀려나는 플레이어
 * @param to - 충돌 상대 플레이어
 * @returns 넉백 속도 벡터 { vx, vy }
 */
export function calculateKnockback(
  from: Player,
  to: Player
): { vx: number; vy: number } {
  const dx = from.x - to.x;
  const dy = from.y - to.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // 거리가 0이면 랜덤 방향으로 넉백
  if (distance === 0) {
    const angle = Math.random() * Math.PI * 2;
    return {
      vx: Math.cos(angle) * KNOCKBACK_FORCE,
      vy: Math.sin(angle) * KNOCKBACK_FORCE,
    };
  }

  // 정규화된 방향 벡터에 넉백 힘 적용
  const nx = dx / distance;
  const ny = dy / distance;

  return {
    vx: nx * KNOCKBACK_FORCE,
    vy: ny * KNOCKBACK_FORCE,
  };
}

/**
 * 플레이어 목록에서 모든 충돌을 감지합니다.
 * @param players - 플레이어 목록
 * @returns 충돌한 플레이어 쌍 목록
 */
export function detectAllCollisions(
  players: Player[]
): Array<[Player, Player]> {
  const collisions: Array<[Player, Player]> = [];

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      if (checkCollision(players[i], players[j])) {
        collisions.push([players[i], players[j]]);
      }
    }
  }

  return collisions;
}
