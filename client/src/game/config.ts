/**
 * Phaser 게임 설정
 * WebGL/Canvas 자동 폴백 지원
 * 
 * [1.4.5] PreloadScene 제거 - MainScene에서 모든 로딩 처리
 */

import Phaser from 'phaser';
import { MainScene } from './scenes/MainScene';

/** 게임 설정 */
export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
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
    powerPreference: 'high-performance',
    batchSize: 2048,
    maxTextures: 16,
  },
  audio: {
    disableWebAudio: false,
  },
  input: {
    keyboard: {
      capture: [],
    },
  },
  // [1.4.5] MainScene 하나만 사용
  scene: [MainScene],
};

/** 모바일 최적화 설정 */
export const MOBILE_CONFIG: Partial<Phaser.Types.Core.GameConfig> = {
  type: Phaser.AUTO,
  render: {
    antialias: true,
    pixelArt: false,
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
