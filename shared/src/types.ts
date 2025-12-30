/**
 * ChaosRPS.io 공유 타입 정의
 * 클라이언트와 서버에서 동일하게 사용되는 타입들
 */

/**
 * 가위바위보 상태 열거형
 * 플레이어가 가질 수 있는 세 가지 상태
 */
export enum RPSState {
  ROCK = 'rock',
  PAPER = 'paper',
  SCISSORS = 'scissors',
}

/**
 * 충돌 결과 열거형
 * 두 플레이어가 충돌했을 때 발생할 수 있는 결과
 */
export enum CollisionResult {
  /** 공격자 승리 - 방어자 제거 */
  WIN = 'win',
  /** 공격자 패배 - 공격자 제거 */
  LOSE = 'lose',
  /** 무승부 - 양쪽 넉백 */
  DRAW = 'draw',
}

/**
 * 플레이어 인터페이스
 * 게임 내 플레이어(유저 또는 봇)의 상태를 나타냄
 */
export interface Player {
  /** 고유 식별자 */
  id: string;
  /** 닉네임 (영문자만 허용) */
  nickname: string;
  /** X 좌표 */
  x: number;
  /** Y 좌표 */
  y: number;
  /** 현재 가위바위보 상태 */
  rpsState: RPSState;
  /** 다음 가위바위보 상태 (자기 자신만 볼 수 있음) */
  nextRpsState?: RPSState;
  /** 현재 점수 */
  score: number;
  /** 현재 크기 (점수에 비례) */
  size: number;
  /** 봇 여부 */
  isBot: boolean;
  /** X축 속도 */
  velocityX: number;
  /** Y축 속도 */
  velocityY: number;
  /** 스폰 시간 (무적 판정용, 타임스탬프) */
  spawnTime?: number;
  /** 마지막 변신 시간 (타임스탬프, 변신 타이머 표시용) */
  lastTransformTime?: number;
  /** 대시 중 여부 */
  isDashing?: boolean;
}

/**
 * 게임 룸 인터페이스
 * 하나의 게임 세션을 나타냄
 */
export interface GameRoom {
  /** 룸 고유 식별자 */
  id: string;
  /** 6자리 초대 코드 */
  code: string;
  /** 공개 방 여부 */
  isPublic: boolean;
  /** AI 봇 채우기 옵션 */
  fillWithBots: boolean;
  /** 최대 플레이어 수 */
  maxPlayers: number;
  /** 변신 주기 (밀리초) */
  transformInterval: number;
  /** 생성 시간 (타임스탬프) */
  createdAt: number;
}

/**
 * 플레이어 생성 요청 데이터
 */
export interface CreatePlayerData {
  nickname: string;
  isBot?: boolean;
}

/**
 * 방 생성 요청 데이터
 */
export interface CreateRoomRequest {
  /** 방장 닉네임 */
  nickname: string;
  /** AI 봇 채우기 여부 */
  fillWithBots: boolean;
}

/**
 * 방 생성 응답 데이터
 */
export interface CreateRoomResponse {
  /** 생성된 룸 ID */
  roomId: string;
  /** 초대 코드 */
  code: string;
  /** 플레이어 ID */
  playerId: string;
}

/**
 * 방 입장 요청 데이터
 */
export interface JoinRoomRequest {
  /** 플레이어 닉네임 */
  nickname: string;
  /** 초대 코드 (비공개 방 입장 시) */
  code?: string;
}

/**
 * 방 입장 응답 데이터
 */
export interface JoinRoomResponse {
  /** 입장한 룸 ID */
  roomId: string;
  /** 플레이어 ID */
  playerId: string;
  /** 현재 방의 플레이어 목록 */
  players: Player[];
}

/**
 * 게임 상태 업데이트 데이터
 * 서버에서 클라이언트로 브로드캐스트되는 전체 게임 상태
 */
export interface GameStateUpdate {
  /** 현재 플레이어 목록 */
  players: Player[];
  /** 서버 타임스탬프 */
  timestamp: number;
}

/**
 * 플레이어 이동 입력 데이터
 * 클라이언트에서 서버로 전송되는 이동 의도
 */
export interface PlayerMoveInput {
  /** 목표 X 좌표 */
  targetX: number;
  /** 목표 Y 좌표 */
  targetY: number;
  /** 클라이언트 타임스탬프 */
  timestamp: number;
}

