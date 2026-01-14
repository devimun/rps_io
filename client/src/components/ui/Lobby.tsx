/**
 * 로비 화면 컴포넌트
 * 게임 시작 전 방 생성/입장 UI를 제공합니다.
 */
import { useState, useEffect, memo, useCallback } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useGameStore } from '../../stores/gameStore';
import { t } from '../../utils/i18n';
import { VersionInfo } from './VersionInfo';
import { Tutorial } from './Tutorial';

import { SupportButton } from './SupportButton';
import {
  trackLobbyEnter,
  trackRoomCreateAttempt,
  trackRoomCreateSuccess,
  trackRoomJoinAttempt,
  trackRoomJoinSuccess,
  trackError
} from '../../services/analytics';

/** API 기본 URL */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/** 로비 컴포넌트 Props */
interface LobbyProps {
  /** URL에서 추출한 초기 방 코드 (다이렉트 입장용) */
  initialRoomCode?: string | null;
}

/** 대기 중인 시작 액션 타입 */
type PendingStartAction = 'quick' | 'create' | 'join' | null;

/**
 * 로비 컴포넌트
 */
export const Lobby = memo(function Lobby({ initialRoomCode }: LobbyProps) {
  const language = useUIStore((state) => state.language);
  const savedNickname = useUIStore((state) => state.savedNickname);
  const setSavedNickname = useUIStore((state) => state.setSavedNickname);
  const setLoading = useUIStore((state) => state.setLoading);
  const setError = useUIStore((state) => state.setError);
  const tutorialDismissed = useUIStore((state) => state.tutorialDismissed);

  // selector 패턴: 각 상태 변경시에만 리렌더링
  const setRoomInfo = useGameStore((state) => state.setRoomInfo);
  const setPhase = useGameStore((state) => state.setPhase);

  const [nickname, setNickname] = useState(savedNickname);
  const [roomCode, setRoomCode] = useState('');
  const [fillWithBots, setFillWithBots] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // 튜토리얼 표시 상태 및 대기 중인 액션
  const [showTutorialBeforeStart, setShowTutorialBeforeStart] = useState(false);
  const [pendingStartAction, setPendingStartAction] = useState<PendingStartAction>(null);

  /** URL에서 방 코드가 있으면 자동으로 코드 입장 모달 열기 */
  useEffect(() => {
    trackLobbyEnter(); // 로비 진입 추적

    if (initialRoomCode) {
      setRoomCode(initialRoomCode);
      setShowJoinModal(true);
    }
  }, [initialRoomCode]);

  /** 닉네임 유효성 검사 */
  const isValidNickname = /^[a-zA-Z0-9]{1,12}$/.test(nickname);

  /** 실제 빠른 시작 로직 */
  const executeQuickStart = useCallback(async () => {
    setLoading(true, t('common.loading', language));
    setSavedNickname(nickname);
    trackRoomJoinAttempt('quick');

    try {
      const response = await fetch(`${API_BASE_URL}/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname }),
      });

      if (!response.ok) throw new Error('Failed to join');

      const data = await response.json();
      trackRoomJoinSuccess('public');
      setRoomInfo(data.roomId, data.code || '', data.playerId, nickname);
      setPhase('loading');
    } catch (error) {
      setError(t('error.connectionFailed', language));
      if (error instanceof Error) trackError(error, 'quick_join');
    } finally {
      setLoading(false);
    }
  }, [language, nickname, setLoading, setSavedNickname, setRoomInfo, setPhase, setError]);

  /** 바로 시작 (공개 방 매칭) */
  const handleQuickStart = async () => {
    if (!isValidNickname) {
      setError(t('error.invalidNickname', language));
      return;
    }

    // 튜토리얼을 이미 본 경우 바로 시작
    if (tutorialDismissed) {
      executeQuickStart();
    } else {
      // 튜토리얼을 보여주고 대기
      setPendingStartAction('quick');
      setShowTutorialBeforeStart(true);
    }
  };

  /** 방 생성 */
  const handleCreateRoom = async () => {
    if (!isValidNickname) {
      setError(t('error.invalidNickname', language));
      return;
    }

    setLoading(true, t('common.loading', language));
    setSavedNickname(nickname);
    trackRoomCreateAttempt(fillWithBots);
    try {
      const response = await fetch(`${API_BASE_URL}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, fillWithBots }),
      });

      if (!response.ok) throw new Error('Failed to create');

      const data = await response.json();

      // URL에 방 코드 추가 (브라우저 히스토리 업데이트)
      const url = new URL(window.location.href);
      url.searchParams.set('code', data.code);
      window.history.replaceState({}, '', url.toString());

      setRoomInfo(data.roomId, data.code, data.playerId, nickname, true); // 사설방

      // GA4: 방 생성 성공 추적
      trackRoomCreateSuccess('private', data.code);

      setPhase('loading');
    } catch (error) {
      setError(t('error.connectionFailed', language));
      if (error instanceof Error) trackError(error, 'create_room');
    } finally {
      setLoading(false);
      setShowCreateModal(false);
    }
  };

  /** 코드로 입장 */
  const handleJoinWithCode = async () => {
    if (!isValidNickname) {
      setError(t('error.invalidNickname', language));
      return;
    }

    if (!/^[A-Z0-9]{6}$/i.test(roomCode)) {
      setError(t('error.roomNotFound', language));
      return;
    }

    setLoading(true, t('common.loading', language));
    setSavedNickname(nickname);

    try {
      const response = await fetch(`${API_BASE_URL}/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, code: roomCode.toUpperCase() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to join');
      }

      const data = await response.json();

      // URL에 방 코드 추가 (브라우저 히스토리 업데이트)
      const url = new URL(window.location.href);
      url.searchParams.set('code', roomCode.toUpperCase());
      window.history.replaceState({}, '', url.toString());

      setRoomInfo(data.roomId, roomCode.toUpperCase(), data.playerId, nickname, true); // 사설방 (코드 입장)
      setPhase('loading');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.roomNotFound', language);
      setError(message);
    } finally {
      setLoading(false);
      setShowJoinModal(false);
    }
  };

  /** 튜토리얼에서 시작하기 클릭 시 */
  const handleTutorialStart = () => {
    setShowTutorialBeforeStart(false);

    // 대기 중인 액션 실행
    if (pendingStartAction === 'quick') {
      executeQuickStart();
    }
    // create, join은 모달에서 바로 처리하므로 여기서는 quick만 처리
    setPendingStartAction(null);
  };

  /** 튜토리얼 취소 */
  const handleTutorialCancel = () => {
    setShowTutorialBeforeStart(false);
    setPendingStartAction(null);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center p-4 overflow-y-auto">
      {/* 상단 여백 (중앙 정렬 대용) */}
      <div className="flex-1 min-h-[5vh]" />
      {/* 타이틀 */}
      <header className="text-center mb-8">
        <h1 className="text-5xl font-bold text-white mb-2">{t('lobby.title', language)}</h1>
        <p className="text-xl text-slate-400">{t('lobby.subtitle', language)}</p>
      </header>

      {/* 닉네임 입력 */}
      <section className="w-full max-w-sm mb-6">
        <label className="block text-slate-300 mb-2">{t('lobby.nickname', language)}</label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder={t('lobby.nicknamePlaceholder', language)}
          maxLength={12}
          className="w-full px-4 py-3 rounded-lg bg-slate-700 text-white placeholder-slate-400 
                     border border-slate-600 focus:border-cyan-400 focus:outline-none"
        />
      </section>

      {/* 버튼 그룹 */}
      <nav className="w-full max-w-sm space-y-3">
        <button
          onClick={handleQuickStart}
          disabled={!isValidNickname}
          className="w-full py-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-600 
                     text-white font-bold text-lg transition-colors"
        >
          {t('lobby.quickStart', language)}
        </button>

        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!isValidNickname}
          className="w-full py-3 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 
                     text-white font-medium transition-colors"
        >
          {t('lobby.createRoom', language)}
        </button>

        <button
          onClick={() => setShowJoinModal(true)}
          disabled={!isValidNickname}
          className="w-full py-3 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 
                     text-white font-medium transition-colors"
        >
          {t('lobby.joinRoom', language)}
        </button>

        {/* 후원 버튼 */}
        <div className="pt-2">
          <SupportButton fullWidth />
        </div>
      </nav>

      {/* 방 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold text-white mb-4">{t('lobby.createRoom', language)}</h2>

            <label className="flex items-center gap-3 text-slate-300 mb-6">
              <input
                type="checkbox"
                checked={fillWithBots}
                onChange={(e) => setFillWithBots(e.target.checked)}
                className="w-5 h-5 rounded"
              />
              {t('lobby.fillWithBots', language)}
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  // URL에서 code 파라미터 제거
                  const url = new URL(window.location.href);
                  if (url.searchParams.has('code')) {
                    url.searchParams.delete('code');
                    window.history.replaceState({}, '', url.toString());
                  }
                }}
                className="flex-1 py-2 rounded-lg bg-slate-700 text-white"
              >
                {t('common.cancel', language)}
              </button>
              <button
                onClick={handleCreateRoom}
                className="flex-1 py-2 rounded-lg bg-cyan-500 text-white font-medium"
              >
                {t('lobby.create', language)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 코드 입장 모달 */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-sm">
            <h2 className="text-xl font-bold text-white mb-4">{t('lobby.joinRoom', language)}</h2>

            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder={t('lobby.roomCodePlaceholder', language)}
              maxLength={6}
              className="w-full px-4 py-3 rounded-lg bg-slate-700 text-white text-center text-2xl 
                         tracking-widest placeholder-slate-400 border border-slate-600 
                         focus:border-cyan-400 focus:outline-none mb-6"
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  // URL에서 code 파라미터 제거
                  const url = new URL(window.location.href);
                  if (url.searchParams.has('code')) {
                    url.searchParams.delete('code');
                    window.history.replaceState({}, '', url.toString());
                  }
                }}
                className="flex-1 py-2 rounded-lg bg-slate-700 text-white"
              >
                {t('common.cancel', language)}
              </button>
              <button
                onClick={handleJoinWithCode}
                className="flex-1 py-2 rounded-lg bg-cyan-500 text-white font-medium"
              >
                {t('lobby.join', language)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 튜토리얼 모달 (게임 시작 전) */}
      {showTutorialBeforeStart && (
        <Tutorial
          onStart={handleTutorialStart}
          onCancel={handleTutorialCancel}
          isPreGame={true}
        />
      )}

      {/* 하단 여백 + 버전 정보 (스크롤 콘텐츠에 포함) */}
      <div className="flex-1 min-h-[5vh]" />
      <footer className="pb-8">
        <VersionInfo />
      </footer>
    </main>
  );
});

