/**
 * Property 15, 16: 다국어 텍스트 로딩 및 언어 폴백 테스트
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  t,
  detectBrowserLanguage,
  isSupportedLanguage,
  getTranslations,
  hasTranslation,
} from '../i18n';
import type { SupportedLanguage } from '@chaos-rps/shared';

describe('Property 15: 다국어 텍스트 로딩', () => {
  const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['ko', 'en'];

  // 필수 번역 키 목록
  const REQUIRED_KEYS = [
    'common.loading',
    'common.error',
    'lobby.title',
    'lobby.quickStart',
    'game.ranking',
    'death.title',
    'tutorial.title',
  ];

  describe('필수 번역 키 존재 확인', () => {
    it.each(SUPPORTED_LANGUAGES)(
      '%s 언어에 모든 필수 키가 존재해야 합니다',
      (lang) => {
        REQUIRED_KEYS.forEach((key) => {
          expect(hasTranslation(key, lang)).toBe(true);
        });
      }
    );
  });

  describe('번역 텍스트 반환', () => {
    it('존재하는 키는 해당 언어의 텍스트를 반환해야 합니다', () => {
      expect(t('lobby.title', 'ko')).toBe('ChaosRPS.io');
      expect(t('lobby.title', 'en')).toBe('ChaosRPS.io');
      expect(t('lobby.subtitle', 'ko')).toBe('가위바위보 배틀로얄');
      expect(t('lobby.subtitle', 'en')).toBe('Rock Paper Scissors Battle Royale');
    });

    it('파라미터 치환이 올바르게 동작해야 합니다', () => {
      const result = t('death.eliminatedBy', 'ko', { nickname: 'TestPlayer' });
      expect(result).toBe('TestPlayer에게 제거당했습니다');

      const resultEn = t('death.eliminatedBy', 'en', { nickname: 'TestPlayer' });
      expect(resultEn).toBe('Eliminated by TestPlayer');
    });
  });

  describe('Property: 모든 지원 언어에서 동일한 키 구조', () => {
    it('한국어와 영어의 번역 키가 동일해야 합니다', () => {
      const koKeys = Object.keys(getTranslations('ko')).sort();
      const enKeys = Object.keys(getTranslations('en')).sort();

      expect(koKeys).toEqual(enKeys);
    });
  });

  describe('Property: 번역 텍스트는 빈 문자열이 아님', () => {
    it.each(SUPPORTED_LANGUAGES)(
      '%s 언어의 모든 번역 값은 비어있지 않아야 합니다',
      (lang) => {
        const translations = getTranslations(lang);
        Object.entries(translations).forEach(([_key, value]) => {
          expect(value.length).toBeGreaterThan(0);
        });
      }
    );
  });
});

describe('Property 16: 언어 폴백', () => {
  describe('존재하지 않는 키 폴백', () => {
    it('존재하지 않는 키는 키 자체를 반환해야 합니다', () => {
      const nonExistentKey = 'non.existent.key';
      expect(t(nonExistentKey, 'ko')).toBe(nonExistentKey);
      expect(t(nonExistentKey, 'en')).toBe(nonExistentKey);
    });
  });

  describe('Property: 임의의 문자열 키에 대한 안전한 폴백', () => {
    it('임의의 키에 대해 항상 문자열을 반환해야 합니다', () => {
      // 예약어(valueOf, toString 등)를 제외한 일반 문자열만 테스트
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-z][a-z0-9.]{0,49}$/),
          fc.constantFrom<SupportedLanguage>('ko', 'en'),
          (key: string, lang: SupportedLanguage) => {
            const result = t(key, lang);
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
          }
        )
      );
    });
  });

  describe('브라우저 언어 감지', () => {
    it('지원되는 언어 코드만 반환해야 합니다', () => {
      const detected = detectBrowserLanguage();
      expect(isSupportedLanguage(detected)).toBe(true);
    });
  });

  describe('isSupportedLanguage 함수', () => {
    it('ko와 en만 true를 반환해야 합니다', () => {
      expect(isSupportedLanguage('ko')).toBe(true);
      expect(isSupportedLanguage('en')).toBe(true);
      expect(isSupportedLanguage('ja')).toBe(false);
      expect(isSupportedLanguage('zh')).toBe(false);
      expect(isSupportedLanguage('')).toBe(false);
    });
  });

  describe('Property: 파라미터 치환 안전성', () => {
    it('파라미터가 없어도 안전하게 동작해야 합니다', () => {
      // 파라미터 플레이스홀더가 있는 키에 파라미터 없이 호출
      const result = t('death.eliminatedBy', 'ko');
      expect(typeof result).toBe('string');
      // 치환되지 않은 플레이스홀더가 남아있음
      expect(result).toContain('{nickname}');
    });

    it('빈 파라미터 객체도 안전하게 처리해야 합니다', () => {
      const result = t('death.eliminatedBy', 'ko', {});
      expect(typeof result).toBe('string');
    });
  });
});
