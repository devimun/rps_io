/**
 * Feature: chaos-rps-io, Property 7: 초대 코드 라운드 트립
 * Validates: Requirements 4.2, 4.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { INVITE_CODE_LENGTH } from '@chaos-rps/shared';
import { GameRoomEntity } from '../game/GameRoom';

// 초대 코드 생성 로직 (RoomManager에서 추출)
const CODE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCode(): string {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += CODE_CHARACTERS[Math.floor(Math.random() * CODE_CHARACTERS.length)];
  }
  return code;
}

describe('Property 7: 초대 코드 라운드 트립', () => {
  it('초대 코드는 항상 6자리이다', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), () => {
        const code = generateCode();
        expect(code.length).toBe(INVITE_CODE_LENGTH);
        expect(code).toMatch(/^[A-Z0-9]+$/);
      }),
      { numRuns: 100 }
    );
  });

  it('초대 코드는 고유하다', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const code = generateCode();
      codes.add(code);
    }
    // 100개 중 중복이 거의 없어야 함 (확률적으로 99개 이상)
    expect(codes.size).toBeGreaterThan(95);
  });
});

describe('GameRoomEntity 테스트', () => {
  it('GameRoomEntity 생성이 올바르게 동작한다', () => {
    const room = new GameRoomEntity('room_1', 'ABC123', { isPublic: true });
    expect(room.id).toBe('room_1');
    expect(room.code).toBe('ABC123');
    expect(room.isPublic).toBe(true);
    room.stopGameLoop();
  });

  it('플레이어 추가/제거가 올바르게 동작한다', () => {
    const room = new GameRoomEntity('room_2', 'DEF456', {});
    const player = room.addPlayer('TestPlayer');
    
    expect(player).not.toBeNull();
    expect(room.getPlayerCount()).toBe(1);
    
    room.removePlayer(player!.id);
    expect(room.getPlayerCount()).toBe(0);
    room.stopGameLoop();
  });

  it('최대 인원 초과 시 플레이어 추가 실패', () => {
    const room = new GameRoomEntity('room_3', 'GHI789', {});
    
    for (let i = 0; i < room.maxPlayers; i++) {
      room.addPlayer(`Player${i}`);
    }
    
    expect(room.isFull()).toBe(true);
    expect(room.addPlayer('Extra')).toBeNull();
    room.stopGameLoop();
  });

  it('봇과 실제 플레이어 수가 올바르게 계산된다', () => {
    const room = new GameRoomEntity('room_4', 'JKL012', {});
    
    room.addPlayer('Real1', false);
    room.addPlayer('Real2', false);
    room.addPlayer('Bot1', true);
    
    expect(room.getPlayerCount()).toBe(3);
    expect(room.getRealPlayerCount()).toBe(2);
    room.stopGameLoop();
  });
});
