# 1.4.3 업데이트 계획서

> **작성일**: 2026-01-02  
> **기반**: 1.4.2 사용자 및 운영자 피드백  
> **목표**: slither.io 수준의 성능과 완성도 달성

---

## 📋 개요

1.4.2 버전 선공개를 통해 수집된 사용자 및 운영자 피드백을 바탕으로 작성된 업데이트 계획입니다. 성능 최적화, UI/UX 개선, 버그 수정, 신규 기능 추가를 포함합니다.

---

## 🎯 핵심 개선 목표

| 영역 | 목표 | 우선순위 |
|------|------|----------|
| **성능** | 초기 렉 제거, 입력 응답성 향상, 크로스 브라우저 최적화 | 🔴 HIGH |
| **UI/UX** | 반응형 디자인, RPS 가시성 강화, 모바일 화질 개선 | 🟡 MEDIUM |
| **버그** | RPS 타이머/URL 동기화/브라우저 감지 수정 | 🔴 HIGH |
| **기능** | 커스텀 방 재입장, 피드백 채널, 성능 모니터링 | 🟢 LOW-MEDIUM |

---

## 🚀 1. 성능 최적화

### 1.1 게임 시작 시 초기 렉 제거

**문제 진단**
- 사용자 피드백: "게임을 시작한 순간에 렉이 좀 심하고, 1초 정도 지나면 완전히 부드러워집니다."
- **원인 추정**:
  1. Phaser 게임 엔진 초기화 시 대량의 텍스처/스프라이트 로딩
  2. WebGL 컨텍스트 생성 및 셰이더 컴파일
  3. 초기 게임 상태 동기화 시 대량의 엔티티 렌더링

**해결 방안**

#### 1.1.1 에셋 사전 로딩 (Preloading)
**파일**: `client/src/scenes/`에 `PreloadScene.ts` 추가

```typescript
// 새로운 Preload Scene 생성
class PreloadScene extends Phaser.Scene {
  preload() {
    // 모든 에셋을 미리 로드
    // 프로그레스 바 UI 표시
  }
}
```

- **작업**: 로딩 화면에서 모든 텍스처, 사운드 사전 로딩
- **예상 효과**: 게임 시작 시 동기 로딩 제거

#### 1.1.2 점진적 렌더링 (Progressive Rendering)
**파일**: `client/src/game/PlayerRenderer.ts`

- **작업**: 
  - 초기 프레임에 가까운 플레이어만 렌더링 (거리 기반 LOD)
  - 이후 프레임에서 점진적으로 원거리 객체 추가
- **예상 효과**: 초기 렌더링 부하 25-40% 감소

#### 1.1.3 WebGL Shader 사전 컴파일
**파일**: `client/src/game/config.ts`

```typescript
// Phaser 설정에 추가
render: {
  powerPreference: 'high-performance',
  batchSize: 2048, // 배치 크기 최적화
}
```

- **작업**: 게임 시작 전 셰이더 컴파일 완료
- **예상 효과**: 첫 프레임 렌더링 시간 단축

---

### 1.2 마우스 입력 딜레이 개선

**문제 진단**
- 사용자 피드백: "마우스 위치를 변경해도 아바타가 따라가는 딜레이가 있는 것 같습니다."
- **원인 추정**:
  1. 입력 → 서버 → 클라이언트 렌더링 파이프라인 지연
  2. 서버 권위 모델로 인한 네트워크 왕복 시간 (RTT)
  3. 클라이언트 예측 미적용

**해결 방안**

#### 1.2.1 클라이언트 예측 (Client-Side Prediction)
**파일**: `client/src/game/PlayerRenderer.ts`, `client/src/services/SocketService.ts`

- **작업**: 
  ```typescript
  // 로컬 플레이어는 즉시 이동 (예측)
  if (player.id === localPlayerId) {
    player.x = mouseX;
    player.y = mouseY;
  }
  
  // 서버 응답 시 위치 보정 (Reconciliation)
  onServerUpdate((serverState) => {
    if (Math.abs(predictedX - serverX) > THRESHOLD) {
      smoothCorrection(serverX, serverY);
    }
  });
  ```
