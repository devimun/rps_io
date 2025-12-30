/**
 * 앱 버전 및 업데이트 정보
 * 배포 시 이 파일을 업데이트합니다.
 */

/** 현재 앱 버전 */
export const APP_VERSION = '1.2.0';

/** 빌드 날짜 */
export const BUILD_DATE = '2024-12-31';

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
