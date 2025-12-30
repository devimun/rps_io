/**
 * 미니맵 컴포넌트 (성능 최적화 버전)
 * 전체 맵에서 플레이어들의 위치를 표시합니다.
 * 
 * 최적화:
 * - Canvas 기반 렌더링으로 DOM 조작 최소화
 * - 200ms 간격 업데이트 (5fps)
 * - requestAnimationFrame 대신 setInterval 사용
 */
import { useEffect, useRef, memo } from 'react';
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
const MINIMAP_SIZE = 120;
const SCALE = MINIMAP_SIZE / WORLD_SIZE;

/**
 * 미니맵 컴포넌트 (Canvas 기반)
 */
export const Minimap = memo(function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 200ms 간격으로 미니맵 업데이트 (성능 최적화)
    const draw = () => {
      const { players, myPlayer } = useGameStore.getState();
      
      // 캔버스 클리어
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

      // 플레이어 점 그리기
      players.forEach((player, id) => {
        const isMe = myPlayer?.id === id;
        const x = player.x * SCALE;
        const y = player.y * SCALE;
        const color = RPS_COLORS[player.rpsState];
        const radius = isMe ? 4 : 2;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // 내 플레이어는 테두리 추가
        if (isMe) {
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 1;
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
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-30">
      <canvas
        ref={canvasRef}
        width={MINIMAP_SIZE}
        height={MINIMAP_SIZE}
        className="rounded-lg"
      />
      <div className="absolute bottom-0.5 left-1 text-[8px] text-white/50">MAP</div>
    </div>
  );
});
