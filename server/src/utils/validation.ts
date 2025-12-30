/**
 * 입력 검증 유틸리티
 * 닉네임, 코드 등 사용자 입력 검증
 * Requirements: 4.6
 */

/** 검증 결과 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/** 닉네임 설정 */
const NICKNAME_MIN_LENGTH = 1;
const NICKNAME_MAX_LENGTH = 12;
const NICKNAME_PATTERN = /^[a-zA-Z0-9]+$/;

/**
 * 닉네임 검증
 * - 영문자(a-z, A-Z)와 숫자(0-9)만 허용
 * - 길이 제한: 1~12자
 *
 * @param nickname - 검증할 닉네임
 * @returns 검증 결과
 */
export function validateNickname(nickname: string): ValidationResult {
  // null/undefined 체크
  if (nickname == null) {
    return { valid: false, error: '닉네임을 입력해주세요.' };
  }

  // 타입 체크
  if (typeof nickname !== 'string') {
    return { valid: false, error: '닉네임은 문자열이어야 합니다.' };
  }

  // 공백 제거
  const trimmed = nickname.trim();

  // 길이 체크
  if (trimmed.length < NICKNAME_MIN_LENGTH) {
    return { valid: false, error: '닉네임을 입력해주세요.' };
  }

  if (trimmed.length > NICKNAME_MAX_LENGTH) {
    return { valid: false, error: `닉네임은 ${NICKNAME_MAX_LENGTH}자 이하여야 합니다.` };
  }

  // 패턴 체크 (영문자, 숫자만)
  if (!NICKNAME_PATTERN.test(trimmed)) {
    return { valid: false, error: '닉네임은 영문자와 숫자만 사용할 수 있습니다.' };
  }

  return { valid: true };
}

/**
 * 닉네임이 유효한지 간단히 확인
 *
 * @param nickname - 검증할 닉네임
 * @returns 유효 여부
 */
export function isValidNickname(nickname: string): boolean {
  return validateNickname(nickname).valid;
}

/**
 * 초대 코드 검증
 * - 6자리 영문 대문자 + 숫자
 *
 * @param code - 검증할 코드
 * @returns 검증 결과
 */
export function validateInviteCode(code: string): ValidationResult {
  if (code == null || typeof code !== 'string') {
    return { valid: false, error: '초대 코드를 입력해주세요.' };
  }

  const trimmed = code.trim().toUpperCase();

  if (trimmed.length !== 6) {
    return { valid: false, error: '초대 코드는 6자리입니다.' };
  }

  // 혼동하기 쉬운 문자 제외한 패턴
  const codePattern = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/;
  if (!codePattern.test(trimmed)) {
    return { valid: false, error: '유효하지 않은 초대 코드입니다.' };
  }

  return { valid: true };
}
