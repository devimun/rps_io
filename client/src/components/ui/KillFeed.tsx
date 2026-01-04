/**
 * 킬 피드 컴포넌트 (성능 최적화 버전)
 * 실시간 킬 이벤트를 화면 좌측 상단에 표시합니다.
 * 
 * 최적화:
 * - memo로 개별 아이템 리렌더링 방지
 * - useCallback으로 이벤트 핸들러 메모이제이션
 * - CSS 애니메이션으로 JS 타이머 최소화
 * - 이모지 대신 스프라이트 이미지 사용
 */
import { useEffect, useState, useCallback, memo } from 'react';
import type { KillFeedEvent } from '@chaos-rps/shared';
import { useGameStore } from '../../stores/gameStore';
import { RpsSprite } from './RpsSprite';

/** 킬 피드 아이템 Props */
interface KillFeedItemProps {
  event: KillFeedEvent;
  isHighlighted: boolean;
}

/**
 * 킬 피드 아이템 컴포넌트
 */
const KillFeedItem = memo(function KillFeedItem({ event, isHighlighted }: KillFeedItemProps) {
  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 rounded text-sm animate-fade-out ${isHighlighted
          ? 'bg-yellow-500/30 border border-yellow-500/50'
          : 'bg-black/50'
        }`}
    >
      <span className={`font-medium ${isHighlighted ? 'text-yellow-300' : 'text-green-400'}`}>
        {event.winnerNickname}
      </span>
      <RpsSprite state={event.winnerRpsState} size={20} />
      <span className="text-gray-400 mx-1">→</span>
      <RpsSprite state={event.loserRpsState} size={20} />
      <span className={`font-medium ${isHighlighted ? 'text-yellow-300' : 'text-red-400'}`}>
        {event.loserNickname}
      </span>
    </div>
  );
});

/**
 * 킬 피드 컴포넌트
 */
export const KillFeed = memo(function KillFeed() {
  const nickname = useGameStore((state) => state.nickname);
  const [killFeed, setKillFeed] = useState<KillFeedEvent[]>([]);

  // 킬 피드 이벤트 핸들러
  const handleKillFeed = useCallback((event: CustomEvent<KillFeedEvent>) => {
    const newEvent = event.detail;

    setKillFeed((prev) => {
      const newFeed = [...prev, newEvent].slice(-5);
      return newFeed;
    });

    // 6초 후 자동 제거
    setTimeout(() => {
      setKillFeed((prev) => prev.filter((e) => e.id !== newEvent.id));
    }, 6000);
  }, []);

  useEffect(() => {
    window.addEventListener('kill:feed', handleKillFeed as EventListener);
    return () => {
      window.removeEventListener('kill:feed', handleKillFeed as EventListener);
    };
  }, [handleKillFeed]);

  if (killFeed.length === 0) return null;

  return (
    <div className="fixed top-20 left-4 z-30 flex flex-col gap-1">
      {killFeed.map((event) => (
        <KillFeedItem
          key={event.id}
          event={event}
          isHighlighted={
            event.winnerNickname === nickname || event.loserNickname === nickname
          }
        />
      ))}

      {/* CSS 애니메이션 정의 */}
      <style>{`
        @keyframes fadeOut {
          0%, 70% { opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-fade-out {
          animation: fadeOut 6s ease-out forwards;
        }
      `}</style>
    </div>
  );
});
