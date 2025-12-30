# React와 Phaser 3 통합 패턴

## 개요

React와 Phaser 3를 함께 사용할 때 발생하는 생명주기 충돌 문제와 이를 해결하기 위한 통합 패턴을 설명합니다. 두 라이브러리는 각각 독립적인 렌더링 시스템을 가지고 있어, 올바른 통합 전략이 필수적입니다.

## 핵심 개념

### React와 Phaser의 렌더링 차이

| 특성 | React | Phaser 3 |
|------|-------|----------|
| 렌더링 대상 | DOM (Virtual DOM) | Canvas/WebGL |
| 업데이트 방식 | 상태 변경 시 재렌더링 | 게임 루프 (60fps) |
| 생명주기 | 컴포넌트 마운트/언마운트 | Scene 시작/종료 |
| 메모리 관리 | 가비지 컬렉션 | 수동 정리 필요 |

### 통합 시 주의사항

1. **이중 렌더링 방지**: React의 StrictMode는 개발 환경에서 컴포넌트를 두 번 마운트합니다. Phaser 게임 인스턴스가 중복 생성되지 않도록 주의해야 합니다.

2. **메모리 누수 방지**: Phaser 게임 인스턴스는 컴포넌트 언마운트 시 반드시 `destroy()` 메서드를 호출하여 정리해야 합니다.

3. **상태 동기화**: React 상태와 Phaser 게임 상태는 별도로 관리되므로, 동기화 전략이 필요합니다.

## 구현 패턴

### 1. 기본 브릿지 컴포넌트

```typescript
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { gameConfig } from './config';

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // 이미 게임 인스턴스가 존재하면 생성하지 않음
    if (gameRef.current || !containerRef.current) return;

    // Phaser 게임 인스턴스 생성
    gameRef.current = new Phaser.Game({
      ...gameConfig,
      parent: containerRef.current,
    });

    // 클린업 함수: 컴포넌트 언마운트 시 게임 정리
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return <div ref={containerRef} />;
}
```

### 2. Zustand를 활용한 상태 동기화

Zustand(독일어로 "상태"를 의미)는 React 상태 관리 라이브러리입니다. Phaser Scene 내부에서 직접 Zustand 스토어에 접근하여 상태를 동기화할 수 있습니다.

```typescript
// stores/gameStore.ts
import { create } from 'zustand';

interface GameState {
  players: Map<string, Player>;
  updatePlayers: (players: Player[]) => void;
}

export const useGameStore = create<GameState>((set) => ({
  players: new Map(),
  updatePlayers: (players) => {
    const map = new Map(players.map(p => [p.id, p]));
    set({ players: map });
  },
}));
```

```typescript
// game/scenes/MainScene.ts
import { useGameStore } from '../../stores/gameStore';

export class MainScene extends Phaser.Scene {
  update() {
    // Phaser Scene에서 Zustand 스토어 직접 접근
    const { players } = useGameStore.getState();
    
    // 플레이어 스프라이트 업데이트
    players.forEach((player) => {
      this.updatePlayerSprite(player);
    });
  }
}
```

### 3. 이벤트 기반 통신

React 컴포넌트와 Phaser Scene 간의 느슨한 결합(Loose Coupling)을 위해 이벤트 시스템을 활용할 수 있습니다.

```typescript
// utils/gameEvents.ts
import { EventEmitter } from 'events';

export const gameEvents = new EventEmitter();

// 이벤트 타입 정의
export const GAME_EVENTS = {
  PLAYER_MOVE: 'player:move',
  GAME_PAUSE: 'game:pause',
  GAME_RESUME: 'game:resume',
} as const;
```

```typescript
// React 컴포넌트에서 이벤트 발행
import { gameEvents, GAME_EVENTS } from '../utils/gameEvents';

function PauseButton() {
  const handlePause = () => {
    gameEvents.emit(GAME_EVENTS.GAME_PAUSE);
  };
  
  return <button onClick={handlePause}>일시정지</button>;
}
```

```typescript
// Phaser Scene에서 이벤트 구독
import { gameEvents, GAME_EVENTS } from '../../utils/gameEvents';

export class MainScene extends Phaser.Scene {
  create() {
    gameEvents.on(GAME_EVENTS.GAME_PAUSE, this.handlePause, this);
  }

  handlePause() {
    this.scene.pause();
  }

  // Scene 종료 시 이벤트 리스너 정리
  shutdown() {
    gameEvents.off(GAME_EVENTS.GAME_PAUSE, this.handlePause, this);
  }
}
```

## 저사양 모드 지원

인앱 브라우저(카카오톡, 인스타그램 등)나 저사양 기기에서의 성능 최적화를 위해 저사양 모드를 구현합니다.

```typescript
// game/config.ts
export const createGameConfig = (lowSpecMode: boolean): Phaser.Types.Core.GameConfig => ({
  type: lowSpecMode ? Phaser.CANVAS : Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      // 저사양 모드에서 디버그 비활성화
      debug: false,
    },
  },
  render: {
    // 저사양 모드에서 안티앨리어싱 비활성화
    antialias: !lowSpecMode,
    // 저사양 모드에서 픽셀 아트 스타일 활성화
    pixelArt: lowSpecMode,
  },
});
```

## 메모리 누수 방지 체크리스트

Phaser 게임을 React와 함께 사용할 때 메모리 누수를 방지하기 위한 체크리스트입니다.

1. **게임 인스턴스 정리**
   - `useEffect` 클린업에서 `game.destroy(true)` 호출
   - `true` 파라미터는 모든 캐시된 텍스처도 함께 제거

2. **이벤트 리스너 정리**
   - Scene의 `shutdown` 메서드에서 모든 커스텀 이벤트 리스너 제거
   - `this.events.off()` 또는 `gameEvents.off()` 사용

3. **타이머 정리**
   - `this.time.addEvent()`로 생성한 타이머는 Scene 종료 시 자동 정리
   - `setInterval`, `setTimeout`은 수동으로 정리 필요

4. **Tween 정리**
   - 진행 중인 Tween은 Scene 종료 시 자동 정리
   - 필요시 `this.tweens.killAll()` 호출

## 참고 자료

- [Phaser 3 공식 문서](https://photonstorm.github.io/phaser3-docs/)
- [Zustand 공식 문서](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [React useEffect 클린업](https://react.dev/learn/synchronizing-with-effects#how-to-handle-the-effect-firing-twice-in-development)
