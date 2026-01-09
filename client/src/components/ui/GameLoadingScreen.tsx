/**
 * 게임 로딩 화면 컴포넌트
 * 게임 시작 시 서버 연결 중에 표시됩니다.
 * 
 * [1.4.7] 로딩 종료 조건 강화:
 * 1. 서버 연결 완료 (connectionStatus === 'connected')
 * 2. UI 마운트 완료 (isUIReady === true)
 * 3. 씬 로딩 완료 (isSceneReady === true)
 */
import { useGameStore } from '../../stores/gameStore';
import { useUIStore } from '../../stores/uiStore';

export function GameLoadingScreen() {
    const connectionStatus = useGameStore((state) => state.connectionStatus);
    const isSceneReady = useGameStore((state) => state.isSceneReady);
    const language = useUIStore((state) => state.language);
    const isUIReady = useUIStore((state) => state.isUIReady);

    // [1.4.7] 모든 조건 충족 시에만 로딩 화면 제거
    const isFullyReady = connectionStatus === 'connected' && isUIReady && isSceneReady;
    if (isFullyReady) {
        return null;
    }

    const getText = () => {
        switch (connectionStatus) {
            case 'connecting':
                return language === 'ko' ? '서버에 연결 중...' : 'Connecting to server...';
            case 'error':
                return language === 'ko' ? '연결 실패. 재시도 중...' : 'Connection failed. Retrying...';
            default:
                return language === 'ko' ? '게임 준비 중...' : 'Preparing game...';
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/95 flex flex-col items-center justify-center z-50">
            {/* 로고 */}
            <h1 className="text-4xl font-bold text-white mb-8">
                ChaosRPS.io
            </h1>

            {/* 로딩 스피너 */}
            <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full" />
                <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin" />
            </div>

            {/* 상태 텍스트 */}
            <p className="text-lg text-slate-300">
                {getText()}
            </p>

            {/* 에러 시 추가 메시지 */}
            {connectionStatus === 'error' && (
                <p className="text-sm text-red-400 mt-2">
                    {language === 'ko' ? '네트워크를 확인해주세요' : 'Please check your network'}
                </p>
            )}
        </div>
    );
}
