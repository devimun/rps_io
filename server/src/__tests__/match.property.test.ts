/**
 * Property 6 테스트: 공개 방 매칭
 * 
 * *For any* "바로 시작" 요청에 대해, 시스템은 정원이 차지 않은 공개 방이 있으면 
 * 해당 방에 배치하고, 없으면 새 공개 방을 생성해야 한다.
 * 
 * **Validates: Requirements 4.1**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { MatchManager } from '../managers/MatchManager';
import { RoomManager, IGameRoom } from '../managers/RoomManager';

/**
 * 테스트용 간단한 GameRoom 구현
 */
class MockGameRoom implements IGameRoom {
  readonly id: string;
  readonly code: string;
  readonly isPublic: boolean;
  readonly fillWithBots: boolean;
  readonly maxPlayers: number = 20;
  readonly createdAt: number;
  private realPlayers: number = 0;

  constructor(
    id: string,
    code: string,
    options: { isPublic?: boolean; fillWithBots?: boolean } = {}
  ) {
    this.id = id;
    this.code = code;
    this.isPublic = options.isPublic ?? false;
    this.fillWithBots = options.fillWithBots ?? false;
    this.createdAt = Date.now();
  }

  isFull(): boolean {
    return this.realPlayers >= this.maxPlayers;
  }

  isEmpty(): boolean {
    return this.realPlayers === 0;
  }

  getPlayerCount(): number {
    return this.maxPlayers; // 봇 포함
  }

  getRealPlayerCount(): number {
    return this.realPlayers;
  }

  addRealPlayer(): void {
    if (this.realPlayers < this.maxPlayers) {
      this.realPlayers++;
    }
  }

  stopGameLoop(): void {
    // 테스트용 no-op
  }
}

describe('Feature: chaos-rps-io, Property 6: 공개 방 매칭', () => {
  it('빈 공개 방이 없으면 새 공개 방을 생성해야 한다', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10 }), (requestCount) => {
        // 새로운 매니저로 시작
        const rm = new RoomManager(MockGameRoom);
        const mm = new MatchManager(rm);

        // 여러 번 매칭 요청
        const rooms: MockGameRoom[] = [];
        for (let i = 0; i < requestCount; i++) {
          const room = mm.findOrCreatePublicRoom();
          rooms.push(room);
        }

        // 모든 반환된 방은 공개 방이어야 함
        return rooms.every(room => room.isPublic === true);
      }),
      { numRuns: 100 }
    );
  });

  it('정원이 차지 않은 공개 방이 있으면 해당 방에 배치해야 한다', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 19 }), // 1~19명 (정원 미만)
        (existingPlayers) => {
          const rm = new RoomManager(MockGameRoom);
          const mm = new MatchManager(rm);

          // 기존 공개 방 생성 및 플레이어 추가
          const existingRoom = rm.createRoom({ isPublic: true });
          for (let i = 0; i < existingPlayers; i++) {
            existingRoom.addRealPlayer();
          }

          // 매칭 요청
          const matchedRoom = mm.findOrCreatePublicRoom();

          // 기존 방에 배치되어야 함
          return matchedRoom.id === existingRoom.id;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('공개 방이 가득 차면 새 방을 생성해야 한다', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const rm = new RoomManager(MockGameRoom);
        const mm = new MatchManager(rm);

        // 가득 찬 공개 방 생성
        const fullRoom = rm.createRoom({ isPublic: true });
        for (let i = 0; i < 20; i++) {
          fullRoom.addRealPlayer();
        }

        // 매칭 요청
        const matchedRoom = mm.findOrCreatePublicRoom();

        // 새 방이 생성되어야 함
        return matchedRoom.id !== fullRoom.id && matchedRoom.isPublic === true;
      }),
      { numRuns: 100 }
    );
  });

  it('비공개 방은 매칭 대상에서 제외되어야 한다', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (privateRoomCount) => {
          const rm = new RoomManager(MockGameRoom);
          const mm = new MatchManager(rm);

          // 비공개 방만 생성
          for (let i = 0; i < privateRoomCount; i++) {
            rm.createRoom({ isPublic: false });
          }

          // 매칭 요청
          const matchedRoom = mm.findOrCreatePublicRoom();

          // 새 공개 방이 생성되어야 함
          return matchedRoom.isPublic === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('MatchManager 단위 테스트', () => {
  let roomManager: RoomManager<MockGameRoom>;
  let matchManager: MatchManager<MockGameRoom>;

  beforeEach(() => {
    roomManager = new RoomManager(MockGameRoom);
    matchManager = new MatchManager(roomManager);
  });

  it('getPublicRoomCount는 공개 방 수를 반환한다', () => {
    expect(matchManager.getPublicRoomCount()).toBe(0);

    roomManager.createRoom({ isPublic: true });
    expect(matchManager.getPublicRoomCount()).toBe(1);

    roomManager.createRoom({ isPublic: false });
    expect(matchManager.getPublicRoomCount()).toBe(1);

    roomManager.createRoom({ isPublic: true });
    expect(matchManager.getPublicRoomCount()).toBe(2);
  });

  it('getTotalPublicRoomPlayers는 공개 방의 총 플레이어 수를 반환한다', () => {
    const room1 = roomManager.createRoom({ isPublic: true });
    const room2 = roomManager.createRoom({ isPublic: true });
    roomManager.createRoom({ isPublic: false }); // 비공개 방

    room1.addRealPlayer();
    room1.addRealPlayer();
    room2.addRealPlayer();

    expect(matchManager.getTotalPublicRoomPlayers()).toBe(3);
  });
});
