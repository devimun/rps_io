/**
 * 대시 인디케이터 컴포넌트
 * 대시 쿨다운 상태를 시각적으로 표시합니다.
 */
import { useEffect, useState, memo } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { DASH_COOLDOWN_MS } from '@chaos-rps/shared';

/**
 * 대시 인디케이터 컴포넌트
 * 화면 하단에 대시 쿨다운 게이지를 표시합니다.
 */
export const DashIndicator = memo(function DashIndicator() {
  // selector 패턴: 각 상태 변경시에만 리렌더링
  const isDashing = useGameStore((state) => state.isDashing);
  const dashCooldownEndTime = useGameStore((state) => state.dashCooldownEndTime);
  const [cooldownProgress, setCooldownProgress] = useState(100);
  const [isReady, setIsReady] = useState(true);

  useEffect(() => {
    const updateCooldown = () => {
      const now = Date.now();
      const remaining = dashCooldownEndTime - now;

      if (remaining <= 0) {
        setCooldownProgress(100);
        setIsReady(true);
      } else {
        const progress = ((DASH_COOLDOWN_MS - remaining) / DASH_COOLDOWN_MS) * 100;
        setCooldownProgress(Math.min(100, Math.max(0, progress)));
        setIsReady(false);
      }
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 16);
    return () => clearInterval(interval);
  }, [dashCooldownEndTime]);

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 translate-y-16 z-30">
      <div className="flex flex-col items-center gap-1">
        {/* 대시 상태 텍스트 */}
        <span className={`text-sm font-bold drop-shadow-lg ${isDashing ? 'text-yellow-400' : isReady ? 'text-green-400' : 'text-blue-400'
          }`}>
          {isDashing ? '⚡ BOOST!' : isReady ? '🚀 READY' : '⏳ CHARGING'}
        </span>

        {/* 쿨다운 게이지 바 */}
        <div className="w-32 h-3 bg-gray-800/80 rounded-full overflow-hidden border border-white/40 shadow-lg">
          <div
            className={`h-full transition-all duration-100 ${isDashing
              ? 'bg-gradient-to-r from-yellow-400 to-orange-500 animate-pulse'
              : isReady
                ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                : 'bg-gradient-to-r from-blue-400 to-cyan-500'
              }`}
            style={{ width: `${isDashing ? 100 : cooldownProgress}%` }}
          />
        </div>

        {/* 키 힌트 (PC) */}
        <span className="text-xs text-white/50 hidden md:block">
          SPACE / 우클릭
        </span>
      </div>
    </div>
  );
});