- **예상 효과**: 체감 입력 지연 50-70ms → 0-10ms

#### 1.2.2 입력 전송 최적화
**파일**: `client/src/services/SocketService.ts`

- **작업**: 
  - 입력 이벤트 쓰로틀링 제거 (현재 60Hz → 무제한)
  - requestAnimationFrame 동기화
- **예상 효과**: 입력 샘플링 주기 단축

---

### 1.3 특정 하드웨어 환경 성능 문제 해결

**문제 진단**
- 사용자 피드백: "하드웨어 스펙, 네트워크 상태 모든 게 더 좋은 상태인데, 다른 컴퓨터에 비해서 렉이 걸립니다."
- 운영자 피드백: "일부 컴퓨터에서는 아무 문제 없이 진행되지만, 일부 컴퓨터에서는 문제가 발생되고 있습니다."
- **원인 추정**:
  1. GPU 벤더별 WebGL 드라이버 호환성 이슈
  2. 통합 그래픽 vs 전용 그래픽 성능 차이
  3. 브라우저 하드웨어 가속 미활성화
  4. V-Sync/프레임 제한 설정 차이

**해결 방안**

#### 1.3.1 적응형 품질 설정 (Adaptive Quality)
**파일**: `client/src/game/config.ts`, `client/src/utils/performanceMonitor.ts` (신규)

- **작업**:
  ```typescript
  // 실시간 FPS 모니터링
  class PerformanceMonitor {
    detectPerformanceTier() {
      // FPS < 30: LOW
      // FPS 30-50: MEDIUM
      // FPS > 50: HIGH
    }
    
    adjustQuality(tier: 'LOW' | 'MEDIUM' | 'HIGH') {
      // LOW: 파티클 감소, 그림자 제거, 해상도 0.75x
      // MEDIUM: 일부 효과 감소
      // HIGH: 모든 효과 활성화
    }
  }
  ```
- **예상 효과**: 저성능 환경에서도 안정적인 30+ FPS 보장

#### 1.3.2 WebGL 컨텍스트 복원 처리
**파일**: `client/src/game/config.ts`

- **작업**: 
  ```typescript
  // WebGL 컨텍스트 손실 시 복원
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    showWarning('GPU 오류 감지, 재시작 중...');
  });
  
  canvas.addEventListener('webglcontextrestored', () => {
    reinitializeGame();
  });
  ```
- **예상 효과**: GPU 크래시 복구 가능

#### 1.3.3 fallback 렌더러 (Canvas 2D)
**파일**: `client/src/game/config.ts`

- **작업**: 
  ```typescript
  render: {
    type: Phaser.AUTO, // WebGL 실패 시 자동으로 Canvas 2D
    failIfMajorPerformanceCaveat: false, // 통합 그래픽도 허용
  }
  ```
- **예상 효과**: WebGL 미지원 환경 대응

---

## 🎨 2. UI/UX 개선

### 2.1 반응형 UI (다양한 디스플레이 크기 대응)

**문제 진단**
- 사용자 피드백: "24,27인치 등 디스플레이의 크기를 고려하지 않은 UI 디자인이라고 느껴집니다."
- **원인 추정**: 고정 크기 UI 요소가 대형 모니터에서 너무 작거나 작은 화면에서 너무 큼

**해결 방안**

#### 2.1.1 뷰포트 기반 스케일링
**파일**: `client/src/App.tsx`, `client/src/index.css`

- **작업**:
  ```css
  /* Tailwind config 수정 */
  /* 기본 기준: 1920x1080 (24인치) */
  /* 27인치 (2560x1440): 1.33배 스케일 */
  html {
    font-size: clamp(12px, 0.8vw, 20px);
  }
  
  .game-ui {
    --scale: min(100vw / 1920, 100vh / 1080);
    transform: scale(var(--scale));
  }
  ```
- **예상 효과**: 모든 해상도에서 적절한 UI 크기 유지

#### 2.1.2 동적 캔버스 크기 조정
**파일**: `client/src/game/config.ts`

- **작업**:
  ```typescript
  scale: {
    mode: Phaser.Scale.RESIZE,
    parent: 'game-container',
    width: '100%',
    height: '100%',
  }
  ```
