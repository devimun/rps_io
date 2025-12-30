# IO 게임 스폰 시스템 설계 가이드

## 개요

본 문서는 IO 게임(slither.io, agar.io 등)에서 사용되는 스폰 시스템의 설계 원칙과 구현 방법을 설명합니다. 공정하고 재미있는 게임플레이를 위해 스폰 시스템은 매우 중요한 역할을 담당합니다.

## 1. 스폰 시스템의 목표

스폰 시스템은 다음 목표를 달성해야 합니다:

1. **공정성**: 모든 플레이어가 동등한 조건에서 시작해야 합니다
2. **안전성**: 스폰 직후 즉시 사망하는 상황(스폰 킬)을 방지해야 합니다
3. **분산성**: 플레이어들이 맵 전체에 고르게 분포되어야 합니다
4. **성능**: 스폰 위치 계산이 빠르게 이루어져야 합니다

## 2. 스폰 알고리즘 비교

### 2.1 랜덤 스폰 (Random Spawn)

가장 단순한 방식으로, 맵 내 임의의 위치에 플레이어를 배치합니다.

```typescript
function randomSpawn(worldWidth: number, worldHeight: number, margin: number) {
  return {
    x: margin + Math.random() * (worldWidth - margin * 2),
    y: margin + Math.random() * (worldHeight - margin * 2),
  };
}
```

**장점:**
- 구현이 매우 간단합니다
- 계산 비용이 O(1)입니다

**단점:**
- 다른 플레이어 위에 스폰될 수 있습니다
- 스폰 킬 가능성이 높습니다

### 2.2 격자 기반 스폰 (Grid-based Spawn)

맵을 격자(Grid)로 나누고, 플레이어 밀도가 가장 낮은 셀에 스폰합니다.

```typescript
// 격자 셀 구조
interface GridCell {
  centerX: number;
  centerY: number;
  playerCount: number;
}

// 밀도 계산
function calculateDensity(grid: GridCell[][], players: Player[]) {
  for (const player of players) {
    const col = Math.floor(player.x / cellSize);
    const row = Math.floor(player.y / cellSize);
    grid[row][col].playerCount++;
  }
}
```

**장점:**
- 플레이어 분포를 고려한 스폰이 가능합니다
- 시간 복잡도가 O(n)으로 효율적입니다 (n = 플레이어 수)
- 구현이 직관적입니다

**단점:**
- 격자 크기에 따라 정밀도가 달라집니다
- 격자 경계에서 불균형이 발생할 수 있습니다

### 2.3 쿼드트리 기반 스폰 (Quadtree-based Spawn)

공간을 동적으로 분할하여 플레이어 밀도를 계산합니다.

**장점:**
- 플레이어 분포에 적응적으로 대응합니다
- 정밀한 밀도 계산이 가능합니다

**단점:**
- 구현 복잡도가 높습니다
- 소규모 게임에서는 오버엔지니어링(과도한 설계)입니다

## 3. 안전 거리 계산

스폰 위치가 기존 플레이어와 충분히 떨어져 있는지 확인해야 합니다.

```typescript
function isSafePosition(
  pos: { x: number; y: number },
  players: Player[],
  safeDistance: number
): boolean {
  for (const player of players) {
    const dx = player.x - pos.x;
    const dy = player.y - pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < safeDistance) {
      return false;
    }
  }
  return true;
}
```

### 안전 거리 결정 요소

1. **플레이어 크기**: 플레이어 반지름의 2배 이상
2. **이동 속도**: 빠른 게임일수록 더 큰 안전 거리 필요
3. **맵 크기**: 맵이 작으면 안전 거리도 줄여야 합니다
4. **최대 플레이어 수**: 많은 플레이어를 수용하려면 안전 거리 조정 필요

### 공식

```
최소 맵 크기 = √(플레이어 수 × π × 안전거리²)
```

예시: 20명, 안전거리 500px
```
최소 맵 크기 = √(20 × 3.14 × 500²) ≈ 2,800px
```

## 4. 무적 시스템 (Invincibility)

스폰 직후 일정 시간 동안 무적 상태를 부여하여 추가적인 보호를 제공합니다.

```typescript
class Player {
  spawnTime: number;
  
  isInvincible(): boolean {
    const INVINCIBILITY_MS = 3000; // 3초
    return Date.now() - this.spawnTime < INVINCIBILITY_MS;
  }
}
```

### 무적 시각화

플레이어가 무적 상태임을 시각적으로 표시해야 합니다:

```typescript
function calculateInvincibilityAlpha(player: Player): number {
  const elapsed = Date.now() - player.spawnTime;
  const remaining = INVINCIBILITY_MS - elapsed;
  
  if (remaining <= 0) return 1; // 완전 불투명
  
  // 마지막 1초: 빠른 깜빡임
  if (remaining < 1000) {
    return Math.floor(Date.now() / 100) % 2 === 0 ? 0.3 : 0.9;
  }
  
  // 일반 깜빡임
  return Math.floor(Date.now() / 500) % 2 === 0 ? 0.5 : 0.8;
}
```

## 5. 폴백 전략 (Fallback Strategy)

안전한 스폰 위치를 찾지 못할 경우를 대비한 폴백 전략이 필요합니다:

1. **최저 밀도 셀 중심**: 가장 한산한 영역의 중심에 스폰
2. **무적 시간 연장**: 위험한 위치에 스폰 시 무적 시간 증가
3. **랜덤 폴백**: 최후의 수단으로 랜덤 위치 사용

```typescript
function findSafeSpawnPosition(players: Player[]): Position {
  // 1. 격자 기반 탐색
  const grid = createGrid();
  calculateDensity(grid, players);
  const lowestDensityCell = findLowestDensityCell(grid);
  
  // 2. 셀 내 안전 위치 탐색
  for (let attempt = 0; attempt < 50; attempt++) {
    const pos = randomPositionInCell(lowestDensityCell);
    if (isSafePosition(pos, players, SAFE_DISTANCE)) {
      return pos;
    }
  }
  
  // 3. 폴백: 셀 중심 반환
  return {
    x: lowestDensityCell.centerX,
    y: lowestDensityCell.centerY,
  };
}
```

## 6. 성능 최적화

### 6.1 공간 해싱 (Spatial Hashing)

플레이어 위치를 해시 테이블로 관리하여 근처 플레이어 검색을 최적화합니다.

### 6.2 캐싱

격자 밀도 정보를 캐싱하고, 플레이어 이동 시에만 업데이트합니다.

### 6.3 비동기 처리

스폰 위치 계산을 비동기로 처리하여 게임 루프를 차단하지 않습니다.

## 7. 결론

효과적인 스폰 시스템은 다음 요소를 조합하여 구현합니다:

1. **격자 기반 밀도 계산**으로 한산한 영역 선택
2. **안전 거리 검증**으로 스폰 킬 방지
3. **무적 시간**으로 추가 보호
4. **폴백 전략**으로 예외 상황 대응

이러한 요소들을 적절히 조합하면 공정하고 재미있는 게임플레이를 제공할 수 있습니다.

---

**작성일**: 2025-12-30
**관련 파일**: `server/src/systems/SpawnSystem.ts`
