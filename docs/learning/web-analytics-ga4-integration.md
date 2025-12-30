# 웹 게임 분석 시스템 구축 가이드

## 개요

웹 게임 서비스에서 사용자 행동을 분석하는 것은 서비스 개선과 성장에 필수적입니다. 본 문서에서는 클라이언트(Google Analytics 4)와 서버(자체 통계 서비스)를 활용한 이중 분석 시스템 구축 방법을 설명합니다.

## 분석 시스템 아키텍처

```
┌─────────────────┐     ┌─────────────────┐
│   클라이언트     │     │     서버        │
│  (GA4 분석)     │     │  (자체 통계)    │
├─────────────────┤     ├─────────────────┤
│ • 사용자 행동   │     │ • CCU 추적     │
│ • 세션 데이터   │     │ • 방 수 추적   │
│ • 이벤트 추적   │     │ • 게임 시작 수 │
│ • User Agent   │     │ • 피크 타임    │
└─────────────────┘     └─────────────────┘
```

## 1. 클라이언트 분석 (Google Analytics 4)

### GA4의 장점

- **자동 수집 데이터**: User Agent, 기기 정보, 지역, 언어 등이 자동으로 수집됩니다.
- **무료 사용**: 대부분의 기능을 무료로 사용할 수 있습니다.
- **실시간 대시보드**: 실시간 사용자 현황을 확인할 수 있습니다.

### 구현 방법

```typescript
// services/analytics.ts

/** GA4 Measurement ID */
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

/** GA4 초기화 여부 */
let isInitialized = false;

/**
 * GA4 초기화
 * 앱 시작 시 한 번만 호출합니다.
 */
export function initAnalytics(): void {
  if (!GA_MEASUREMENT_ID || isInitialized) return;

  // gtag 스크립트 동적 로드
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // dataLayer 초기화
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID);

  isInitialized = true;
}

/**
 * 커스텀 이벤트 전송
 */
function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  if (!isInitialized || !window.gtag) return;
  window.gtag('event', eventName, params);
}
```

### 추적할 이벤트

| 이벤트명 | 설명 | 파라미터 |
|---------|------|----------|
| `game_start` | 게임 시작 | `room_type` (public/private) |
| `game_end` | 게임 종료 | `play_time_seconds`, `final_score`, `kill_count`, `room_type` |
| `play_again` | 다시하기 클릭 | - |
| `share` | 공유 클릭 | `method` (code/link) |

### 이벤트 추적 함수 예시

```typescript
/**
 * 게임 시작 이벤트
 */
export function trackGameStart(roomType: 'public' | 'private'): void {
  trackEvent('game_start', { room_type: roomType });
}

/**
 * 게임 종료 이벤트
 */
export function trackGameEnd(params: {
  playTimeSeconds: number;
  finalScore: number;
  killCount: number;
  roomType: 'public' | 'private';
}): void {
  trackEvent('game_end', {
    play_time_seconds: params.playTimeSeconds,
    final_score: params.finalScore,
    kill_count: params.killCount,
    room_type: params.roomType,
  });
}
```

## 2. 서버 통계 서비스

### 서버 통계의 필요성

GA4만으로는 실시간 서버 상태(CCU, 활성 방 수 등)를 정확히 파악하기 어렵습니다. 서버에서 직접 통계를 수집하면 다음과 같은 이점이 있습니다:

- **정확한 CCU**: 소켓 연결 기반의 정확한 동시 접속자 수
- **서버 상태 모니터링**: 방 수, 게임 시작 수 등 서버 리소스 현황
- **스케일링 판단 근거**: 피크 CCU를 기반으로 서버 확장 시점 결정

### 구현 방법

```typescript
// services/StatsService.ts

interface ServerStats {
  currentCCU: number;
  peakCCU: number;
  peakCCUTime: Date | null;
  activeRooms: number;
  totalGamesStarted: number;
  serverStartTime: Date;
}

class StatsServiceClass {
  private currentCCU = 0;
  private peakCCU = 0;
  private peakCCUTime: Date | null = null;
  private activeRooms = 0;
  private totalGamesStarted = 0;
  private serverStartTime = new Date();

  /** 플레이어 연결 시 호출 */
  playerConnected(): void {
    this.currentCCU++;
    if (this.currentCCU > this.peakCCU) {
      this.peakCCU = this.currentCCU;
      this.peakCCUTime = new Date();
    }
  }

  /** 플레이어 연결 해제 시 호출 */
  playerDisconnected(): void {
    this.currentCCU = Math.max(0, this.currentCCU - 1);
  }

  /** 방 생성 시 호출 */
  roomCreated(): void {
    this.activeRooms++;
    this.totalGamesStarted++;
  }

  /** 방 종료 시 호출 */
  roomClosed(): void {
    this.activeRooms = Math.max(0, this.activeRooms - 1);
  }

  /** 현재 통계 조회 */
  getStats(): ServerStats {
    return {
      currentCCU: this.currentCCU,
      peakCCU: this.peakCCU,
      peakCCUTime: this.peakCCUTime,
      activeRooms: this.activeRooms,
      totalGamesStarted: this.totalGamesStarted,
      serverStartTime: this.serverStartTime,
    };
  }
}

export const StatsService = new StatsServiceClass();
```

### API 엔드포인트

```typescript
// 서버 통계 API
fastify.get('/stats', async () => {
  return StatsService.getStats();
});
```

## 3. 통합 사용 예시

### 소켓 연결 시

```typescript
io.on('connection', (socket) => {
  StatsService.playerConnected();
  
  socket.on('disconnect', () => {
    StatsService.playerDisconnected();
  });
});
```

### 게임 시작 시 (클라이언트)

```typescript
// GameCanvas.tsx
onConnect: () => {
  setConnectionStatus('connected');
  socketService.sendReady();
  trackGameStart(isPrivateRoom ? 'private' : 'public');
},
```

### 게임 종료 시 (클라이언트)

```typescript
// DeathScreen.tsx
useEffect(() => {
  const playTimeSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
  trackGameEnd({
    playTimeSeconds,
    finalScore: 0,
    killCount: 0,
    roomType: isPrivateRoom ? 'private' : 'public',
  });
}, []);
```

## 4. 환경 변수 설정

```bash
# .env.example
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

GA4 Measurement ID는 Google Analytics 콘솔에서 확인할 수 있습니다:
1. Google Analytics 접속
2. 관리 → 데이터 스트림 → 웹 스트림 선택
3. 측정 ID 복사 (G-XXXXXXXXXX 형식)

## 5. 분석 데이터 활용

### 스케일링 판단

| 피크 CCU | 권장 조치 |
|----------|----------|
| ~100 | 현재 인프라 유지 |
| 100~500 | 서버 스펙 업그레이드 고려 |
| 500~1000 | 전용 서버 또는 컨테이너 오케스트레이션 검토 |
| 1000+ | 멀티 리전 배포 및 로드 밸런싱 필수 |

### 사용자 행동 분석

- **평균 플레이 시간**: 게임 밸런스 조정 지표
- **다시하기 비율**: 게임 중독성 지표
- **공유 비율**: 바이럴 성장 가능성 지표

## 결론

클라이언트(GA4)와 서버(자체 통계)를 조합한 이중 분석 시스템은 웹 게임 서비스의 성장과 안정성을 위한 필수 인프라입니다. GA4는 사용자 행동과 마케팅 분석에, 서버 통계는 인프라 모니터링과 스케일링 판단에 활용하는 것이 효과적입니다.