- **예상 효과**: 게임 화면이 창 크기에 맞게 자동 조정

---

### 2.2 RPS 상태 가시성 강화

**문제 진단**
- 사용자 피드백: "RPS 상태의 가시성이 떨어지는 것 같습니다."
- **원인 추정**: 
  1. 아이콘 크기가 작거나 색상 대비가 약함
  2. 다른 UI 요소에 가려짐
  3. 애니메이션이 부족하여 변화 감지 어려움

**해결 방안**

#### 2.2.1 RPS 아이콘 강화
**파일**: `client/src/game/PlayerRenderer.ts`

- **작업**:
  - 아이콘 크기 1.5배 증가
  - 배경 원형 테두리 추가 (발광 효과)
  - 변신 시 펄스 애니메이션 (0.3초 크기 변화)
  ```typescript
  // 예시 코드
  const rpsIcon = this.add.sprite(x, y, 'rps', state);
  rpsIcon.setScale(1.5); // 크기 증가
  
  // 배경 원
  const bgCircle = this.add.graphics();
  bgCircle.fillStyle(0xffffff, 0.3);
  bgCircle.fillCircle(x, y, 40);
  
  // 변신 시 애니메이션
  onTransform(() => {
    this.tweens.add({
      targets: rpsIcon,
      scale: { from: 1.5, to: 2.0 },
      duration: 150,
      yoyo: true,
    });
  });
  ```
- **예상 효과**: RPS 상태 즉각 인지 가능

#### 2.2.2 UI 레이어 재정렬
**파일**: `client/src/game/PlayerRenderer.ts`

- **작업**: RPS 아이콘을 최상단 레이어로 이동 (depth 증가)
- **예상 효과**: 다른 객체에 가려지지 않음

---

### 2.3 모바일 아바타 화질 개선

**문제 진단**
- 사용자 피드백: "PC 환경에 비해서 너무나도 아바타 화질이 떨어집니다."
- **원인 추정**:
  1. 모바일에서 텍스처 해상도 자동 다운스케일
  2. Phaser 기본 안티앨리어싱 설정
  3. 모바일 디바이스 픽셀 비율(DPR) 미적용

**해결 방안**

#### 2.3.1 고해상도 텍스처 사용
**파일**: `client/src/assets/`, `client/src/game/config.ts`

- **작업**:
  - 현재 텍스처를 2배 해상도로 교체 (예: 64x64 → 128x128)
  - `@2x`, `@3x` 멀티플 텍스처 준비
  ```typescript
  // DPR 기반 텍스처 선택
  const textureKey = window.devicePixelRatio >= 2 ? 'player@2x' : 'player';
  ```
- **예상 효과**: Retina/고해상도 디스플레이 대응

#### 2.3.2 안티앨리어싱 강화
**파일**: `client/src/game/config.ts`

- **작업**:
  ```typescript
  render: {
    antialias: true,
    antialiasGL: true,
    pixelArt: false, // 부드러운 스케일링
  }
  ```
- **예상 효과**: 모바일에서도 부드러운 렌더링

---

## 🐛 3. 버그 수정

### 3.1 RPS 타이머 만료 후 상태 변경 안됨

**문제 진단**
- 사용자 피드백: "타이머가 다 지나가도 RPS 상태가 변경되지 않습니다."
- **원인 추정**:
  1. 클라이언트 타이머와 서버 타이머 동기화 오류
  2. 서버에서 상태 변경 이벤트 미전송
  3. 클라이언트에서 상태 업데이트 이벤트 미처리

**해결 방안**

#### 3.1.1 서버 상태 변경 로직 검증
**파일**: `server/src/game/GameRoom.ts`

- **작업**:
  ```typescript
  // GameRoom.ts의 변신 로직 확인
  private handleTransform() {
    const now = Date.now();
    if (now - this.lastTransformTime >= TRANSFORM_INTERVAL_MS) {
      this.lastTransformTime = now;
      
      // 모든 플레이어 상태 변경
      this.players.forEach(player => {
        player.transform(); // ✅ 이 부분 검증 필요
      });
      
      // 클라이언트에 브로드캐스트
      this.broadcast('transform', {
        timestamp: now,
        nextTransformTime: now + TRANSFORM_INTERVAL_MS
      }); // ✅ 이벤트 전송 확인
    }
  }
  ```
