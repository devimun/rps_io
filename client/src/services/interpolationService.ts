/**
 * Entity Interpolation 서비스
 * Slither.io 스타일 부드러운 움직임을 위한 상태 보간
 * 
 * 서버에서 20Hz로 상태를 받을 때, 그 사이를 부드럽게 보간하여
 * 다른 플레이어들의 움직임이 끊기지 않게 합니다.
 */
import type { Player } from '@chaos-rps/shared';

/** 보간에 사용될 스냅샷 인터페이스 */
interface Snapshot {
    x: number;
    y: number;
    size: number;
    timestamp: number;
}

/** 보간된 위치 결과 */
interface InterpolatedPosition {
    x: number;
    y: number;
    size: number;
}

/** 플레이어별 스냅샷 버퍼 (최근 N개 상태 저장) */
const playerBuffers = new Map<string, Snapshot[]>();

/** 버퍼 최대 크기 (약 500ms 분량 @ 20Hz) */
const MAX_BUFFER_SIZE = 10;

/** 보간 지연 시간 (ms) - 이 시간만큼 과거 상태를 렌더링 */
const INTERPOLATION_DELAY = 100;

/**
 * 플레이어 스냅샷을 버퍼에 추가
 * @param playerId 플레이어 ID
 * @param player 플레이어 데이터
 * @param timestamp 서버 타임스탬프
 */
export function addSnapshot(playerId: string, player: Player, timestamp: number): void {
    let buffer = playerBuffers.get(playerId);

    if (!buffer) {
        buffer = [];
        playerBuffers.set(playerId, buffer);
    }

    // 스냅샷 추가
    buffer.push({
        x: player.x,
        y: player.y,
        size: player.size,
        timestamp,
    });

    // 버퍼 크기 제한
    while (buffer.length > MAX_BUFFER_SIZE) {
        buffer.shift();
    }
}

/**
 * 특정 플레이어의 버퍼 제거
 * @param playerId 플레이어 ID
 */
export function removePlayerBuffer(playerId: string): void {
    playerBuffers.delete(playerId);
}

/**
 * 모든 플레이어 버퍼 초기화
 */
export function clearAllBuffers(): void {
    playerBuffers.clear();
}

/**
 * 버퍼 존재 여부 확인
 * @param playerId 플레이어 ID
 * @returns 버퍼가 있으면 true
 */
export function hasBuffer(playerId: string): boolean {
    const buffer = playerBuffers.get(playerId);
    return buffer !== undefined && buffer.length >= 2;
}

/**
 * 보간된 위치 계산
 * 두 스냅샷 사이를 선형 보간하여 부드러운 위치 반환
 * 
 * @param playerId 플레이어 ID
 * @param currentTime 현재 시간 (Date.now())
 * @returns 보간된 위치 또는 null
 */
export function getInterpolatedPosition(
    playerId: string,
    currentTime: number
): InterpolatedPosition | null {
    const buffer = playerBuffers.get(playerId);

    if (!buffer || buffer.length < 2) {
        return null;
    }

    // 렌더링 시간 (현재보다 약간 과거)
    const renderTime = currentTime - INTERPOLATION_DELAY;

    // 렌더링 시간을 포함하는 두 스냅샷 찾기
    let before: Snapshot | null = null;
    let after: Snapshot | null = null;

    for (let i = 0; i < buffer.length - 1; i++) {
        if (buffer[i].timestamp <= renderTime && buffer[i + 1].timestamp >= renderTime) {
            before = buffer[i];
            after = buffer[i + 1];
            break;
        }
    }

    // 적절한 스냅샷 쌍을 못 찾으면 가장 최근 데이터 사용
    if (!before || !after) {
        const latest = buffer[buffer.length - 1];
        return {
            x: latest.x,
            y: latest.y,
            size: latest.size,
        };
    }

    // 보간 계수 계산 (0~1)
    const totalTime = after.timestamp - before.timestamp;
    const elapsed = renderTime - before.timestamp;
    const t = totalTime > 0 ? Math.min(1, Math.max(0, elapsed / totalTime)) : 1;

    // 선형 보간
    return {
        x: before.x + (after.x - before.x) * t,
        y: before.y + (after.y - before.y) * t,
        size: before.size + (after.size - before.size) * t,
    };
}
