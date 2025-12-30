/**
 * UI 상태 관리 스토어
 * Zustand를 사용하여 UI 관련 전역 상태를 관리합니다.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SupportedLanguage } from '@chaos-rps/shared';

/** 모달 타입 */
export type ModalType =
  | 'none'
  | 'createRoom'
  | 'joinRoom'
  | 'settings'
  | 'tutorial'
  | 'inAppWarning';

/** UI 스토어 상태 인터페이스 */
interface UIState {
  // 모달 상태
  activeModal: ModalType;

  // 언어 설정
  language: SupportedLanguage;

  // 튜토리얼 설정
  showTutorial: boolean;
  tutorialDismissed: boolean;

  // 저사양 모드
  lowSpecMode: boolean;

  // 인앱 브라우저 감지
  isInAppBrowser: boolean;

  // 닉네임 (로컬 저장)
  savedNickname: string;

  // 로딩 상태
  isLoading: boolean;
  loadingMessage: string;

  // 에러 상태
  errorMessage: string | null;
}

/** UI 스토어 액션 인터페이스 */
interface UIActions {
  // 모달 관련
  openModal: (modal: ModalType) => void;
  closeModal: () => void;

  // 언어 관련
  setLanguage: (lang: SupportedLanguage) => void;

  // 튜토리얼 관련
  setShowTutorial: (show: boolean) => void;
  dismissTutorial: () => void;

  // 저사양 모드 관련
  setLowSpecMode: (enabled: boolean) => void;

  // 인앱 브라우저 관련
  setIsInAppBrowser: (isInApp: boolean) => void;

  // 닉네임 관련
  setSavedNickname: (nickname: string) => void;

  // 로딩 관련
  setLoading: (isLoading: boolean, message?: string) => void;

  // 에러 관련
  setError: (message: string | null) => void;
  clearError: () => void;
}

/** 브라우저 언어 감지 */
const detectBrowserLanguage = (): SupportedLanguage => {
  if (typeof navigator === 'undefined') return 'en';
  const lang = navigator.language.toLowerCase();
  return lang.startsWith('ko') ? 'ko' : 'en';
};

/** 초기 상태 (persist 미적용 필드) */
const initialNonPersistedState = {
  activeModal: 'none' as ModalType,
  isLoading: false,
  loadingMessage: '',
  errorMessage: null,
  isInAppBrowser: false,
};

/**
 * UI 상태 스토어
 * 일부 설정은 localStorage에 영구 저장됩니다.
 */
export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set) => ({
      // 초기 상태
      ...initialNonPersistedState,
      language: detectBrowserLanguage(),
      showTutorial: true,
      tutorialDismissed: false,
      lowSpecMode: false,
      savedNickname: '',

      // 모달 액션
      openModal: (modal) => set({ activeModal: modal }),
      closeModal: () => set({ activeModal: 'none' }),

      // 언어 액션
      setLanguage: (lang) => set({ language: lang }),

      // 튜토리얼 액션
      setShowTutorial: (show) => set({ showTutorial: show }),
      dismissTutorial: () => set({ tutorialDismissed: true, showTutorial: false }),

      // 저사양 모드 액션
      setLowSpecMode: (enabled) => set({ lowSpecMode: enabled }),

      // 인앱 브라우저 액션
      setIsInAppBrowser: (isInApp) => set({ isInAppBrowser: isInApp }),

      // 닉네임 액션
      setSavedNickname: (nickname) => set({ savedNickname: nickname }),

      // 로딩 액션
      setLoading: (isLoading, message = '') =>
        set({ isLoading, loadingMessage: message }),

      // 에러 액션
      setError: (message) => set({ errorMessage: message }),
      clearError: () => set({ errorMessage: null }),
    }),
    {
      name: 'chaos-rps-ui-storage',
      // persist할 필드만 선택
      partialize: (state) => ({
        language: state.language,
        tutorialDismissed: state.tutorialDismissed,
        lowSpecMode: state.lowSpecMode,
        savedNickname: state.savedNickname,
      }),
    }
  )
);
