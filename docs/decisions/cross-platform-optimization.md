# 크로스 플랫폼 웹 게임 최적화 의사결정

## 개요

ChaosRPS.io 개발 과정에서 다양한 플랫폼(PC, 모바일, 인앱 브라우저)을 지원하기 위해 내린 기술적 의사결정과 그 배경을 기록합니다.

## 배경

IO 게임의 특성상 사용자는 다양한 환경에서 접속합니다:
- PC 브라우저 (Chrome, Firefox, Safari)
- 모바일 브라우저 (Safari, Chrome Mobile)
- 인앱 브라우저 (카카오톡, 인스타그램, 페이스북 등)

특히 한국 시장에서는 카카오톡 공유를 통한 유입이 많아, 인앱 브라우저 대응이 필수적이었습니다.

## 의사결정 1: 인앱 브라우저 감지 및 경고

### 문제

인앱 브라우저는 일반 브라우저에 비해 다음과 같은 제약이 있습니다:
- WebGL 지원 불안정
- 메모리 제한
- 성능 저하
- 일부 Web API 미지원

### 결정

1. User-Agent 기반 인앱 브라우저 감지
2. 감지 시 외부 브라우저 사용 권장 모달 표시
3. 사용자가 계속하기 선택 시 저사양 모드 자동 활성화

### 구현

```typescript
// 인앱 브라우저 패턴
const IN_APP_BROWSER_PATTERNS = {
  kakao: /KAKAOTALK/i,
  instagram: /Instagram/i,
  facebook: /FBAN|FBAV|FB_IAB/i,
  // ...
};
```

### 결과

- 인앱 브라우저 사용자의 이탈률 감소
- 외부 브라우저 전환 시 더 나은 게임 경험 제공
- 저사양 모드로 인앱 브라우저에서도 플레이 가능

## 의사결정 2: 저사양 모드 구현

### 문제

저사양 기기나 인앱 브라우저에서 60fps 유지가 어려웠습니다.

### 결정

저사양 모드를 구현하여 다음을 비활성화:
- WebGL → Canvas 폴백
- 안티앨리어싱(Anti-aliasing, 계단 현상 제거 기술) 비활성화
- 프레임 레이트 30fps로 제한
- 파티클 효과 제거

### 구현

```typescript
const LOW_SPEC_CONFIG = {
  type: Phaser.CANVAS,
  render: {
    antialias: false,
    pixelArt: true,
  },
  fps: {
    target: 30,
    forceSetTimeOut: true,
  },
};
```

### 결과

- 저사양 기기에서도 안정적인 플레이 가능
- 배터리 소모 감소
- 발열 감소

## 의사결정 3: 반응형 입력 시스템

### 문제

PC와 모바일의 입력 방식이 근본적으로 다릅니다:
- PC: 마우스 추적
- 모바일: 터치/드래그

### 결정

1. Phaser의 통합 포인터 이벤트 사용
2. 모바일 전용 가상 조이스틱 구현
3. 화면 영역 분할 (왼쪽: 이동, 오른쪽: 기타)

### 구현

```typescript
// 통합 포인터 이벤트
this.input.on('pointermove', this.handlePointerMove, this);

// 모바일 감지 시 조이스틱 활성화
if (deviceInfo.isMobile) {
  this.joystick = new VirtualJoystick(this);
}
```

### 결과

- PC와 모바일 모두 자연스러운 조작감
- 코드 중복 최소화
- 유지보수 용이

## 의사결정 4: 클라이언트 사이드 예측

### 문제

네트워크 지연으로 인해 플레이어 움직임이 끊겨 보였습니다.

### 결정

클라이언트 사이드 예측(Client-Side Prediction)을 구현하여 서버 응답을 기다리지 않고 즉시 움직임을 표시합니다.

### 구현

```typescript
// 위치 보간 (Lerp)
const lerpFactor = lowSpecMode ? 0.3 : 0.15;
container.x = Phaser.Math.Linear(container.x, player.x, lerpFactor);
container.y = Phaser.Math.Linear(container.y, player.y, lerpFactor);
```

### 결과

- 부드러운 움직임
- 네트워크 지연 체감 감소
- 저사양 모드에서는 더 빠른 보간으로 반응성 향상

## 교훈

1. **점진적 향상(Progressive Enhancement)**: 최소 사양을 먼저 지원하고, 고사양 기기에서 추가 기능 활성화

2. **사용자 선택권 제공**: 강제로 외부 브라우저를 열지 않고, 사용자가 선택할 수 있도록 함

3. **성능 측정 우선**: 최적화 전에 실제 성능 병목 지점을 측정하여 효과적인 최적화 수행

4. **플랫폼별 테스트 필수**: 개발 환경(PC)에서 잘 동작해도 실제 타겟 환경(모바일, 인앱)에서 문제가 발생할 수 있음

## 향후 개선 사항

- WebGL 2.0 지원 여부에 따른 동적 기능 활성화
- 네트워크 품질에 따른 동적 틱 레이트 조정
- 배터리 절약 모드 감지 및 대응
