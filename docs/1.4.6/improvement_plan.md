# 1.4.5 성능 개선 계획

## 현재 상태 (트레이스 분석 결과)

| 지표 | 1.4.5 | 1.4.5 | 목표 |
|------|-------|-------|------|
| 프레임 드랍 | 133 | 62 | **< 10** |
| 최대 병목 | 1,125ms | 584ms | **< 50ms** |
| GC 오버헤드 | 40ms+ | 23ms | **< 10ms** |

---

## Phase 1: 첫 게임 상태 점진적 처리 (High Priority)

**문제**: 서버에서 10명+ 플레이어 데이터 한꺼번에 수신 → 렉

**수정 파일**: [gameStore.ts](file:///c:/Users/user/Desktop/DEV/rps_io/client/src/stores/gameStore.ts)

```typescript
// Before: 모든 플레이어 한번에 처리
updatePlayers: (players, timestamp) => {
  players.forEach((p) => {
    addSnapshot(p.id, p, timestamp); // 🔴 N번 호출
  });
}

// After: 첫 프레임에는 내 플레이어만, 나머지는 점진적
updatePlayers: (players, timestamp) => {
  const isFirstUpdate = get().players.size === 0;
  if (isFirstUpdate) {
    // 첫 업데이트: 내 플레이어만 즉시 처리
    const myPlayer = players.find(p => p.nickname === get().nickname);
    if (myPlayer) addSnapshot(myPlayer.id, myPlayer, timestamp);
    // 나머지는 다음 프레임에서 점진적 추가
  }
}
```

---

## Phase 2: Phaser 게임 루프 최적화 (High Priority)

**문제**: `phaser-iZDVk5aZ.js:1036`에서 584ms 소비

**수정 파일**: [MainScene.ts](file:///c:/Users/user/Desktop/DEV/rps_io/client/src/game/scenes/MainScene.ts)

```typescript
// 1. Store 캐싱 주기 늘리기 (16ms → 32ms)
private readonly STORE_CHECK_INTERVAL = 32;

// 2. 플레이어 업데이트 스킵 조건 강화
update(time: number): void {
  // 게임 준비 안됐으면 완전 스킵
  if (!this.isGameReady) return;
  
  // 매 프레임이 아닌 홀수 프레임만 전체 업데이트
  this.frameCount++;
  if (this.frameCount % 2 === 0) {
    // 짝수 프레임: 위치만 업데이트 (렌더링 스킵)
    this.updatePositionsOnly();
    return;
  }
}
```

---

## Phase 3: GC 압력 감소 (Medium Priority)

**문제**: `MinorGC` 10.31ms, `V8.GC_SCAVENGER` 12.67ms

**수정 파일**: [interpolationService.ts](file:///c:/Users/user/Desktop/DEV/rps_io/client/src/services/interpolationService.ts)

```typescript
// 오래된 버퍼 정리 함수 추가
export function cleanOldBuffers(activePlayerIds: Set<string>): void {
  playerBuffers.forEach((_, id) => {
    if (!activePlayerIds.has(id)) {
      playerBuffers.delete(id);
    }
  });
}

// 버퍼 크기 제한 강화
const MAX_BUFFER_SIZE = 5; // 10 → 5
```

---

## Phase 4: 모바일 전용 최적화 (Low Priority)

**수정 파일**: [config.ts](file:///c:/Users/user/Desktop/DEV/rps_io/client/src/game/config.ts)

```typescript
export const MOBILE_CONFIG = {
  fps: {
    target: 30,  // 이미 있음
    forceSetTimeOut: true,
  },
  render: {
    batchSize: 1024,  // 2048 → 1024
  },
};
```

---

## 우선순위 정리

| 순위 | Phase | 작업 | 예상 효과 |
|------|-------|------|----------|
| 1 | Phase 1 | 첫 게임 상태 점진적 처리 | ★★★★★ |
| 2 | Phase 2 | Phaser 루프 최적화 | ★★★★☆ |
| 3 | Phase 3 | GC 압력 감소 | ★★★☆☆ |
| 4 | Phase 4 | 모바일 전용 최적화 | ★★☆☆☆ |

---

## 예상 결과

| 지표 | 현재 | 목표 |
|------|------|------|
| 프레임 드랍 | 62 | **< 10** |
| 체감 렉 | 있음 | **거의 없음** |
| 타이머 지연 | 있음 | **즉시 표시** |
