# 모바일 가상 조이스틱 구현 가이드

## 개요

모바일 게임에서 **가상 조이스틱**(Virtual Joystick)은 터치 입력을 방향 벡터로 변환하여 캐릭터 이동을 제어하는 UI 컴포넌트입니다. 본 문서에서는 Phaser.js 기반 게임에서 가상 조이스틱을 구현하고 통합하는 방법을 설명합니다.

## 핵심 개념

### 1. 조이스틱의 구성 요소

가상 조이스틱은 두 가지 시각적 요소로 구성됩니다:

- **베이스(Base)**: 조이스틱의 이동 가능 범위를 나타내는 원형 영역
- **스틱(Stick)**: 사용자가 드래그하는 내부 원, 터치 위치를 따라 이동

### 2. 방향 벡터 계산

조이스틱의 핵심은 터치 위치를 **정규화된 방향 벡터**(-1 ~ 1)로 변환하는 것입니다:

```typescript
// 터치 시작점과 현재 위치의 차이 계산
const dx = pointer.x - startPosition.x;
const dy = pointer.y - startPosition.y;
const distance = Math.sqrt(dx * dx + dy * dy);

// 정규화된 방향 벡터
const direction = {
  x: distance > 0 ? dx / distance : 0,
  y: distance > 0 ? dy / distance : 0,
};

// 강도 (0 ~ 1): 얼마나 세게 밀었는지
const force = Math.min(distance, maxRadius) / maxRadius;
```

### 3. 화면 영역 분할

모바일 게임에서는 일반적으로 화면을 두 영역으로 분할합니다:

- **왼쪽 절반**: 이동 조이스틱
- **오른쪽 절반**: 액션 버튼 (공격, 대시 등)

```typescript
private onPointerDown(pointer: Phaser.Input.Pointer): void {
  // 화면 왼쪽 절반에서만 조이스틱 활성화
  if (pointer.x > this.scene.cameras.main.width / 2) return;
  
  this.activateJoystick(pointer);
}
```

## 구현 단계

### Step 1: VirtualJoystick 클래스 생성

```typescript
export class VirtualJoystick {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private base: Phaser.GameObjects.Graphics;
  private stick: Phaser.GameObjects.Graphics;
  
  private isActive = false;
  private startPosition = { x: 0, y: 0 };
  private direction = { x: 0, y: 0 };
  private force = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createVisuals();
    this.setupInput();
  }
}
```

### Step 2: 게임 씬에 통합

```typescript
export class MainScene extends Phaser.Scene {
  private virtualJoystick: VirtualJoystick | null = null;
  private isMobile = false;

  create(): void {
    this.isMobile = this.detectMobile();
    
    if (this.isMobile) {
      this.virtualJoystick = new VirtualJoystick(this);
    }
  }
}
```

### Step 3: 입력 처리 분기

```typescript
private sendMovement(): void {
  if (this.isMobile && this.virtualJoystick?.getIsActive()) {
    // 조이스틱 방향으로 목표 지점 계산
    const direction = this.virtualJoystick.getDirection();
    const targetX = player.x + direction.x * moveDistance;
    const targetY = player.y + direction.y * moveDistance;
    
    socketService.sendMove({ targetX, targetY });
  } else {
    // 데스크톱: 마우스 위치 사용
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    socketService.sendMove({ targetX: worldPoint.x, targetY: worldPoint.y });
  }
}
```

## 모바일 디바이스 감지

```typescript
function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || ('ontouchstart' in window);
}
```

## UI/UX 고려사항

### 1. 시각적 피드백
- 조이스틱은 터치 시작 시에만 표시 (동적 생성)
- 반투명 처리로 게임 화면 가시성 확보
- 스틱 이동 시 부드러운 애니메이션

### 2. 터치 영역
- 조이스틱 베이스 크기: 60~80px 권장
- 스틱 크기: 베이스의 40% 정도
- 최대 이동 반경 제한으로 손가락 이탈 방지

### 3. 성능 최적화
- `setScrollFactor(0)`: UI 레이어로 고정하여 카메라 이동에 영향받지 않음
- 불필요한 재렌더링 방지를 위한 상태 관리

## 정리 (Cleanup)

씬 종료 시 반드시 이벤트 리스너와 게임 오브젝트를 정리해야 합니다:

```typescript
shutdown(): void {
  if (this.virtualJoystick) {
    this.virtualJoystick.destroy();
    this.virtualJoystick = null;
  }
}
```

## 참고 자료

- [Phaser 3 Input System](https://photonstorm.github.io/phaser3-docs/Phaser.Input.html)
- [Touch Events MDN](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)
