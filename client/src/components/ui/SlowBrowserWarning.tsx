/**
 * 저성능 브라우저 경고 컴포넌트
 * 삼성 브라우저 등 저성능 브라우저에서 접속 시 크롬/사파리 사용을 권장합니다.
 */
import { useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import type { SlowBrowserType } from '../../utils/deviceDetector';

interface SlowBrowserWarningProps {
  browserType: SlowBrowserType;
}

/** 브라우저별 이름 */
const BROWSER_NAMES: Record<Exclude<SlowBrowserType, null>, string> = {
  samsung: '삼성 인터넷',
  ucbrowser: 'UC 브라우저',
  'opera-mini': 'Opera Mini',
};

/**
 * 저성능 브라우저 경고 컴포넌트
 */
export function SlowBrowserWarning({ browserType }: SlowBrowserWarningProps) {
  const [dismissed, setDismissed] = useState(false);
  const { setLowSpecMode } = useUIStore();

  if (dismissed || !browserType) return null;

  const browserName = BROWSER_NAMES[browserType] || '현재 브라우저';
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  /** 크롬으로 열기 (Android) */
  const handleOpenChrome = () => {
    const url = window.location.href;
    // Android Intent로 크롬 열기
    window.location.href = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
  };

  /** 계속하기 */
  const handleContinue = () => {
    setDismissed(true);
    setLowSpecMode(true);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <article className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full text-center">
        {/* 경고 아이콘 */}
        <div className="text-5xl mb-3">🐢</div>

        {/* 제목 */}
        <h1 className="text-lg font-bold text-yellow-400 mb-3">
          {browserName}는 게임 성능이 낮습니다
        </h1>

        {/* 메시지 */}
        <p className="text-slate-300 text-sm mb-6">
          원활한 게임 플레이를 위해<br />
          <strong className="text-cyan-400">
            {isIOS ? 'Safari' : 'Chrome'}
          </strong>
          를 사용해 주세요.
        </p>

        {/* 버튼 그룹 */}
        <nav className="space-y-3">
          {isAndroid && (
            <button
              onClick={handleOpenChrome}
              className="w-full py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 
                         text-white font-bold transition-colors flex items-center justify-center gap-2"
            >
              <span>🌐</span>
              Chrome으로 열기
            </button>
          )}

          {isIOS && (
            <div className="text-slate-400 text-sm py-2">
              Safari에서 이 주소를 직접 입력해 주세요:<br />
              <code className="text-cyan-400 text-xs break-all">
                {window.location.href}
              </code>
            </div>
          )}

          <button
            onClick={handleContinue}
            className="w-full py-3 rounded-lg bg-slate-700 hover:bg-slate-600 
                       text-slate-300 transition-colors text-sm"
          >
            그냥 계속하기 (저사양 모드)
          </button>
        </nav>
      </article>
    </div>
  );
}
