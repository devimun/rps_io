# Object Pool 점진적 생성으로 Long Task 방지

## 문제
게임 시작 시 Object Pool을 한번에 생성하면 **205ms Long Task**가 발생합니다.

```typescript
// 문제 코드: 동기적 생성
prewarmPool(count: number = 25): void {
  for (let i = 0; i < count; i++) {
    const container = this.createEmptyContainer();  // 무거운 작업
    this.containerPool.push(container);
  }
}
```

25개의 Container를 한번에 만들면서 메인 스레드가 200ms 이상 블로킹됩니다.

## 해결책: requestAnimationFrame 분할

```typescript
prewarmPool(count: number = 20, batchSize: number = 4): void {
  let created = 0;

  const createBatch = () => {
    const toCreate = Math.min(batchSize, count - created);

    for (let i = 0; i < toCreate; i++) {
      const container = this.createEmptyContainer();
      container.setPosition(-9999, -9999);
      container.setVisible(false);
      this.containerPool.push(container);
      created++;
    }

    // 남은 개수가 있으면 다음 프레임에서 계속
    if (created < count) {
      requestAnimationFrame(createBatch);
    }
  };

  requestAnimationFrame(createBatch);
}
```

## 작동 원리

### 프레임 분할 실행
```
Frame 1: Container 4개 생성 (~30ms)
Frame 2: Container 4개 생성 (~30ms)
Frame 3: Container 4개 생성 (~30ms)
...
```

각 프레임에서 4개씩 생성하면 **Long Task 없이** 전체 Pool을 완성합니다.

### 시각적 차이
```
❌ 동기 생성: [====================] 200ms 멈춤

✅ 분할 생성: [====]   [====]   [====]   [====]   [====]
              30ms    30ms    30ms    30ms    30ms
              ↑       ↑       ↑       ↑       ↑
           프레임   프레임   프레임   프레임   프레임
```

## 주의사항

### 1. Pool이 준비되기 전 사용 시도
```typescript
// 해결책: Pool이 비면 그때 생성
if (this.containerPool.length > 0) {
  container = this.containerPool.pop()!;
} else {
  container = this.createEmptyContainer();  // Fallback
}
```

### 2. batchSize 튜닝
- 너무 작으면: Pool 준비 시간 증가
- 너무 크면: Long Task 발생
- 권장: **4~8개** (기기 성능에 따라 조절)

## 성능 비교

| 방식 | Long Task | 사용자 체감 |
|-----|----------|-----------|
| 동기 생성 (25개) | 205ms | 화면 정지 |
| 분할 생성 (4개/프레임) | 0ms | 부드러움 |

## 결론
**"빠르게 많이"보다 "천천히 꾸준히"**가 사용자 경험에 좋습니다. requestAnimationFrame은 브라우저의 렌더링 타이밍에 맞춰 작업을 분산시키는 최적의 도구입니다.
