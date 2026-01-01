/**
 * 미니맵 컴포넌트 (성능 최적화 버전)
 * 전체 맵에서 플레이어들의 위치를 표시합니다.
 * 플레이어 점 색상: 본체(닉네임 기반) 색상 사용
 */
import { useEffect, useRef, memo } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';
import { WORLD_SIZE } from '@chaos-rps/shared';

/** 플레이어 색상 팔레트 (닉네임 해시 기반) */
const PLAYER_COLORS = [
  '#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181',
  '#aa96da', '#fcbad3', '#a8d8ea', '#f9ed69', '#b8de6f',
];

/** 닉네임 기반 색상 인덱스 */
function getPlayerColorIndex(nickname: string): number {
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % PLAYER_COLORS.length;
}

/**
 * 미니맵 컴포넌트 (Canvas 기반, 본체 색상 사용)
 */
export const Minimap = memo(function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isMobile = useUIStore((state) => state.isMobile);

  const MINIMAP_SIZE = isMobile
    ? Math.min(window.innerWidth * 0.2, 100)
    : 120;
  const SCALE = MINIMAP_SIZE / WORLD_SIZE;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const { players, myPlayer } = useGameStore.getState();

      ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

      // 배경
      ctx.fillStyle = 'rgba(17, 24, 39, 0.8)';
      ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

      // 그리드
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      const gridSize = MINIMAP_SIZE / 6;
      for (let i = 1; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, MINIMAP_SIZE);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(MINIMAP_SIZE, i * gridSize);
        ctx.stroke();
      }

      // 플레이어 점 (본체 색상 사용)
      players.forEach((player, id) => {
        const isMe = myPlayer?.id === id;
        const x = player.x * SCALE;
        const y = player.y * SCALE;
        // RPS 색상 대신 닉네임 기반 본체 색상 사용
        const color = PLAYER_COLORS[getPlayerColorIndex(player.nickname)];
        const radius = isMe ? (isMobile ? 3 : 4) : (isMobile ? 1.5 : 2);

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        if (isMe) {
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      // 테두리
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
    };

    draw();
    const interval = setInterval(draw, 100);
    return () => clearInterval(interval);
  }, [isMobile, MINIMAP_SIZE, SCALE]);

  return (
    <div
      className="fixed z-30"
      style={{
        bottom: isMobile ? '2vw' : '16px',
        right: isMobile ? '2vw' : '16px',
      }}
    >
      <canvas
        ref={canvasRef}
        width={MINIMAP_SIZE}
        height={MINIMAP_SIZE}
        className="rounded-lg"
      />
      {!isMobile && (
        <div className="absolute bottom-0.5 left-1 text-[8px] text-white/50">MAP</div>
      )}
    </div>
  );
});
