/**
 * 초대 버튼 컴포넌트
 * 사설방(코드로 입장하는 방)에서 초대 코드/링크 복사 버튼을 제공합니다.
 * 통일된 컴팩트 UI
 */
import { useState, memo } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';
import { createShareMetadata, copyToClipboard } from '../../utils/shareUtils';
import { trackShare } from '../../services/analytics';

/**
 * 초대 버튼 컴포넌트 - 통일된 디자인
 */
export const InviteButtons = memo(function InviteButtons() {
  const roomCode = useGameStore((state) => state.roomCode);
  const isPrivateRoom = useGameStore((state) => state.isPrivateRoom);
  const isMobile = useUIStore((state) => state.isMobile);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // 사설방이 아니거나 roomCode가 없으면 표시하지 않음
  if (!isPrivateRoom || !roomCode) return null;

  /** 초대 코드 복사 */
  const handleCopyCode = async () => {
    const success = await copyToClipboard(roomCode);
    if (success) {
      trackShare('code');
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  /** 초대 링크 복사 */
  const handleCopyLink = async () => {
    const metadata = createShareMetadata(roomCode);
    const success = await copyToClipboard(metadata.url);
    if (success) {
      trackShare('link');
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className={`fixed z-30 ${isMobile ? 'top-2 left-2' : 'top-4 left-4'}`}>
      {/* 통일된 컴팩트 카드 */}
      <div className={`bg-black/70 backdrop-blur-sm rounded-lg ${isMobile ? 'p-2' : 'p-3'}`}>
        {/* 방 코드 표시 */}
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-gray-400 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>CODE</span>
          <span className={`text-white font-mono font-bold tracking-widest ${isMobile ? 'text-sm' : 'text-base'}`}>
            {roomCode}
          </span>
        </div>

        {/* 버튼 그룹 - 통일된 스타일 */}
        <div className="flex gap-1">
          <button
            onClick={handleCopyCode}
            className={`flex-1 flex items-center justify-center gap-1 rounded py-1.5 font-medium transition-colors
              ${isMobile ? 'text-xs px-2' : 'text-sm px-3'}
              ${copiedCode
                ? 'bg-green-500 text-white'
                : 'bg-slate-600 hover:bg-slate-500 text-white'
              }`}
          >
            <CopyIcon />
            {copiedCode ? '✓' : '코드'}
          </button>

          <button
            onClick={handleCopyLink}
            className={`flex-1 flex items-center justify-center gap-1 rounded py-1.5 font-medium transition-colors
              ${isMobile ? 'text-xs px-2' : 'text-sm px-3'}
              ${copiedLink
                ? 'bg-green-500 text-white'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
              }`}
          >
            <LinkIcon />
            {copiedLink ? '✓' : '링크'}
          </button>
        </div>
      </div>
    </div>
  );
});

/** 복사 아이콘 */
function CopyIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

/** 링크 아이콘 */
function LinkIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  );
}
