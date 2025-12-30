/**
 * 실시간 랭킹 UI 컴포넌트 (성능 최적화 버전)
 * 상위 10명의 플레이어 순위를 표시합니다.
 * 
 * 최적화:
 * - memo로 불필요한 리렌더링 방지
 * - 선택적 구독으로 필요한 상태만 감시
 */
import { memo, useMemo } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';
import { t } from '../../utils/i18n';

/**
 * 랭킹 아이템 컴포넌트
 */
const RankingItem = memo(function RankingItem({ 
  rank, 
  nickname, 
  killCount, 
  isMe,
  language 
}: { 
  rank: number; 
  nickname: string; 
  killCount: number; 
  isMe: boolean;
  language: string;
}) {
  return (
    <li
      className={`flex items-center justify-between text-sm ${
        isMe ? 'text-cyan-400 font-bold' : 'text-white/80'
      }`}
    >
      <span className="flex items-center gap-2">
        <span className="w-5 text-right text-white/50">{rank}.</span>
        <span className="truncate max-w-20">
          {nickname}
          {isMe && ` (${t('game.you', language)})`}
        </span>
      </span>
      <span className="text-amber-400">🗡️ {killCount}</span>
    </li>
  );
});

/**
 * 랭킹 컴포넌트
 */
export const Ranking = memo(function Ranking() {
  const rankings = useGameStore((state) => state.rankings);
  const playerId = useGameStore((state) => state.playerId);
  const language = useUIStore((state) => state.language);

  // 상위 10개만 메모이제이션
  const top10 = useMemo(() => rankings.slice(0, 10), [rankings]);

  if (top10.length === 0) return null;

  return (
    <aside className="absolute top-4 right-4 w-48 bg-black/50 backdrop-blur-sm rounded-lg p-3 z-10">
      <h2 className="text-white font-bold text-sm mb-2 border-b border-white/20 pb-1">
        {t('game.ranking', language)}
      </h2>

      <ol className="space-y-1">
        {top10.map((entry) => (
          <RankingItem
            key={entry.playerId}
            rank={entry.rank}
            nickname={entry.nickname}
            killCount={entry.killCount}
            isMe={entry.playerId === playerId}
            language={language}
          />
        ))}
      </ol>
    </aside>
  );
});
