# Phaser 동적 임포트로 초기 로딩 시간 단축

## 문제
Phaser.js는 **1.4MB** 크기의 라이브러리입니다. 페이지 로드 시 즉시 파싱하면 메인 스레드가 오래 블로킹됩니다.

```typescript
// 정적 임포트: 페이지 로드 시 즉시 로드
import Phaser from 'phaser';

// 번들에 Phaser가 포함되어 EvaluateScript 시간 증가
```

## 해결책: 동적 임포트

```typescript
// 동적 임포트: 필요할 때만 로드
const initPhaser = async (container: HTMLElement, isMobile: boolean) => {
  const [Phaser, { getGameConfig }] = await Promise.all([
    import('phaser'),
    import('../../game/config'),
  ]);
  
  const config = getGameConfig(isMobile);
  return new Phaser.default.Game({
    ...config,
    parent: container,
  });
};

// 사용
useEffect(() => {
  initPhaser(containerRef.current, isMobile)
    .then(game => { gameRef.current = game; });
}, []);
```

## 작동 원리

### 정적 임포트
```
페이지 로드 → [index.js + phaser.js 파싱] → React 렌더링 → 게임 표시
                    ↑
              여기서 225ms 블로킹
```

### 동적 임포트
```
페이지 로드 → [index.js 파싱] → React 렌더링 → 로비 표시
                                                ↓ (사용자가 게임 시작)
                                          [phaser.js 로드] → 게임 표시
```

## 장점

### 1. 초기 TTI(Time to Interactive) 단축
- 로비 화면이 **먼저** 표시됨
- 사용자가 닉네임 입력하는 동안 Phaser 로드 가능

### 2. 코드 스플리팅과 결합
```typescript
// Vite가 자동으로 별도 청크로 분리
const Phaser = await import('phaser');
// → phaser.abc123.js 파일이 생성됨
```

### 3. 조건부 로딩
```typescript
// 로비에서는 Phaser 불필요
if (phase === 'playing') {
  const game = await initPhaser();
}
```

## 구현 패턴

### 패턴 1: useEffect 내 동적 임포트
```typescript
useEffect(() => {
  let game: Phaser.Game | null = null;
  
  const init = async () => {
    const Phaser = await import('phaser');
    game = new Phaser.Game(config);
  };
  
  init();
  
  return () => { game?.destroy(true); };
}, []);
```

### 패턴 2: React.lazy + Suspense
```typescript
const GameCanvas = lazy(() => import('./GameCanvas'));

// 사용
<Suspense fallback={<LoadingScreen />}>
  <GameCanvas />
</Suspense>
```

### 패턴 3: 프리로드 힌트
```html
<!-- 로비에서 미리 다운로드 시작 -->
<link rel="prefetch" href="/assets/phaser.js" />
```

## 주의사항

### 1. 로딩 상태 처리
```typescript
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  initPhaser().then(() => setIsLoading(false));
}, []);

if (isLoading) return <LoadingScreen />;
```

### 2. 에러 처리
```typescript
try {
  const Phaser = await import('phaser');
} catch (error) {
  console.error('Phaser 로드 실패:', error);
  // 폴백 처리
}
```

### 3. TypeScript 타입
```typescript
// 동적 임포트 시 타입 처리
const Phaser = await import('phaser');
const game = new Phaser.default.Game(config);  // .default 필요
```

## 성능 비교

| 방식 | 초기 파싱 | 게임 시작 시 |
|-----|---------|------------|
| 정적 임포트 | 225ms | 즉시 |
| 동적 임포트 | ~50ms | +200ms |

**Trade-off**: 초기 로딩 ↓, 게임 시작 시 로딩 ↑

## 최적 전략

```typescript
// 1. 로비 표시 즉시
// 2. 백그라운드에서 Phaser 프리로드
useEffect(() => {
  // 로비가 보이는 동안 미리 로드
  import('phaser');
}, []);

// 3. 게임 시작 시 이미 로드된 Phaser 사용
const startGame = async () => {
  const Phaser = await import('phaser');  // 캐시됨, 빠름
  // ...
};
```

## 결론
동적 임포트는 **"나중에 필요한 건 나중에"** 원칙을 코드 레벨에서 구현하는 방법입니다. IO 게임처럼 로비 화면이 있는 경우 특히 효과적입니다.
