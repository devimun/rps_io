/**
 * Property 8 테스트: 닉네임 영문자 검증
 *
 * *For any* 문자열에 대해, 영문자(a-z, A-Z)와 숫자(0-9)만 포함된 경우에만
 * 유효한 닉네임으로 판정해야 하며, 그 외 문자(한글, 특수문자, 공백 등)가
 * 포함되면 거부해야 한다.
 *
 * **Validates: Requirements 4.6, 11.3**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateNickname, isValidNickname, validateInviteCode } from '../utils/validation';

describe('Feature: chaos-rps-io, Property 8: 닉네임 영문자 검증', () => {
  it('영문자와 숫자만 포함된 닉네임은 유효해야 한다', () => {
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')), {
          minLength: 1,
          maxLength: 12,
        }),
        (nickname) => {
          const result = validateNickname(nickname);
          return result.valid === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('한글이 포함된 닉네임은 거부해야 한다', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 0, maxLength: 5 }),
          fc.stringOf(fc.constantFrom(...'가나다라마바사아자차카타파하'.split('')), { minLength: 1, maxLength: 3 }),
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 0, maxLength: 5 })
        ),
        ([prefix, korean, suffix]) => {
          const nickname = prefix + korean + suffix;
          const result = validateNickname(nickname);
          return result.valid === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('특수문자가 포함된 닉네임은 거부해야 한다', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 1, maxLength: 5 }),
          fc.constantFrom('!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '=', '+')
        ),
        ([base, special]) => {
          const nickname = base + special;
          const result = validateNickname(nickname);
          return result.valid === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('공백이 포함된 닉네임은 거부해야 한다', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 1, maxLength: 5 }),
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 1, maxLength: 5 })
        ),
        ([part1, part2]) => {
          const nickname = part1 + ' ' + part2;
          const result = validateNickname(nickname);
          return result.valid === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('빈 문자열은 거부해야 한다', () => {
    const result = validateNickname('');
    expect(result.valid).toBe(false);
  });

  it('12자를 초과하는 닉네임은 거부해야 한다', () => {
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 13, maxLength: 30 }),
        (nickname) => {
          const result = validateNickname(nickname);
          return result.valid === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('닉네임 검증 단위 테스트', () => {
  it('유효한 닉네임 예시', () => {
    expect(isValidNickname('Player1')).toBe(true);
    expect(isValidNickname('abc')).toBe(true);
    expect(isValidNickname('ABC123')).toBe(true);
    expect(isValidNickname('a')).toBe(true);
    expect(isValidNickname('123456789012')).toBe(true); // 12자
  });

  it('유효하지 않은 닉네임 예시', () => {
    expect(isValidNickname('')).toBe(false);
    expect(isValidNickname('   ')).toBe(false);
    expect(isValidNickname('플레이어')).toBe(false);
    expect(isValidNickname('Player!')).toBe(false);
    expect(isValidNickname('Player 1')).toBe(false);
    expect(isValidNickname('1234567890123')).toBe(false); // 13자
  });
});

describe('초대 코드 검증 단위 테스트', () => {
  it('유효한 초대 코드', () => {
    expect(validateInviteCode('ABC234').valid).toBe(true);
    expect(validateInviteCode('XYZDEF').valid).toBe(true);
    expect(validateInviteCode('abc234').valid).toBe(true); // 소문자도 허용 (대문자로 변환)
  });

  it('유효하지 않은 초대 코드', () => {
    expect(validateInviteCode('').valid).toBe(false);
    expect(validateInviteCode('ABC').valid).toBe(false); // 3자
    expect(validateInviteCode('ABCDEFG').valid).toBe(false); // 7자
    expect(validateInviteCode('ABC12O').valid).toBe(false); // O 포함 (혼동 문자)
  });
});