- **테스트**: 단위 테스트 추가하여 타이머 정확성 검증

#### 3.1.2 클라이언트 이벤트 핸들러 검증
**파일**: `client/src/services/SocketService.ts`

- **작업**:
  ```typescript
  // transform 이벤트 리스너 확인
  socket.on('transform', (data) => {
    console.log('[DEBUG] Transform event received:', data);
    gameScene.handleTransform(data); // ✅ 호출 확인
  });
  ```
- **테스트**: 브라우저 콘솔 로그로 이벤트 수신 확인

---

### 3.2 방 만들기 URL 코드 동기화 문제

**문제 진단**
- 사용자 피드백: "방만들기 → 코드 생성 → 링크 복사 → 접속을 한 경우 링크가 '주소?=CODE=코드' 형식으로 생성이 됩니다. 이때 로비로 이동 후 다시 방을 만든 경우 사용자에게는 코드가 변경된 채로 전송이 되지만, 현재 제 주소는 변경되지 않습니다."
- **원인 추정**: 
  1. URL 쿼리 파라미터 업데이트가 브라우저 히스토리에 반영되지 않음
  2. React Router 또는 상태 관리 문제

**해결 방안**

#### 3.2.1 URL 동기화 로직 수정
**파일**: `client/src/App.tsx` 또는 라우팅 관련 파일

- **작업**:
  ```typescript
  // 새 방 생성 시 URL 업데이트
  const createRoom = (newCode: string) => {
    // URL 파라미터 업데이트
    const url = new URL(window.location.href);
    url.searchParams.set('code', newCode);
    
    // 히스토리 업데이트 (replace: 뒤로가기 방지)
    window.history.replaceState({}, '', url.toString());
    
    setRoomCode(newCode);
  };
  
  // 로비로 이동 시 코드 제거
  const leaveRoom = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    window.history.replaceState({}, '', url.toString());
    
    setRoomCode(null);
  };
  ```
- **예상 효과**: URL과 실제 방 코드 항상 동기화

---

### 3.3 삼성 브라우저 저성능 브라우저 오판 수정

**문제 진단**
- 운영자 피드백: "삼성 브라우저는 저성능 브라우저가 아니지만, 저성능 브라우저로 판단하고 크롬 브라우저로 이동시키는 정책이 존재하고 있습니다. 브라우저 이동 정책은 오직 인앱브라우저인 경우 → 외부 브라우저로 이동하도록 권장하는 것 뿐입니다."
- **원인**: `deviceDetector.ts`에서 삼성 브라우저를 저성능으로 분류

**해결 방안**

#### 3.3.1 브라우저 감지 로직 수정
**파일**: `client/src/utils/deviceDetector.ts`

- **작업**:
  ```typescript
  // 삼성 브라우저를 slowBrowser에서 제거
  export function detectSlowBrowser(userAgent?: string): SlowBrowserType {
    const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  
    // ❌ 삼성 브라우저 제거
    // if (/SamsungBrowser/i.test(ua)) return 'samsung';
    
    // UC 브라우저
    if (/UCBrowser/i.test(ua)) return 'ucbrowser';
    // Opera Mini
    if (/Opera Mini/i.test(ua)) return 'opera-mini';
  
    return null;
  }
  ```

#### 3.3.2 SlowBrowserWarning 컴포넌트 수정
**파일**: `client/src/components/ui/SlowBrowserWarning.tsx`

- **작업**:
  ```typescript
  // SlowBrowserType에서 'samsung' 제거
  export type SlowBrowserType = 'ucbrowser' | 'opera-mini' | null;
  
  // BROWSER_NAMES에서도 제거
  const BROWSER_NAMES: Record<Exclude<SlowBrowserType, null>, string> = {
    // samsung: '삼성 인터넷', // ❌ 삭제
    ucbrowser: 'UC 브라우저',
    'opera-mini': 'Opera Mini',
  };
  ```

