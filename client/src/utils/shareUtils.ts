/**
 * 공유 유틸리티
 * 게임 공유 URL 생성 및 소셜 미디어 공유 기능을 제공합니다.
 */

/** 공유 메타데이터 인터페이스 */
export interface ShareMetadata {
  /** 공유 제목 */
  title: string;
  /** 공유 설명 */
  description: string;
  /** 공유 URL */
  url: string;
  /** 이미지 URL (선택) */
  imageUrl?: string;
}

/** 기본 게임 URL */
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

/**
 * 방 초대 URL 생성
 * @param roomCode - 6자리 방 코드
 * @returns 초대 URL
 */
export function createInviteUrl(roomCode: string): string {
  if (!roomCode || roomCode.length !== 6) {
    throw new Error('유효하지 않은 방 코드입니다');
  }
  return `${BASE_URL}?code=${roomCode.toUpperCase()}`;
}

/**
 * URL에서 방 코드 추출
 * @param url - URL 문자열 (기본값: 현재 URL)
 * @returns 방 코드 또는 null
 */
export function extractRoomCode(url?: string): string | null {
  try {
    const targetUrl = url ?? (typeof window !== 'undefined' ? window.location.href : '');
    const urlObj = new URL(targetUrl);
    const code = urlObj.searchParams.get('code');
    
    // 6자리 영문/숫자 코드만 유효
    if (code && /^[A-Z0-9]{6}$/i.test(code)) {
      return code.toUpperCase();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 공유 메타데이터 생성
 * @param roomCode - 방 코드 (선택)
 * @param score - 점수 (선택)
 * @returns 공유 메타데이터
 */
export function createShareMetadata(roomCode?: string, score?: number): ShareMetadata {
  const url = roomCode ? createInviteUrl(roomCode) : BASE_URL;
  
  let description = '가위바위보 배틀로얄 게임에 도전하세요!';
  if (score !== undefined) {
    description = `${score}점을 기록했습니다! 도전해보세요!`;
  }

  return {
    title: 'ChaosRPS.io',
    description,
    url,
    imageUrl: `${BASE_URL}/og-image.png`,
  };
}

/**
 * Web Share API 지원 여부 확인
 * @returns 지원 여부
 */
export function isWebShareSupported(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}

/**
 * Web Share API를 사용한 공유
 * @param metadata - 공유 메타데이터
 * @returns 공유 성공 여부
 */
export async function shareViaWebAPI(metadata: ShareMetadata): Promise<boolean> {
  if (!isWebShareSupported()) return false;

  try {
    await navigator.share({
      title: metadata.title,
      text: metadata.description,
      url: metadata.url,
    });
    return true;
  } catch (error) {
    // 사용자가 공유를 취소한 경우
    if (error instanceof Error && error.name === 'AbortError') {
      return false;
    }
    console.warn('[ShareUtils] Web Share failed:', error);
    return false;
  }
}

/**
 * 클립보드에 URL 복사
 * @param url - 복사할 URL
 * @returns 복사 성공 여부
 */
export async function copyToClipboard(url: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }
    
    // 폴백: execCommand 사용
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    console.warn('[ShareUtils] Clipboard copy failed');
    return false;
  }
}

/**
 * 카카오톡 공유 URL 생성
 * @param metadata - 공유 메타데이터
 * @returns 카카오톡 공유 URL
 */
export function createKakaoShareUrl(metadata: ShareMetadata): string {
  const params = new URLSearchParams({
    url: metadata.url,
  });
  return `https://story.kakao.com/share?${params.toString()}`;
}

/**
 * 트위터 공유 URL 생성
 * @param metadata - 공유 메타데이터
 * @returns 트위터 공유 URL
 */
export function createTwitterShareUrl(metadata: ShareMetadata): string {
  const params = new URLSearchParams({
    text: `${metadata.title} - ${metadata.description}`,
    url: metadata.url,
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/**
 * 페이스북 공유 URL 생성
 * @param metadata - 공유 메타데이터
 * @returns 페이스북 공유 URL
 */
export function createFacebookShareUrl(metadata: ShareMetadata): string {
  const params = new URLSearchParams({
    u: metadata.url,
  });
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}
