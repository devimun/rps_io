# Socket.IO 실시간 통신 가이드

## 개요

실시간 멀티플레이어 게임에서 클라이언트와 서버 간의 양방향 통신은 핵심 요소입니다. 이 문서에서는 Socket.IO를 활용한 실시간 통신의 개념과 구현 방법을 설명합니다.

## WebSocket vs HTTP 폴링

### HTTP 폴링 (Polling)

**HTTP 폴링**은 클라이언트가 주기적으로 서버에 요청을 보내 새로운 데이터가 있는지 확인하는 방식입니다.

```
클라이언트                    서버
    |                          |
    |------- GET /updates ---->|
    |<------ 응답 (없음) ------|
    |                          |
    |------- GET /updates ---->|
    |<------ 응답 (없음) ------|
    |                          |
    |------- GET /updates ---->|
    |<------ 응답 (데이터!) ---|
```

**단점:**
- 불필요한 요청으로 인한 서버 부하
- 실시간성 부족 (폴링 간격만큼 지연)
- 네트워크 대역폭 낭비

### WebSocket

**WebSocket**은 클라이언트와 서버 간에 지속적인 양방향 연결을 유지하는 프로토콜입니다.

```
클라이언트                    서버
    |                          |
    |==== WebSocket 연결 ======|
    |                          |
    |<------ 데이터 푸시 ------|
    |------- 데이터 전송 ----->|
    |<------ 데이터 푸시 ------|
    |                          |
```

**장점:**
- 실시간 양방향 통신
- 낮은 지연 시간 (latency)
- 효율적인 네트워크 사용

### 비교표

| 특성 | HTTP 폴링 | WebSocket |
|------|----------|-----------|
| 연결 방식 | 요청마다 새 연결 | 지속적 연결 |
| 지연 시간 | 높음 (폴링 간격) | 낮음 (즉시) |
| 서버 부하 | 높음 | 낮음 |
| 양방향 통신 | 제한적 | 완전 지원 |
| 브라우저 지원 | 모든 브라우저 | 대부분 지원 |

## Socket.IO 소개

**Socket.IO**는 WebSocket을 기반으로 한 실시간 통신 라이브러리입니다. WebSocket이 지원되지 않는 환경에서는 자동으로 폴링으로 폴백(fallback)합니다.

### 주요 특징

1. **자동 재연결**: 연결이 끊어지면 자동으로 재연결 시도
2. **폴백 지원**: WebSocket 불가 시 HTTP 롱 폴링으로 대체
3. **Room 기반 브로드캐스팅**: 특정 그룹에만 메시지 전송
4. **네임스페이스**: 논리적으로 연결을 분리
5. **이벤트 기반**: 직관적인 이벤트 발행/구독 패턴

## Socket.IO Room 개념

**Room**은 Socket.IO에서 소켓들을 그룹화하는 개념입니다. 게임에서는 각 게임 방을 Room으로 관리합니다.

```
┌─────────────────────────────────────────────────────────────┐
│                      Socket.IO 서버                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │    Room: ABC    │    │    Room: XYZ    │                │
│  │  ┌───┐ ┌───┐   │    │  ┌───┐ ┌───┐   │                │
│  │  │ A │ │ B │   │    │  │ D │ │ E │   │                │
│  │  └───┘ └───┘   │    │  └───┘ └───┘   │                │
│  │  ┌───┐         │    │  ┌───┐         │                │
│  │  │ C │         │    │  │ F │         │                │
│  │  └───┘         │    │  └───┘         │                │
│  └─────────────────┘    └─────────────────┘                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Room 사용 예시

```typescript
// 서버 측
import { Server } from 'socket.io';

const io = new Server(httpServer);

io.on('connection', (socket) => {
  // Room 입장
  socket.on('joinRoom', (roomId: string) => {
    socket.join(roomId);
    console.log(`${socket.id}가 ${roomId}에 입장`);
  });

  // Room 퇴장
  socket.on('leaveRoom', (roomId: string) => {
    socket.leave(roomId);
    console.log(`${socket.id}가 ${roomId}에서 퇴장`);
  });

  // Room 내 브로드캐스트 (자신 제외)
  socket.on('message', (roomId: string, message: string) => {
    socket.to(roomId).emit('message', message);
  });

  // Room 내 브로드캐스트 (자신 포함)
  socket.on('announcement', (roomId: string, message: string) => {
    io.to(roomId).emit('announcement', message);
  });
});
```

## 이벤트 기반 통신 패턴

Socket.IO는 이벤트 기반 통신을 사용합니다. 이벤트 이름과 데이터를 함께 전송합니다.

### 기본 패턴

```typescript
// 서버 → 클라이언트 (단일)
socket.emit('eventName', data);

// 서버 → 클라이언트 (Room 내 자신 제외)
socket.to(roomId).emit('eventName', data);

// 서버 → 클라이언트 (Room 내 모두)
io.to(roomId).emit('eventName', data);

// 서버 → 모든 클라이언트
io.emit('eventName', data);

