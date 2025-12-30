/**
 * 다국어(i18n) 유틸리티
 * 브라우저 언어 감지 및 번역 텍스트 로딩 기능을 제공합니다.
 */
import type { SupportedLanguage } from '@chaos-rps/shared';

/** 번역 키 타입 */
export type TranslationKey = keyof typeof translations.ko;

/** 번역 데이터 구조 */
type TranslationData = Record<string, string>;

/** 지원 언어별 번역 데이터 */
const translations: Record<SupportedLanguage, TranslationData> = {
  ko: {
    // 공통
    'common.loading': '로딩 중...',
    'common.error': '오류가 발생했습니다',
    'common.retry': '다시 시도',
    'common.close': '닫기',
    'common.confirm': '확인',
    'common.cancel': '취소',

    // 로비
    'lobby.title': 'ChaosRPS.io',
    'lobby.subtitle': '가위바위보 배틀로얄',
    'lobby.quickStart': '바로 시작',
    'lobby.createRoom': '방 만들기',
    'lobby.joinRoom': '코드로 입장',
    'lobby.nickname': '닉네임',
    'lobby.nicknamePlaceholder': '영문/숫자만 (1-12자)',
    'lobby.roomCode': '초대 코드',
    'lobby.roomCodePlaceholder': '6자리 코드 입력',
    'lobby.fillWithBots': 'AI 봇으로 채우기',
    'lobby.join': '입장',
    'lobby.create': '생성',

    // 게임
    'game.ranking': '순위',
    'game.score': '점수',
    'game.you': '나',

    // 사망 화면
    'death.title': '제거되었습니다!',
    'death.eliminatedBy': '{nickname}에게 제거당했습니다',
    'death.share': '공유하기',
    'death.playAgain': '다시 하기',
    'death.backToLobby': '로비로',

    // 튜토리얼
    'tutorial.title': '게임 방법',
    'tutorial.rule1': '가위 > 보 > 바위 > 가위',
    'tutorial.rule2': '상대를 잡으면 점수 획득',
    'tutorial.rule3': '점수가 높을수록 크기 증가',
    'tutorial.rule4': '1.5초마다 랜덤 변신',
    'tutorial.dontShowAgain': '다시 보지 않기',
    'tutorial.start': '시작하기',

    // 인앱 브라우저 경고
    'inapp.title': '외부 브라우저 권장',
    'inapp.message': '인앱 브라우저에서는 게임이 원활하지 않을 수 있습니다.',
    'inapp.openExternal': '외부 브라우저로 열기',
    'inapp.continue': '계속하기',

    // 에러 메시지
    'error.invalidNickname': '닉네임은 영문/숫자 1-12자만 가능합니다',
    'error.roomNotFound': '방을 찾을 수 없습니다',
    'error.roomFull': '방이 가득 찼습니다',
    'error.connectionFailed': '서버 연결에 실패했습니다',
  },
  en: {
    // 공통
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.retry': 'Retry',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.cancel': 'Cancel',

    // 로비
    'lobby.title': 'ChaosRPS.io',
    'lobby.subtitle': 'Rock Paper Scissors Battle Royale',
    'lobby.quickStart': 'Quick Start',
    'lobby.createRoom': 'Create Room',
    'lobby.joinRoom': 'Join with Code',
    'lobby.nickname': 'Nickname',
    'lobby.nicknamePlaceholder': 'Letters/numbers only (1-12)',
    'lobby.roomCode': 'Room Code',
    'lobby.roomCodePlaceholder': 'Enter 6-digit code',
    'lobby.fillWithBots': 'Fill with AI bots',
    'lobby.join': 'Join',
    'lobby.create': 'Create',

    // 게임
    'game.ranking': 'Ranking',
    'game.score': 'Score',
    'game.you': 'You',

    // 사망 화면
    'death.title': 'Eliminated!',
    'death.eliminatedBy': 'Eliminated by {nickname}',
    'death.share': 'Share',
    'death.playAgain': 'Play Again',
    'death.backToLobby': 'Back to Lobby',

    // 튜토리얼
    'tutorial.title': 'How to Play',
    'tutorial.rule1': 'Scissors > Paper > Rock > Scissors',
    'tutorial.rule2': 'Catch opponents to score',
    'tutorial.rule3': 'Higher score = bigger size',
    'tutorial.rule4': 'Random transform every 1.5s',
    'tutorial.dontShowAgain': "Don't show again",
    'tutorial.start': 'Start',

    // 인앱 브라우저 경고
    'inapp.title': 'External Browser Recommended',
    'inapp.message': 'The game may not work properly in in-app browsers.',
    'inapp.openExternal': 'Open in External Browser',
    'inapp.continue': 'Continue Anyway',

    // 에러 메시지
    'error.invalidNickname': 'Nickname must be 1-12 letters/numbers only',
    'error.roomNotFound': 'Room not found',
    'error.roomFull': 'Room is full',
    'error.connectionFailed': 'Failed to connect to server',
  },
};

/** 기본 언어 (폴백) */
const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

/**
 * 브라우저 언어 감지
 * @returns 지원되는 언어 코드
 */
export function detectBrowserLanguage(): SupportedLanguage {
  if (typeof navigator === 'undefined') return DEFAULT_LANGUAGE;

  const browserLang = navigator.language.toLowerCase();

  // 한국어 감지
  if (browserLang.startsWith('ko')) return 'ko';

  // 기본값: 영어
  return 'en';
}

/**
 * 언어가 지원되는지 확인
 * @param lang - 확인할 언어 코드
 * @returns 지원 여부
 */
export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return lang === 'ko' || lang === 'en';
}

/**
 * 번역 텍스트 가져오기
 * @param key - 번역 키
 * @param lang - 언어 코드
 * @param params - 치환 파라미터 (예: { nickname: 'Player1' })
 * @returns 번역된 텍스트
 */
export function t(
  key: string,
  lang: SupportedLanguage,
  params?: Record<string, string>
): string {
  // 해당 언어에서 번역 찾기
  let text = translations[lang]?.[key];

  // 없으면 기본 언어(영어)에서 찾기
  if (!text) {
    text = translations[DEFAULT_LANGUAGE]?.[key];
  }

  // 그래도 없으면 키 반환
  if (!text) {
    return key;
  }

  // 파라미터 치환
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), value);
    });
  }

  return text;
}

/**
 * 특정 언어의 모든 번역 데이터 가져오기
 * @param lang - 언어 코드
 * @returns 번역 데이터 객체
 */
export function getTranslations(lang: SupportedLanguage): TranslationData {
  return translations[lang] ?? translations[DEFAULT_LANGUAGE];
}

/**
 * 번역 키 존재 여부 확인
 * @param key - 확인할 키
 * @param lang - 언어 코드
 * @returns 존재 여부
 */
export function hasTranslation(key: string, lang: SupportedLanguage): boolean {
  return key in translations[lang];
}