#### 3.3.3 테스트 수정
**파일**: `client/src/utils/__tests__/deviceDetector.property.test.ts`

- **작업**: 삼성 브라우저 관련 테스트 케이스 업데이트
- **예상 효과**: 삼성 브라우저 사용자는 경고 없이 게임 플레이 가능

---

## ✨ 4. 신규 기능

### 4.1 사망 후 같은 방 재입장 (커스텀 방 전용)

**요구사항**
- 사용자 피드백: "방 만들기로 친구들끼리 게임을 하다가 죽으면 다시하기를 누른 경우 다른 방으로 이동됩니다. 친구들이랑 같은 방에 계속 하고 싶습니다."
- **중요**: 오직 방만들기로 생성된 커스텀 방에서만 동작

**해결 방안**

#### 4.1.1 방 타입 구분
**파일**: `shared/src/types.ts`

- **작업**:
  ```typescript
  // 방 타입 추가
  export type RoomType = 'public' | 'custom';
  
  export interface Room {
    id: string;
    type: RoomType; // 신규 필드
    code?: string; // 커스텀 방만 코드 보유
    maxPlayers: number;
    currentPlayers: number;
  }
  ```

#### 4.1.2 서버 로직 수정
**파일**: `server/src/game/GameRoom.ts`

- **작업**:
  ```typescript
  class GameRoom {
    type: RoomType;
    
    // 플레이어 사망 시
    onPlayerDeath(playerId: string) {
      const player = this.players.get(playerId);
      
      // 커스텀 방이면 재입장 정보 전송
      if (this.type === 'custom') {
        this.io.to(playerId).emit('death', {
          canRejoin: true,
          roomCode: this.code,
        });
      } else {
        // 퍼블릭 방은 기존 동작 (새 방 찾기)
        this.io.to(playerId).emit('death', {
          canRejoin: false,
        });
      }
    }
  }
  ```

#### 4.1.3 클라이언트 UI 수정
**파일**: `client/src/components/DeathScreen.tsx` (신규 또는 기존 파일)

- **작업**:
  ```tsx
  // 사망 화면
  function DeathScreen({ canRejoin, roomCode }: DeathScreenProps) {
    const handleRespawn = () => {
      if (canRejoin && roomCode) {
        // 같은 방에 재입장
        socket.emit('rejoin', { roomCode });
      } else {
        // 새 방 찾기
        socket.emit('findMatch');
      }
    };
    
    return (
      <div>
        <h1>사망!</h1>
        <button onClick={handleRespawn}>
          {canRejoin ? '같은 방에서 다시하기' : '다시하기'}
        </button>
      </div>
    );
  }
  ```

- **예상 효과**: 커스텀 방에서는 친구들과 계속 플레이, 퍼블릭 방은 기존 동작 유지

---

### 4.2 다국어 피드백 채널

**요구사항**
- 운영자 피드백: "다양한 국가의 사용자들이 조금 더 편하게 문의를 할 수 있는 채널이 생기면 좋을 것 같습니다."

**해결 방안**

#### 4.2.1 인게임 피드백 버튼 추가
**파일**: `client/src/components/ui/FeedbackButton.tsx` (신규)

- **작업**:
  ```tsx
  // UI 우측 하단에 피드백 버튼
  function FeedbackButton() {
    const { t } = useTranslation();
    
    const openFeedback = () => {
      // Google Forms 또는 Typeform 링크
      // 사용자 언어에 따라 다른 폼 제공
      const lang = getCurrentLanguage();
      const formUrl = FEEDBACK_FORMS[lang] || FEEDBACK_FORMS['en'];
      window.open(formUrl, '_blank');
    };
    
    return (
      <button onClick={openFeedback}>
        💬 {t('feedback.button')}
      </button>
    );
  }
  ```

#### 4.2.2 다국어 지원
**파일**: `client/src/i18n/locales/en.json`, `ko.json`

- **작업**:
  ```json
  {
    "feedback": {
      "button": "Feedback",
      "title": "Send Feedback",
      "placeholder": "Please share your experience..."
    }
  }
  ```

