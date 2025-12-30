/**
 * 변신 타이머 + NEXT 박스 컴포넌트
 * 상단에 수직으로 NEXT 박스와 타이머 바를 표시합니다.
 */
import { useEffect, useState, memo } from 'react';
import { useGameStore } from '../../stores/gameStore';
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
 * 변신 타이머 컴포넌트 (NEXT 박스 위, 타이머 아래)
 */
export const TransformTimer = memo(function TransformTimer() {
  const myPlayer = useGameStore((state) => state.myPlayer);
  const connectionStatus = useGameStore((state) => state.connectionStatus);
  const [progress, setProgress] = useState(1);
  const [isWarning, setIsWarning] = useState(false);

  // 타이머 업데이트 (부드러운 애니메이션을 위해 자주 업데이트)
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

  // 연결되지 않았거나 플레이어가 없으면 표시하지 않음
  if (connectionStatus !== 'connected' || !myPlayer) return null;

  const nextState = myPlayer.nextRpsState;
  if (!nextState) return null;

  return (
    <div className="fixed top-[12%] left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
      {/* 다음 상태 (NEXT) - 위에 배치 */}
      <div 
        className="flex items-center gap-4 px-8 py-4 rounded-2xl"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          border: `3px solid ${RPS_COLORS[nextState]}`,
          boxShadow: `0 0 30px ${RPS_COLORS[nextState]}50`,
        }}
      >
        <span className="text-base text-gray-400 font-bold">NEXT</span>
        <span className="text-5xl">{RPS_EMOJI[nextState]}</span>
        <span 
          className="text-xl font-bold"
          style={{ color: RPS_COLORS[nextState] }}
        >
          {RPS_NAMES[nextState]}
        </span>
      </div>

      {/* 타이머 바 (줄어드는 바) - 아래에 배치 */}
      <div 
        className="w-72 h-6 rounded-full overflow-hidden"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          border: isWarning ? '3px solid #ff6b6b' : '3px solid rgba(255,255,255,0.3)',
          boxShadow: isWarning ? '0 0 25px rgba(255, 100, 100, 0.6)' : 'none',
        }}
      >
        <div 
          className={`h-full rounded-full ${isWarning ? 'animate-pulse' : ''}`}
          style={{ 
            width: `${progress * 100}%`,
            backgroundColor: isWarning ? '#ff6b6b' : RPS_COLORS[nextState],
            boxShadow: `0 0 15px ${isWarning ? '#ff6b6b' : RPS_COLORS[nextState]}`,
            transition: 'background-color 0.3s',
          }}
        />
      </div>
    </div>
  );
});
