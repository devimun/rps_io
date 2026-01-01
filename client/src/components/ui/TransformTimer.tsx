/**
 * 변신 타이머 + NEXT 박스 컴포넌트
 * CSS 애니메이션 사용 - JS 블로킹과 무관하게 부드럽게 동작
 */
import { useMemo, memo } from 'react';
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
 * 변신 타이머 컴포넌트 (CSS 애니메이션 버전)
 * - setInterval 대신 CSS animation 사용
 * - GPU에서 독립적으로 실행되어 JS 부하와 무관
 */
export const TransformTimer = memo(function TransformTimer() {
  const myPlayer = useGameStore((state) => state.myPlayer);
  const connectionStatus = useGameStore((state) => state.connectionStatus);
  const isMobile = useUIStore((state) => state.isMobile);

  // CSS 애니메이션 계산
  const animationStyle = useMemo(() => {
    if (!myPlayer?.lastTransformTime) return null;

    const now = Date.now();
    const elapsed = now - myPlayer.lastTransformTime;
    const remaining = Math.max(0, TRANSFORM_INTERVAL_MS - elapsed);
    const progress = remaining / TRANSFORM_INTERVAL_MS;

    // 남은 시간만큼 애니메이션 설정
    return {
      width: `${progress * 100}%`,
      animation: `shrinkBar ${remaining}ms linear forwards`,
    };
  }, [myPlayer?.lastTransformTime]);

  const isWarning = useMemo(() => {
    if (!myPlayer?.lastTransformTime) return false;
    const elapsed = Date.now() - myPlayer.lastTransformTime;
    const remaining = TRANSFORM_INTERVAL_MS - elapsed;
    return remaining < 1000;
  }, [myPlayer?.lastTransformTime]);

  if (connectionStatus !== 'connected' || !myPlayer) return null;

  const nextState = myPlayer.nextRpsState;
  if (!nextState) return null;

  // 통일된 너비: 모바일 50vw, PC 200px
  const boxWidth = isMobile ? '50vw' : '200px';

  return (
    <>
      {/* CSS 애니메이션 정의 */}
      <style>{`
        @keyframes shrinkBar {
          from { width: inherit; }
          to { width: 0%; }
        }
      `}</style>

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

        {/* 타이머 바 (CSS 애니메이션) */}
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
          {/* key로 lastTransformTime 사용 → 시간 바뀌면 애니메이션 재시작 */}
          <div
            key={myPlayer.lastTransformTime}
            className={`h-full rounded-full ${isWarning ? 'animate-pulse' : ''}`}
            style={{
              ...animationStyle,
              backgroundColor: isWarning ? '#ff6b6b' : RPS_COLORS[nextState],
              boxShadow: `0 0 10px ${isWarning ? '#ff6b6b' : RPS_COLORS[nextState]}`,
            }}
          />
        </div>
      </div>
    </>
  );
});