#### 4.2.3 대안: Discord 통합
- Discord 서버 링크 제공 (언어별 채널 분리)
- 게임 내 버튼으로 Discord 초대 링크 오픈

- **예상 효과**: 전 세계 사용자 피드백 수집 용이

---

### 4.3 성능 모니터링 / 텔레메트리 시스템

**요구사항**
- 운영자 피드백: "모든 사용자들이 피드백을 남기는 것이 아니기 때문에, 사용자가 피드백을 남기지 않더라도 사용자가 얼마나 부드럽게 게임이 되고 있는지 게임에는 문제가 없는지에 대한 정보를 얻고 싶습니다."

**해결 방안**

#### 4.3.1 클라이언트 성능 데이터 수집
**파일**: `client/src/utils/performanceMonitor.ts` (신규), `client/src/services/TelemetryService.ts` (신규)

- **작업**:
  ```typescript
  // 성능 지표 수집
  class PerformanceMonitor {
    private fps: number[] = [];
    private frameDrops: number = 0;
    private inputLatency: number[] = [];
    
    recordFrame(delta: number) {
      const fps = 1000 / delta;
      this.fps.push(fps);
      
      if (fps < 30) this.frameDrops++;
    }
    
    getMetrics() {
      return {
        avgFps: average(this.fps),
        minFps: Math.min(...this.fps),
        frameDrops: this.frameDrops,
        avgInputLatency: average(this.inputLatency),
      };
    }
  }
  
  // 텔레메트리 전송 (익명)
  class TelemetryService {
    async sendReport(metrics: PerformanceMetrics) {
      // 개인정보 제외, 익명 UUID만 전송
      await fetch('/api/telemetry', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: generateUUID(),
          timestamp: Date.now(),
          metrics,
          deviceInfo: {
            userAgent: navigator.userAgent,
            screen: `${screen.width}x${screen.height}`,
            devicePixelRatio: window.devicePixelRatio,
          },
        }),
      });
    }
  }
  ```

#### 4.3.2 서버 텔레메트리 엔드포인트
**파일**: `server/src/routes/telemetry.ts` (신규)

- **작업**:
  ```typescript
  // POST /api/telemetry
  fastify.post('/api/telemetry', async (request, reply) => {
    const data = request.body;
    
    // 데이터베이스 또는 로그 파일에 저장
    await saveTelemetry(data);
    
    // 실시간 모니터링 대시보드 업데이트
    updateDashboard(data);
    
    return { success: true };
  });
  ```

#### 4.3.3 데이터 분석 및 대시보드
- **도구**: Grafana, Prometheus, 또는 Google Analytics
- **수집 지표**:
  - 평균/최소 FPS
  - 프레임 드롭 빈도
  - 입력 지연 시간
  - WebGL vs Canvas 사용률
  - 브라우저/OS 분포
  - 에러 발생률

- **개인정보 보호**: 
  - 닉네임, IP 주소 등 개인정보 수집 금지
  - 익명 세션 ID만 사용
  - GDPR/개인정보보호법 준수

- **예상 효과**: 
  - 문제가 발생하는 환경 식별 (예: "AMD GPU + Firefox에서 평균 FPS 20")
  - A/B 테스트 및 최적화 효과 측정

---

## 📊 5. 테스트 전략

### 5.1 성능 테스트

**테스트 환경**
- **저사양**: Intel HD Graphics, 4GB RAM, Chrome
- **중사양**: GTX 1050, 8GB RAM, Firefox
- **고사양**: RTX 3060, 16GB RAM, Edge
- **모바일**: iPhone 12 Safari, Galaxy S21 Samsung Browser

**테스트 항목**
1. ✅ 게임 시작 시 첫 1초 FPS (목표: 55+ FPS)
2. ✅ 마우스 입력 → 화면 반영 지연 (목표: 20ms 이하)
3. ✅ 20명 풀방에서 안정적 FPS (목표: 30+ FPS)

**도구**
- Phaser FPS counter
- Chrome DevTools Performance 프로파일링
- 수동 입력 지연 측정 (마우스 이동 → 스크린샷 타임스탬프)

---

### 5.2 UI/UX 테스트