/**
 * 변신 이벤트 데이터
 */
export interface TransformEvent {
  /** 변신한 플레이어 ID */
  playerId: string;
  /** 새로운 상태 */
  newState: RPSState;
  /** 서버 타임스탬프 */
  timestamp: number;
}

/**
 * 변신 예고 이벤트 데이터
 */
export interface TransformWarningEvent {
  /** 변신까지 남은 시간 (밀리초) */
  timeRemaining: number;
}

/**
 * 충돌 이벤트 데이터
 */
export interface CollisionEvent {
  /** 승자 플레이어 ID */
  winnerId: string;
  /** 패자 플레이어 ID */
  loserId: string;
  /** 충돌 결과 */
  result: CollisionResult;
  /** 서버 타임스탬프 */
  timestamp: number;
}

/**
 * 플레이어 제거 이벤트 데이터
 */
export interface PlayerEliminatedEvent {
  /** 제거된 플레이어 ID */
  eliminatedId: string;
  /** 제거한 플레이어 ID */
  eliminatorId: string;
  /** 제거한 플레이어 닉네임 */
  eliminatorNickname: string;
  /** 제거한 플레이어의 RPS 상태 */
  eliminatorRpsState: RPSState;
  /** 제거된 플레이어의 RPS 상태 */
  eliminatedRpsState: RPSState;
  /** 사망 메시지 */
  deathMessage: string;
}

/**
 * 대시 상태 인터페이스
 */
export interface DashStateData {
  /** 대시 중 여부 */
  isDashing: boolean;
  /** 쿨다운 종료 시간 (타임스탬프) */
  cooldownEndTime: number;
}

/**
 * 대시 이벤트 데이터
 */
export interface DashEvent {
  /** 플레이어 ID */
  playerId: string;
  /** 대시 중 여부 */
  isDashing: boolean;
  /** 쿨다운 종료 시간 */
  cooldownEndTime: number;
  /** 서버 타임스탬프 */
  timestamp: number;
}

/**
 * 킬 피드 이벤트 데이터
 */
export interface KillFeedEvent {
  /** 이벤트 고유 ID */
  id: string;
  /** 승자 플레이어 ID */
  winnerId: string;
  /** 승자 닉네임 */
  winnerNickname: string;
  /** 승자 RPS 상태 */
  winnerRpsState: RPSState;
  /** 패자 플레이어 ID */
  loserId: string;
  /** 패자 닉네임 */
  loserNickname: string;
  /** 패자 RPS 상태 */
  loserRpsState: RPSState;
  /** 서버 타임스탬프 */
  timestamp: number;
}

/**
 * 랭킹 항목 인터페이스
 */
export interface RankingEntry {
  /** 순위 (1부터 시작) */
  rank: number;
  /** 플레이어 ID */
  playerId: string;
  /** 플레이어 닉네임 */
  nickname: string;
  /** 점수 */
  score: number;
}

/**
 * Socket.IO 서버 → 클라이언트 이벤트 타입
 */
export interface ServerToClientEvents {
  'game:state': (data: GameStateUpdate) => void;
  'player:join': (player: Player) => void;
  'player:leave': (playerId: string) => void;
  'player:transform': (data: TransformEvent) => void;
  'transform:warning': (data: TransformWarningEvent) => void;
  'player:collision': (data: CollisionEvent) => void;
  'player:eliminated': (data: PlayerEliminatedEvent) => void;
  'player:dash': (data: DashEvent) => void;
  'kill:feed': (data: KillFeedEvent) => void;
  'ranking:update': (rankings: RankingEntry[]) => void;
  'room:closed': (reason: string) => void;
}

/**
 * Socket.IO 클라이언트 → 서버 이벤트 타입
 */
export interface ClientToServerEvents {
  'player:move': (data: PlayerMoveInput) => void;
  'player:dash': () => void;
  'player:ready': () => void;
}

/**
 * 지원 언어 타입
 */
export type SupportedLanguage = 'ko' | 'en';

/**
 * 에러 응답 인터페이스
 */
export interface ErrorResponse {
  /** 에러 코드 */
  code: string;
  /** 에러 메시지 */
  message: string;
}