// 클라이언트 → 서버
socket.emit('eventName', data);

// 클라이언트에서 서버 이벤트 수신
socket.on('eventName', (data) => {
  // 처리
});
```

### ChaosRPS.io 이벤트 설계

```typescript
// 클라이언트 → 서버 이벤트
interface ClientToServerEvents {
  'player:join': (data: { roomId: string; nickname: string }) => void;
  'player:leave': () => void;
  'player:move': (data: { input: PlayerMoveInput }) => void;
}

// 서버 → 클라이언트 이벤트
interface ServerToClientEvents {
  'player:joined': (data: { playerId: string; nickname: string }) => void;
  'player:left': (data: { playerId: string; nickname: string }) => void;
  'player:moved': (data: { playerId: string; input: PlayerMoveInput }) => void;
  'player:transform': (data: { playerId: string; newState: RPSState }) => void;
  'player:collision': (data: { winnerId: string; loserId: string }) => void;
  'game:state': (state: GameState) => void;
  'game:ranking': (data: { ranking: RankingEntry[] }) => void;
  'error': (data: { message: string }) => void;
}
```

## 연결 관리

### 연결 상태 처리

```typescript
// 클라이언트 측
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  reconnection: true,           // 자동 재연결 활성화
  reconnectionAttempts: 5,      // 최대 재연결 시도 횟수
  reconnectionDelay: 1000,      // 재연결 시도 간격 (ms)
  reconnectionDelayMax: 5000,   // 최대 재연결 간격
  timeout: 20000,               // 연결 타임아웃
});

// 연결 성공
socket.on('connect', () => {
  console.log('서버에 연결됨:', socket.id);
});

// 연결 해제
socket.on('disconnect', (reason) => {
  console.log('연결 해제:', reason);
  // reason: 'io server disconnect', 'io client disconnect', 
  //         'ping timeout', 'transport close', 'transport error'
});

// 재연결 시도
socket.on('reconnect_attempt', (attemptNumber) => {
  console.log(`재연결 시도 ${attemptNumber}회`);
});

// 재연결 성공
socket.on('reconnect', (attemptNumber) => {
  console.log(`${attemptNumber}회 시도 후 재연결 성공`);
});

// 재연결 실패
socket.on('reconnect_failed', () => {
  console.log('재연결 실패');
});

// 에러
socket.on('connect_error', (error) => {
  console.error('연결 에러:', error.message);
});
```

### 서버 측 연결 관리

```typescript
// 서버 측
io.on('connection', (socket) => {
  // 연결된 클라이언트 정보
  console.log('새 연결:', {
    id: socket.id,
    address: socket.handshake.address,
    query: socket.handshake.query,
  });

  // 연결 해제 처리
  socket.on('disconnect', (reason) => {
    console.log(`연결 해제: ${socket.id} (${reason})`);
    // 정리 작업 수행
  });

  // 에러 처리
  socket.on('error', (error) => {
    console.error(`소켓 에러: ${socket.id}`, error);
  });
});
```

## 게임에서의 활용

### 게임 상태 동기화

```typescript
// 서버: 60Hz로 게임 상태 브로드캐스트
const TICK_RATE = 60;
const TICK_INTERVAL = 1000 / TICK_RATE;

setInterval(() => {
  for (const room of gameRooms.values()) {
    const state = room.getState();
    io.to(room.id).emit('game:state', state);
  }
}, TICK_INTERVAL);
```

### 입력 처리

```typescript
// 클라이언트: 입력 전송
function sendInput(direction: { x: number; y: number }) {
  socket.emit('player:move', {
    input: {
      direction,
      timestamp: Date.now(),
    },
  });
}

// 서버: 입력 수신 및 처리
socket.on('player:move', (data) => {
  const room = getPlayerRoom(socket.id);
  if (room) {
    room.queueInput(socket.id, data.input);
  }
});
```

## 보안 고려사항

1. **입력 검증**: 모든 클라이언트 입력을 서버에서 검증
2. **속도 제한**: 이벤트 발생 빈도 제한 (Rate Limiting)
3. **인증**: 연결 시 토큰 검증
4. **CORS 설정**: 허용된 출처만 연결 허용

```typescript
const io = new Server(httpServer, {
  cors: {
    origin: ['https://yourgame.com'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// 연결 시 인증
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (isValidToken(token)) {
    next();
  } else {
    next(new Error('인증 실패'));
  }
});
```

## 정리

| 개념 | 설명 |
|------|------|
| WebSocket | 양방향 실시간 통신 프로토콜 |
| Socket.IO | WebSocket 기반 실시간 통신 라이브러리 |
| Room | 소켓 그룹화 단위 (게임 방) |
| 이벤트 | 메시지 타입 식별자 |
| 브로드캐스트 | 여러 클라이언트에 동시 전송 |

## 참고 자료

- [Socket.IO 공식 문서](https://socket.io/docs/v4/)
- [WebSocket MDN 문서](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [실시간 게임 네트워킹](https://gafferongames.com/post/what_every_programmer_needs_to_know_about_game_networking/)
