/**
 * 브라우저 경고 컴포넌트
 * 인앱 브라우저 또는 저성능 브라우저에서 접속 시 외부 브라우저 사용을 권장합니다.
 */
import { useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { detectInAppBrowser, detectSlowBrowser, getExternalBrowserUrl } from '../../utils/deviceDetector';
import { copyToClipboard } from '../../utils/shareUtils';

/**
 * 브라우저 경고 컴포넌트
 */
export function InAppWarning() {
  const { language, setIsInAppBrowser } = useUIStore();
  const [copySuccess, setCopySuccess] = useState(false);

  const inAppType = detectInAppBrowser();
  const slowBrowserType = detectSlowBrowser();
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);

  // 브라우저 타입에 따른 메시지 결정
  const getBrowserName = (): string => {
    if (inAppType) {
      const names: Record<string, string> = {
        kakao: language === 'ko' ? '카카오톡' : 'KakaoTalk',
        instagram: 'Instagram',
        facebook: 'Facebook',
        line: 'LINE',
        naver: language === 'ko' ? '네이버' : 'Naver',
        twitter: 'Twitter',
        tiktok: 'TikTok',
        unknown: language === 'ko' ? '인앱 브라우저' : 'In-App Browser',
      };
      return names[inAppType] || names.unknown;
    }
    if (slowBrowserType) {
      const names: Record<string, string> = {
        ucbrowser: 'UC Browser',
        'opera-mini': 'Opera Mini',
      };
      return names[slowBrowserType] || (language === 'ko' ? '현재 브라우저' : 'Current Browser');
    }
    return language === 'ko' ? '현재 브라우저' : 'Current Browser';
  };

  const getRecommendedBrowser = (): string => {
    if (isIOS) return 'Safari';
    return 'Chrome';
  };

  /** URL 복사 (iOS용) */
  const handleCopyUrl = async () => {
    const success = await copyToClipboard(window.location.href);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  /** 외부 브라우저로 열기 (Android용) */
  const handleOpenExternal = () => {
    const currentUrl = window.location.href;
    const externalUrl = getExternalBrowserUrl(currentUrl, inAppType);
    window.location.href = externalUrl;
  };

  /** 계속하기 */
  const handleContinue = () => {
    setIsInAppBrowser(false); // 경고 닫기
  };

  const browserName = getBrowserName();
  const recommendedBrowser = getRecommendedBrowser();

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <article className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full text-center">
        {/* 경고 아이콘 */}
        <div className="text-5xl mb-3">⚠️</div>

        {/* 제목 */}
        <h1 className="text-lg font-bold text-yellow-400 mb-3">
          {browserName}
          {language === 'ko' ? '는 게임 성능이 낮습니다' : ' has low game performance'}
        </h1>

        {/* 메시지 */}
        <p className="text-slate-300 text-sm mb-6">
          {language === 'ko' ? '원활한 게임 플레이를 위해' : 'For smooth gameplay,'}<br />
          <strong className="text-cyan-400">{recommendedBrowser}</strong>
          {language === 'ko' ? '를 사용해 주세요.' : ' is recommended.'}
        </p>

        {/* 버튼 그룹 */}
        <nav className="space-y-3">
          {/* iOS: URL 복사 안내 */}
          {isIOS && (
            <>
              <div className="text-slate-400 text-xs mb-3 p-3 bg-slate-900/50 rounded-lg">
                {language === 'ko' ? (
                  <>
                    1. 아래 버튼으로 URL 복사<br />
                    2. Safari를 열어서 붙여넣기
                  </>
                ) : (
                  <>
                    1. Copy URL with button below<br />
                    2. Open Safari and paste
                  </>
                )}
              </div>
              <button
                onClick={handleCopyUrl}
                className={`w-full py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 ${copySuccess
                  ? 'bg-green-500 text-white'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-white'
                  }`}
              >
                {copySuccess ? (
                  <>
                    ✓ {language === 'ko' ? 'URL 복사됨!' : 'URL Copied!'}
                  </>
                ) : (
                  <>
                    📋 {language === 'ko' ? 'URL 복사하기' : 'Copy URL'}
                  </>
                )}
              </button>
            </>
          )}

          {/* Android: Chrome으로 열기 */}
          {isAndroid && !slowBrowserType && (
            <button
              onClick={handleOpenExternal}
              className="w-full py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 
                         text-white font-bold transition-colors flex items-center justify-center gap-2"
            >
              <span>🌐</span>
              {language === 'ko' ? 'Chrome으로 열기' : 'Open in Chrome'}
            </button>
          )}

          {/* 저성능 브라우저 (Android): Chrome 권장 */}
          {isAndroid && slowBrowserType && (
            <div className="text-slate-400 text-sm py-2">
              {language === 'ko'
                ? 'Chrome 브라우저를 사용해주세요'
                : 'Please use Chrome browser'}
            </div>
          )}

          {/* 계속하기 버튼 */}
          <button
            onClick={handleContinue}
            className="w-full py-3 rounded-lg bg-slate-700 hover:bg-slate-600 
                       text-slate-300 transition-colors text-sm"
          >
            {language === 'ko' ? '그냥 계속하기' : 'Continue Anyway'}
          </button>
        </nav>
      </article>
    </div>
  );
}
