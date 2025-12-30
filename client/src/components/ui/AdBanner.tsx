/**
 * 광고 배너 컴포넌트
 * 게임 중 배너 광고 및 사망 시 전면 광고를 표시합니다.
 * 실제 광고 SDK 연동 전 플레이스홀더입니다.
 */

/** 광고 배너 타입 */
type AdType = 'banner' | 'interstitial';

interface AdBannerProps {
  /** 광고 타입 */
  type: AdType;
  /** 전면 광고 닫기 콜백 */
  onClose?: () => void;
}

/**
 * 광고 배너 컴포넌트
 */
export function AdBanner({ type, onClose }: AdBannerProps) {
  // 배너 광고
  if (type === 'banner') {
    return (
      <aside className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900 flex items-center justify-center z-20">
        <div className="text-slate-500 text-sm">
          [광고 영역 - 320x50]
        </div>
      </aside>
    );
  }

  // 전면 광고
  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <article className="bg-slate-800 rounded-xl p-4 max-w-md w-full mx-4">
        {/* 광고 영역 */}
        <div className="aspect-video bg-slate-700 rounded-lg flex items-center justify-center mb-4">
          <span className="text-slate-500">[전면 광고 영역]</span>
        </div>

        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-lg bg-slate-700 hover:bg-slate-600 
                     text-white transition-colors"
        >
          닫기
        </button>
      </article>
    </div>
  );
}
