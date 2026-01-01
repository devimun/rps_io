/**
 * 전체 화면 버튼 컴포넌트
 * 모바일에서 전체 화면 모드를 유도합니다.
 */
import { useState, useEffect } from 'react';

/**
 * 전체 화면 API 지원 여부 확인
 */
function isFullscreenSupported(): boolean {
  return !!(
    document.fullscreenEnabled ||
    (document as Document & { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled
  );
}

/**
 * 현재 전체 화면 상태 확인
 */
function isFullscreen(): boolean {
  return !!(
    document.fullscreenElement ||
    (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement
  );
}

/**
 * 전체 화면 토글
 */
async function toggleFullscreen(): Promise<void> {
  try {
    if (isFullscreen()) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
        await (document as Document & { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
      }
    } else {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
        await (elem as HTMLElement & { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
      }
    }
  } catch (error) {
    console.warn('[Fullscreen] Failed to toggle:', error);
  }
}

/**
 * 전체 화면 버튼 컴포넌트
 */
export function FullscreenButton() {
  const [isFs, setIsFs] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(isFullscreenSupported());
    setIsFs(isFullscreen());

    const handleChange = () => setIsFs(isFullscreen());
    document.addEventListener('fullscreenchange', handleChange);
    document.addEventListener('webkitfullscreenchange', handleChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
      document.removeEventListener('webkitfullscreenchange', handleChange);
    };
  }, []);

  // 전체 화면 미지원 시 숨김
  if (!supported) return null;

  return (
    <button
      onClick={toggleFullscreen}
      className="fixed bottom-4 left-4 z-30 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
      title={isFs ? '전체 화면 종료' : '전체 화면'}
    >
      {isFs ? (
        <ExitFullscreenIcon />
      ) : (
        <FullscreenIcon />
      )}
    </button>
  );
}

/** 전체 화면 아이콘 */
function FullscreenIcon() {
  return (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  );
}

/** 전체 화면 종료 아이콘 */
function ExitFullscreenIcon() {
  return (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 9V4H4m0 0l5 5M9 15v5H4m0 0l5-5m6-6V4h5m0 0l-5 5m5 6v5h-5m0 0l5-5" />
    </svg>
  );
}
