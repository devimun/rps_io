# 모바일 터치 입력 처리

## 개요

웹 게임에서 모바일 터치 입력을 처리하는 방법과 가상 조이스틱 구현 원리를 설명합니다. PC의 마우스 입력과 모바일의 터치 입력은 근본적으로 다른 특성을 가지므로, 각 플랫폼에 최적화된 입력 처리가 필요합니다.

## 터치 이벤트 vs 마우스 이벤트

### 기본 차이점

| 특성 | 마우스 이벤트 | 터치 이벤트 |
|------|-------------|------------|
| 동시 입력 | 단일 포인터 | 멀티터치 지원 |
| 호버 상태 | 지원 (mouseover) | 미지원 |
| 정밀도 | 높음 (픽셀 단위) | 낮음 (손가락 크기) |
| 이벤트 | click, mousedown, mouseup | touchstart, touchmove, touchend |

### Phaser에서의 통합 처리

Phaser 3는 `pointer` 이벤트를 통해 마우스와 터치를 통합 처리합니다.

```typescript
// 마우스와 터치 모두 처리
this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
  // pointer.x, pointer.y: 화면 좌표
  // pointer.id: 멀티터치 시 각 터치 포인트 식별
  // pointer.isDown: 현재 눌린 상태인지
});
```

## 가상 조이스틱 구현 원리

### 1. 기본 구조

가상 조이스틱은 두 개의 원으로 구성됩니다:
- **베이스(Base)**: 고정된 외부 원, 조이스틱의 이동 범위를 나타냄
- **스틱(Stick)**: 사용자가 드래그하는 내부 원

### 2. 방향 벡터 계산

터치 위치에서 시작점까지의 벡터를 정규화(Normalize, 벡터의 길이를 1로 만드는 것)하여 방향을 계산합니다.

```typescript
// 터치 시작점과 현재 위치의 차이
const dx = currentX - startX;
const dy = currentY - startY;

// 거리 계산 (피타고라스 정리)
const distance = Math.sqrt(dx * dx + dy * dy);

// 방향 벡터 정규화 (-1 ~ 1 범위)
const directionX = distance > 0 ? dx / distance : 0;
const directionY = distance > 0 ? dy / distance : 0;

// 강도 계산 (0 ~ 1 범위)
const force = Math.min(distance / maxRadius, 1);
```

### 3. 스틱 위치 제한

스틱이 베이스 밖으로 나가지 않도록 최대 반경으로 제한합니다.

```typescript
const clampedDistance = Math.min(distance, maxRadius);
const angle = Math.atan2(dy, dx);

const stickX = Math.cos(angle) * clampedDistance;
const stickY = Math.sin(angle) * clampedDistance;
```

## 멀티터치 처리

### 터치 포인트 식별

각 터치 포인트는 고유한 `id`를 가집니다. 조이스틱은 특정 터치만 추적해야 합니다.

```typescript
private pointerId: number | null = null;

onPointerDown(pointer: Phaser.Input.Pointer) {
  if (this.pointerId !== null) return; // 이미 추적 중
  this.pointerId = pointer.id;
}

onPointerMove(pointer: Phaser.Input.Pointer) {
  if (pointer.id !== this.pointerId) return; // 다른 터치 무시
  // 조이스틱 업데이트
}

onPointerUp(pointer: Phaser.Input.Pointer) {
  if (pointer.id !== this.pointerId) return;
  this.pointerId = null;
}
```

### 화면 영역 분할

일반적으로 화면을 분할하여 각 영역에 다른 기능을 할당합니다:
- 왼쪽 절반: 이동 조이스틱
- 오른쪽 절반: 공격/스킬 버튼 또는 카메라 조작

```typescript
onPointerDown(pointer: Phaser.Input.Pointer) {
  const screenWidth = this.cameras.main.width;
  
  if (pointer.x < screenWidth / 2) {
    // 왼쪽: 조이스틱 활성화
    this.activateJoystick(pointer);
  } else {
    // 오른쪽: 다른 동작
    this.handleRightSideTouch(pointer);
  }
}
```

## 성능 최적화

### 1. 입력 쓰로틀링(Throttling)

서버로 전송하는 입력 데이터의 빈도를 제한합니다.

```typescript
private lastMoveTime = 0;
private readonly moveInterval = 50; // 50ms 간격

handleMove(pointer: Phaser.Input.Pointer) {
  const now = Date.now();
  if (now - this.lastMoveTime < this.moveInterval) return;
  
  this.sendMoveToServer(pointer);
  this.lastMoveTime = now;
}
```

### 2. 터치 영역 확대

모바일에서는 손가락 크기를 고려하여 터치 영역을 실제 UI보다 크게 설정합니다.

```typescript
// 버튼 크기: 44x44px (Apple HIG 권장)
// 터치 영역: 최소 48x48px
button.setInteractive({
  hitArea: new Phaser.Geom.Rectangle(-4, -4, 52, 52),
  hitAreaCallback: Phaser.Geom.Rectangle.Contains,
});
```

### 3. 패시브 이벤트 리스너

스크롤 성능을 위해 패시브 리스너를 사용합니다.

```typescript
// Phaser는 기본적으로 패시브 리스너를 사용
// 커스텀 이벤트 추가 시:
element.addEventListener('touchmove', handler, { passive: true });
```

## 제스처 인식

### 스와이프 감지

```typescript
interface SwipeData {
  startX: number;
  startY: number;
  startTime: number;
}

const SWIPE_THRESHOLD = 50; // 최소 이동 거리
const SWIPE_TIME_LIMIT = 300; // 최대 시간 (ms)

function detectSwipe(start: SwipeData, end: Phaser.Input.Pointer): string | null {
  const dx = end.x - start.startX;
  const dy = end.y - start.startY;
  const dt = Date.now() - start.startTime;
  
  if (dt > SWIPE_TIME_LIMIT) return null;
  
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  
  if (absDx > SWIPE_THRESHOLD && absDx > absDy) {
    return dx > 0 ? 'right' : 'left';
  }
  if (absDy > SWIPE_THRESHOLD && absDy > absDx) {
    return dy > 0 ? 'down' : 'up';
  }
  
  return null;
}
```

## 참고 자료

- [Phaser 3 Input 문서](https://photonstorm.github.io/phaser3-docs/Phaser.Input.html)
- [Apple Human Interface Guidelines - Touch](https://developer.apple.com/design/human-interface-guidelines/inputs/touch)
- [MDN Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)
