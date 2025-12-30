/**
 * 사망 화면 컴포넌트
 * 플레이어가 제거되었을 때 표시되는 화면입니다.
 * 사망 애니메이션 후 표시됩니다.
 */
import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';
import { t } from '../../utils/i18n';
import { createShareMetadata, shareViaWebAPI, copyToClipboard, isWebShareSupported } from '../../utils/shareUtils';
import { trackGameEnd, trackPlayAgain, trackShare } from '../../services/analytics';
import { RPSState } from '@chaos-rps/shared';

const DEATH_SCREEN_DELAY = 1500;
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const getRpsEmoji = (state: RPSState | null): string => {
  switch (state) {
    case RPSState.ROCK: return '✊';
    case RPSState.PAPER: return '✋';
    case RPSState.SCISSORS: return '✌️';
    default: return '❓';
  }
};

const getRpsName = (state: RPSState | null, language: string): string => {
  if (!state) return '???';
  const names: Record<RPSState, Record<string, string>> = {
    [RPSState.ROCK]: { ko: '바위', en: 'Rock' },
    [RPSState.PAPER]: { ko: '보', en: 'Paper' },
    [RPSState.SCISSORS]: { ko: '가위', en: 'Scissors' },
  };
  return names[state]?.[language] || names[state]?.en || '???';
};

export function DeathScreen() {
  const { 
    eliminatorNickname, eliminatorRpsState, eliminatedRpsState, 
    deathMessage, roomCode, nickname, isPrivateRoom, finalKillCount,
    clearDeathInfo, setRoomInfo, setPhase, reset 
  } = useGameStore();
  const { language, setError, setLoading } = useUIStore();
  const [showScreen, setShowScreen] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  
  // 게임 시작 시간 기록 (게임 종료 이벤트용)
  const gameStartTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowScreen(true);
      requestAnimationFrame(() => setFadeIn(true));
      
      // 게임 종료 이벤트 트래킹
      const playTimeSeconds = Math.floor((Date.now() - gameStartTimeRef.current) / 1000);
      trackGameEnd({
        playTimeSeconds,
        finalScore: 0,
        killCount: finalKillCount,
        roomType: isPrivateRoom ? 'private' : 'public',
      });
    }, DEATH_SCREEN_DELAY);
    return () => clearTimeout(timer);
  }, [isPrivateRoom, finalKillCount]);

  const handleShare = async () => {
    const metadata = createShareMetadata(roomCode ?? undefined);
    trackShare('link');
    if (isWebShareSupported()) {
      await shareViaWebAPI(metadata);
    } else {
      const success = await copyToClipboard(metadata.url);
      if (success) {
        alert(language === 'ko' ? 'URL이 복사되었습니다!' : 'URL copied!');
      } else {
        setError(language === 'ko' ? '복사에 실패했습니다' : 'Copy failed');
      }
    }
  };

  const handlePlayAgain = async () => {
    if (isJoining || !nickname) return;
    setIsJoining(true);
    setLoading(true, t('common.loading', language));
    
    // 현재 방 ID 저장 (직전 방 제외용)
    const currentRoomId = useGameStore.getState().roomId;
    
    clearDeathInfo();
    trackPlayAgain();
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nickname,
          excludeRoomId: currentRoomId, // 직전 방 제외
        }),
      });
      if (!response.ok) throw new Error('Failed to join');
      const data = await response.json();
      setRoomInfo(data.roomId, data.code || '', data.playerId, nickname);
      setPhase('playing');
    } catch {
      setError(t('error.connectionFailed', language));
      reset();
    } finally {
      setLoading(false);
      setIsJoining(false);
    }
  };

  const handleBackToLobby = () => reset();

  if (!showScreen) return null;

  return (
    <div className={`fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 
      transition-opacity duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
      <article className={`bg-slate-800 rounded-2xl p-8 max-w-sm w-full text-center 
        transform transition-all duration-500 ${fadeIn ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        <h1 className="text-3xl font-bold text-red-400 mb-4">{t('death.title', language)}</h1>
        
        {/* 킬 수 표시 */}
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl p-4 mb-4 border border-amber-500/30">
          <p className="text-amber-400 text-sm mb-1">{language === 'ko' ? '이번 게임 킬 수' : 'Kills This Game'}</p>
          <p className="text-4xl font-bold text-white">{finalKillCount}</p>
        </div>
        
        <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-center gap-4">
            <div className="flex flex-col items-center">
              <span className="text-4xl mb-1">{getRpsEmoji(eliminatedRpsState)}</span>
              <span className="text-slate-400 text-sm">{getRpsName(eliminatedRpsState, language)}</span>
              <span className="text-slate-500 text-xs mt-1">{language === 'ko' ? '나' : 'You'}</span>
            </div>
            <div className="text-slate-500 font-bold text-lg">VS</div>
            <div className="flex flex-col items-center">
              <span className="text-4xl mb-1">{getRpsEmoji(eliminatorRpsState)}</span>
              <span className="text-slate-400 text-sm">{getRpsName(eliminatorRpsState, language)}</span>
              <span className="text-cyan-400 text-xs mt-1 font-medium">{eliminatorNickname || '???'}</span>
            </div>
          </div>
        </div>

        <p className="text-slate-300 mb-2 text-sm">
          {deathMessage || t('death.eliminatedBy', language, { nickname: eliminatorNickname || '???' })}
        </p>

        <nav className="space-y-3 mt-6">
          <button onClick={handleShare}
            className="w-full py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium 
              transition-colors flex items-center justify-center gap-2">
            <ShareIcon />{t('death.share', language)}
          </button>
          <button onClick={handlePlayAgain} disabled={isJoining}
            className="w-full py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-700 
              text-white font-bold transition-colors">
            {isJoining ? (language === 'ko' ? '입장 중...' : 'Joining...') : t('death.playAgain', language)}
          </button>
          <button onClick={handleBackToLobby}
            className="w-full py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
            {t('death.backToLobby', language)}
          </button>
        </nav>
      </article>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}