**테스트 환경**
- **디스플레이**: 24인치 FHD, 27인치 QHD, 32인치 4K
- **모바일**: iPhone SE (작은 화면), iPad Pro (큰 화면)

**테스트 항목**
1. ✅ 모든 해상도에서 UI 요소 가독성
2. ✅ RPS 아이콘 5m 거리에서 육안 식별 가능
3. ✅ 모바일 텍스처 선명도 (PC와 비교)

---

### 5.3 버그 수정 검증

**테스트 시나리오**

#### 3.1 RPS 타이머
1. 게임 입장
2. 타이머 4초 대기
3. ✅ 정확히 4초 후 RPS 상태 변경 확인
4. ✅ 클라이언트 UI 타이머와 실제 변경 타이밍 일치

#### 3.2 URL 동기화
1. 방 만들기 → 코드 A 생성
2. URL에 `?code=A` 확인
3. 로비 이동 → URL에 code 파라미터 제거 확인
4. 다시 방 만들기 → 코드 B 생성
5. ✅ URL이 `?code=B`로 업데이트 확인

#### 3.3 삼성 브라우저
1. 삼성 인터넷 브라우저로 접속
2. ✅ 저성능 경고 표시 안됨
3. ✅ 인앱 브라우저일 경우만 외부 브라우저 권장

---

### 5.4 신규 기능 테스트

#### 4.1 커스텀 방 재입장
1. 친구와 커스텀 방 생성
2. 게임 플레이 중 사망
3. ✅ "같은 방에서 다시하기" 버튼 표시
4. 버튼 클릭 → ✅ 같은 방 코드로 재입장
5. 퍼블릭 방에서 사망 → ✅ 일반 "다시하기" 동작

#### 4.2 피드백 채널
1. 게임 화면에서 피드백 버튼 클릭
2. ✅ 현재 언어에 맞는 피드백 폼 오픈
3. 한국어 사용자 → 한국어 폼, 영어 사용자 → 영어 폼

#### 4.3 텔레메트리
1. 게임 플레이 5분
2. ✅ 서버에 텔레메트리 데이터 전송 확인
3. ✅ 대시보드에 FPS, 입력 지연 그래프 표시
4. ✅ 개인정보 미포함 확인

---

## 📅 6. 개발 일정 (예상)

| 단계 | 작업 | 예상 기간 | 우선순위 |
|------|------|-----------|----------|
| **1주차** | 버그 수정 (3.1~3.3) | 3일 | 🔴 HIGH |
| **1주차** | 성능 최적화 - 초기 렉, 입력 딜레이 (1.1~1.2) | 4일 | 🔴 HIGH |
| **2주차** | UI/UX 개선 (2.1~2.3) | 5일 | 🟡 MEDIUM |
| **2주차** | 성능 최적화 - 적응형 품질 (1.3) | 2일 | 🟡 MEDIUM |
| **3주차** | 신규 기능 - 커스텀 방 재입장 (4.1) | 3일 | 🟢 MEDIUM |
| **3주차** | 신규 기능 - 피드백 채널 (4.2) | 1일 | 🟢 LOW |
| **3주차** | 신규 기능 - 텔레메트리 (4.3) | 3일 | 🟢 MEDIUM |
| **4주차** | 통합 테스트 및 QA | 5일 | 🔴 HIGH |
| **4주차** | 배포 및 모니터링 | 2일 | 🔴 HIGH |

**총 예상 기간**: 약 4주

---

## 🎯 7. 성공 지표 (KPI)

| 지표 | 현재 (1.4.2) | 목표 (1.4.3) |
|------|--------------|--------------|
| **초기 프레임 FPS** | 15-25 FPS | 50+ FPS |
| **입력 지연** | 50-70ms | 0-20ms |
| **모바일 화질 만족도** | 낮음 (피드백) | 높음 |
| **RPS 가시성 불만** | 여러 건 | 0건 |
| **버그 리포트** | 3건 | 0건 |
| **텔레메트리 커버리지** | 0% | 80%+ |

---

## 📝 8. 변경 파일 요약

