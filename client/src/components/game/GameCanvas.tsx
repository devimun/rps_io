/**
 * 게임 캔버스 컨테이너 컴포넌트
 * Phaser 게임을 React에 마운트합니다.
 * 
 * [1.4.5 최적화]
 * - Phaser 지연 초기화 (requestIdleCallback)
 * - 로비 진입 시 버벅임 방지
 */
import { useEffect, useRef, useState, memo } from 'react';
import Phaser from 'phaser';
import { getGameConfig } from '../../game/config';
import { useUIStore } from '../../stores/uiStore';
import { useGameStore } from '../../stores/gameStore';
import { socketService } from '../../services/socketService';
import { trackGameStart, trackSessionEnd, trackError, trackLoadingTime } from '../../services/analytics';

/** 서버 URL */
const SERVER_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

/**
 * requestIdleCallback 폴리필 (Safari 등 미지원 브라우저용)
 */
const requestIdleCallbackPolyfill = (
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): number => {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }
  // 폴리필: setTimeout으로 대체
  const timeout = options?.timeout ?? 50;
  return setTimeout(() => {
    callback({
      didTimeout: true,
      timeRemaining: () => 0,
    });
  }, Math.min(timeout, 50)) as unknown as number;
};

const cancelIdleCallbackPolyfill = (handle: number): void => {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(handle);
  } else {
    clearTimeout(handle);
  }
};

/**
 * 게임 캔버스 컴포넌트
 * memo로 불필요한 리렌더링 방지
 */
export const GameCanvas = memo(function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const initHandleRef = useRef<number | null>(null);

  /** [1.4.5] Phaser 초기화 완료 여부 */
  const [isInitialized, setIsInitialized] = useState(false);

  const isMobile = useUIStore((state) => state.isMobile);
  const roomId = useGameStore((state) => state.roomId);
  const playerId = useGameStore((state) => state.playerId);
  const nickname = useGameStore((state) => state.nickname);
  const isPrivateRoom = useGameStore((state) => state.isPrivateRoom);

  // [1.4.5] Phaser 지연 초기화
  useEffect(() => {
    if (gameRef.current || !containerRef.current) return;

    const initPhaser = () => {
      if (gameRef.current || !containerRef.current) return;

      try {
        const loadStart = Date.now();
        console.log('[GameCanvas] Initializing Phaser...');

        const config = getGameConfig(isMobile);
        gameRef.current = new Phaser.Game({
          ...config,
          parent: containerRef.current,
        });

        // 로딩 시간 측정
        const loadTime = Date.now() - loadStart;
        trackLoadingTime(loadTime, 'initial');
        console.log(`[GameCanvas] Phaser initialized in ${loadTime}ms`);

        setIsInitialized(true);
      } catch (error) {
        console.error('[GameCanvas] Failed to initialize:', error);
        if (error instanceof Error) {
          trackError(error, 'game_init');
        }
      }
    };

    // requestIdleCallback으로 브라우저가 여유있을 때 초기화
    // timeout: 최대 300ms 대기 후 강제 실행
    initHandleRef.current = requestIdleCallbackPolyfill(initPhaser, { timeout: 300 });

    return () => {
      // 초기화 중단
      if (initHandleRef.current !== null) {
        cancelIdleCallbackPolyfill(initHandleRef.current);
        initHandleRef.current = null;
      }

      trackSessionEnd();

      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [isMobile]);

  // Socket.IO 연결
  useEffect(() => {
    if (!roomId || !playerId || !nickname) return;

    const {
      setConnectionStatus,
      updatePlayers,
      updateRankings,
      setDeathInfo,
      setPhase,
      setDashState,
      setTransformWarning,
    } = useGameStore.getState();

    setConnectionStatus('connecting');

    socketService.connect(
      {
        serverUrl: SERVER_URL,
        roomId,
        playerId,
        nickname,
        autoReconnect: true,
      },
      {
        onConnect: () => {
          setConnectionStatus('connected');
          // 대시 상태 초기화 (이전 게임 상태 제거)
          setDashState(false, 0);
          socketService.sendReady();
          // 게임 시작 이벤트 트래킹
          trackGameStart(isPrivateRoom ? 'private' : 'public');
        },
        onDisconnect: (reason) => {
          setConnectionStatus('disconnected');
          console.log('[Socket] Disconnected:', reason);
        },
        onError: (error) => {
          setConnectionStatus('error');
          console.error('[Socket] Error:', error);
        },
        onGameState: (data) => {
          updatePlayers(data.players, data.timestamp);
        },
        onRankingUpdate: (rankings) => {
          updateRankings(rankings);
        },
        onEliminated: (data) => {
          setDeathInfo(data.eliminatorNickname, data.deathMessage, data.eliminatorRpsState, data.eliminatedRpsState, data.killCount);
        },
        onRoomClosed: (reason) => {
          console.log('[Socket] Room closed:', reason);
          setPhase('idle');
        },
        onDash: (data) => {
          const { myPlayer } = useGameStore.getState();
          if (myPlayer && data.playerId === myPlayer.id) {
            setDashState(data.isDashing, data.cooldownEndTime);
          }
        },
        onTransformWarning: (data) => {
          setTransformWarning(data.timeRemaining);
          setTimeout(() => {
            setTransformWarning(null);
          }, data.timeRemaining + 100);
        },
      }
    );

    return () => {
      socketService.disconnect();
      setConnectionStatus('disconnected');
    };
  }, [roomId, playerId, nickname]);

  return (
    <div
      ref={containerRef}
      id="game-container"
      className="w-full h-full absolute inset-0"
      style={{ touchAction: 'none' }}
    >
      {/* [1.4.5] Phaser 초기화 중 로딩 표시 */}
      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">게임 엔진 초기화 중...</p>
          </div>
        </div>
      )}
    </div>
  );
});
