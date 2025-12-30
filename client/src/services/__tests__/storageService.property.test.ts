/**
 * Property 12: 튜토리얼 설정 라운드 트립 테스트
 * localStorage에 저장한 값이 올바르게 복원되는지 검증합니다.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import {
  setItem,
  getItem,
  removeItem,
  clearAll,
  setTutorialDismissed,
  getTutorialDismissed,
  saveNickname,
  loadNickname,
  isStorageAvailable,
  STORAGE_KEYS,
} from '../storageService';

// localStorage 모킹
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Property 12: 튜토리얼 설정 라운드 트립', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('튜토리얼 설정 저장/로드', () => {
    it('true 값이 올바르게 저장되고 복원되어야 합니다', () => {
      setTutorialDismissed(true);
      expect(getTutorialDismissed()).toBe(true);
    });

    it('false 값이 올바르게 저장되고 복원되어야 합니다', () => {
      setTutorialDismissed(false);
      expect(getTutorialDismissed()).toBe(false);
    });

    it('저장되지 않은 경우 기본값 false를 반환해야 합니다', () => {
      expect(getTutorialDismissed()).toBe(false);
    });
  });

  describe('Property: boolean 라운드 트립', () => {
    it('임의의 boolean 값이 라운드 트립되어야 합니다', () => {
      fc.assert(
        fc.property(fc.boolean(), (value: boolean) => {
          setTutorialDismissed(value);
          expect(getTutorialDismissed()).toBe(value);
        })
      );
    });
  });
});

describe('닉네임 저장/로드', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('닉네임이 올바르게 저장되고 복원되어야 합니다', () => {
    saveNickname('TestPlayer');
    expect(loadNickname()).toBe('TestPlayer');
  });

  it('저장되지 않은 경우 빈 문자열을 반환해야 합니다', () => {
    expect(loadNickname()).toBe('');
  });

  describe('Property: 문자열 라운드 트립', () => {
    it('임의의 영문/숫자 닉네임이 라운드 트립되어야 합니다', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/^[a-zA-Z0-9]{1,12}$/),
          (nickname: string) => {
            saveNickname(nickname);
            expect(loadNickname()).toBe(nickname);
          }
        )
      );
    });
  });
});

describe('일반 스토리지 함수', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('setItem / getItem', () => {
    it('객체가 올바르게 직렬화/역직렬화되어야 합니다', () => {
      const testObj = { name: 'test', value: 123 };
      setItem(STORAGE_KEYS.NICKNAME, testObj);
      expect(getItem(STORAGE_KEYS.NICKNAME, null)).toEqual(testObj);
    });

    it('배열이 올바르게 직렬화/역직렬화되어야 합니다', () => {
      const testArr = [1, 2, 3, 'test'];
      setItem(STORAGE_KEYS.NICKNAME, testArr);
      expect(getItem(STORAGE_KEYS.NICKNAME, null)).toEqual(testArr);
    });

    it('존재하지 않는 키는 기본값을 반환해야 합니다', () => {
      const defaultValue = { default: true };
      expect(getItem(STORAGE_KEYS.NICKNAME, defaultValue)).toEqual(defaultValue);
    });
  });

  describe('removeItem', () => {
    it('항목이 올바르게 삭제되어야 합니다', () => {
      setItem(STORAGE_KEYS.NICKNAME, 'test');
      removeItem(STORAGE_KEYS.NICKNAME);
      expect(getItem(STORAGE_KEYS.NICKNAME, 'default')).toBe('default');
    });
  });

  describe('clearAll', () => {
    it('모든 앱 데이터가 삭제되어야 합니다', () => {
      setTutorialDismissed(true);
      saveNickname('TestPlayer');
      clearAll();
      expect(getTutorialDismissed()).toBe(false);
      expect(loadNickname()).toBe('');
    });
  });

  describe('isStorageAvailable', () => {
    it('localStorage가 사용 가능하면 true를 반환해야 합니다', () => {
      expect(isStorageAvailable()).toBe(true);
    });
  });
});

describe('Property: JSON 직렬화 가능한 값 라운드 트립', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('숫자가 라운드 트립되어야 합니다', () => {
    fc.assert(
      fc.property(fc.integer(), (value: number) => {
        setItem(STORAGE_KEYS.NICKNAME, value);
        expect(getItem(STORAGE_KEYS.NICKNAME, 0)).toBe(value);
      })
    );
  });

  it('문자열이 라운드 트립되어야 합니다', () => {
    fc.assert(
      fc.property(fc.string(), (value: string) => {
        setItem(STORAGE_KEYS.NICKNAME, value);
        expect(getItem(STORAGE_KEYS.NICKNAME, '')).toBe(value);
      })
    );
  });
});
