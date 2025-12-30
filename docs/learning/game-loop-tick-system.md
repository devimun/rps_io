# 게임 루프와 틱 기반 시스템

## 개요

실시간 멀티플레이어 게임에서 **게임 루프**(Game Loop)는 게임 상태를 지속적으로 업데이트하고 동기화하는 핵심 메커니즘입니다. 이 문서에서는 게임 루프의 개념, 틱 레이트(Tick Rate)와 프레임 레이트의 차이, 그리고 서버-클라이언트 아키텍처에서의 구현 방법을 설명합니다.

## 게임 루프란?

게임 루프는 게임이 실행되는 동안 반복적으로 수행되는 코드 블록입니다. 일반적으로 다음 세 단계로 구성됩니다:

```
┌─────────────────────────────────────────┐
│              게임 루프                   │
├─────────────────────────────────────────┤
│  1. 입력 처리 (Process Input)           │
│     - 키보드, 마우스, 터치 입력 수집     │
│                                         │
│  2. 상태 업데이트 (Update)              │
│     - 물리 연산, 충돌 판정, AI 로직     │
│     - 게임 규칙 적용                    │
│                                         │
│  3. 렌더링 (Render)                     │
│     - 화면에 현재 상태 그리기           │
└─────────────────────────────────────────┘
```

### 기본 구현 예시

```typescript
// 클라이언트 측 게임 루프 (단순화된 예시)
function gameLoop(currentTime: number): void {
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  // 1. 입력 처리
  processInput();

  // 2. 상태 업데이트
  update(deltaTime);

  // 3. 렌더링
  render();

  // 다음 프레임 예약
  requestAnimationFrame(gameLoop);
}
```

## 틱 레이트 vs 프레임 레이트

### 프레임 레이트 (Frame Rate, FPS)

**프레임 레이트**는 클라이언트에서 화면을 초당 몇 번 그리는지를 나타냅니다.

- 단위: FPS (Frames Per Second)
- 일반적인 값: 30fps, 60fps, 120fps
- 영향 요소: 그래픽 카드 성능, 모니터 주사율
- 목적: 부드러운 시각적 경험 제공

### 틱 레이트 (Tick Rate)

**틱 레이트**는 서버에서 게임 상태를 초당 몇 번 업데이트하는지를 나타냅니다.

- 단위: Hz (Hertz) 또는 ticks/second
- 일반적인 값: 20Hz, 30Hz, 60Hz, 128Hz
- 영향 요소: 서버 CPU 성능, 네트워크 대역폭
- 목적: 정확한 게임 로직 처리 및 동기화

### 비교표

| 구분 | 프레임 레이트 | 틱 레이트 |
|------|--------------|-----------|
| 위치 | 클라이언트 | 서버 |
| 목적 | 시각적 부드러움 | 게임 로직 정확성 |
| 영향 | 사용자 경험 | 게임플레이 공정성 |
| 가변성 | 기기마다 다름 | 모든 플레이어 동일 |

## setInterval vs requestAnimationFrame

### setInterval

**setInterval**은 지정된 시간 간격으로 콜백 함수를 실행합니다.

```typescript
// 60Hz 틱 레이트 (약 16.67ms 간격)
const TICK_RATE = 60;
const TICK_INTERVAL = 1000 / TICK_RATE;

const gameLoopId = setInterval(() => {
  update();
  broadcastState();
}, TICK_INTERVAL);

// 정리
clearInterval(gameLoopId);
```

**장점:**
- 일정한 간격 보장 (시도)
- 서버 측에서 사용 가능
- 탭이 비활성화되어도 계속 실행

**단점:**
- 정확한 타이밍 보장 불가 (JavaScript 이벤트 루프 특성)
- CPU 부하 시 지연 발생 가능

### requestAnimationFrame

**requestAnimationFrame**(줄여서 rAF)은 브라우저의 다음 리페인트(repaint) 전에 콜백을 실행합니다.

```typescript
let lastTime = 0;

function gameLoop(currentTime: number): void {
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  update(deltaTime);
  render();

  requestAnimationFrame(gameLoop);
}

// 시작
requestAnimationFrame(gameLoop);
```

**장점:**
- 모니터 주사율에 동기화 (부드러운 애니메이션)
- 탭 비활성화 시 자동 일시정지 (배터리 절약)
- 브라우저 최적화 혜택

**단점:**
- 클라이언트(브라우저)에서만 사용 가능
- 프레임 레이트가 가변적

### 사용 가이드라인

| 상황 | 권장 방식 |
|------|----------|
| 서버 게임 루프 | setInterval |
| 클라이언트 렌더링 | requestAnimationFrame |
| 클라이언트 게임 로직 | requestAnimationFrame + deltaTime |
| 백그라운드 작업 | setInterval |

## 서버 권위적 아키텍처에서의 게임 루프

ChaosRPS.io와 같은 실시간 멀티플레이어 게임에서는 **서버 권위적 아키텍처**(Server-Authoritative Architecture)를 사용합니다. 이 구조에서 게임 루프는 서버와 클라이언트에서 각각 다른 역할을 수행합니다.

### 서버 측 게임 루프

