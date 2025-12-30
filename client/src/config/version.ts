/**
 * 앱 버전 및 업데이트 정보
 * 배포 시 이 파일을 업데이트합니다.
 */

/** 현재 앱 버전 */
export const APP_VERSION = '1.1.0';

/** 빌드 날짜 */
export const BUILD_DATE = '2024-12-31';

/** 업데이트 로그 */
export interface UpdateLog {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

/** 업데이트 히스토리 (최신순) */
export const UPDATE_LOGS: UpdateLog[] = [
  {
    version: '1.1.0',
    date: '2024-12-31',
    title: '배포판 업데이트 🚀',
    changes: [
      '버전 정보 및 업데이트 내역 표시 기능',
      '공지사항 시스템 추가',
      'Buy Me a Coffee 후원 버튼 추가',
      'Google Analytics 4 연동',
      'AI 봇 닉네임 다양화 (150개+ 자연스러운 닉네임)',
      '사망 화면에 친구 초대 버튼 추가',
    ],
  },
  {
    version: '1.0.0',
    date: '2024-12-30',
    title: '정식 출시 🎉',
    changes: [
      '실시간 멀티플레이어 가위바위보 배틀로얄',
      '4초마다 전체 동기화 변신 시스템',
      '대시 기능 (스페이스바 / 화면 터치)',
      '사설방 생성 및 초대 코드 공유',
      '모바일 가상 조이스틱 지원',
      '킬 피드 및 실시간 랭킹',
    ],
  },
];

/** 공지사항 */
export interface Notice {
  id: string;
  type: 'info' | 'warning' | 'event';
  title: string;
  content: string;
  startDate: string;
  endDate?: string;
}

/** 현재 공지사항 목록 */
export const NOTICES: Notice[] = [
  {
    id: 'launch-notice',
    type: 'event',
    title: '🎮 ChaosRPS.io 정식 출시!',
    content: '가위바위보 배틀로얄에 오신 것을 환영합니다. 친구들과 함께 즐겨보세요!',
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
