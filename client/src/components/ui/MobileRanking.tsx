/**
 * 모바일용 컴팩트 랭킹 컴포넌트
 * 우측 상단에 수직으로 TOP 5를 표시합니다.
 * viewport 비율 기반 크기
 */
import { memo, useMemo } from 'react';
import { useGameStore } from '../../stores/gameStore';

/**
 * 모바일 랭킹 컴포넌트 (viewport 비율 기반)
 */
export const MobileRanking = memo(function MobileRanking() {
  const rankings = useGameStore((state) => state.rankings);
  const playerId = useGameStore((state) => state.playerId);

  const top5 = useMemo(() => rankings.slice(0, 5), [rankings]);

  const myRank = useMemo(() => {
    const idx = rankings.findIndex((r) => r.playerId === playerId);
    return idx >= 0 ? rankings[idx] : null;
  }, [rankings, playerId]);

  if (top5.length === 0) return null;

  return (
    <div
      className="fixed z-20 bg-black/50 backdrop-blur-sm rounded"
      style={{
        top: '28%',
        right: '1vw',
        padding: '1.5vw',
        minWidth: '18vw',
      }}
    >
      {/* 상위 5명 수직 리스트 */}
      <div className="flex flex-col" style={{ gap: '0.3vh' }}>
        {top5.map((entry, idx) => {
          const isMe = entry.playerId === playerId;
          const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`;
          return (
            <div
              key={entry.playerId}
              className={`flex items-center justify-between ${isMe ? 'text-cyan-400 font-bold' : 'text-white/70'
                }`}
              style={{ fontSize: '2.5vw', lineHeight: 1.2 }}
            >
              <span className="flex items-center">
                <span style={{ width: '4vw', textAlign: 'center' }}>{medal}</span>
                <span
                  className="truncate"
                  style={{ maxWidth: '10vw' }}
                >
                  {entry.nickname}
                </span>
              </span>
              <span className="text-amber-400" style={{ marginLeft: '1vw' }}>
                {entry.killCount}
              </span>
            </div>
          );
        })}
      </div>

      {/* 내 순위가 5위 밖이면 */}
      {myRank && myRank.rank > 5 && (
        <>
          <div className="border-t border-white/20" style={{ margin: '0.5vh 0' }} />
          <div
            className="flex items-center justify-between text-cyan-400 font-bold"
            style={{ fontSize: '2.5vw' }}
          >
            <span>#{myRank.rank}</span>
            <span className="text-amber-400">{myRank.killCount}</span>
          </div>
        </>
      )}
    </div>
  );
});
