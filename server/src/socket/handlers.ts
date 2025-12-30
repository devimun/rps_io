/**
 * Socket.IO 이벤트 핸들러
 * 실시간 게임 이벤트 처리
 * Requirements: 1.4, 3.1
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { PlayerMoveInput } from '@chaos-rps/shared';
import { validateNickname } from '../utils/validation';

/** 플레이어 입장 데이터 */
interface PlayerJoinData {
  roomId: string;
  nickname: string;
}

/** 플레이어 이동 데이터 */
interface PlayerMoveData {
  input: PlayerMoveInput;
}

/** 소켓 핸들러 컨텍스트 */
export interface SocketHandlerContext {
  /** 플레이어 ID → 룸 ID 매핑 */
  playerRoomMap: Map<string, string>;
  /** 플레이어 ID → 닉네임 매핑 */
  playerNicknameMap: Map<string, string>;
}

/**
 * Socket.IO 핸들러 등록
 */
export function registerSocketHandlers(
  io: SocketIOServer,
  context: SocketHandlerContext
): void {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 클라이언트 연결: ${socket.id}`);

    // 플레이어 입장
    socket.on('player:join', (data: PlayerJoinData) => {
      handlePlayerJoin(socket, data, context);
    });

    // 플레이어 퇴장
    socket.on('player:leave', () => {
      handlePlayerLeave(socket, context);
    });

    // 플레이어 이동
    socket.on('player:move', (data: PlayerMoveData) => {
      handlePlayerMove(socket, data, context);
    });

    // 연결 해제
    socket.on('disconnect', (reason: string) => {
      handleDisconnect(socket, reason, context);
    });
  });
}

/**
 * 플레이어 입장 처리
 */
function handlePlayerJoin(
  socket: Socket,
  data: PlayerJoinData,
  context: SocketHandlerContext
): void {
  const { roomId, nickname } = data;

  // 닉네임 검증
  const validation = validateNickname(nickname);
  if (!validation.valid) {
    socket.emit('error', { message: validation.error });
    return;
  }

  // 룸 입장
  socket.join(roomId);
  context.playerRoomMap.set(socket.id, roomId);
  context.playerNicknameMap.set(socket.id, nickname);

  // 입장 알림
  socket.to(roomId).emit('player:joined', {
    playerId: socket.id,
    nickname,
  });

  console.log(`👤 플레이어 입장: ${nickname} (${socket.id}) → 룸 ${roomId}`);
}

/**
 * 플레이어 퇴장 처리
 */
function handlePlayerLeave(socket: Socket, context: SocketHandlerContext): void {
  const roomId = context.playerRoomMap.get(socket.id);
  const nickname = context.playerNicknameMap.get(socket.id);

  if (roomId) {
    // 퇴장 알림
    socket.to(roomId).emit('player:left', {
      playerId: socket.id,
      nickname,
    });

    // 룸 퇴장
    socket.leave(roomId);
    context.playerRoomMap.delete(socket.id);
    context.playerNicknameMap.delete(socket.id);

    console.log(`👤 플레이어 퇴장: ${nickname} (${socket.id}) ← 룸 ${roomId}`);
  }
}

/**
 * 플레이어 이동 처리
 */
function handlePlayerMove(
  socket: Socket,
  data: PlayerMoveData,
  context: SocketHandlerContext
): void {
  const roomId = context.playerRoomMap.get(socket.id);

  if (!roomId) {
    socket.emit('error', { message: '룸에 입장하지 않았습니다.' });
    return;
  }

  // 이동 입력을 룸의 다른 플레이어에게 브로드캐스트
  // 실제 위치 계산은 서버 게임 루프에서 처리
  socket.to(roomId).emit('player:moved', {
    playerId: socket.id,
    input: data.input,
  });
}

/**
 * 연결 해제 처리
 */
function handleDisconnect(
  socket: Socket,
  reason: string,
  context: SocketHandlerContext
): void {
  const roomId = context.playerRoomMap.get(socket.id);
  const nickname = context.playerNicknameMap.get(socket.id);

  if (roomId) {
    // 퇴장 알림
    socket.to(roomId).emit('player:left', {
      playerId: socket.id,
      nickname,
      reason,
    });

    // 정리
    context.playerRoomMap.delete(socket.id);
    context.playerNicknameMap.delete(socket.id);
  }

  console.log(`🔌 클라이언트 연결 해제: ${socket.id} (${reason})`);
}

/**
 * 게임 상태 브로드캐스트
 */
export function broadcastGameState(
  io: SocketIOServer,
  roomId: string,
  state: unknown
): void {
  io.to(roomId).emit('game:state', state);
}

/**
 * 변신 이벤트 브로드캐스트
 */
export function broadcastTransform(
  io: SocketIOServer,
  roomId: string,
  playerId: string,
  newState: string
): void {
  io.to(roomId).emit('player:transform', { playerId, newState });
}

/**
 * 변신 예고 브로드캐스트
 */
export function broadcastTransformWarning(
  io: SocketIOServer,
  roomId: string,
  playerId: string
): void {
  io.to(roomId).emit('player:transform:warning', { playerId });
}

/**
 * 충돌 이벤트 브로드캐스트
 */
export function broadcastCollision(
  io: SocketIOServer,
  roomId: string,
  winnerId: string,
  loserId: string
): void {
  io.to(roomId).emit('player:collision', { winnerId, loserId });
}

/**
 * 랭킹 업데이트 브로드캐스트
 */
export function broadcastRanking(
  io: SocketIOServer,
  roomId: string,
  ranking: unknown[]
): void {
  io.to(roomId).emit('game:ranking', { ranking });
}

/**
 * 대시 이벤트 브로드캐스트
 */
export function broadcastDash(
  io: SocketIOServer,
  roomId: string,
  playerId: string,
  isDashing: boolean,
  cooldownEndTime: number
): void {
  io.to(roomId).emit('player:dash', {
    playerId,
    isDashing,
    cooldownEndTime,
    timestamp: Date.now(),
  });
}

/**
 * 킬 피드 이벤트 브로드캐스트
 */
export function broadcastKillFeed(
  io: SocketIOServer,
  roomId: string,
  event: {
    id: string;
    winnerId: string;
    winnerNickname: string;
    winnerRpsState: string;
    loserId: string;
    loserNickname: string;
    loserRpsState: string;
  }
): void {
  io.to(roomId).emit('kill:feed', {
    ...event,
    timestamp: Date.now(),
  });
}
