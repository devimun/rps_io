/**
 * 프리로드 씬
 * 게임에 필요한 에셋을 로딩하고 로딩 진행률을 표시합니다.
 * 
 * [1.4.5 최적화]
 * - 그리드 텍스처 완전 사전 생성
 */
import Phaser from 'phaser';
import { WORLD_SIZE } from '@chaos-rps/shared';

/** 씬 키 상수 */
export const SCENE_KEYS = {
  PRELOAD: 'PreloadScene',
  MAIN: 'MainScene',
} as const;

/**
 * 프리로드 씬 클래스
 * 게임 시작 전 모든 에셋을 미리 로딩합니다.
 */
export class PreloadScene extends Phaser.Scene {
  /** 로딩 진행률 텍스트 */
  private progressText?: Phaser.GameObjects.Text;
  /** 로딩 바 배경 */
  private progressBarBg?: Phaser.GameObjects.Graphics;
  /** 로딩 바 */
  private progressBar?: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: SCENE_KEYS.PRELOAD });
  }

  /**
   * 씬 초기화
   * 로딩 UI를 생성합니다.
   */
  create(): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    // 배경색 설정
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // 게임 타이틀
    this.add
      .text(centerX, centerY - 80, 'ChaosRPS.io', {
        fontSize: '48px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    // 로딩 바 배경
    this.progressBarBg = this.add.graphics();
    this.progressBarBg.fillStyle(0x333333, 1);
    this.progressBarBg.fillRect(centerX - 150, centerY, 300, 20);

    // 로딩 바
    this.progressBar = this.add.graphics();

    // 로딩 진행률 텍스트
    this.progressText = this.add
      .text(centerX, centerY + 50, '로딩 중... 0%', {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    // 로딩 이벤트 리스너 등록
    this.load.on('progress', this.onProgress, this);
    this.load.on('complete', this.onComplete, this);

    // 에셋 로딩 시작
    this.loadAssets();
  }

  /**
   * 에셋 로딩
   * 게임에 필요한 모든 에셋을 로딩합니다.
   */
  private loadAssets(): void {
    // RPS 스프라이트시트 로드 (128x128 * 3 = 384x128)
    // 순서: 주먹(rock), 보자기(paper), 가위(scissors)
    this.load.spritesheet('rps-sprites', '/assets/images/rps.png', {
      frameWidth: 128,
      frameHeight: 128,
    });

    // [1.4.5] 모든 그리드 텍스처 사전 생성
    this.createAllGridTextures();

    // 로딩 시작
    this.load.start();
  }

  /**
   * [1.4.5] 모든 그리드 관련 텍스처 사전 생성
   * MainScene에서 실시간 생성하던 것을 여기로 이동
   */
  private createAllGridTextures(): void {
    // 1. 기본 그리드 타일
    this.createGridTile();

    // 2. 큰 그리드 선 텍스처 (500px 간격)
    this.createBigGridTexture();

    // 3. 월드 경계선 텍스처
    this.createBorderTexture();
  }

  /**
   * 그리드 타일 텍스처 생성 (PC 최적화)
   * 500x500 타일을 한 번만 생성하여 TileSprite로 반복 사용
   */
  private createGridTile(): void {
    const tileSize = 500;
    const gridSize = 100;
    const graphics = this.add.graphics();

    // 배경 (투명)
    graphics.fillStyle(0x000000, 0);
    graphics.fillRect(0, 0, tileSize, tileSize);

    // 점 패턴 (100px 간격)
    graphics.fillStyle(0x2a3a5e, 1);
    for (let x = 0; x <= tileSize; x += gridSize) {
      for (let y = 0; y <= tileSize; y += gridSize) {
        graphics.fillCircle(x, y, 4);
      }
    }

    // 작은 그리드 선 (100px 간격)
    graphics.lineStyle(1, 0x1e2d4a, 0.5);
    for (let x = 0; x <= tileSize; x += gridSize) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, tileSize);
    }
    for (let y = 0; y <= tileSize; y += gridSize) {
      graphics.moveTo(0, y);
      graphics.lineTo(tileSize, y);
    }
    graphics.strokePath();

    // 텍스처로 저장
    graphics.generateTexture('grid-tile', tileSize, tileSize);
    graphics.destroy();
  }

  /**
   * [1.4.5] 큰 그리드 선 텍스처 생성 (500px 간격)
   */
  private createBigGridTexture(): void {
    const worldSize = WORLD_SIZE;
    const gridSize = 500;
    const graphics = this.add.graphics();

    // 큰 그리드 선
    graphics.lineStyle(2, 0x2a3a5e, 0.8);
    for (let x = 0; x <= worldSize; x += gridSize) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, worldSize);
    }
    for (let y = 0; y <= worldSize; y += gridSize) {
      graphics.moveTo(0, y);
      graphics.lineTo(worldSize, y);
    }
    graphics.strokePath();

    graphics.generateTexture('big-grid', worldSize, worldSize);
    graphics.destroy();
  }

  /**
   * [1.4.5] 월드 경계선 텍스처 생성
   */
  private createBorderTexture(): void {
    const worldSize = WORLD_SIZE;
    const graphics = this.add.graphics();

    // 경계선
    graphics.lineStyle(8, 0xff4444, 1);
    graphics.strokeRect(0, 0, worldSize, worldSize);

    graphics.generateTexture('world-border', worldSize, worldSize);
    graphics.destroy();
  }

  /**
   * 로딩 진행률 업데이트
   * @param progress - 진행률 (0-1)
   */
  private onProgress(progress: number): void {
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;

    // 로딩 바 업데이트
    this.progressBar?.clear();
    this.progressBar?.fillStyle(0x4ecdc4, 1);
    this.progressBar?.fillRect(centerX - 148, centerY + 2, 296 * progress, 16);

    // 텍스트 업데이트
    const percent = Math.floor(progress * 100);
    this.progressText?.setText(`로딩 중... ${percent}%`);
  }

  /**
   * 로딩 완료 처리
   */
  private onComplete(): void {
    this.progressText?.setText('완료!');

    // 잠시 후 메인 씬으로 전환
    this.time.delayedCall(300, () => {
      this.scene.start(SCENE_KEYS.MAIN);
    });
  }
}
