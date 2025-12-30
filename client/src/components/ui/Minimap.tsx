/**
 * 미니맵 컴포넌트
 * 전체 맵에서 플레이어들의 위치를 표시합니다.
 */
import { useMemo } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { WORLD_SIZE } from '@chaos-rps/shared';
import type { RPSState } from '@chaos-rps/shared';

/** RPS 상태별 색상 */
const RPS_COLORS: Record<RPSState, string> = {
  rock: '#4ecdc4',
  paper: '#ffe66d',
  scissors: '#ff6b6b',
};

/** 미니맵 크기 설정 */
const MINIMAP_SIZE = { width: 120, height: 120 };

/**
 * 미니맵 컴포넌트
 * 화면 우측 하단에 전체 맵 상황을 표시합니다.
 */
export function Minimap() {
  const { players, myPlayer } = useGameStore();

  // 월드 좌표를 미니맵 좌표로 변환하는 스케일
  const scale = useMemo(() => ({
    x: MINIMAP_SIZE.width / WORLD_SIZE,
    y: MINIMAP_SIZE.height / WORLD_SIZE,
  }), []);

  // 플레이어 점 렌더링 (transition 제거로 끊김 해결)
  const playerDots = useMemo(() => {
    const dots: JSX.Element[] = [];

    players.forEach((player, id) => {
      const isMe = myPlayer?.id === id;
      const x = player.x * scale.x;
      const y = player.y * scale.y;
      const color = RPS_COLORS[player.rpsState];

      dots.push(
        <div
          key={id}
          className={`absolute rounded-full ${isMe ? 'z-10' : 'z-0'}`}
          style={{
            left: `${x}px`,
            top: `${y}px`,
            width: isMe ? '8px' : '4px',
            height: isMe ? '8px' : '4px',
            backgroundColor: color,
            transform: 'translate(-50%, -50%)',
            boxShadow: isMe ? `0 0 6px ${color}, 0 0 12px ${color}` : 'none',
            border: isMe ? '1px solid white' : 'none',
          }}
        />
      );
    });

    return dots;
  }, [players, myPlayer, scale]);

  return (
    <div className="fixed bottom-4 right-4 z-30">
      <div
        className="relative bg-gray-900/80 border border-white/20 rounded-lg overflow-hidden"
        style={{ width: `${MINIMAP_SIZE.width}px`, height: `${MINIMAP_SIZE.height}px` }}
      >
        <div className="absolute inset-1 border border-white/10 rounded" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, white 1px, transparent 1px),
              linear-gradient(to bottom, white 1px, transparent 1px)
            `,
            backgroundSize: `${MINIMAP_SIZE.width / 6}px ${MINIMAP_SIZE.height / 6}px`,
          }}
        />
        {playerDots}
        <div className="absolute bottom-0.5 left-1 text-[8px] text-white/50">MAP</div>
      </div>
    </div>
  );
}
