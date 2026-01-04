# 웜업 프레임과 점진적 렌더링으로 첫 프레임 최적화

## 문제
게임 첫 프레임에서 **81ms Long Task**가 발생합니다.

원인:
- 모든 플레이어 렌더링
- 전체 그리드 생성
- UI 요소 배치
- 카메라 설정

60fps 기준 1프레임 = 16.67ms인데, 81ms는 **5프레임 분량**의 정지입니다.

## 해결책 1: 웜업 프레임 증가

```typescript
// 변경 전
if (this.warmupFrames >= 3 && myPlayer) {
  this.isReady = true;
  // 카메라 표시
}

// 변경 후
if (this.warmupFrames >= 5 && myPlayer) {
  this.isReady = true;
  // 카메라 표시 (더 부드러운 페이드인)
  this.tweens.add({
    targets: this.cameras.main,
    alpha: 1,
    duration: 200,  // 150 → 200ms
    ease: 'Power2',
  });
}
```

### 왜 효과적인가?
- 처음 5프레임 동안 **화면을 숨기고** 초기화 작업 수행
- 모든 준비가 끝난 후 **페이드인으로 자연스럽게** 표시
- 사용자는 "로딩 중"으로만 인식

## 해결책 2: 그리드 생성 지연

```typescript
// 변경 전
this.createGrid();  // 첫 프레임에서 실행

// 변경 후
this.time.delayedCall(100, () => {
  this.createGrid();  // 100ms 후 실행
});
```

### 그리드는 왜 지연해도 되나?
- 그리드는 **시각적 배경**일 뿐
- 게임 로직에 영향 없음
- 100ms 지연은 사용자가 인지하기 어려움

## 해결책 3: 초기 플레이어 렌더링 제한

```typescript
// 웜업 기간 동안 최대 5명만 렌더링
const maxInitialPlayers = 5;
if (!this.isReady && visiblePlayers.size > maxInitialPlayers) {
  const limitedPlayers = new Map<string, Player>();
  let count = 0;
  
  visiblePlayers.forEach((p, id) => {
    if (id === myPlayerId || count < maxInitialPlayers) {
      limitedPlayers.set(id, p);
      count++;
    }
  });
  
  visiblePlayers = limitedPlayers;
}
```

### 왜 효과적인가?
- 내 캐릭터는 **항상** 렌더링 (필수)
- 주변 4명만 먼저 표시
- 웜업 완료 후 나머지 플레이어 추가

## 전체 흐름

```
Frame 1-5: (화면 숨김)
  - 내 플레이어 + 4명 렌더링
  - Object Pool 점진적 생성 중
  - 그리드 생성 대기

Frame 6: (페이드인 시작)
  - 카메라 alpha: 0 → 1
  - 그리드 생성 시작

Frame 7+: (정상 게임)
  - 모든 플레이어 표시
  - 60fps 유지
```

## 성능 비교

| 기법 | 적용 전 | 적용 후 |
|-----|--------|--------|
| 첫 프레임 렌더링 | 81ms | ~30ms |
| 사용자 체감 | 버벅임 | 부드러운 진입 |

## 결론
**"모든 것을 한번에"가 아닌 "중요한 것부터 순차적으로"**. 사용자가 보지 않는 동안 무거운 작업을 처리하고, 볼 때는 이미 준비된 상태를 보여주는 것이 핵심입니다.
