/**
 * 킬 피드 컴포넌트
 * 실시간 킬 이벤트를 화면 좌측 상단에 표시합니다.
 */
import { useEffect, useState } from 'react';
import type { KillFeedEvent, RPSState } from '@chaos-rps/shared';
import { useGameStore } from '../../stores/gameStore';

/** RPS 상태별 이모지 */
const RPS_EMOJI: Record<RPSState, string> = {
  rock: '✊',
  paper: '✋',
  scissors: '✌️',
};

/** 킬 피드 아이템 Props */
interface KillFeedItemProps {
  event: KillFeedEvent;
  isHighlighted: boolean;
}

/**
 * 킬 피드 아이템 컴포넌트
 */
function KillFeedItem({ event, isHighlighted }: KillFeedItemProps) {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    // 5초 후 페이드아웃 시작
    const fadeTimer = setTimeout(() => {
      setOpacity(0);
    }, 4000);

    return () => clearTimeout(fadeTimer);
  }, []);

  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 rounded text-sm transition-opacity duration-1000 ${
        isHighlighted
          ? 'bg-yellow-500/30 border border-yellow-500/50'
          : 'bg-black/50'
      }`}
      style={{ opacity }}
    >
      {/* 승자 */}
      <span className={`font-medium ${isHighlighted ? 'text-yellow-300' : 'text-green-400'}`}>
        {event.winnerNickname}
      </span>
      <span className="text-lg">{RPS_EMOJI[event.winnerRpsState]}</span>

      {/* 화살표 */}
      <span className="text-gray-400 mx-1">→</span>

      {/* 패자 */}
      <span className="text-lg">{RPS_EMOJI[event.loserRpsState]}</span>
      <span className={`font-medium ${isHighlighted ? 'text-yellow-300' : 'text-red-400'}`}>
        {event.loserNickname}
      </span>
    </div>
  );
}

/**
 * 킬 피드 컴포넌트
 * 최근 5개의 킬 이벤트를 표시합니다.
 */
export function KillFeed() {
  const { nickname } = useGameStore();
  const [killFeed, setKillFeed] = useState<KillFeedEvent[]>([]);

  // 킬 피드 이벤트 수신 (socketService에서 호출)
  useEffect(() => {
    const handleKillFeed = (event: CustomEvent<KillFeedEvent>) => {
      setKillFeed((prev) => {
        const newFeed = [...prev, event.detail];
        // 최대 5개 유지
        if (newFeed.length > 5) {
          return newFeed.slice(-5);
        }
        return newFeed;
      });

      // 6초 후 자동 제거
      setTimeout(() => {
        setKillFeed((prev) => prev.filter((e) => e.id !== event.detail.id));
      }, 6000);
    };

    window.addEventListener('kill:feed', handleKillFeed as EventListener);
    return () => {
      window.removeEventListener('kill:feed', handleKillFeed as EventListener);
    };
  }, []);

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
    </div>
  );
}
