/**
 * 모바일 대시(부스트) 버튼 컴포넌트
 * 화면 오른쪽 하단에 표시되며, 탭하면 대시를 발동합니다.
 * 
 * [1.4.9] 모바일 대시 기능 복구
 */
import { memo, useCallback, useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { socketService } from '../../services/socketService';
import { DASH_COOLDOWN_MS } from '@chaos-rps/shared';

/** 대시 요청 스로틀링 */
let lastDashRequestTime = 0;
const DASH_REQUEST_THROTTLE = 100;

/**
 * 모바일 대시 버튼 컴포넌트
 */
export const MobileDashButton = memo(function MobileDashButton() {
    const isDashing = useGameStore((state) => state.isDashing);
    const dashCooldownEndTime = useGameStore((state) => state.dashCooldownEndTime);
    const [cooldownProgress, setCooldownProgress] = useState(100);
    const [isReady, setIsReady] = useState(true);

    // 쿨다운 진행 상태 업데이트
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

    // 대시 발동 (스로틀링 포함)
    const handleDash = useCallback(() => {
        const now = Date.now();

        // 스로틀링 체크
        if (now - lastDashRequestTime < DASH_REQUEST_THROTTLE) return;

        // 대시 가능 여부 체크
        const { isDashing: currentDashing, dashCooldownEndTime: currentCooldown } = useGameStore.getState();
        if (currentDashing) return;
        if (now < currentCooldown) return;

        // 대시 요청
        lastDashRequestTime = now;
        socketService.sendDash();
    }, []);

    // 버튼 크기 및 스타일
    const buttonSize = 80;

    return (
        <button
            onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDash();
            }}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
            }}
            className="fixed z-50 select-none touch-none"
            style={{
                bottom: '20%',
                right: '5%',
                width: buttonSize,
                height: buttonSize,
                borderRadius: '50%',
                background: isDashing
                    ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
                    : isReady
                        ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                        : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                border: '4px solid rgba(255, 255, 255, 0.5)',
                boxShadow: isDashing
                    ? '0 0 20px #fbbf24, 0 4px 15px rgba(0,0,0,0.4)'
                    : isReady
                        ? '0 0 15px #22c55e, 0 4px 15px rgba(0,0,0,0.4)'
                        : '0 4px 15px rgba(0,0,0,0.4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.9,
                transition: 'transform 0.1s, box-shadow 0.2s',
            }}
        >
            {/* 아이콘 */}
            <span style={{ fontSize: 28, marginBottom: 2 }}>
                {isDashing ? '⚡' : isReady ? '🚀' : '⏳'}
            </span>

            {/* 라벨 */}
            <span
                style={{
                    fontSize: 11,
                    fontWeight: 'bold',
                    color: 'white',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                }}
            >
                {isDashing ? 'BOOST!' : isReady ? 'READY' : `${Math.floor(cooldownProgress)}%`}
            </span>

            {/* 쿨다운 오버레이 (진행률 표시) */}
            {!isReady && !isDashing && (
                <div
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        height: `${100 - cooldownProgress}%`,
                        background: 'rgba(0, 0, 0, 0.4)',
                        borderRadius: '0 0 50% 50%',
                        pointerEvents: 'none',
                    }}
                />
            )}
        </button>
    );
});
