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
  },
  audio: {
    disableWebAudio: false,
  },
  scene: [PreloadScene, MainScene],
};

/** 저사양 모드 설정 */
export const LOW_SPEC_CONFIG: Partial<Phaser.Types.Core.GameConfig> = {
  type: Phaser.CANVAS, // Canvas 강제
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
  },
  fps: {
    target: 30,
    forceSetTimeOut: true,
  },
};

/**
 * 저사양 모드 적용된 설정 반환
 */
export function getGameConfig(lowSpecMode: boolean = false): Phaser.Types.Core.GameConfig {
  if (lowSpecMode) {
    return { ...GAME_CONFIG, ...LOW_SPEC_CONFIG };
  }
  return GAME_CONFIG;
}
