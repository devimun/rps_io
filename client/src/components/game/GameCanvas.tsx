/**
 * 게임 캔버스 컨테이너 컴포넌트
 * Phaser 게임을 React에 마운트합니다.
 */
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { getGameConfig } from '../../game/config';
import { useUIStore } from '../../stores/uiStore';
import { useGameStore } from '../../stores/gameStore';
import { socketService } from '../../services/socketService';

/** 서버 URL */
const SERVER_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

/**
 * 게임 캔버스 컴포넌트
 * Phaser 게임 인스턴스를 관리하고 서버와 연결합니다.
 */
export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  const { lowSpecMode } = useUIStore();
  const {
    roomId,
    playerId,
    nickname,
    setConnectionStatus,
    updatePlayers,
    updateRankings,
    setDeathInfo,
    setPhase,
  } = useGameStore();

  // Phaser 게임 초기화
  useEffect(() => {
    if (gameRef.current || !containerRef.current) return;

    const config = getGameConfig(lowSpecMode);
    gameRef.current = new Phaser.Game({
      ...config,
      parent: containerRef.current,
    });

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [lowSpecMode]);

  // Socket.IO 연결
  useEffect(() => {
    if (!roomId || !playerId || !nickname) return;

    const { setDashState } = useGameStore.getState();

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
          socketService.sendReady();
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
          setDeathInfo(data.eliminatorNickname, data.deathMessage);
        },
        onRoomClosed: (reason) => {
          console.log('[Socket] Room closed:', reason);
          setPhase('idle');
        },
        onDash: (data) => {
          // 내 플레이어의 대시 상태만 업데이트
          const { myPlayer } = useGameStore.getState();
          if (myPlayer && data.playerId === myPlayer.id) {
            setDashState(data.isDashing, data.cooldownEndTime);
          }
        },
        onTransformWarning: (data) => {
          const { setTransformWarning } = useGameStore.getState();
          setTransformWarning(data.timeRemaining);
          // 변신 후 경고 상태 초기화
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
  }, [roomId, playerId, nickname, setConnectionStatus, updatePlayers, updateRankings, setDeathInfo, setPhase]);

  return (
    <div
      ref={containerRef}
      id="game-container"
      className="w-full h-full absolute inset-0"
      style={{ touchAction: 'none' }}
    />
  );
}
