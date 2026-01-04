# Vite 코드 스플리팅으로 초기 번들 크기 줄이기

## 문제
단일 번들에 모든 라이브러리가 포함되면 초기 파싱/실행 시간이 길어집니다.

```
// 변경 전: 단일 번들
index.js → 1.7MB (Phaser + React + 게임 코드 모두 포함)
```

225ms의 `EvaluateScript`가 발생한 원인입니다.

## 해결책: manualChunks 설정

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Phaser를 별도 청크로 분리 (~1.4MB)
          phaser: ['phaser'],
          // React + 상태관리 + 네트워크
          vendor: ['react', 'react-dom', 'zustand', 'socket.io-client'],
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
});
```

## 빌드 결과

```
변경 전:
  index.js     → 1,700 kB

변경 후:
  index.js     →    76 kB  ← 메인 번들 (95% 감소!)
  vendor.js    →   186 kB  ← 별도 캐싱 가능
  phaser.js    → 1,478 kB  ← 별도 캐싱 가능
```

## 왜 효과적인가?

### 1. 초기 실행 시간 단축
- 브라우저는 **모든 JS를 파싱한 후** 실행
- 76KB 파싱 vs 1.7MB 파싱 → 큰 차이

### 2. 캐싱 효율
- `phaser.js`는 거의 변경되지 않음 → 브라우저 캐시 활용
- 게임 로직 변경 시 `index.js`만 다시 다운로드

### 3. 병렬 다운로드
- HTTP/2에서 여러 청크를 동시에 다운로드
- 단일 파일보다 빠른 전체 로딩

## 청크 분리 전략

| 청크 | 포함 내용 | 변경 빈도 |
|-----|---------|----------|
| phaser | 게임 엔진 | 거의 없음 |
| vendor | React, 상태관리 | 드묾 |
| index | 게임 로직 | 자주 |

## 추가 최적화: 동적 임포트

```typescript
// 더 공격적인 분리: Phaser 동적 임포트
const initPhaser = async () => {
  const Phaser = await import('phaser');
  return new Phaser.Game(config);
};
```

이렇게 하면 Phaser가 **실제로 필요할 때만** 로드됩니다.

## 결론
코드 스플리팅은 "코드를 나누는 것"이 아니라 **"언제 로드할지 제어하는 것"**입니다. 사용자가 게임을 시작하기 전에 모든 것을 로드할 필요는 없습니다.
