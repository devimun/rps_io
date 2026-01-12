/**
 * ChaosRPS.io 메인 앱 컴포넌트
 * 게임 상태에 따라 적절한 화면을 렌더링합니다.
 */
import { useEffect, useState } from 'react';
import { useGameStore } from './stores/gameStore';
import { useUIStore } from './stores/uiStore';
import { Lobby } from './components/ui/Lobby';
import { GameCanvas } from './components/game/GameCanvas';
import { Ranking } from './components/ui/Ranking';
import { DeathScreen } from './components/ui/DeathScreen';
import { Tutorial } from './components/ui/Tutorial';
import { InAppWarning } from './components/ui/InAppWarning';
import { Minimap } from './components/ui/Minimap';
import { KillFeed } from './components/ui/KillFeed';
import { MobileRanking } from './components/ui/MobileRanking';
import { FullscreenButton } from './components/ui/FullscreenButton';
import { TransformTimer } from './components/ui/TransformTimer';
import { InviteButtons } from './components/ui/InviteButtons';
import { detectDevice } from './utils/deviceDetector';
import { extractRoomCode } from './utils/shareUtils';
import { initAnalytics } from './services/analytics';
import { FeedbackModal } from './components/ui/FeedbackButton';

/**
 * 메인 앱 컴포넌트
 */
function App() {
  const { phase } = useGameStore();
  const {
    showTutorial,
    tutorialDismissed,
    isInAppBrowser,
    isMobile,
    setIsInAppBrowser,
    setIsMobile,
    setUIReady,
  } = useUIStore();

  /** URL에서 추출한 방 코드 (다이렉트 입장용) */
  const [initialRoomCode, setInitialRoomCode] = useState<string | null>(null);

  // 초기화: 기기 감지, URL 파라미터 처리, 분석 초기화
  useEffect(() => {
    // GA4 분석 초기화
    initAnalytics();

    const deviceInfo = detectDevice();

    // 모바일 감지
    if (deviceInfo.isMobile) {
      setIsMobile(true);
    }

    // 인앱 브라우저 또는 저성능 브라우저 감지
    if (deviceInfo.isInAppBrowser || deviceInfo.isSlowBrowser) {
      setIsInAppBrowser(true);
    }

    // URL에서 방 코드 추출 (다이렉트 입장)
    const roomCode = extractRoomCode();
    if (roomCode) {
      setInitialRoomCode(roomCode);
      console.log('[App] Room code from URL:', roomCode);
    }
  }, [setIsInAppBrowser, setIsMobile]);

  // [1.4.8] HUD 마운트 상태 추적 - loading 단계에서 미리 렌더링
  useEffect(() => {
    // loading, playing, dead 상태일 때 HUD가 마운트됨
    if (phase === 'loading' || phase === 'playing' || phase === 'dead') {
      // requestAnimationFrame으로 다음 프레임에 UI Ready 설정 (렌더링 완료 보장)
      const handle = requestAnimationFrame(() => {
        setUIReady(true);
        console.log('[App] HUD mounted, isUIReady = true');
      });
      return () => cancelAnimationFrame(handle);
    } else {
      // idle 상태에서는 UI Ready 초기화
      setUIReady(false);
    }
  }, [phase, setUIReady]);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* 브라우저 경고 (인앱/저성능 브라우저) */}
      {isInAppBrowser && <InAppWarning />}

      {/* 메인 콘텐츠 */}
      {phase === 'idle' && <Lobby initialRoomCode={initialRoomCode} />}

      {/* GameCanvas: 로비에서부터 미리 마운트하여 Phaser 사전 초기화 (렉 방지) */}
      {/* visibility:hidden으로 숨기면 Phaser가 정상 초기화됨 (display:none은 불가) */}
      {/* [1.4.8] 게임 캔버스 + HUD 컨테이너 */}
      <div
        className="w-full h-screen"
        style={{
          visibility: phase === 'idle' ? 'hidden' : 'visible',
          position: phase === 'idle' ? 'absolute' : 'relative',
          top: 0,
          left: 0,
          zIndex: phase === 'idle' ? -1 : 1,
        }}
      >
        <GameCanvas />
        {/* [1.4.8] HUD: loading 단계에서 미리 마운트 (숨김), playing/dead에서 표시 */}
        {(phase === 'loading' || phase === 'playing' || phase === 'dead') && (
          <div style={{ visibility: phase === 'loading' ? 'hidden' : 'visible' }}>
            <TransformTimer />
            <InviteButtons />
            {/* 모바일: 랭킹 + 미니맵, PC: 전체 UI */}
            {isMobile ? (
              <>
                <MobileRanking />
                <Minimap />
              </>
            ) : (
              <>
                <Ranking />
                <Minimap />
                <KillFeed />
              </>
            )}
            <FullscreenButton />
          </div>
        )}
      </div>

      {/* 사망 화면 */}
      {phase === 'dead' && <DeathScreen />}

      {/* [1.4.8] GameLoadingScreen 삭제됨 - MainScene에서만 로딩 처리 */}

      {/* 튜토리얼 (첫 플레이 시) */}
      {phase === 'playing' && showTutorial && !tutorialDismissed && <Tutorial />}

      {/* 피드백 모달 (메인 화면에서만 표시) */}
      {phase === 'idle' && <FeedbackModal />}
    </div>
  );
}

export default App;
