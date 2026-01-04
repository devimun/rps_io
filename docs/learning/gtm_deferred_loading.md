# Google Tag Manager 지연 로딩으로 초기 렌더링 최적화

## 문제
Google Tag Manager(GTM)는 분석에 필수적이지만, 초기 렌더링을 **91ms** 블로킹할 수 있습니다.

```html
<!-- 기존 방식: 블로킹 발생 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXX"></script>
```

`async` 속성이 있어도 스크립트 실행 자체는 메인 스레드를 점유합니다.

## 해결책: 지연 로딩

```html
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  
  // 페이지 로드 완료 후 100ms 지연하여 GTM 로드
  window.addEventListener('load', function() {
    setTimeout(function() {
      var s = document.createElement('script');
      s.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXX';
      s.async = true;
      document.head.appendChild(s);
      gtag('js', new Date());
      gtag('config', 'G-XXX');
    }, 100);
  });
</script>
```

## 작동 원리

1. `window.addEventListener('load')`: DOM + 리소스 로딩 완료 대기
2. `setTimeout(..., 100)`: 초기 렌더링 후 여유 시간 확보
3. 동적 스크립트 삽입: GTM을 비동기로 로드

## 효과

| 지표 | 변경 전 | 변경 후 |
|-----|--------|--------|
| 초기 메인 스레드 블로킹 | 91ms | 0ms |
| GTM 기능 | 정상 | 정상 (지연됨) |
| 사용자 체감 | 버벅임 | 부드러움 |

## 주의사항

- **첫 페이지뷰 정확도**: GTM이 100ms 늦게 로드되므로 매우 빠른 이탈은 추적 못할 수 있음
- **이벤트 큐잉**: `dataLayer.push()`는 GTM 로드 전에도 작동하므로 데이터 손실 없음

## 적용 대상
- 게임, 미디어 등 초기 렌더링이 중요한 사이트
- LCP(Largest Contentful Paint) 개선이 필요한 경우
- Core Web Vitals 점수 향상 목표

## 결론
GTM은 중요하지만 **게임 시작보다 중요하진 않습니다**. 100ms 지연은 분석에 거의 영향이 없으면서 사용자 경험을 크게 개선합니다.
