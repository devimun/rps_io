/**
 * 변신 타이머 + NEXT 박스 컴포넌트
 * CSS 애니메이션 사용 - JS 블로킹과 무관하게 부드럽게 동작
 * 
 * [1.4.5] 서버에서 transformTimeRemaining을 받아 정확한 타이머 표시
 * [1.4.5] 애니메이션 안정성 개선 - 서버 업데이트로 인한 재시작 방지
 */
import { memo, useMemo } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';
import { TRANSFORM_INTERVAL_MS } from '@chaos-rps/shared';
import { RpsSprite, RPS_COLORS, RPS_NAMES } from './RpsSprite';

/**
 * 변신 타이머 컴포넌트 (CSS 애니메이션 버전)
 */
export const TransformTimer = memo(function TransformTimer() {
  const myPlayer = useGameStore((state) => state.myPlayer);
  const connectionStatus = useGameStore((state) => state.connectionStatus);
  const transformTimeRemaining = useGameStore((state) => state.transformTimeRemaining);
  const isMobile = useUIStore((state) => state.isMobile);

  // [1.4.5] 애니메이션 파라미터를 lastTransformTime이 변경될 때만 캡처
  // 서버가 50ms마다 transformTimeRemaining을 업데이트해도 애니메이션이 중단되지 않음
  // 주의: Hooks는 조건부 return 전에 호출해야 함
  const animationParams = useMemo(() => {
    const duration = Math.max(0, transformTimeRemaining);
    return {
      duration,
      startProgress: duration / TRANSFORM_INTERVAL_MS,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPlayer?.lastTransformTime]); // transformTimeRemaining 의존성 제외 (의도적)

  // 조건부 렌더링 (Hooks 호출 후)
  if (connectionStatus !== 'connected' || !myPlayer) return null;

  const nextState = myPlayer.nextRpsState;
  if (!nextState) return null;

  // 경고 상태는 실시간으로 업데이트 (이 값은 애니메이션에 영향 없음)
  const remaining = Math.max(0, transformTimeRemaining);
  const isWarning = remaining < 1000;

  // 통일된 너비: 모바일 50vw, PC 200px
  const boxWidth = isMobile ? '50vw' : '200px';
  const spriteSize = isMobile ? 40 : 36;

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
          <RpsSprite state={nextState} size={spriteSize} />
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
          {/* [1.4.5] useMemo로 캡처된 파라미터 사용 - 서버 업데이트로 인한 재시작 방지 */}
          <div
            key={myPlayer.lastTransformTime}
            className={`h-full rounded-full ${isWarning ? 'animate-pulse' : ''}`}
            style={{
              width: `${animationParams.startProgress * 100}%`,
              animation: `shrinkBar ${animationParams.duration}ms linear forwards`,
              backgroundColor: isWarning ? '#ff6b6b' : RPS_COLORS[nextState],
              boxShadow: `0 0 10px ${isWarning ? '#ff6b6b' : RPS_COLORS[nextState]}`,
            }}
          />
        </div>
      </div>
    </>
  );
});

