/**
 * 방 정보 로컬 스토리지 관리
 * 커스텀 방 재입장을 위한 정보 저장/불러오기
 */

interface RoomInfo {
    /** 방 코드 */
    code: string;
    /** 방 ID */
    roomId: string;
    /** 마지막 접속 시간 */
    lastJoinTime: number;
    /** 닉네임 */
    nickname: string;
}

const STORAGE_KEY = 'chaosrps_last_room';
const ROOM_EXPIRY_MS = 1000 * 60 * 60; // 1시간

/**
 * 마지막 접속한 방 정보 저장
 */
export function saveLastRoom(code: string, roomId: string, nickname: string): void {
    try {
        const roomInfo: RoomInfo = {
            code,
            roomId,
            nickname,
            lastJoinTime: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(roomInfo));
    } catch (error) {
        console.warn('[RoomStorage] Failed to save room info:', error);
    }
}

/**
 * 마지막 접속한 방 정보 불러오기
 * @returns 유효한 방 정보 또는 null
 */
export function getLastRoom(): RoomInfo | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;

        const roomInfo: RoomInfo = JSON.parse(stored);

        // 만료 시간 체크
        const elapsed = Date.now() - roomInfo.lastJoinTime;
        if (elapsed > ROOM_EXPIRY_MS) {
            clearLastRoom();
            return null;
        }

        return roomInfo;
    } catch (error) {
        console.warn('[RoomStorage] Failed to load room info:', error);
        return null;
    }
}

/**
 * 저장된 방 정보 삭제
 */
export function clearLastRoom(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.warn('[RoomStorage] Failed to clear room info:', error);
    }
}
