/**
 * 로비 API 라우트
 * 방 생성, 입장, 조회 엔드포인트
 * Requirements: 4.1, 4.2, 4.4
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RoomManager, IGameRoom } from '../managers/RoomManager';
import { MatchManager } from '../managers/MatchManager';
import { validateNickname } from '../utils/validation';

/** 방 생성 요청 바디 */
interface CreateRoomBody {
  nickname: string;
  fillWithBots?: boolean;
}

/** 방 입장 요청 바디 */
interface JoinRoomBody {
  nickname: string;
  code?: string;
}

/** 방 조회 파라미터 */
interface RoomParams {
  code: string;
}

/** 방 응답 데이터 */
interface RoomResponse {
  id: string;
  code: string;
  isPublic: boolean;
  playerCount: number;
  maxPlayers: number;
}

/**
 * IGameRoom을 응답 형식으로 변환
 */
function toRoomResponse(room: IGameRoom): RoomResponse {
  return {
    id: room.id,
    code: room.code,
    isPublic: room.isPublic,
    playerCount: room.getPlayerCount(),
    maxPlayers: room.maxPlayers,
  };
}

/**
 * 로비 라우트 등록
 */
export function registerLobbyRoutes<T extends IGameRoom>(
  fastify: FastifyInstance,
  roomManager: RoomManager<T>,
  matchManager: MatchManager<T>
): void {
  /**
   * POST /rooms - 비공개 방 생성
   */
  fastify.post<{ Body: CreateRoomBody }>(
    '/rooms',
    async (request: FastifyRequest<{ Body: CreateRoomBody }>, reply: FastifyReply) => {
      const { nickname, fillWithBots = true } = request.body;

      // 닉네임 검증
      const validation = validateNickname(nickname);
      if (!validation.valid) {
        return reply.status(400).send({ error: validation.error });
      }

      // 비공개 방 생성
      const room = roomManager.createRoom({
        isPublic: false,
        fillWithBots,
      });

      // 플레이어 ID 생성 (임시)
      const playerId = `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      return reply.status(201).send({
        roomId: room.id,
        code: room.code,
        playerId,
        nickname,
        room: toRoomResponse(room),
        message: '방이 생성되었습니다.',
      });
    }
  );

  /**
   * POST /rooms/join - 방 입장 (바로 시작 또는 코드 입장)
   */
  fastify.post<{ Body: JoinRoomBody }>(
    '/rooms/join',
    async (request: FastifyRequest<{ Body: JoinRoomBody }>, reply: FastifyReply) => {
      const { nickname, code } = request.body;

      // 닉네임 검증
      const validation = validateNickname(nickname);
      if (!validation.valid) {
        return reply.status(400).send({ error: validation.error });
      }

      let room: T;

      if (code) {
        // 코드로 입장
        const foundRoom = roomManager.getRoomByCode(code);
        if (!foundRoom) {
          return reply.status(404).send({ error: '방을 찾을 수 없습니다.' });
        }
        if (foundRoom.isFull()) {
          return reply.status(400).send({ error: '방이 가득 찼습니다.' });
        }
        room = foundRoom;
      } else {
        // 바로 시작 - 공개 방 매칭
        room = matchManager.findOrCreatePublicRoom();
      }

      // 플레이어 ID 생성 (임시)
      const playerId = `player_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      return reply.status(200).send({
        roomId: room.id,
        code: room.code,
        playerId,
        nickname,
        room: toRoomResponse(room),
        message: '방에 입장합니다.',
      });
    }
  );

  /**
   * GET /rooms/:code - 방 조회
   */
  fastify.get<{ Params: RoomParams }>(
    '/rooms/:code',
    async (request: FastifyRequest<{ Params: RoomParams }>, reply: FastifyReply) => {
      const { code } = request.params;

      const room = roomManager.getRoomByCode(code);
      if (!room) {
        return reply.status(404).send({ error: '방을 찾을 수 없습니다.' });
      }

      return reply.status(200).send({
        room: toRoomResponse(room),
      });
    }
  );

  /**
   * GET /rooms - 공개 방 목록 조회
   */
  fastify.get('/rooms', async (_request, reply: FastifyReply) => {
    const publicRooms = roomManager.getPublicRooms();

    return reply.status(200).send({
      rooms: publicRooms.map(toRoomResponse),
      count: publicRooms.length,
    });
  });
}
