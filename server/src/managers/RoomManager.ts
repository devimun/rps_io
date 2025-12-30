/**
 * 룸 매니저
 * 게임 룸의 생성, 삭제, 조회를 관리합니다.
 * 6자리 초대 코드 생성 및 코드로 방 조회 기능을 제공합니다.
 */

import { INVITE_CODE_LENGTH } from '@chaos-rps/shared';

/**
 * 게임 룸 인터페이스 (순환 의존성 방지)
 */
export interface IGameRoom {
  readonly id: string;
  readonly code: string;
  readonly isPublic: boolean;
  readonly fillWithBots: boolean;
  readonly maxPlayers: number;
  readonly createdAt: number;
  isFull(): boolean;
  isEmpty(): boolean;
  getPlayerCount(): number;
  getRealPlayerCount(): number;
  stopGameLoop(): void;
}

/**
 * 게임 룸 생성자 타입
 */
export type GameRoomConstructor = new (
  id: string,
  code: string,
  options: { isPublic?: boolean; fillWithBots?: boolean }
) => IGameRoom;

/**
 * 초대 코드 생성에 사용할 문자 집합
 * 혼동하기 쉬운 문자(0, O, I, l)를 제외
 */
const CODE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * 고유한 초대 코드를 생성합니다.
 * @param existingCodes - 이미 사용 중인 코드 집합
 * @returns 6자리 고유 코드
 */
function generateUniqueCode(existingCodes: Set<string>): string {
  let code: string;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    code = '';
    for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * CODE_CHARACTERS.length);
      code += CODE_CHARACTERS[randomIndex];
    }
    attempts++;

    if (attempts >= maxAttempts) {
      throw new Error('초대 코드 생성 실패: 최대 시도 횟수 초과');
    }
  } while (existingCodes.has(code));

  return code;
}

/**
 * 고유 룸 ID를 생성합니다.
 */
function generateRoomId(): string {
  return `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 룸 매니저 클래스
 */
export class RoomManager<T extends IGameRoom = IGameRoom> {
  /** 룸 ID → GameRoom 맵 */
  private rooms: Map<string, T> = new Map();

  /** 초대 코드 → 룸 ID 맵 */
  private codeToRoomId: Map<string, string> = new Map();

  /** 사용 중인 코드 집합 */
  private usedCodes: Set<string> = new Set();

  /** GameRoom 생성자 */
  private readonly GameRoomClass: new (
    id: string,
    code: string,
    options: { isPublic?: boolean; fillWithBots?: boolean }
  ) => T;

  constructor(GameRoomClass: new (
    id: string,
    code: string,
    options: { isPublic?: boolean; fillWithBots?: boolean }
  ) => T) {
    this.GameRoomClass = GameRoomClass;
  }

  /**
   * 새로운 게임 룸을 생성합니다.
   * @param options - 룸 생성 옵션
   * @returns 생성된 GameRoom
   */
  createRoom(options: {
    isPublic?: boolean;
    fillWithBots?: boolean;
  } = {}): T {
    const roomId = generateRoomId();
    const code = generateUniqueCode(this.usedCodes);

    const room = new this.GameRoomClass(roomId, code, options);

    this.rooms.set(roomId, room);
    this.codeToRoomId.set(code, roomId);
    this.usedCodes.add(code);

    return room;
  }

  /**
   * 룸 ID로 룸을 조회합니다.
   */
  getRoomById(roomId: string): T | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * 초대 코드로 룸을 조회합니다.
   */
  getRoomByCode(code: string): T | undefined {
    const normalizedCode = code.toUpperCase().trim();
    const roomId = this.codeToRoomId.get(normalizedCode);
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }

  /**
   * 룸을 삭제합니다.
   * @returns 삭제 성공 여부
   */
  deleteRoom(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    room.stopGameLoop();
    this.codeToRoomId.delete(room.code);
    this.usedCodes.delete(room.code);
    this.rooms.delete(roomId);

    return true;
  }

  /**
   * 모든 룸 목록을 반환합니다.
   */
  getAllRooms(): T[] {
    return Array.from(this.rooms.values());
  }

  /**
   * 공개 룸 목록을 반환합니다.
   */
  getPublicRooms(): T[] {
    return this.getAllRooms().filter(room => room.isPublic);
  }

  /**
   * 입장 가능한 공개 룸을 찾습니다.
   */
  findAvailablePublicRoom(): T | undefined {
    return this.getPublicRooms()
      .filter(room => !room.isFull())
      .sort((a, b) => a.createdAt - b.createdAt)[0];
  }

  /**
   * 현재 활성 룸 수를 반환합니다.
   */
  getRoomCount(): number {
    return this.rooms.size;
  }

  /**
   * 초대 코드가 유효한지 확인합니다.
   */
  isValidCode(code: string): boolean {
    const normalizedCode = code.toUpperCase().trim();
    return this.codeToRoomId.has(normalizedCode);
  }

  /**
   * 빈 룸들을 정리합니다.
   */
  cleanupEmptyRooms(): number {
    let cleaned = 0;
    for (const room of this.getAllRooms()) {
      if (room.getRealPlayerCount() === 0) {
        this.deleteRoom(room.id);
        cleaned++;
      }
    }
    return cleaned;
  }
}
