/**
 * 실시간 랭킹 UI 컴포넌트
 * 상위 10명의 플레이어 순위를 표시합니다.
 */
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';
import { t } from '../../utils/i18n';

/**
 * 랭킹 컴포넌트
 */
export function Ranking() {
  const { rankings, playerId } = useGameStore();
  const { language } = useUIStore();

  if (rankings.length === 0) return null;

  return (
    <aside className="absolute top-4 right-4 w-48 bg-black/50 backdrop-blur-sm rounded-lg p-3 z-10">
      <h2 className="text-white font-bold text-sm mb-2 border-b border-white/20 pb-1">
        {t('game.ranking', language)}
      </h2>

      <ol className="space-y-1">
        {rankings.slice(0, 10).map((entry) => {
          const isMe = entry.playerId === playerId;

          return (
            <li
              key={entry.playerId}
              className={`flex items-center justify-between text-sm ${
                isMe ? 'text-cyan-400 font-bold' : 'text-white/80'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="w-5 text-right text-white/50">{entry.rank}.</span>
                <span className="truncate max-w-20">
                  {entry.nickname}
                  {isMe && ` (${t('game.you', language)})`}
                </span>
              </span>
              <span className="text-white/60">{entry.score}</span>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
