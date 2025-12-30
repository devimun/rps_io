/**
 * Google Analytics 4 분석 서비스
 * 게임 이벤트 추적을 위한 유틸리티입니다.
 */

/** GA4 Measurement ID (환경 변수에서 가져옴) */
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

/** gtag 함수 타입 */
type GtagCommand = 'config' | 'event' | 'js' | 'set';

/** Window에 gtag 추가 */
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (command: GtagCommand, ...args: unknown[]) => void;
  }
}

/** GA4 초기화 여부 */
let isInitialized = false;

/**
 * GA4 초기화
 * index.html에 스크립트가 로드된 후 호출됩니다.
 */
export function initAnalytics(): void {
  if (!GA_MEASUREMENT_ID) {
    console.log('[Analytics] GA_MEASUREMENT_ID가 설정되지 않음 - 분석 비활성화');
    return;
  }

  if (isInitialized) return;

  // gtag 스크립트 동적 로드
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  // dataLayer 초기화
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID);

  isInitialized = true;
}

/**
 * 커스텀 이벤트 전송
 */
function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  if (!isInitialized || !window.gtag) return;
  window.gtag('event', eventName, params);
}

/**
 * 게임 시작 이벤트
 */
export function trackGameStart(roomType: 'public' | 'private'): void {
  trackEvent('game_start', {
    room_type: roomType,
  });
}

/**
 * 게임 종료 이벤트
 */
export function trackGameEnd(params: {
  playTimeSeconds: number;
  finalScore: number;
  killCount: number;
  roomType: 'public' | 'private';
}): void {
  trackEvent('game_end', {
    play_time_seconds: params.playTimeSeconds,
    final_score: params.finalScore,
    kill_count: params.killCount,
    room_type: params.roomType,
  });
}

/**
 * 다시하기 클릭 이벤트
 */
export function trackPlayAgain(): void {
  trackEvent('play_again');
}

/**
 * 공유 클릭 이벤트
 */
export function trackShare(method: 'code' | 'link'): void {
  trackEvent('share', {
    method,
  });
}
