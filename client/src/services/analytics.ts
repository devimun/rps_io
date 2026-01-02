/**
 * 세계 최고 수준 Google Analytics 4 분석 시스템
 * League of Legends, Valorant 수준의 상세한 게임 분석
 * 
 * 추적 카테고리:
 * 1. 사용자 여정 (User Journey)
 * 2. 성능 메트릭스 (Performance)
 * 3. 게임플레이 (Gameplay)
 * 4. UI/UX 상호작용
 * 5. 에러 및 이슈
 * 6. 리텐션 및 참여도
 */

/** GA4 Measurement ID */
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

/** gtag 함수 타입 */
type GtagCommand = 'config' | 'event' | 'js' | 'set';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (command: GtagCommand, ...args: unknown[]) => void;
  }
}

let isInitialized = false;
let sessionStartTime = 0;

// 세션 통계
let sessionStats = {
  gamesPlayed: 0,
  totalPlayTime: 0,
  totalKills: 0,
  deaths: 0,
  publicRooms: 0,
  privateRooms: 0,
};

/**
 * GA4 초기화
 */
export function initAnalytics(): void {
  if (!GA_MEASUREMENT_ID) {
    console.log('[Analytics] GA_MEASUREMENT_ID not set - Analytics disabled');
    return;
  }

  if (isInitialized) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false, // SPA이므로 자동 페이지뷰 비활성화
    cookie_flags: 'SameSite=None;Secure', // GDPR 준수
  });

  sessionStartTime = Date.now();
  isInitialized = true;

  // 세션 시작
  trackEvent('session_start', {
    platform: getPlatform(),
    browser: getBrowser(),
    screen_resolution: `${window.screen.width}x${window.screen.height}`,
  });
}

/**
 * 커스텀 이벤트 전송
 */
function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  if (!isInitialized || !window.gtag) return;

  // 모든 이벤트에 세션 컨텍스트 추가
  const enrichedParams = {
    ...params,
    session_duration: Math.floor((Date.now() - sessionStartTime) / 1000),
    games_in_session: sessionStats.gamesPlayed,
  };

  window.gtag('event', eventName, enrichedParams);
}

// ============================================
// 플랫폼 감지 유틸
// ============================================

function getPlatform(): string {
  const ua = navigator.userAgent;
  if (/Mobile|Android/i.test(ua)) return 'mobile_android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'mobile_ios';
  if (/Windows/i.test(ua)) return 'desktop_windows';
  if (/Mac/i.test(ua)) return 'desktop_mac';
  if (/Linux/i.test(ua)) return 'desktop_linux';
  return 'unknown';
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) return 'chrome';
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'safari';
  if (/Firefox/i.test(ua)) return 'firefox';
  if (/Edge/i.test(ua)) return 'edge';
  return 'other';
}

// ============================================
// 1. 사용자 여정 (User Journey)
// ============================================

/**
 * 앱 시작
 */
export function trackAppLoad(): void {
  trackEvent('app_load', {
    load_time: performance.now(),
  });
}

/**
 * 로비 진입
 */
export function trackLobbyEnter(): void {
  trackEvent('lobby_enter', {
    time_since_session_start: Math.floor((Date.now() - sessionStartTime) / 1000),
  });
}

/**
 * 방 생성 시도
 */
export function trackRoomCreateAttempt(fillWithBots: boolean): void {
  trackEvent('room_create_attempt', {
    fill_with_bots: fillWithBots,
  });
}

/**
 * 방 생성 성공
 */
export function trackRoomCreateSuccess(roomType: 'public' | 'private', code?: string): void {
  if (roomType === 'private') sessionStats.privateRooms++;
  else sessionStats.publicRooms++;

  trackEvent('room_create_success', {
    room_type: roomType,
    has_code: !!code,
  });
}

/**
 * 방 입장 시도
 */
export function trackRoomJoinAttempt(joinType: 'quick' | 'code'): void {
  trackEvent('room_join_attempt', {
    join_type: joinType,
  });
}

/**
 * 방 입장 성공
 */
export function trackRoomJoinSuccess(roomType: 'public' | 'private'): void {
  if (roomType === 'private') sessionStats.privateRooms++;
  else sessionStats.publicRooms++;

  trackEvent('room_join_success', {
    room_type: roomType,
  });
}

/**
 * 게임 시작 (실제 플레이 시작)
 */
export function trackGameStart(roomType: 'public' | 'private'): void {
  sessionStats.gamesPlayed++;

  trackEvent('game_start', {
    room_type: roomType,
    game_number_in_session: sessionStats.gamesPlayed,
  });
}

/**
 * 게임 종료 (사망)
 */
export function trackGameEnd(params: {
  playTimeSeconds: number;
  finalScore: number;
  killCount: number;
  roomType: 'public' | 'private';
  finalRank?: number;
  totalPlayers?: number;
}): void {
  sessionStats.deaths++;
  sessionStats.totalKills += params.killCount;
  sessionStats.totalPlayTime += params.playTimeSeconds;

  trackEvent('game_end', {
    play_time_seconds: params.playTimeSeconds,
    kill_count: params.killCount,
    final_rank: params.finalRank,
    total_players: params.totalPlayers,
    room_type: params.roomType,
    // 성과 지표
    kills_per_minute: params.playTimeSeconds > 0 ? (params.killCount / (params.playTimeSeconds / 60)).toFixed(2) : 0,
    survival_rate: params.finalRank && params.totalPlayers ? ((params.totalPlayers - params.finalRank + 1) / params.totalPlayers).toFixed(2) : undefined,
  });
}

