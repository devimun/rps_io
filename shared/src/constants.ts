/**
 * 게임 설정 상수
 * 클라이언트와 서버에서 동일하게 사용되는 값들
 */

/** 게임 룸 최대 인원 */
export const MAX_PLAYERS_PER_ROOM = 20;

/** 게임 룸 최대 인원 (별칭) */
export const ROOM_MAX_PLAYERS = MAX_PLAYERS_PER_ROOM;

/** 변신 주기 (밀리초) - 4초 (전체 동기화) */
export const TRANSFORM_INTERVAL_MS = 4000;

/** 변신 예고 시간 (밀리초) */
export const TRANSFORM_WARNING_MS = 500;

/** 서버 틱 레이트 (Hz) */
export const SERVER_TICK_RATE = 60;

/** 게임 틱 레이트 (별칭) */
export const GAME_TICK_RATE = SERVER_TICK_RATE;

/** 초대 코드 길이 */
export const INVITE_CODE_LENGTH = 6;

/** 닉네임 최소 길이 */
export const NICKNAME_MIN_LENGTH = 1;

/** 닉네임 최대 길이 */
export const NICKNAME_MAX_LENGTH = 12;

/** 기본 플레이어 크기 (픽셀 반지름) */
export const DEFAULT_PLAYER_SIZE = 30;

/** 기본 플레이어 크기 (별칭) */
export const BASE_SIZE = DEFAULT_PLAYER_SIZE;

/** 최대 크기 배율 (기본 크기의 4배까지) */
export const MAX_SIZE_MULTIPLIER = 4;

/** 최대 플레이어 크기 */
export const MAX_PLAYER_SIZE = BASE_SIZE * MAX_SIZE_MULTIPLIER;

/** 최소 속도 비율 (크기에 관계없이 동일 속도) */
export const MIN_SPEED_RATIO = 1.0;

/** 월드 맵 크기 (픽셀) */
export const WORLD_SIZE = 4000;

/** 월드 맵 너비 (별칭) */
export const WORLD_WIDTH = WORLD_SIZE;

/** 월드 맵 높이 (별칭) */
export const WORLD_HEIGHT = WORLD_SIZE;

/** 스폰 경계 여백 (맵 가장자리에서의 최소 거리) */
export const SPAWN_EDGE_MARGIN = 100;

/** 스폰 무적 시간 (밀리초) - 3초로 증가 */
export const SPAWN_INVINCIBILITY_MS = 3000;

/** 기본 플레이어 속도 */
export const DEFAULT_PLAYER_SPEED = 380;

/** 기본 플레이어 속도 (별칭) */
export const BASE_SPEED = DEFAULT_PLAYER_SPEED;

/** 넉백 강도 */
export const KNOCKBACK_FORCE = 150;

/** 대시 속도 배율 */
export const DASH_SPEED_MULTIPLIER = 1.5;

/** 대시 최대 지속 시간 (밀리초) */
export const DASH_DURATION_MS = 1000;

/** 대시 쿨다운 시간 (밀리초) - 3.0초 */
export const DASH_COOLDOWN_MS = 3000;

/** 지원 언어 목록 */
export const SUPPORTED_LANGUAGES = ['ko', 'en'] as const;

/** 기본 언어 */
export const DEFAULT_LANGUAGE = 'en';
