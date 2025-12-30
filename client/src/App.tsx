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
import { SlowBrowserWarning } from './components/ui/SlowBrowserWarning';
import { Minimap } from './components/ui/Minimap';
import { KillFeed } from './components/ui/KillFeed';
import { FullscreenButton } from './components/ui/FullscreenButton';
import { TransformTimer } from './components/ui/TransformTimer';
import { InviteButtons } from './components/ui/InviteButtons';
import { detectDevice } from './utils/deviceDetector';
import type { SlowBrowserType } from './utils/deviceDetector';
import { extractRoomCode } from './utils/shareUtils';

/**
 * 메인 앱 컴포넌트
 */
function App() {
  const { phase } = useGameStore();
  const {
    showTutorial,
    tutorialDismissed,
    isInAppBrowser,
    setIsInAppBrowser,
    setLowSpecMode,
  } = useUIStore();

  /** URL에서 추출한 방 코드 (다이렉트 입장용) */
  const [initialRoomCode, setInitialRoomCode] = useState<string | null>(null);
  /** 저성능 브라우저 타입 */
  const [slowBrowserType, setSlowBrowserType] = useState<SlowBrowserType>(null);

  // 초기화: 기기 감지 및 URL 파라미터 처리
  useEffect(() => {
    const deviceInfo = detectDevice();

    // 인앱 브라우저 감지
    if (deviceInfo.isInAppBrowser) {
      setIsInAppBrowser(true);
      setLowSpecMode(true);
    }

    // 저성능 브라우저 감지 (모바일에서만)
    if (deviceInfo.isMobile && deviceInfo.isSlowBrowser) {
      setSlowBrowserType(deviceInfo.slowBrowserType);
    }

    // URL에서 방 코드 추출 (다이렉트 입장)
    const roomCode = extractRoomCode();
    if (roomCode) {
      setInitialRoomCode(roomCode);
      console.log('[App] Room code from URL:', roomCode);
    }
  }, [setIsInAppBrowser, setLowSpecMode]);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* 인앱 브라우저 경고 */}
      {isInAppBrowser && <InAppWarning />}

      {/* 저성능 브라우저 경고 */}
      {!isInAppBrowser && slowBrowserType && (
        <SlowBrowserWarning browserType={slowBrowserType} />
      )}

      {/* 메인 콘텐츠 */}
      {phase === 'idle' && <Lobby initialRoomCode={initialRoomCode} />}

      {(phase === 'playing' || phase === 'dead') && (
        <div className="relative w-full h-screen">
          <GameCanvas />
          <TransformTimer />
          <InviteButtons />
          <Ranking />
          <Minimap />
          <KillFeed />
          <FullscreenButton />
        </div>
      )}

      {/* 사망 화면 */}
      {phase === 'dead' && <DeathScreen />}

      {/* 튜토리얼 (첫 플레이 시) */}
      {phase === 'playing' && showTutorial && !tutorialDismissed && <Tutorial />}
    </div>
  );
}

export default App;