/**
 * 다시하기
 */
export function trackPlayAgain(roomType: 'same' | 'new'): void {
  trackEvent('play_again', {
    room_type: roomType,
    games_played: sessionStats.gamesPlayed,
  });
}

// ============================================
// 2. 성능 메트릭스 (Performance)
// ============================================

/**
 * 로딩 시간 측정
 */
export function trackLoadingTime(loadingMs: number, stage: 'initial' | 'game_ready'): void {
  trackEvent('loading_time', {
    stage,
    loading_ms: loadingMs,
    is_fast: loadingMs < 3000,
    performance_tier: loadingMs < 2000 ? 'excellent' : loadingMs < 3000 ? 'good' : loadingMs < 5000 ? 'fair' : 'poor',
  });
}

/**
 * FPS 성능 측정
 */
export function trackPerformance(fps: number, context?: string): void {
  const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);

  trackEvent('performance_fps', {
    fps,
    fps_tier: fps >= 55 ? 'excellent' : fps >= 45 ? 'good' : fps >= 30 ? 'fair' : 'poor',
    device_type: isMobile ? 'mobile' : 'desktop',
    context: context || 'gameplay',
  });

  // 심각한 성능 문제 별도 추적
  if (fps < 25) {
    trackEvent('performance_issue', {
      issue_type: 'critical_fps_drop',
      fps,
      device_type: isMobile ? 'mobile' : 'desktop',
    });
  }
}

/**
 * 네트워크 지연 (RTT)
 */
export function trackNetworkLatency(rtt: number): void {
  trackEvent('network_latency', {
    rtt_ms: rtt,
    latency_tier: rtt < 50 ? 'excellent' : rtt < 100 ? 'good' : rtt < 200 ? 'fair' : 'poor',
  });

  if (rtt > 300) {
    trackEvent('network_issue', {
      issue_type: 'high_latency',
      rtt_ms: rtt,
    });
  }
}

// ============================================
// 4. UI/UX 상호작용
// ============================================

/**
 * 튜토리얼
 */
export function trackTutorial(action: 'view' | 'skip' | 'complete'): void {
  trackEvent('tutorial', {
    action,
  });
}

/**
 * 공유
 */
export function trackShare(method: 'code' | 'link', shareType: 'copy' | 'native'): void {
  trackEvent('share', {
    method,
    share_type: shareType,
  });
}


/**
 * 전체화면 토글
 */
export function trackFullscreen(enabled: boolean): void {
  trackEvent('fullscreen_toggle', {
    enabled,
  });
}

/**
 * 피드백 버튼 클릭
 */
export function trackFeedback(action: 'open' | 'submit'): void {
  trackEvent('feedback', {
    action,
  });
}

/**
 * 인앱 브라우저 경고
 */
export function trackInAppBrowserWarning(browserType: string, action: 'shown' | 'dismissed' | 'opened_external'): void {
  trackEvent('inapp_browser_warning', {
    browser_type: browserType,
    action,
  });
}

// ============================================
// 5. 에러 및 이슈
// ============================================

/**
 * 에러 추적
 */
export function trackError(error: Error, context: string): void {
  trackEvent('error', {
    error_message: error.message,
    error_stack: error.stack?.substring(0, 200),
    error_context: context,
    fatal: false,
  });
}

/**
 * 치명적 에러
 */
export function trackFatalError(error: Error, context: string): void {
  trackEvent('fatal_error', {
    error_message: error.message,
    error_stack: error.stack?.substring(0, 200),
    error_context: context,
    fatal: true,
  });
}

/**
 * 연결 끊김
 */
export function trackDisconnect(reason: string, wasIntentional: boolean): void {
  trackEvent('disconnect', {
    reason,
    was_intentional: wasIntentional,
  });
}

// ============================================
// 6. 리텐션 및 참여도
// ============================================

/**
 * 세션 종료
 */
export function trackSessionEnd(): void {
  const sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);

  trackEvent('session_end', {
    session_duration_seconds: sessionDuration,
    games_played: sessionStats.gamesPlayed,
    total_kills: sessionStats.totalKills,
    total_deaths: sessionStats.deaths,
    total_play_time: sessionStats.totalPlayTime,
    public_rooms: sessionStats.publicRooms,
    private_rooms: sessionStats.privateRooms,
    avg_game_duration: sessionStats.gamesPlayed > 0 ? Math.floor(sessionStats.totalPlayTime / sessionStats.gamesPlayed) : 0,
    engagement_level: sessionDuration > 600 ? 'high' : sessionDuration > 300 ? 'medium' : 'low',
  });
}

/**
 * 재방문 (returning user)
 */
export function trackReturningUser(daysSinceLastVisit: number): void {
  trackEvent('returning_user', {
    days_since_last_visit: daysSinceLastVisit,
    user_segment: daysSinceLastVisit === 0 ? 'daily' : daysSinceLastVisit < 7 ? 'weekly' : daysSinceLastVisit < 30 ? 'monthly' : 'lapsed',
  });
}

// ============================================
// 페이지뷰 (SPA 라우팅)
// ============================================

/**
 * 가상 페이지뷰 (SPA)
 */
export function trackPageView(pageName: string): void {
  if (!isInitialized || !window.gtag) return;

  window.gtag('event', 'page_view', {
    page_title: pageName,
    page_location: window.location.href,
  });
}
