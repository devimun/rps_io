/**
 * Property 14: 공유 URL 생성 테스트
 * 방 코드로부터 올바른 공유 URL이 생성되는지 검증합니다.
 */
import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import {
  createInviteUrl,
  extractRoomCode,
  createShareMetadata,
  createTwitterShareUrl,
  createFacebookShareUrl,
  copyToClipboard,
} from '../shareUtils';

// window.location.origin 모킹
const MOCK_ORIGIN = 'https://chaosrps.io';

// 테스트 전에 window 모킹
vi.stubGlobal('window', {
  location: {
    origin: MOCK_ORIGIN,
    href: MOCK_ORIGIN,
  },
});

describe('Property 14: 공유 URL 생성', () => {
  describe('createInviteUrl', () => {
    it('유효한 방 코드로 올바른 URL을 생성해야 합니다', () => {
      const url = createInviteUrl('ABC123');
      expect(url).toContain('?code=ABC123');
    });

    it('소문자 코드도 대문자로 변환해야 합니다', () => {
      const url = createInviteUrl('abc123');
      expect(url).toContain('?code=ABC123');
    });

    it('유효하지 않은 코드는 에러를 발생시켜야 합니다', () => {
      expect(() => createInviteUrl('')).toThrow();
      expect(() => createInviteUrl('ABC')).toThrow();
      expect(() => createInviteUrl('ABCDEFGH')).toThrow();
    });
  });

  describe('Property: 6자리 영문/숫자 코드 라운드 트립', () => {
    it('생성된 URL에서 원본 코드를 추출할 수 있어야 합니다', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[A-Z0-9]{6}$/),
          (code: string) => {
            const url = createInviteUrl(code);
            const extracted = extractRoomCode(url);
            expect(extracted).toBe(code.toUpperCase());
          }
        )
      );
    });
  });

  describe('extractRoomCode', () => {
    it('URL에서 방 코드를 추출해야 합니다', () => {
      expect(extractRoomCode(`${MOCK_ORIGIN}?code=ABC123`)).toBe('ABC123');
      expect(extractRoomCode(`${MOCK_ORIGIN}?code=abc123`)).toBe('ABC123');
    });

    it('코드가 없는 URL은 null을 반환해야 합니다', () => {
      expect(extractRoomCode(MOCK_ORIGIN)).toBeNull();
      expect(extractRoomCode(`${MOCK_ORIGIN}?other=value`)).toBeNull();
    });

    it('유효하지 않은 코드는 null을 반환해야 합니다', () => {
      expect(extractRoomCode(`${MOCK_ORIGIN}?code=ABC`)).toBeNull();
      expect(extractRoomCode(`${MOCK_ORIGIN}?code=ABC123456`)).toBeNull();
      expect(extractRoomCode(`${MOCK_ORIGIN}?code=ABC-12`)).toBeNull();
    });

    it('잘못된 URL은 null을 반환해야 합니다', () => {
      expect(extractRoomCode('not-a-url')).toBeNull();
    });
  });
});

describe('공유 메타데이터 생성', () => {
  it('기본 메타데이터를 생성해야 합니다', () => {
    const metadata = createShareMetadata();
    expect(metadata.title).toBe('ChaosRPS.io');
    expect(typeof metadata.url).toBe('string');
    expect(metadata.description).toContain('가위바위보');
  });

  it('방 코드가 있으면 초대 URL을 포함해야 합니다', () => {
    const metadata = createShareMetadata('ABC123');
    expect(metadata.url).toContain('?code=ABC123');
  });

  it('점수가 있으면 설명에 포함해야 합니다', () => {
    const metadata = createShareMetadata(undefined, 100);
    expect(metadata.description).toContain('100점');
  });
});

describe('소셜 미디어 공유 URL', () => {
  const testMetadata = {
    title: 'ChaosRPS.io',
    description: 'Test description',
    url: `${MOCK_ORIGIN}?code=ABC123`,
  };

  it('트위터 공유 URL을 생성해야 합니다', () => {
    const url = createTwitterShareUrl(testMetadata);
    expect(url).toContain('twitter.com/intent/tweet');
    expect(url).toContain(encodeURIComponent(testMetadata.url));
  });

  it('페이스북 공유 URL을 생성해야 합니다', () => {
    const url = createFacebookShareUrl(testMetadata);
    expect(url).toContain('facebook.com/sharer');
    expect(url).toContain(encodeURIComponent(testMetadata.url));
  });
});

describe('클립보드 복사', () => {
  it('클립보드 API가 없으면 폴백을 사용해야 합니다', async () => {
    // navigator.clipboard 모킹 제거
    vi.stubGlobal('navigator', {});
    
    // document.execCommand 모킹
    const mockExecCommand = vi.fn().mockReturnValue(true);
    vi.stubGlobal('document', {
      createElement: vi.fn().mockReturnValue({
        value: '',
        style: {},
        select: vi.fn(),
      }),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
      execCommand: mockExecCommand,
    });

    const result = await copyToClipboard('test-url');
    expect(result).toBe(true);
  });
});
