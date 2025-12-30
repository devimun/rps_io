/**
 * 로컬 스토리지 서비스
 * 브라우저 localStorage를 안전하게 사용하기 위한 추상화 레이어입니다.
 */

/** 스토리지 키 상수 */
export const STORAGE_KEYS = {
  TUTORIAL_DISMISSED: 'chaos-rps:tutorial-dismissed',
  LANGUAGE: 'chaos-rps:language',
  LOW_SPEC_MODE: 'chaos-rps:low-spec-mode',
  NICKNAME: 'chaos-rps:nickname',
} as const;

/** 스토리지 키 타입 */
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * localStorage 사용 가능 여부 확인
 * 시크릿 모드나 일부 브라우저에서는 localStorage가 비활성화될 수 있습니다.
 * @returns localStorage 사용 가능 여부
 */
export function isStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * 값 저장
 * @param key - 스토리지 키
 * @param value - 저장할 값 (JSON 직렬화 가능해야 함)
 * @returns 저장 성공 여부
 */
export function setItem<T>(key: StorageKey, value: T): boolean {
  if (!isStorageAvailable()) return false;

  try {
    const serialized = JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
    return true;
  } catch {
    console.warn(`[StorageService] Failed to save item: ${key}`);
    return false;
  }
}

/**
 * 값 조회
 * @param key - 스토리지 키
 * @param defaultValue - 기본값 (값이 없거나 파싱 실패 시 반환)
 * @returns 저장된 값 또는 기본값
 */
export function getItem<T>(key: StorageKey, defaultValue: T): T {
  if (!isStorageAvailable()) return defaultValue;

  try {
    const item = window.localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item) as T;
  } catch {
    console.warn(`[StorageService] Failed to parse item: ${key}`);
    return defaultValue;
  }
}

/**
 * 값 삭제
 * @param key - 스토리지 키
 * @returns 삭제 성공 여부
 */
export function removeItem(key: StorageKey): boolean {
  if (!isStorageAvailable()) return false;

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    console.warn(`[StorageService] Failed to remove item: ${key}`);
    return false;
  }
}

/**
 * 모든 앱 데이터 삭제
 * @returns 삭제 성공 여부
 */
export function clearAll(): boolean {
  if (!isStorageAvailable()) return false;

  try {
    Object.values(STORAGE_KEYS).forEach((key) => {
      window.localStorage.removeItem(key);
    });
    return true;
  } catch {
    console.warn('[StorageService] Failed to clear all items');
    return false;
  }
}

// ============================================
// 튜토리얼 설정 전용 헬퍼 함수
// ============================================

/**
 * 튜토리얼 숨김 설정 저장
 * @param dismissed - 숨김 여부
 * @returns 저장 성공 여부
 */
export function setTutorialDismissed(dismissed: boolean): boolean {
  return setItem(STORAGE_KEYS.TUTORIAL_DISMISSED, dismissed);
}

/**
 * 튜토리얼 숨김 설정 조회
 * @returns 숨김 여부 (기본값: false)
 */
export function getTutorialDismissed(): boolean {
  return getItem(STORAGE_KEYS.TUTORIAL_DISMISSED, false);
}

// ============================================
// 닉네임 전용 헬퍼 함수
// ============================================

/**
 * 닉네임 저장
 * @param nickname - 저장할 닉네임
 * @returns 저장 성공 여부
 */
export function saveNickname(nickname: string): boolean {
  return setItem(STORAGE_KEYS.NICKNAME, nickname);
}

/**
 * 닉네임 조회
 * @returns 저장된 닉네임 (기본값: 빈 문자열)
 */
export function loadNickname(): string {
  return getItem(STORAGE_KEYS.NICKNAME, '');
}
