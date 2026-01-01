/**
 * Spatial Hash Grid
 * O(n²) 충돌 검사를 O(n)으로 최적화하는 공간 분할 시스템
 * 
 * 월드를 격자로 나누고 같은/인접 셀의 플레이어끼리만 충돌 검사
 */
import type { Player } from '@chaos-rps/shared';

/** 격자 셀 크기 (플레이어 최대 크기 * 2 권장) */
const CELL_SIZE = 200;

/**
 * Spatial Hash Grid 클래스
 */
export class SpatialHashGrid {
    private cellSize: number;
    private grid: Map<string, Set<string>>;
    private playerPositions: Map<string, { x: number; y: number }>;

    constructor(cellSize: number = CELL_SIZE) {
        this.cellSize = cellSize;
        this.grid = new Map();
        this.playerPositions = new Map();
    }

    /**
     * 좌표를 셀 키로 변환
     */
    private getCellKey(x: number, y: number): string {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        return `${cellX},${cellY}`;
    }

    /**
     * 그리드 초기화
     */
    clear(): void {
        this.grid.clear();
        this.playerPositions.clear();
    }

    /**
     * 플레이어를 그리드에 삽입
     */
    insert(player: Player): void {
        const key = this.getCellKey(player.x, player.y);

        if (!this.grid.has(key)) {
            this.grid.set(key, new Set());
        }

        this.grid.get(key)!.add(player.id);
        this.playerPositions.set(player.id, { x: player.x, y: player.y });
    }

    /**
     * 모든 플레이어를 그리드에 삽입
     */
    insertAll(players: Player[]): void {
        this.clear();
        for (const player of players) {
            this.insert(player);
        }
    }

    /**
     * 특정 플레이어와 충돌 가능한 플레이어 ID 목록 반환
     * (같은 셀 + 인접 8개 셀)
     */
    getNearbyPlayerIds(player: Player): string[] {
        const cellX = Math.floor(player.x / this.cellSize);
        const cellY = Math.floor(player.y / this.cellSize);
        const nearbyIds: string[] = [];

        // 3x3 인접 셀 탐색
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const key = `${cellX + dx},${cellY + dy}`;
                const cell = this.grid.get(key);
                if (cell) {
                    for (const id of cell) {
                        // 자기 자신 제외
                        if (id !== player.id) {
                            nearbyIds.push(id);
                        }
                    }
                }
            }
        }

        return nearbyIds;
    }

    /**
     * 잠재적 충돌 쌍 반환 (중복 제거)
     * 기존 O(n²)를 O(n)으로 최적화
     */
    getPotentialCollisionPairs(players: Player[]): Array<[Player, Player]> {
        // 먼저 모든 플레이어를 그리드에 삽입
        this.insertAll(players);

        const pairs: Array<[Player, Player]> = [];
        const checkedPairs = new Set<string>();

        // 플레이어 ID → 객체 맵
        const playerMap = new Map<string, Player>();
        for (const player of players) {
            playerMap.set(player.id, player);
        }

        // 각 플레이어에 대해 인접 플레이어만 검사
        for (const player of players) {
            const nearbyIds = this.getNearbyPlayerIds(player);

            for (const nearbyId of nearbyIds) {
                // 중복 방지: 작은 ID가 먼저 오도록 정렬
                const pairKey = player.id < nearbyId
                    ? `${player.id}-${nearbyId}`
                    : `${nearbyId}-${player.id}`;

                if (!checkedPairs.has(pairKey)) {
                    checkedPairs.add(pairKey);
                    const nearbyPlayer = playerMap.get(nearbyId);
                    if (nearbyPlayer) {
                        pairs.push([player, nearbyPlayer]);
                    }
                }
            }
        }

        return pairs;
    }
}

/** 싱글톤 인스턴스 */
export const spatialHashGrid = new SpatialHashGrid();
