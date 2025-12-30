/**
 * MatchManager - 공개 방 매칭 관리
 * 빈 공개 방 찾기/생성 로직 담당
 * Requirements: 4.1
 */

import { IGameRoom, RoomManager } from './RoomManager';

/** 매치 매니저 설정 */
export interface MatchManagerConfig {
  /** 방 최대 인원 */
  maxPlayersPerRoom: number;
  /** 공개 방 최대 개수 */
  maxPublicRooms: number;
}

/** 기본 설정 */
const DEFAULT_CONFIG: MatchManagerConfig = {
  maxPlayersPerRoom: 20,
  maxPublicRooms: 10,
};

/**
 * 공개 방 매칭 매니저
 * - 빈 공개 방 찾기
 * - 공개 방 자동 생성
 */
export class MatchManager<T extends IGameRoom = IGameRoom> {
  private readonly roomManager: RoomManager<T>;
  private readonly config: MatchManagerConfig;

  constructor(roomManager: RoomManager<T>, config: Partial<MatchManagerConfig> = {}) {
    this.roomManager = roomManager;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 공개 방 매칭 - 빈 공개 방 찾기 또는 새로 생성
   * @param excludeRoomId - 제외할 방 ID (다시하기 시 직전 방 제외)
   * @returns 매칭된 방
   */
  findOrCreatePublicRoom(excludeRoomId?: string): T {
    // 1. 기존 공개 방 중 빈 자리가 있는 방 찾기 (직전 방 제외)
    const availableRoom = this.findAvailablePublicRoom(excludeRoomId);
    if (availableRoom) {
      return availableRoom;
    }

    // 2. 없으면 새 공개 방 생성
    return this.roomManager.createRoom({ isPublic: true });
  }

  /**
   * 빈 자리가 있는 공개 방 찾기
   * @param excludeRoomId - 제외할 방 ID
   * @returns 빈 자리가 있는 공개 방 또는 null
   */
  findAvailablePublicRoom(excludeRoomId?: string): T | null {
    const publicRooms = this.roomManager.getPublicRooms();
    
    // 실제 플레이어 수가 최대 인원 미만인 방 찾기 (직전 방 제외)
    for (const room of publicRooms) {
      // 직전 방은 제외
      if (excludeRoomId && room.id === excludeRoomId) {
        continue;
      }
      
      const realPlayerCount = room.getRealPlayerCount();
      if (realPlayerCount < this.config.maxPlayersPerRoom) {
        return room;
      }
    }

    return null;
  }

  /**
   * 공개 방 개수 조회
   */
  getPublicRoomCount(): number {
    return this.roomManager.getPublicRooms().length;
  }

  /**
   * 전체 공개 방의 실제 플레이어 수 합계
   */
  getTotalPublicRoomPlayers(): number {
    return this.roomManager.getPublicRooms()
      .reduce((sum, room) => sum + room.getRealPlayerCount(), 0);
  }
}