```typescript
/**
 * 서버 게임 루프 구현 예시
 * 60Hz 틱 레이트로 게임 상태를 업데이트합니다.
 */
class GameRoom {
  private readonly TICK_RATE = 60;
  private readonly TICK_INTERVAL = 1000 / this.TICK_RATE;
  private gameLoopId: NodeJS.Timeout | null = null;
  private lastTickTime = Date.now();

  startGameLoop(): void {
    this.gameLoopId = setInterval(() => {
      const now = Date.now();
      const deltaTime = now - this.lastTickTime;
      this.lastTickTime = now;

      // 1. 플레이어 입력 처리 (큐에서 가져옴)
      this.processInputQueue();

      // 2. 게임 상태 업데이트
      this.updateGameState(deltaTime);

      // 3. 충돌 판정
      this.checkCollisions();

      // 4. 상태 브로드캐스트
      this.broadcastState();
    }, this.TICK_INTERVAL);
  }

  stopGameLoop(): void {
    if (this.gameLoopId) {
      clearInterval(this.gameLoopId);
      this.gameLoopId = null;
    }
  }
}
```

### 클라이언트 측 게임 루프

```typescript
/**
 * 클라이언트 게임 루프 구현 예시
 * 서버 상태를 보간(interpolation)하여 부드럽게 렌더링합니다.
 */
class GameScene {
  private lastServerState: GameState | null = null;
  private targetServerState: GameState | null = null;

  update(time: number, delta: number): void {
    // 1. 로컬 입력 수집 및 서버 전송
    this.collectAndSendInput();

    // 2. 클라이언트 사이드 예측 (선택적)
    this.predictLocalPlayer(delta);

    // 3. 서버 상태 보간
    this.interpolateServerState(delta);

    // 4. 렌더링은 Phaser가 자동 처리
  }
}
```

## Delta Time의 중요성

**Delta Time**(델타 타임)은 이전 프레임/틱과 현재 프레임/틱 사이의 경과 시간입니다. 이를 사용하면 프레임 레이트에 관계없이 일관된 게임 속도를 유지할 수 있습니다.

### Delta Time 없이 (잘못된 방식)

```typescript
// ❌ 프레임 레이트에 따라 속도가 달라짐
function update(): void {
  player.x += 5; // 60fps에서는 초당 300픽셀, 30fps에서는 초당 150픽셀
}
```

### Delta Time 사용 (올바른 방식)

```typescript
// ✅ 프레임 레이트와 무관하게 일정한 속도
function update(deltaTime: number): void {
  const speed = 300; // 초당 300픽셀
  player.x += speed * (deltaTime / 1000);
}
```

## 네트워크 지연 보상 기법

실시간 멀티플레이어 게임에서는 네트워크 지연(latency)으로 인한 문제를 해결하기 위해 다양한 기법을 사용합니다.

### 1. 클라이언트 사이드 예측 (Client-Side Prediction)

클라이언트가 서버 응답을 기다리지 않고 즉시 로컬에서 결과를 예측하여 표시합니다.

```typescript
// 입력 즉시 로컬 적용
function onMoveInput(direction: Vector2): void {
  // 서버에 전송
  socket.emit('player:move', direction);
  
  // 로컬에서 즉시 예측 적용
  localPlayer.position.add(direction.multiply(speed));
}
```

### 2. 서버 조정 (Server Reconciliation)

서버의 권위적 상태와 클라이언트 예측이 다를 경우 조정합니다.

```typescript
// 서버 상태 수신 시
socket.on('game:state', (serverState) => {
  const serverPlayerPos = serverState.players[myId].position;
  const localPlayerPos = localPlayer.position;
  
  // 차이가 크면 서버 상태로 보정
  if (distance(serverPlayerPos, localPlayerPos) > THRESHOLD) {
    localPlayer.position = serverPlayerPos;
  }
});
```

### 3. 엔티티 보간 (Entity Interpolation)

다른 플레이어의 움직임을 부드럽게 표시하기 위해 과거 상태들 사이를 보간합니다.

```typescript
// 다른 플레이어 위치 보간
function interpolateOtherPlayers(alpha: number): void {
  for (const player of otherPlayers) {
    player.displayPosition = lerp(
      player.previousPosition,
      player.targetPosition,
      alpha
    );
  }
}
```

## 정리

| 개념 | 설명 |
|------|------|
| 게임 루프 | 입력 → 업데이트 → 렌더링을 반복하는 핵심 메커니즘 |
| 틱 레이트 | 서버의 초당 게임 상태 업데이트 횟수 |
| 프레임 레이트 | 클라이언트의 초당 화면 렌더링 횟수 |
| Delta Time | 프레임 간 경과 시간, 일관된 속도 유지에 필수 |
| setInterval | 서버 측 게임 루프에 적합 |
| requestAnimationFrame | 클라이언트 렌더링에 적합 |

## 참고 자료

- [Game Programming Patterns - Game Loop](https://gameprogrammingpatterns.com/game-loop.html)
- [Valve Developer Community - Source Multiplayer Networking](https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking)
- [Gabriel Gambetta - Fast-Paced Multiplayer](https://www.gabrielgambetta.com/client-server-game-architecture.html)
