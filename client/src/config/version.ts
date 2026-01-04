/**
 * 앱 버전 및 업데이트 정보
 * 배포 시 이 파일을 업데이트합니다.
 */

/** 현재 앱 버전 */
export const APP_VERSION = '1.4.4';

/** 빌드 날짜 */
export const BUILD_DATE = '2026-01-05';

/** 업데이트 로그 타입 */
export interface UpdateLog {
  version: string;
  date: string;
  title: { ko: string; en: string };
  changes: { ko: string; en: string }[];
}

/** 업데이트 히스토리 (최신순) */
export const UPDATE_LOGS: UpdateLog[] = [
  {
    version: '1.4.4',
    date: '2026-01-05',
    title: { ko: '성능 대폭 개선 🚀', en: 'Major Performance Improvements 🚀' },
    changes: [
      { ko: '게임 시작이 훨씬 빨라졌어요! ⚡', en: 'Game starts much faster! ⚡' },
      { ko: '가위바위보 아이콘이 이미지로 바뀌어 더 깔끔해졌어요 🎨', en: 'RPS icons are now images for a cleaner look 🎨' },
      { ko: '게임 진입 시 버벅임이 크게 줄었어요 ✨', en: 'Much less stuttering when entering game ✨' },
      { ko: '재방문 시 로딩이 더 빨라졌어요 💨', en: 'Faster loading on revisit 💨' },
    ],
  },
  {
    version: '1.4.3',
    date: '2026-01-03',
    title: { ko: '피드백 & 최적화 업데이트 💬', en: 'Feedback & Optimization Update 💬' },
    changes: [
      { ko: '인게임 피드백 기능 추가 🗣️', en: 'In-game feedback feature added 🗣️' },
      { ko: '충돌 판정과 캐릭터 크기 일치 수정 🎯', en: 'Fixed collision hitbox matching visual size 🎯' },
      { ko: '플레이어 움직임이 더 반응적으로 개선', en: 'Player movement feels more responsive' },
      { ko: '게임 시작 시 초기 렉 현상 해결', en: 'Fixed initial lag when starting game' },
      { ko: 'RPS 이모지가 더 크고 잘 보이게 개선', en: 'RPS emoji now larger and more visible' },
      { ko: '사설방에서 다시하기 시 같은 방 재입장', en: 'Play Again in private rooms rejoins same room' },
    ],
  },
  {
    version: '1.4.2',
    date: '2026-01-02',
    title: { ko: '성능 최적화 ⚡', en: 'Performance Optimization ⚡' },
    changes: [
      { ko: '일부 PC에서 발생하던 렉 현상 개선', en: 'Fixed lag issues on some PCs' },
      { ko: '변신 타이머가 더 부드럽게 작동', en: 'Transform timer now runs smoother' },
      { ko: '전체적인 게임 반응 속도 향상', en: 'Overall game responsiveness improved' },
    ],
  },
  {
    version: '1.4.1',
    date: '2026-01-02',
    title: { ko: '안정성 개선 🔧', en: 'Stability Improvements 🔧' },
    changes: [

      { ko: '배포 환경 속도 일관성 수정', en: 'Fixed speed consistency in deployed environment' },
      { ko: '초기 로딩 시 순간이동 버그 수정', en: 'Fixed teleporting bug on initial load' },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-01-02',
    title: { ko: '슬리더 스타일 업데이트 🐍', en: 'Slither Style Update 🐍' },
    changes: [
      { ko: '이동 시스템 업데이트', en: 'movement system update' },
      { ko: 'Entity Interpolation으로 부드러운 움직임', en: 'Smooth movement with Entity Interpolation' },
      { ko: '1등 플레이어에게 왕관 👑 표시', en: 'Crown 👑 for 1st place player' },
      { ko: 'RPS 색상 테두리 제거 (이모지로 충분)', en: 'Removed RPS color border (emoji is enough)' },
      { ko: 'UI 통일 및 모바일 viewport 비율 기반 크기', en: 'Unified UI with mobile viewport-based sizing' },
      { ko: '미니맵 점 색상을 본체 색상으로 변경', en: 'Minimap dots now use player body color' },
      { ko: '플레이어 속도 300 → 400 증가', en: 'Increased player speed 300 → 400' },
    ],
  },
  {
    version: '1.2.1',
    date: '2024-12-31',
    title: { ko: '모바일 최적화 📱', en: 'Mobile Optimization 📱' },
    changes: [
      { ko: '모바일 UI 최적화 (미니맵/킬로그 제거)', en: 'Mobile UI optimization (removed minimap/killfeed)' },
      { ko: '모바일 전용 컴팩트 랭킹 추가', en: 'Added compact mobile ranking' },
      { ko: '튜토리얼 텍스트 수정 (킬 기반)', en: 'Fixed tutorial text (kill-based)' },
      { ko: '캐릭터 얼굴 항상 표시', en: 'Character faces always visible' },
      { ko: '화면 밖 플레이어 렌더링 최적화', en: 'Off-screen player rendering optimization' },
    ],
  },
  {
    version: '1.2.0',
    date: '2024-12-31',
    title: { ko: '킬 시스템 업데이트 🗡️', en: 'Kill System Update 🗡️' },
    changes: [
      { ko: '점수 시스템을 킬 수 기반으로 변경', en: 'Changed scoring system to kill-based' },
      { ko: '랭킹이 킬 수 기준으로 표시', en: 'Rankings now show kill count' },
      { ko: '사망 화면에 킬 수 표시 추가', en: 'Kill count display on death screen' },
      { ko: '부스트 버튼 초기화 버그 수정', en: 'Fixed boost button initialization bug' },
      { ko: '다시하기 시 직전 방 제외 매칭', en: 'Exclude previous room when playing again' },
    ],
  },
  {
    version: '1.1.0',
    date: '2024-12-31',
    title: { ko: '배포판 업데이트 🚀', en: 'Production Update 🚀' },
    changes: [
      { ko: '버전 정보 및 업데이트 내역 표시 기능', en: 'Version info and update history display' },
      { ko: '공지사항 시스템 추가', en: 'Notice system added' },
      { ko: 'Buy Me a Coffee 후원 버튼 추가', en: 'Buy Me a Coffee support button' },
      { ko: 'Google Analytics 4 연동', en: 'Google Analytics 4 integration' },
      { ko: 'AI 봇 닉네임 다양화 (150개+ 자연스러운 닉네임)', en: 'Diverse AI bot nicknames (150+ natural names)' },
      { ko: '사망 화면에 친구 초대 버튼 추가', en: 'Friend invite button on death screen' },
    ],
  },
  {
    version: '1.0.0',
    date: '2024-12-30',
    title: { ko: '정식 출시 🎉', en: 'Official Launch 🎉' },
    changes: [
      { ko: '실시간 멀티플레이어 가위바위보 배틀로얄', en: 'Real-time multiplayer RPS battle royale' },
      { ko: '4초마다 전체 동기화 변신 시스템', en: 'Global transform sync every 4 seconds' },
      { ko: '대시 기능 (스페이스바 / 화면 터치)', en: 'Dash ability (Spacebar / Screen tap)' },
      { ko: '사설방 생성 및 초대 코드 공유', en: 'Private room creation and invite codes' },
      { ko: '모바일 가상 조이스틱 지원', en: 'Mobile virtual joystick support' },
      { ko: '킬 피드 및 실시간 랭킹', en: 'Kill feed and live rankings' },
    ],
  },
];

/** 공지사항 타입 */
export interface Notice {
  id: string;
  type: 'info' | 'warning' | 'event';
  title: { ko: string; en: string };
  content: { ko: string; en: string };
  startDate: string;
  endDate?: string;
}

/** 현재 공지사항 목록 */
export const NOTICES: Notice[] = [
  {
    id: 'launch-notice',
    type: 'event',
    title: {
      ko: '🎮 ChaosRPS.io 정식 출시!',
      en: '🎮 ChaosRPS.io Official Launch!'
    },
    content: {
      ko: '가위바위보 배틀로얄에 오신 것을 환영합니다. 친구들과 함께 즐겨보세요!',
      en: 'Welcome to RPS Battle Royale. Enjoy with your friends!'
    },
    startDate: '2024-12-31',
    endDate: '2025-01-15',
  },
];

/**
 * 현재 활성화된 공지사항을 반환합니다.
 */
export function getActiveNotices(): Notice[] {
  const now = new Date();
  return NOTICES.filter((notice) => {
    const start = new Date(notice.startDate);
    const end = notice.endDate ? new Date(notice.endDate) : null;
    return now >= start && (!end || now <= end);
  });
}

/** 언어에 맞는 텍스트 반환 헬퍼 */
export function getLocalizedText(
  text: { ko: string; en: string },
  language: string
): string {
  return language === 'ko' ? text.ko : text.en;
}
