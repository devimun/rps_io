# Phaser 키보드 입력 성능 최적화

## 문제 현상

Phaser 게임에서 **아무 키나 꾹 누르면 렉(프레임 드랍)**이 발생하는 현상입니다.

### 증상
- 스페이스바, A키 등 어떤 키든 꾹 누르면 게임이 버벅거림
- 키를 한 번만 누르면 정상 작동
- Performance 프로파일링 결과 `step` 함수가 90% 이상 차지

## 원인 분석

### Phaser의 기본 키보드 동작

Phaser는 기본적으로 **모든 키보드 이벤트를 캡처(capture)**합니다. 이는 브라우저의 기본 동작(스크롤, 뒤로가기 등)을 방지하기 위한 것입니다.

```typescript
// Phaser 내부에서 발생하는 일
window.addEventListener('keydown', (event) => {
  // 모든 키 이벤트를 가로채서 처리
  event.preventDefault();
  // 내부 키 상태 업데이트
  this.keys[event.code].isDown = true;
});
```

### 문제의 핵심

키를 꾹 누르면 브라우저는 **초당 약 30회의 `keydown` 이벤트**를 발생시킵니다. Phaser가 이 모든 이벤트를 캡처하고 처리하면서 메인 스레드에 부하가 걸립니다.

```
키 꾹 누름 → 초당 30회 keydown → Phaser 내부 처리 × 30 → 렉 발생
```

## 해결 방법

### 1. 키보드 캡처 비활성화

Phaser 게임 설정에서 키보드 캡처를 비활성화합니다.

```typescript
// client/src/game/config.ts
export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  // ... 기타 설정
  input: {
    keyboard: {
      capture: [], // 아무 키도 캡처하지 않음
    },
  },
};
```

### 2. 필요한 키만 직접 처리

특정 키가 필요하면 브라우저 네이티브 이벤트로 직접 처리합니다.

```typescript
// 한 번만 처리하는 패턴
private keyHandled = false;

private handleKeyDown = (e: KeyboardEvent): void => {
  if (e.code !== 'Space') return;
  
  e.preventDefault(); // 스크롤 방지
  
  if (this.keyHandled) return; // 이미 처리됨
  
  this.keyHandled = true;
  this.doSomething();
};

private handleKeyUp = (e: KeyboardEvent): void => {
  if (e.code !== 'Space') return;
  this.keyHandled = false; // 플래그 리셋
};
```

### 3. 마우스 입력으로 대체 (권장)

게임에서 대시(Dash) 같은 액션은 마우스 클릭으로 처리하는 것이 더 직관적입니다.

```typescript
this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
  if (pointer.leftButtonDown()) {
    this.dash();
  }
});
```

## 성능 비교

| 방식 | 키 꾹 누름 시 CPU 사용량 |
|------|------------------------|
| Phaser 기본 캡처 | 90%+ (렉 발생) |
| 캡처 비활성화 | 50~60% (정상) |
| 마우스 입력 | 50~60% (정상) |

## 디버깅 방법

### Performance 프로파일링

1. F12 → Performance 탭
2. Record 버튼 클릭
3. 키 꾹 누르기 (3초)
4. Stop 버튼 클릭
5. Bottom-Up 탭에서 Self Time 확인

`step` 함수가 90% 이상이면 Phaser 내부 처리가 병목입니다.

### 콘솔 로그로 확인

```typescript
let keydownCount = 0;
window.addEventListener('keydown', () => {
  keydownCount++;
});

setInterval(() => {
  console.log(`초당 keydown: ${keydownCount}`);
  keydownCount = 0;
}, 1000);
```

## 결론

Phaser에서 키보드 입력 성능 문제가 발생하면:

1. **`capture: []`** 설정으로 키보드 캡처 비활성화
2. 필요한 키만 **브라우저 네이티브 이벤트**로 처리
3. 가능하면 **마우스 입력**으로 대체

이 방법으로 키를 꾹 눌러도 렉 없이 60fps를 유지할 수 있습니다.
