/**
 * 인앱 브라우저 경고 컴포넌트
 * 인앱 브라우저에서 접속 시 외부 브라우저 사용을 권장합니다.
 */
import { useUIStore } from '../../stores/uiStore';
import { t } from '../../utils/i18n';
import { detectInAppBrowser, getExternalBrowserUrl } from '../../utils/deviceDetector';

/**
 * 인앱 브라우저 경고 컴포넌트
 */
export function InAppWarning() {
  const { language, setIsInAppBrowser, setLowSpecMode } = useUIStore();

  const inAppType = detectInAppBrowser();

  /** 외부 브라우저로 열기 */
  const handleOpenExternal = () => {
    const currentUrl = window.location.href;
    const externalUrl = getExternalBrowserUrl(currentUrl, inAppType);
    window.location.href = externalUrl;
  };

  /** 계속하기 (저사양 모드 활성화) */
  const handleContinue = () => {
    setIsInAppBrowser(false); // 경고 닫기
    setLowSpecMode(true); // 저사양 모드 활성화
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <article className="bg-slate-800 rounded-2xl p-8 max-w-sm w-full text-center">
        {/* 경고 아이콘 */}
        <div className="text-6xl mb-4">⚠️</div>

        {/* 제목 */}
        <h1 className="text-xl font-bold text-yellow-400 mb-4">
          {t('inapp.title', language)}
        </h1>

        {/* 메시지 */}
        <p className="text-slate-300 mb-8">
          {t('inapp.message', language)}
        </p>

        {/* 버튼 그룹 */}
        <nav className="space-y-3">
          <button
            onClick={handleOpenExternal}
            className="w-full py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 
                       text-white font-bold transition-colors"
          >
            {t('inapp.openExternal', language)}
          </button>

          <button
            onClick={handleContinue}
            className="w-full py-3 rounded-lg bg-slate-700 hover:bg-slate-600 
                       text-slate-300 transition-colors"
          >
            {t('inapp.continue', language)}
          </button>
        </nav>
      </article>
    </div>
  );
}
