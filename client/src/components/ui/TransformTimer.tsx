/**
 * 변신 타이머 + NEXT 박스 컴포넌트
 * NEXT 박스와 타이머 바 너비 통일
 */
import { useEffect, useState, memo } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';
import { TRANSFORM_INTERVAL_MS } from '@chaos-rps/shared';
import type { RPSState } from '@chaos-rps/shared';

/** RPS 상태별 이모지 */
const RPS_EMOJI: Record<RPSState, string> = {
  rock: '✊',
  paper: '✋',
  scissors: '✌️',
};

/** RPS 상태별 색상 */
const RPS_COLORS: Record<RPSState, string> = {
  rock: '#4ecdc4',
  paper: '#ffe66d',
  scissors: '#ff6b6b',
};

/** RPS 상태별 한글 이름 */
const RPS_NAMES: Record<RPSState, string> = {
  rock: '바위',
  paper: '보',
  scissors: '가위',
};

/**
 * 변신 타이머 컴포넌트 (NEXT 박스와 너비 통일)
 */
export const TransformTimer = memo(function TransformTimer() {
  const myPlayer = useGameStore((state) => state.myPlayer);
  const connectionStatus = useGameStore((state) => state.connectionStatus);
  const isMobile = useUIStore((state) => state.isMobile);
  const [progress, setProgress] = useState(1);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    if (!myPlayer?.lastTransformTime) return;

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = now - (myPlayer.lastTransformTime || now);
      const remaining = Math.max(0, TRANSFORM_INTERVAL_MS - elapsed);
      setProgress(remaining / TRANSFORM_INTERVAL_MS);
      setIsWarning(remaining < 1000);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 16);
    return () => clearInterval(interval);
  }, [myPlayer?.lastTransformTime]);

  if (connectionStatus !== 'connected' || !myPlayer) return null;

  const nextState = myPlayer.nextRpsState;
  if (!nextState) return null;

  // 통일된 너비: 모바일 50vw, PC 200px
  const boxWidth = isMobile ? '50vw' : '200px';

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-50 flex flex-col items-center"
      style={{
        top: isMobile ? '8%' : '12%',
        gap: isMobile ? '1.5vw' : '8px',
      }}
    >
      {/* 다음 상태 (NEXT) */}
      <div
        className="flex items-center justify-center rounded-xl"
        style={{
          width: boxWidth,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          border: `2px solid ${RPS_COLORS[nextState]}`,
          boxShadow: `0 0 20px ${RPS_COLORS[nextState]}40`,
          padding: isMobile ? '2vw' : '12px',
          gap: isMobile ? '2vw' : '12px',
        }}
      >
        <span
          className="text-gray-400 font-bold"
          style={{ fontSize: isMobile ? '2.5vw' : '12px' }}
        >
          NEXT
        </span>
        <span style={{ fontSize: isMobile ? '7vw' : '36px' }}>
          {RPS_EMOJI[nextState]}
        </span>
        <span
          className="font-bold"
          style={{
            color: RPS_COLORS[nextState],
            fontSize: isMobile ? '3vw' : '16px',
          }}
        >
          {RPS_NAMES[nextState]}
        </span>
      </div>

      {/* 타이머 바 (NEXT 박스와 동일 너비) */}
      <div
        className="rounded-full overflow-hidden"
        style={{
          width: boxWidth,
          height: isMobile ? '1.5vh' : '16px',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          border: isWarning ? '2px solid #ff6b6b' : '2px solid rgba(255,255,255,0.2)',
          boxShadow: isWarning ? '0 0 15px rgba(255, 100, 100, 0.5)' : 'none',
        }}
      >
        <div
          className={`h-full rounded-full ${isWarning ? 'animate-pulse' : ''}`}
          style={{
            width: `${progress * 100}%`,
            backgroundColor: isWarning ? '#ff6b6b' : RPS_COLORS[nextState],
            boxShadow: `0 0 10px ${isWarning ? '#ff6b6b' : RPS_COLORS[nextState]}`,
            transition: 'background-color 0.3s',
          }}
        />
      </div>
    </div>
  );
});