### Client
- ✅ **수정**: `client/src/components/ui/SlowBrowserWarning.tsx` - 삼성 브라우저 제거
- ✅ **수정**: `client/src/utils/deviceDetector.ts` - 저성능 브라우저 로직 수정
- ✅ **수정**: `client/src/game/PlayerRenderer.ts` - RPS 가시성, 입력 예측, 렌더링 최적화
- ✅ **수정**: `client/src/game/config.ts` - WebGL 설정 최적화
- ✅ **수정**: `client/src/App.tsx` - URL 동기화, 반응형 UI
- ✅ **수정**: `client/src/services/SocketService.ts` - 입력 전송, 이벤트 핸들러
- ✅ **신규**: `client/src/scenes/PreloadScene.ts` - 에셋 사전 로딩
- ✅ **신규**: `client/src/utils/performanceMonitor.ts` - 성능 모니터링
- ✅ **신규**: `client/src/services/TelemetryService.ts` - 텔레메트리
- ✅ **신규**: `client/src/components/ui/FeedbackButton.tsx` - 피드백 버튼
- ✅ **신규**: `client/src/components/DeathScreen.tsx` - 사망 화면 (재입장 로직)
- ✅ **수정**: `client/src/index.css` - 반응형 스케일링

### Server
- ✅ **수정**: `server/src/game/GameRoom.ts` - 타이머 검증, 커스텀 방 재입장
- ✅ **신규**: `server/src/routes/telemetry.ts` - 텔레메트리 API

### Shared
- ✅ **수정**: `shared/src/types.ts` - Room 타입에 `type: RoomType` 추가
- ✅ **추가**: `shared/src/types.ts` - `RoomType`, `PerformanceMetrics` 타입 정의

### Tests
- ✅ **수정**: `client/src/utils/__tests__/deviceDetector.property.test.ts` - 삼성 브라우저 테스트 제거
- ✅ **신규**: `server/src/game/__tests__/GameRoom.test.ts` - 타이머 정확성 테스트
- ✅ **신규**: `client/src/utils/__tests__/performanceMonitor.test.ts` - 성능 모니터 테스트

---

## ⚠️ 리스크 및 대응 방안

### 1. 클라이언트 예측으로 인한 동기화 오류
- **리스크**: 로컬 예측과 서버 상태 불일치 시 캐릭터 순간이동
- **대응**: 
  - 서버 권위 유지, 차이가 일정 임계값 이상일 때만 보정
  - 부드러운 보간 (Lerp) 사용

### 2. 텔레메트리 데이터 폭증
- **리스크**: 수천 명 사용자 데이터로 서버 부하
- **대응**: 
  - 샘플링 (10% 사용자만 수집)
  - 배치 전송 (5분마다 1회)
  - 데이터 압축

### 3. 모바일 고해상도 텍스처로 인한 메모리 부족
- **리스크**: 저사양 모바일에서 OOM (Out of Memory)
- **대응**: 
  - 기기 메모리 감지 후 동적 텍스처 선택
  - 텍스처 압축 포맷 사용 (ETC2, PVRTC)

---

## 📌 참고 사항

### 1. 서버 권위 원칙 준수
- 클라이언트 예측은 **시각적 개선**만을 위함
- 모든 게임 로직 판정은 서버에서 수행
- 충돌, 점수, 변신은 서버 검증 필수

### 2. 점진적 배포
- 1.4.3-beta: 성능 최적화 + 버그 수정만 먼저 배포
- 1.4.3-rc: 신규 기능 추가 후 베타 테스트
- 1.4.3-stable: 모든 검증 완료 후 정식 배포

### 3. 사용자 커뮤니케이션
- 업데이트 노트 작성 (한국어/영어)
- 주요 변경사항 게임 내 공지
- 피드백 채널 안내

---

## ✅ 다음 단계

1. ✅ **계획 검토**: 사용자 승인 대기
2. ⏳ **우선순위 조정**: 사용자 피드백 반영
3. ⏳ **개발 시작**: 버그 수정부터 착수
4. ⏳ **주간 진행 보고**: 매주 업데이트 공유

---

**작성자**: Antigravity AI  
**버전**: 1.0  
**마지막 업데이트**: 2026-01-02
