/**
 * 기기 및 브라우저 감지 유틸리티
 * 모바일/PC 감지, 인앱 브라우저 감지 기능을 제공합니다.
 */

/** 인앱 브라우저 타입 */
export type InAppBrowserType =
  | 'kakao'
  | 'instagram'
  | 'facebook'
  | 'line'
  | 'naver'
  | 'twitter'
  | 'tiktok'
  | 'unknown'
  | null;

/** 저성능 브라우저 타입 */
export type SlowBrowserType = 'samsung' | 'ucbrowser' | 'opera-mini' | null;

/** 기기 타입 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop';

/** 기기 감지 결과 인터페이스 */
export interface DeviceInfo {
  /** 기기 타입 */
  deviceType: DeviceType;
  /** 모바일 여부 */
  isMobile: boolean;
  /** 터치 지원 여부 */
  hasTouch: boolean;
  /** 인앱 브라우저 여부 */
  isInAppBrowser: boolean;
  /** 인앱 브라우저 타입 */
  inAppBrowserType: InAppBrowserType;
  /** 저성능 브라우저 타입 */
  slowBrowserType: SlowBrowserType;
  /** 저성능 브라우저 여부 */
  isSlowBrowser: boolean;
}

/**
 * 인앱 브라우저 User-Agent 패턴
 * 각 앱의 내장 브라우저를 식별하기 위한 정규식 패턴입니다.
 */
const IN_APP_BROWSER_PATTERNS: Record<Exclude<InAppBrowserType, null | 'unknown'>, RegExp> = {
  kakao: /KAKAOTALK/i,
  instagram: /Instagram/i,
  facebook: /FBAN|FBAV|FB_IAB/i,
  line: /Line\//i,
  naver: /NAVER/i,
  twitter: /Twitter/i,
  tiktok: /TikTok|BytedanceWebview/i,
};

/**
 * 일반적인 인앱 브라우저 패턴
 * 특정 앱을 식별할 수 없지만 인앱 브라우저임을 나타내는 패턴입니다.
 */
const GENERIC_IN_APP_PATTERNS = [
  /WebView/i,
  /wv\)/i, // Android WebView
  /\(.*; wv\)/i,
];

/**
 * 인앱 브라우저 감지
 * @param userAgent - User-Agent 문자열 (테스트용 주입 가능)
 * @returns 인앱 브라우저 타입 (null이면 일반 브라우저)
 */
export function detectInAppBrowser(userAgent?: string): InAppBrowserType {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');

  // 특정 앱 인앱 브라우저 감지
  for (const [type, pattern] of Object.entries(IN_APP_BROWSER_PATTERNS)) {
    if (pattern.test(ua)) {
      return type as InAppBrowserType;
    }
  }

  // 일반적인 WebView 패턴 감지
  for (const pattern of GENERIC_IN_APP_PATTERNS) {
    if (pattern.test(ua)) {
      return 'unknown';
    }
  }

  return null;
}

/**
 * 모바일 기기 감지
 * @param userAgent - User-Agent 문자열 (테스트용 주입 가능)
 * @returns 모바일 여부
 */
export function detectMobile(userAgent?: string): boolean {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');

  const mobilePatterns = [
    /Android/i,
    /webOS/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /Windows Phone/i,
    /Mobile/i,
  ];

  return mobilePatterns.some((pattern) => pattern.test(ua));
}

/**
 * 태블릿 기기 감지
 * @param userAgent - User-Agent 문자열 (테스트용 주입 가능)
 * @returns 태블릿 여부
 */
export function detectTablet(userAgent?: string): boolean {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');

  const tabletPatterns = [/iPad/i, /Android(?!.*Mobile)/i, /Tablet/i];

  return tabletPatterns.some((pattern) => pattern.test(ua));
}

/**
 * 터치 지원 감지
 * @returns 터치 지원 여부
 */
export function detectTouchSupport(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - msMaxTouchPoints는 IE/Edge 레거시 속성
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * 기기 타입 감지
 * @param userAgent - User-Agent 문자열 (테스트용 주입 가능)
 * @returns 기기 타입
 */
export function detectDeviceType(userAgent?: string): DeviceType {
  if (detectTablet(userAgent)) return 'tablet';
  if (detectMobile(userAgent)) return 'mobile';
  return 'desktop';
}

/**
 * 저성능 브라우저 감지
 * @param userAgent - User-Agent 문자열
 * @returns 저성능 브라우저 타입
 */
export function detectSlowBrowser(userAgent?: string): SlowBrowserType {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');

  // 삼성 인터넷 브라우저
  if (/SamsungBrowser/i.test(ua)) return 'samsung';
  // UC 브라우저
  if (/UCBrowser/i.test(ua)) return 'ucbrowser';
  // Opera Mini
  if (/Opera Mini/i.test(ua)) return 'opera-mini';

  return null;
}

/**
 * 전체 기기 정보 감지
 * @param userAgent - User-Agent 문자열 (테스트용 주입 가능)
 * @returns 기기 정보 객체
 */
export function detectDevice(userAgent?: string): DeviceInfo {
  const inAppBrowserType = detectInAppBrowser(userAgent);
  const slowBrowserType = detectSlowBrowser(userAgent);
  const deviceType = detectDeviceType(userAgent);

  return {
    deviceType,
    isMobile: deviceType === 'mobile' || deviceType === 'tablet',
    hasTouch: detectTouchSupport(),
    isInAppBrowser: inAppBrowserType !== null,
    inAppBrowserType,
    slowBrowserType,
    isSlowBrowser: slowBrowserType !== null,
  };
}

/**
 * 외부 브라우저 열기 URL 생성
 * 인앱 브라우저에서 외부 브라우저로 이동하기 위한 URL을 생성합니다.
 * @param url - 열고자 하는 URL
 * @param inAppType - 인앱 브라우저 타입
 * @returns 외부 브라우저 열기 URL (지원하지 않으면 원본 URL)
 */
export function getExternalBrowserUrl(url: string, inAppType: InAppBrowserType): string {
  // 카카오톡: kakaotalk://web/openExternal?url=
  if (inAppType === 'kakao') {
    return `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
  }

  // 기타 앱은 intent 스킴 사용 (Android)
  if (typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)) {
    return `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;end`;
  }

  // iOS나 지원하지 않는 경우 원본 URL 반환
  return url;
}
