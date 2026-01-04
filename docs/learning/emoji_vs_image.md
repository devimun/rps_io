# 게임에서 이모지 vs 이미지 스프라이트 성능 비교

## 현재 구현 (이모지)

```typescript
// PlayerRenderer.ts
const emojiText = this.scene.add.text(0, -45, '✊', {
  fontSize: '28px',
  fontFamily: 'Arial, sans-serif',
});
```

## 이모지의 숨겨진 비용

### 1. 텍스트 렌더링 파이프라인
```
이모지 문자열 → 폰트 글리프 로딩 → Canvas 2D 렌더링 → 텍스처 변환 → GPU 업로드
```

매번 `Text` 객체가 생성/수정될 때마다 이 과정이 반복됩니다.

### 2. 플랫폼별 차이
| OS | 이모지 폰트 | 렌더링 결과 |
|---|------------|-----------|
| Windows | Segoe UI Emoji | 평면적 |
| macOS | Apple Color Emoji | 입체적 |
| Android | Noto Color Emoji | 기기마다 다름 |
| iOS | Apple Color Emoji | 일관됨 |

### 3. 성능 오버헤드
- 컬러 글리프는 일반 텍스트보다 **2~5배 무거움**
- 플레이어 수가 많을수록 영향 증가
- 모바일 기기에서 특히 부담

## 이미지 스프라이트 방식

### 구현
```typescript
// PreloadScene.ts - 에셋 프리로드
preload(): void {
  this.load.image('emoji-rock', '/assets/emoji/rock.png');
  this.load.image('emoji-paper', '/assets/emoji/paper.png');
  this.load.image('emoji-scissors', '/assets/emoji/scissors.png');
}

// PlayerRenderer.ts - 스프라이트 사용
const emojiSprite = this.scene.add.image(0, -45, 'emoji-rock');
emojiSprite.setScale(0.5);  // 크기 조절
```

### 장점
1. **GPU 텍스처 캐싱**: 한 번 로드하면 즉시 재사용
2. **일관된 비주얼**: 모든 플랫폼에서 동일
3. **빠른 렌더링**: 이미 텍스처로 존재

## 성능 비교

| 요소 | 이모지 Text | 이미지 Sprite |
|-----|-----------|--------------|
| 초기 로딩 | 폰트 로딩 필요 | 이미지 프리로드 |
| 렌더링 | Canvas 2D 변환 | GPU 직접 그리기 |
| 메모리 | 글리프 캐시 | 텍스처 아틀라스 |
| 플레이어 100명 | 느림 | 빠름 |

### 예상 성능 개선
- 플레이어 1명당: ~0.5ms 절약
- 플레이어 20명: ~10ms 절약
- 첫 프레임: FireAnimationFrame 시간 감소

## 추천 이미지 형식

### PNG (권장)
- 투명 배경 지원
- 손실 없는 품질
- 파일 크기: 2~5KB per 이모지

### SVG
- 무한 확대 가능
- 더 작은 파일 크기
- Phaser에서 래스터화 필요

### WebP
- 최고 압축률
- 브라우저 호환성 확인 필요

## 구현 시 고려사항

### 1. 이미지 크기
```
64x64px @ 2x = 충분한 품질
128x128px = 고해상도 디스플레이용
```

### 2. 텍스처 아틀라스
```typescript
// 여러 이미지를 하나로 합치면 더 효율적
this.load.atlas('emojis', '/assets/emoji-atlas.png', '/assets/emoji-atlas.json');
```

### 3. 상태 전환 애니메이션
```typescript
// 이미지 교체는 텍스처 키만 변경하면 됨
emojiSprite.setTexture('emoji-paper');  // 즉시 전환
```

## Slither.io는 어떻게?
- 모든 이모지/아이콘을 **스프라이트 시트**로 제공
- 서버에서 이미지 URL 제공
- 커스텀 스킨도 이미지로 처리

## 결론
이모지는 **개발 편의성**은 좋지만, **성능**에서 불리합니다. 60fps가 중요한 게임에서는 이미지 스프라이트를 권장합니다. 특히 플레이어가 많은 IO 게임에서는 차이가 더 크게 나타납니다.
