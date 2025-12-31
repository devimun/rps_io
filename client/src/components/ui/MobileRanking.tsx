/**
 * 모바일용 컴팩트 랭킹 컴포넌트
 * 우측 상단에 수직으로 TOP 5를 표시합니다.
 * 타이머/NEXT 박스와 겹치지 않도록 위치 조정됩니다.
 */
import { memo, useMemo } from 'react';
import { useGameStore } from '../../stores/gameStore';

/**
 * 모바일 랭킹 컴포넌트
 * 우측 상단에 수직으로 TOP 5 표시
 */
export const MobileRanking = memo(function MobileRanking() {
  const rankings = useGameStore((state) => state.rankings);
  const playerId = useGameStore((state) => state.playerId);

  // 상위 5개만 메모이제이션
  const top5 = useMemo(() => rankings.slice(0, 5), [rankings]);

  // 내 순위 찾기
  const myRank = useMemo(() => {
    const idx = rankings.findIndex((r) => r.playerId === playerId);
    return idx >= 0 ? rankings[idx] : null;
  }, [rankings, playerId]);

  if (top5.length === 0) return null;

  return (
    <div className="fixed top-[28%] right-2 z-20 bg-black/50 backdrop-blur-sm rounded-lg p-2 min-w-[90px]">
      {/* 상위 5명 수직 리스트 */}
      <div className="flex flex-col gap-0.5">
        {top5.map((entry, idx) => {
          const isMe = entry.playerId === playerId;
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
          return (
            <div
              key={entry.playerId}
              className={`flex items-center justify-between text-xs gap-1 ${
                isMe ? 'text-cyan-400 font-bold' : 'text-white/80'
              }`}
            >
              <span className="flex items-center gap-0.5">
                <span className="w-5 text-center">{medal}</span>
                <span className="truncate max-w-[50px]">{entry.nickname}</span>
              </span>
              <span className="text-amber-400">{entry.killCount}</span>
            </div>
          );
        })}
      </div>

      {/* 내 순위가 5위 밖이면 구분선 + 내 순위 표시 */}
      {myRank && myRank.rank > 5 && (
        <>
          <div className="border-t border-white/20 my-1" />
          <div className="flex items-center justify-between text-xs text-cyan-400 font-bold">
            <span>#{myRank.rank}</span>
            <span className="text-amber-400">{myRank.killCount}🗡️</span>
          </div>
        </>
      )}
    </div>
  );
});
