/**
 * Property 13: 인앱 브라우저 감지 테스트
 * 다양한 User-Agent 문자열에 대해 인앱 브라우저를 정확히 감지하는지 검증합니다.
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  detectInAppBrowser,
  detectMobile,
  detectDevice,
  type InAppBrowserType,
} from '../deviceDetector';

describe('Property 13: 인앱 브라우저 감지', () => {
  // 알려진 인앱 브라우저 User-Agent 샘플
  const IN_APP_USER_AGENTS: Record<Exclude<InAppBrowserType, null | 'unknown'>, string> = {
    kakao:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 9.0.0',
    instagram:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 200.0',
    facebook:
      'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36 [FBAN/FB4A]',
    line: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Line/11.0.0',
    naver:
      'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36 NAVER(inapp)',
    twitter:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Twitter for iPhone',
    tiktok:
      'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36 BytedanceWebview',
  };

  // 일반 브라우저 User-Agent 샘플
  const NORMAL_BROWSER_USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
  ];

  describe('알려진 인앱 브라우저 감지', () => {
    it.each(Object.entries(IN_APP_USER_AGENTS))(
      '%s 인앱 브라우저를 정확히 감지해야 합니다',
      (expectedType, userAgent) => {
        const result = detectInAppBrowser(userAgent);
        expect(result).toBe(expectedType);
      }
    );
  });

  describe('일반 브라우저 감지', () => {
    it.each(NORMAL_BROWSER_USER_AGENTS)(
      '일반 브라우저는 null을 반환해야 합니다: %s',
      (userAgent) => {
        const result = detectInAppBrowser(userAgent);
        expect(result).toBeNull();
      }
    );
  });

  describe('Property: 인앱 브라우저 키워드 포함 시 감지', () => {
    it('인앱 브라우저 키워드가 포함된 UA는 해당 타입으로 감지되어야 합니다', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.keys(IN_APP_USER_AGENTS)),
          (browserType: string) => {
            const userAgent = IN_APP_USER_AGENTS[browserType as keyof typeof IN_APP_USER_AGENTS];
            const result = detectInAppBrowser(userAgent);
            expect(result).toBe(browserType);
          }
        )
      );
    });
  });

  describe('Property: 빈 문자열 및 undefined 처리', () => {
    it('빈 문자열은 null을 반환해야 합니다', () => {
      expect(detectInAppBrowser('')).toBeNull();
    });

    it('undefined는 null을 반환해야 합니다 (navigator 없는 환경)', () => {
      // 테스트 환경에서는 navigator가 없으므로 빈 문자열로 처리됨
      expect(detectInAppBrowser(undefined)).toBeNull();
    });
  });
});

describe('모바일 기기 감지', () => {
  const MOBILE_USER_AGENTS = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
    'Mozilla/5.0 (Linux; Android 11; SM-G991B)',
    'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)',
  ];

  const DESKTOP_USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'Mozilla/5.0 (X11; Linux x86_64)',
  ];

  describe('모바일 UA 감지', () => {
    it.each(MOBILE_USER_AGENTS)('모바일 UA를 감지해야 합니다: %s', (userAgent) => {
      expect(detectMobile(userAgent)).toBe(true);
    });
  });

  describe('데스크톱 UA 감지', () => {
    it.each(DESKTOP_USER_AGENTS)('데스크톱 UA는 false를 반환해야 합니다: %s', (userAgent) => {
      expect(detectMobile(userAgent)).toBe(false);
    });
  });
});

describe('통합 기기 정보 감지', () => {
  it('카카오톡 인앱 브라우저 정보를 올바르게 반환해야 합니다', () => {
    const kakaoUA =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 KAKAOTALK';
    const info = detectDevice(kakaoUA);

    expect(info.isInAppBrowser).toBe(true);
    expect(info.inAppBrowserType).toBe('kakao');
    expect(info.isMobile).toBe(true);
  });

  it('일반 데스크톱 브라우저 정보를 올바르게 반환해야 합니다', () => {
    const chromeUA =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0';
    const info = detectDevice(chromeUA);

    expect(info.isInAppBrowser).toBe(false);
    expect(info.inAppBrowserType).toBeNull();
    expect(info.deviceType).toBe('desktop');
    expect(info.isMobile).toBe(false);
  });
});
