/**
 * Socket.IO 클라이언트 서비스
 * 서버와의 실시간 통신을 담당합니다.
 */
import { io, Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  PlayerMoveInput,
  GameStateUpdate,
  Player,
  TransformEvent,
  CollisionEvent,
  PlayerEliminatedEvent,
  RankingEntry,
  DashEvent,
  KillFeedEvent,
} from '@chaos-rps/shared';

/** 타입이 지정된 Socket 인스턴스 */
type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** 소켓 연결 옵션 */
interface SocketOptions {
  /** 서버 URL */
  serverUrl: string;
  /** 방 ID */
  roomId: string;
  /** 플레이어 ID */
  playerId: string;
  /** 닉네임 */
  nickname: string;
  /** 자동 재연결 여부 */
  autoReconnect?: boolean;
}

/** 이벤트 콜백 타입 */
interface SocketCallbacks {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
  onGameState?: (data: GameStateUpdate) => void;
  onPlayerJoin?: (player: Player) => void;
  onPlayerLeave?: (playerId: string) => void;
  onTransform?: (data: TransformEvent) => void;
  onTransformWarning?: (data: { timeRemaining: number }) => void;
  onCollision?: (data: CollisionEvent) => void;
  onEliminated?: (data: PlayerEliminatedEvent) => void;
  onRankingUpdate?: (rankings: RankingEntry[]) => void;
  onRoomClosed?: (reason: string) => void;
  onDash?: (data: DashEvent) => void;
  onKillFeed?: (data: KillFeedEvent) => void;
}

/**
 * Socket.IO 클라이언트 서비스 클래스
 * 싱글톤 패턴으로 구현되어 앱 전체에서 하나의 연결만 유지합니다.
 */
class SocketService {
  private socket: TypedSocket | null = null;
  private callbacks: SocketCallbacks = {};
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;

  /**
   * 서버에 연결
   * @param options - 연결 옵션
   * @param callbacks - 이벤트 콜백
   */
  connect(options: SocketOptions, callbacks: SocketCallbacks): void {
    // 기존 연결이 있으면 종료
    if (this.socket) {
      this.disconnect();
    }

    this.callbacks = callbacks;

    this.socket = io(options.serverUrl, {
      query: {
        roomId: options.roomId,
        playerId: options.playerId,
        nickname: options.nickname,
      },
      reconnection: options.autoReconnect ?? true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    this.setupEventListeners();
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // 연결 이벤트
    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this.callbacks.onConnect?.();
    });

    // 연결 해제 이벤트
    this.socket.on('disconnect', (reason) => {
      this.callbacks.onDisconnect?.(reason);
    });

    // 연결 에러 이벤트
    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      this.callbacks.onError?.(error);
    });

    // 게임 상태 업데이트
    this.socket.on('game:state', (data) => {
      this.callbacks.onGameState?.(data);
    });

    // 플레이어 입장
    this.socket.on('player:join', (player) => {
      this.callbacks.onPlayerJoin?.(player);
    });

    // 플레이어 퇴장
    this.socket.on('player:leave', (playerId) => {
      this.callbacks.onPlayerLeave?.(playerId);
    });

    // 변신 이벤트
    this.socket.on('player:transform', (data) => {
      this.callbacks.onTransform?.(data);
    });

    // 변신 예고 이벤트
    this.socket.on('transform:warning', (data) => {
      this.callbacks.onTransformWarning?.(data);
    });

    // 충돌 이벤트
    this.socket.on('player:collision', (data) => {
      this.callbacks.onCollision?.(data);
    });

    // 제거 이벤트
    this.socket.on('player:eliminated', (data) => {
      this.callbacks.onEliminated?.(data);
    });

    // 랭킹 업데이트
    this.socket.on('ranking:update', (rankings) => {
      this.callbacks.onRankingUpdate?.(rankings);
    });

    // 방 종료
    this.socket.on('room:closed', (reason) => {
      this.callbacks.onRoomClosed?.(reason);
    });

    // 대시 이벤트
    this.socket.on('player:dash', (data) => {
      this.callbacks.onDash?.(data);
    });

    // 킬 피드 이벤트
    this.socket.on('kill:feed', (data) => {
      this.callbacks.onKillFeed?.(data);
      // CustomEvent로 브로드캐스트 (KillFeed 컴포넌트에서 수신)
      window.dispatchEvent(new CustomEvent('kill:feed', { detail: data }));
    });
  }

  /**
   * 이동 입력 전송
   * @param input - 이동 입력 데이터
   */
  sendMove(input: PlayerMoveInput): void {
    if (!this.socket?.connected) return;
    this.socket.emit('player:move', input);
  }

  /**
   * 준비 완료 전송
   */
  sendReady(): void {
    if (!this.socket?.connected) return;
    this.socket.emit('player:ready');
  }

  /**
   * 대시 요청 전송
   */
  sendDash(): void {
    if (!this.socket?.connected) return;
    this.socket.emit('player:dash');
  }

  /**
   * 연결 해제
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.callbacks = {};
    this.reconnectAttempts = 0;
  }

  /**
   * 연결 상태 확인
   * @returns 연결 여부
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * 소켓 ID 조회
   * @returns 소켓 ID 또는 null
   */
  getSocketId(): string | null {
    return this.socket?.id ?? null;
  }
}

/** 싱글톤 인스턴스 */
export const socketService = new SocketService();
