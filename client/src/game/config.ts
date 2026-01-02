/**
 * Phaser 게임 설정
 * WebGL/Canvas 자동 폴백 지원
 * Requirements: 3.3
 */

import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { MainScene } from './scenes/MainScene';

/** 게임 설정 */
export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // WebGL 우선, Canvas 폴백
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: import.meta.env.DEV,
    },
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
    powerPreference: 'high-performance', // GPU 고성능 모드 활성화
    batchSize: 2048, // 배치 크기 증가 (기본 2000)
    maxTextures: 16, // 텍스처 유닛 최대 활용
  },
  audio: {
    disableWebAudio: false,
  },
  // 키보드 이벤트 캡처 비활성화 (키 꾹 누를 때 렉 방지)
  input: {
    keyboard: {
      capture: [], // 아무 키도 캡처하지 않음
    },
  },
  scene: [PreloadScene, MainScene],
};

/** 모바일 최적화 설정 */
export const MOBILE_CONFIG: Partial<Phaser.Types.Core.GameConfig> = {
  type: Phaser.AUTO, // WebGL 시도, Canvas 폴백
  render: {
    antialias: true,  // 안티앨리어싱 활성화 (부드러운 렌더링)
    pixelArt: false,  // 원형 유지
    roundPixels: true,
  },
  fps: {
    target: 30,
    forceSetTimeOut: true,
  },
};

/**
 * 모바일 최적화 적용된 설정 반환
 */
export function getGameConfig(isMobile: boolean = false): Phaser.Types.Core.GameConfig {
  if (isMobile) {
    return { ...GAME_CONFIG, ...MOBILE_CONFIG };
  }
  return GAME_CONFIG;
}
