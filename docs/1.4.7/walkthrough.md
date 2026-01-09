# 🎯 1.4.7 Graphics → Image 최적화 작업 보고서

**작업일시**: 2026-01-06
**대상 버전**: 1.4.7
**목표**: 프레임 드랍율 39.3% → 10% 이하 개선

---

## 📊 문제 분석 (Trace-20261204)

| 지표 | 측정값 | 상태 |
|------|--------|------|
| 프레임 드랍율 | 39.3% | 🔴 심각 |
| UpdateLayer | 4,364ms (평균 727ms/회) | 🔴 핵심 병목 |
| Commit | 482ms (평균 80ms/회) | 🔴 |
| 렌더링 비율 | 76.9% | 스크립팅이 아닌 **렌더링**이 문제 |

**근본 원인**: `Graphics.clear()` + `fillCircle()` 매 프레임 호출 → **GPU 버퍼 재할당**

---

## ✅ 구현 내용

### 1. MainScene.ts

#### circle.png 이미지 로드 추가
```diff
  this.load.spritesheet('rps-sprites', '/assets/images/rps.png', {...});
+ this.load.image('circle', '/assets/images/circle.png');
```

#### currentAngle 전달 추가 (눈동자 마우스 추적용)
```diff
  this.playerRenderer.updateSprite(
    container, player, isMe, isMobile,
    rankings, isDashing, dashCooldownEndTime,
+   this.currentAngle
  );
```

---

### 2. PlayerRenderer.ts

#### Container 구조 변경

| Before | After |
|--------|-------|
| `body` (Graphics) | `body` (Image) ← tint + scale |
| | `border` (Graphics) ← 내 캐릭터 테두리만 |
| `leftEye` (Graphics) | `leftEyeWhite` (Image) |
| `rightEye` (Graphics) | `rightEyeWhite` (Image) |
| | `leftPupil` (Image) ← 마우스 추적 |
| | `rightPupil` (Image) ← 마우스 추적 |

#### drawBody() 변경
- **Before**: `Graphics.clear()` + `fillCircle()` (GPU 버퍼 재할당)
- **After**: `Image.setScale()` + `setTint()` (GPU 버퍼 재사용)

```typescript
// [1.4.7] Image: setScale + setTint (GPU 버퍼 재할당 없음)
body.setScale(size / 64);  // 128x128 이미지 기준
body.setTint(playerColor);
```

#### drawEyes() 변경 + 눈동자 마우스 추적
```typescript
// 눈동자 마우스 추적
const maxPupilOffset = eyeSize * 0.3;
const pupilOffsetX = Math.cos(currentAngle) * maxPupilOffset;
const pupilOffsetY = Math.sin(currentAngle) * maxPupilOffset;

leftPupil.setPosition(-eyeOffset + pupilOffsetX, -eyeY + pupilOffsetY);
rightPupil.setPosition(eyeOffset + pupilOffsetX, -eyeY + pupilOffsetY);
```

---

## 📁 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| [MainScene.ts](file:///c:/Users/user/Desktop/DEV/rps_io/client/src/game/scenes/MainScene.ts) | circle.png 로드, currentAngle 전달 |
| [PlayerRenderer.ts](file:///c:/Users/user/Desktop/DEV/rps_io/client/src/game/PlayerRenderer.ts) | Graphics → Image 변환, 눈동자 추적 |
| [circle.png](file:///c:/Users/user/Desktop/DEV/rps_io/client/public/assets/images/circle.png) | 128×128 흰색 원형 이미지 (사전 준비됨) |

---

## 🎯 예상 효과

| 지표 | Before | Expected |
|------|--------|----------|
| UpdateLayer | 4,364ms | **< 500ms** |
| Commit | 482ms | **< 100ms** |
| 프레임 드랍율 | 39.3% | **< 10%** |

---

## 🧪 검증 체크리스트

- [ ] 플레이어 캐릭터 정상 표시
- [ ] 색상 정상 적용 (닉네임 해시 기반)
- [ ] **눈동자 마우스 방향 추적** ← 신규 기능
- [ ] 크기 변경 (킬 먹으면 커짐)
- [ ] RPS 스프라이트 변경
- [ ] 1등 왕관 표시
- [ ] 대시바 작동
- [ ] Chrome DevTools Performance 측정

---

## 📝 빌드 결과

```
✓ 109 modules transformed.
✓ built in 5.87s
```
