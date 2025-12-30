/**
 * ChaosRPS.io 게임 서버 엔트리포인트
 * Fastify HTTP 서버 + Socket.IO 실시간 통신
 * Requirements: 4.1, 4.2
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { RoomManager } from './managers/RoomManager';
import { MatchManager } from './managers/MatchManager';
import { GameRoomEntity } from './game/GameRoom';
import { registerLobbyRoutes } from './routes/lobby';
import { StatsService } from './services/StatsService';
import type { ClientToServerEvents, ServerToClientEvents } from '@chaos-rps/shared';

/** 서버 설정 */
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

/**
 * Fastify 앱 생성
 * 프로덕션 환경에서는 JSON 로깅, 개발 환경에서는 pino-pretty 사용
 */
const isProduction = process.env.NODE_ENV === 'production';

const fastify = Fastify({
  logger: isProduction
    ? { level: 'info' }
    : {
        level: 'info',
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      },
});

/** 게임 매니저 초기화 */
const roomManager = new RoomManager<GameRoomEntity>(GameRoomEntity);
const matchManager = new MatchManager(roomManager);

/** Socket.IO 서버 (나중에 초기화) */
let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;

/** 플레이어 ID → 룸 ID 매핑 */
const playerRoomMap = new Map<string, string>();
/** 플레이어 ID → 소켓 ID 매핑 */
const playerSocketMap = new Map<string, string>();
/** 소켓 ID → 플레이어 ID 매핑 */
const socketPlayerMap = new Map<string, string>();

/**
 * CORS 설정
 */
async function setupCors(): Promise<void> {
  await fastify.register(cors, {
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN,
    credentials: true,
  });
}

/**
 * 헬스체크 라우트
 */
function setupHealthCheck(): void {
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: Date.now() };
  });

  fastify.get('/', async () => {
    return { 
      name: 'ChaosRPS.io API Server',
      status: 'running',
      timestamp: Date.now()
    };
  });

  // 서버 통계 API
  fastify.get('/stats', async () => {
    return StatsService.getStats();
  });
}

/**
 * 서버 시작
 */
async function start(): Promise<void> {
  try {
    // 미들웨어 설정
    await setupCors();

    // 라우트 설정
    setupHealthCheck();
    registerLobbyRoutes(fastify, roomManager, matchManager);

    // Fastify 서버 시작
    await fastify.listen({ port: PORT, host: HOST });

    // Socket.IO 서버 생성 (Fastify 서버에 연결)
    io = new SocketIOServer(fastify.server, {
      cors: {
        origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Socket.IO 연결 핸들러
    io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
      const { roomId, playerId, nickname } = socket.handshake.query as { roomId?: string; playerId?: string; nickname?: string };
      
      console.log(`🔌 클라이언트 연결: ${socket.id}, roomId: ${roomId}, playerId: ${playerId}, nickname: ${nickname}`);
      StatsService.playerConnected();

      if (!roomId || !playerId || !nickname) {
        console.log(`❌ 연결 거부: roomId, playerId 또는 nickname 누락`);
        StatsService.playerDisconnected();
        socket.disconnect();
        return;
      }

      // 룸 찾기
      const room = roomManager.getRoomById(roomId);
      if (!room) {
        console.log(`❌ 연결 거부: 룸을 찾을 수 없음 (${roomId})`);
        StatsService.playerDisconnected();
        socket.emit('room:closed', '방을 찾을 수 없습니다.');
        socket.disconnect();
        return;
      }

      // 매핑 저장
      playerRoomMap.set(playerId, roomId);
      playerSocketMap.set(playerId, socket.id);
      socketPlayerMap.set(socket.id, playerId);

      // Socket.IO 룸 입장
      socket.join(roomId);

      // player:ready 이벤트 처리
      socket.on('player:ready', () => {
        console.log(`✅ 플레이어 준비 완료: ${nickname} (${playerId})`);
        
        // 플레이어를 게임 룸에 추가 (실제 닉네임 사용)
        const player = room.addPlayer(nickname, false);
        if (player) {
          console.log(`👤 플레이어 추가됨: ${player.nickname} (${player.id})`);
          
          // 실제 playerId와 게임 내 player.id 매핑 업데이트
          playerSocketMap.set(player.id, socket.id);
          socketPlayerMap.set(socket.id, player.id);
          
          // 게임 상태 콜백 설정
          room.setOnStateChange((state) => {
            io.to(roomId).emit('game:state', state);
          });

          room.setOnPlayerEliminated((winnerId, loserId, winnerRpsState, loserRpsState, loserKillCount) => {
            const loserSocket = playerSocketMap.get(loserId);
            if (loserSocket) {
              io.to(loserSocket).emit('player:eliminated', {
                eliminatedId: loserId,
                eliminatorId: winnerId,
                eliminatorNickname: room.getPlayer(winnerId)?.nickname || 'Unknown',
                eliminatorRpsState: winnerRpsState,
                eliminatedRpsState: loserRpsState,
                deathMessage: '당신은 제거되었습니다!',
                killCount: loserKillCount,
              });
            }
          });

          // 킬 피드 콜백 설정
          room.setOnKillFeed((data) => {
            io.to(roomId).emit('kill:feed', {
              ...data,
              timestamp: Date.now(),
            });
          });

          // 랭킹 업데이트 콜백 설정
          room.setOnRankingUpdate((rankings) => {
            io.to(roomId).emit('ranking:update', rankings);
          });

          // 대시 이벤트 콜백 설정
          room.setOnDashEvent((event) => {
            const dashState = room.getDashState(event.playerId);
            io.to(roomId).emit('player:dash', {
              playerId: event.playerId,
              isDashing: dashState.isDashing,
              cooldownEndTime: dashState.cooldownEndTime,
              timestamp: event.timestamp,
            });
          });

          // 봇 채우기 (fillWithBots 옵션이 true인 경우)
          if (room.fillWithBots) {
            room.fillBotsToCapacity();
          }

          // 게임 루프 시작 (아직 시작되지 않았다면)
          room.startGameLoop();
        }
      });

      // player:move 이벤트 처리
      socket.on('player:move', (input) => {
        const gamePlayerId = socketPlayerMap.get(socket.id);
        if (gamePlayerId) {
          room.handlePlayerMove(gamePlayerId, input.targetX, input.targetY);
        }
      });

      // player:dash 이벤트 처리
      socket.on('player:dash', () => {
        const gamePlayerId = socketPlayerMap.get(socket.id);
        if (gamePlayerId) {
          room.handlePlayerDash(gamePlayerId);
        }
      });

      socket.on('disconnect', (reason) => {
        console.log(`🔌 클라이언트 연결 해제: ${socket.id} (${reason})`);
        
        const gamePlayerId = socketPlayerMap.get(socket.id);
        if (gamePlayerId) {
          room.removePlayer(gamePlayerId);
          playerRoomMap.delete(playerId);
          playerSocketMap.delete(gamePlayerId);
          socketPlayerMap.delete(socket.id);
        }
      });
    });

    console.log(`🎮 ChaosRPS.io 서버 시작`);
    console.log(`   HTTP: http://${HOST}:${PORT}`);
    console.log(`   WebSocket: ws://${HOST}:${PORT}`);

    // 빈 방 정리 (30초마다 실행)
    setInterval(() => {
      const cleaned = roomManager.cleanupEmptyRooms();
      if (cleaned > 0) {
        console.log(`🧹 빈 방 ${cleaned}개 정리됨 (현재 ${roomManager.getRoomCount()}개 방)`);
      }
    }, 30000);

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// 서버 시작
start();

// 내보내기 (테스트용)
export { fastify, io, roomManager, matchManager };
