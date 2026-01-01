/**
 * 변신 예고 컴포넌트
 * 변신 0.5초 전에 화면에 경고를 표시합니다.
 */
import { useEffect, useState, memo } from 'react';
import { useGameStore } from '../../stores/gameStore';

/**
 * 변신 예고 컴포넌트
 * 화면 중앙 상단에 변신 예고 애니메이션을 표시합니다.
 */
export const TransformWarning = memo(function TransformWarning() {
  // selector 패턴: transformWarningTime 변경시에만 리렌더링
  const transformWarningTime = useGameStore((state) => state.transformWarningTime);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (transformWarningTime !== null && transformWarningTime > 0) {
      setIsVisible(true);
      // 변신 후 숨기기
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, transformWarningTime);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [transformWarningTime]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <div className="animate-pulse bg-yellow-500/90 text-black px-6 py-3 rounded-full font-bold text-lg shadow-lg flex items-center gap-2">
        <span className="text-2xl animate-spin">🔄</span>
        <span>변신 임박!</span>
      </div>
    </div>
  );
});

