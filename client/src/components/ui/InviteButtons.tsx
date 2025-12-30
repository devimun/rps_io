/**
 * 초대 버튼 컴포넌트
 * 사설방(코드로 입장하는 방)에서 초대 코드/링크 복사 버튼을 제공합니다.
 */
import { useState, memo } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { createShareMetadata, copyToClipboard } from '../../utils/shareUtils';
import { trackShare } from '../../services/analytics';

/**
 * 초대 버튼 컴포넌트
 */
export const InviteButtons = memo(function InviteButtons() {
  const roomCode = useGameStore((state) => state.roomCode);
  const isPrivateRoom = useGameStore((state) => state.isPrivateRoom);
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
    <div className="fixed top-4 left-4 z-30 flex flex-col gap-2">
      {/* 초대 코드 */}
      <div className="flex items-center gap-2 bg-black/60 rounded-lg px-3 py-2">
        <span className="text-xs text-gray-400">CODE</span>
        <span className="text-white font-mono font-bold tracking-wider">{roomCode}</span>
        <button
          onClick={handleCopyCode}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            copiedCode 
              ? 'bg-green-500 text-white' 
              : 'bg-slate-600 hover:bg-slate-500 text-white'
          }`}
        >
          {copiedCode ? '✓' : '복사'}
        </button>
      </div>

      {/* 초대 링크 복사 */}
      <button
        onClick={handleCopyLink}
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          copiedLink 
            ? 'bg-green-500 text-white' 
            : 'bg-black/60 hover:bg-black/80 text-white'
        }`}
      >
        <LinkIcon />
        {copiedLink ? '링크 복사됨!' : '초대 링크 복사'}
      </button>
    </div>
  );
});

/** 링크 아이콘 */
function LinkIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  );
}
