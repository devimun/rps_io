/**
 * 사망 화면 컴포넌트
 * 플레이어가 제거되었을 때 표시되는 화면입니다.
 */
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';
import { t } from '../../utils/i18n';
import { createShareMetadata, shareViaWebAPI, copyToClipboard, isWebShareSupported } from '../../utils/shareUtils';

/**
 * 사망 화면 컴포넌트
 */
export function DeathScreen() {
  const { eliminatorNickname, deathMessage, roomCode, clearDeathInfo, setPhase, reset } = useGameStore();
  const { language, setError } = useUIStore();

  /** 공유하기 */
  const handleShare = async () => {
    const metadata = createShareMetadata(roomCode ?? undefined);

    if (isWebShareSupported()) {
      await shareViaWebAPI(metadata);
    } else {
      const success = await copyToClipboard(metadata.url);
      if (success) {
        // 복사 성공 알림 (간단한 alert 대신 토스트 사용 권장)
        alert('URL이 복사되었습니다!');
      } else {
        setError('복사에 실패했습니다');
      }
    }
  };

  /** 다시 하기 */
  const handlePlayAgain = () => {
    clearDeathInfo();
    setPhase('playing');
    // 서버에 재입장 요청 필요 (실제 구현 시)
  };

  /** 로비로 돌아가기 */
  const handleBackToLobby = () => {
    reset();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <article className="bg-slate-800 rounded-2xl p-8 max-w-sm w-full text-center">
        {/* 제목 */}
        <h1 className="text-3xl font-bold text-red-400 mb-4">
          {t('death.title', language)}
        </h1>

        {/* 사망 메시지 */}
        <p className="text-slate-300 mb-2">
          {deathMessage || t('death.eliminatedBy', language, { nickname: eliminatorNickname || '???' })}
        </p>

        {/* 버튼 그룹 */}
        <nav className="space-y-3 mt-8">
          <button
            onClick={handleShare}
            className="w-full py-3 rounded-lg bg-slate-700 hover:bg-slate-600 
                       text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            <ShareIcon />
            {t('death.share', language)}
          </button>

          <button
            onClick={handlePlayAgain}
            className="w-full py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 
                       text-white font-bold transition-colors"
          >
            {t('death.playAgain', language)}
          </button>

          <button
            onClick={handleBackToLobby}
            className="w-full py-3 rounded-lg bg-slate-700 hover:bg-slate-600 
                       text-slate-300 transition-colors"
          >
            {t('death.backToLobby', language)}
          </button>
        </nav>
      </article>
    </div>
  );
}

/** 공유 아이콘 */
function ShareIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
      />
    </svg>
  );
}
