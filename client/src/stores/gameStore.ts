/**
 * 게임 상태 관리 스토어
 * Zustand를 사용하여 게임 관련 전역 상태를 관리합니다.
 */
import { create } from 'zustand';
import type { Player, RankingEntry, RPSState } from '@chaos-rps/shared';
import { addSnapshot, removePlayerBuffer, clearAllBuffers, cleanStaleBuffers } from '../services/interpolationService';

/** 게임 연결 상태 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/** 게임 진행 상태 */
export type GamePhase = 'idle' | 'lobby' | 'playing' | 'dead' | 'spectating';

/** 게임 스토어 상태 인터페이스 */
interface GameState {
  // 연결 상태
  connectionStatus: ConnectionStatus;
  roomId: string | null;
  roomCode: string | null;
  playerId: string | null;
  nickname: string | null;
  isPrivateRoom: boolean; // 사설방 여부 (코드로 입장하는 방)

  // 게임 상태
  phase: GamePhase;
  players: Map<string, Player>;
  rankings: RankingEntry[];
  serverTimestamp: number;
  /** [1.4.5] 다음 변신까지 남은 시간 (ms) */
  transformTimeRemaining: number;

  // 현재 플레이어 정보
  myPlayer: Player | null;
  pendingTransform: RPSState | null; // 변신 예고 상태
  transformWarningTime: number | null; // 변신 예고 남은 시간

  // 대시 상태
  isDashing: boolean;
  dashCooldownEndTime: number;

  // 사망 정보
  eliminatorNickname: string | null;
  eliminatorRpsState: RPSState | null;
  eliminatedRpsState: RPSState | null;
  deathMessage: string | null;
  finalKillCount: number; // 사망 시 킬 수
}

/** 게임 스토어 액션 인터페이스 */
interface GameActions {
  // 연결 관련
  setConnectionStatus: (status: ConnectionStatus) => void;
  setRoomInfo: (roomId: string, roomCode: string, playerId: string, nickname: string, isPrivate?: boolean) => void;
  clearRoomInfo: () => void;

  // 게임 상태 관련
  setPhase: (phase: GamePhase) => void;
  updatePlayers: (players: Player[], timestamp: number, transformTimeRemaining?: number) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updateRankings: (rankings: RankingEntry[]) => void;

  // 변신 관련
  setPendingTransform: (state: RPSState | null) => void;
  setTransformWarning: (timeRemaining: number | null) => void;

  // 대시 관련
  setDashState: (isDashing: boolean, cooldownEndTime: number) => void;

  // 사망 관련
  setDeathInfo: (eliminatorNickname: string, deathMessage: string, eliminatorRpsState?: RPSState, eliminatedRpsState?: RPSState, killCount?: number) => void;
  clearDeathInfo: () => void;

  // 리셋
  reset: () => void;
}

/** 초기 상태 */
const initialState: GameState = {
  connectionStatus: 'disconnected',
  roomId: null,
  roomCode: null,
  playerId: null,
  nickname: null,
  isPrivateRoom: false,
  phase: 'idle',
  players: new Map(),
  rankings: [],
  serverTimestamp: 0,
  transformTimeRemaining: 4000, // 기본값 4초
  myPlayer: null,
  pendingTransform: null,
  transformWarningTime: null,
  isDashing: false,
  dashCooldownEndTime: 0,
  eliminatorNickname: null,
  eliminatorRpsState: null,
  eliminatedRpsState: null,
  deathMessage: null,
  finalKillCount: 0,
};

/**
 * 게임 상태 스토어
 * 서버와의 동기화 및 게임 진행 상태를 관리합니다.
 */
export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...initialState,

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setRoomInfo: (roomId, roomCode, playerId, nickname, isPrivate = false) =>
    set({ roomId, roomCode, playerId, nickname, isPrivateRoom: isPrivate, phase: 'lobby' }),

  clearRoomInfo: () =>
    set({ roomId: null, roomCode: null, playerId: null, nickname: null, isPrivateRoom: false, phase: 'idle' }),

  setPhase: (phase) => set({ phase }),

  updatePlayers: (players, timestamp, transformTimeRemaining) => {
    const { nickname, players: existingPlayers } = get();
    const isFirstUpdate = existingPlayers.size === 0;
    const playersMap = new Map<string, Player>();

    // 먼저 내 플레이어 찾기
    let myPlayer: Player | null = null;
    for (const p of players) {
      if (nickname && p.nickname === nickname && !p.isBot) {
        myPlayer = p;
        break;
      }
    }

    // [1.4.5] 첫 업데이트 시 내 플레이어만 즉시 스냅샷 추가
    // 나머지는 Map에만 추가 (렌더링 시점에 스냅샷 추가됨)
    if (isFirstUpdate && myPlayer) {
      addSnapshot(myPlayer.id, myPlayer, timestamp);
    }

    // 플레이어 Map 구성
    for (const p of players) {
      playersMap.set(p.id, p);
      // 첫 업데이트가 아니거나, 내 플레이어가 아닌 경우에만 스냅샷 추가
      // 첫 업데이트 시 다른 플레이어 스냅샷은 requestIdleCallback으로 지연
      if (!isFirstUpdate) {
        addSnapshot(p.id, p, timestamp);
      }
    }

    // [1.4.5] 첫 업데이트 시 다른 플레이어 스냅샷 지연 추가
    if (isFirstUpdate) {
      const otherPlayers = players.filter(p => p.id !== myPlayer?.id);
      let idx = 0;
      const addBatch = () => {
        const batch = otherPlayers.slice(idx, idx + 3);
        for (const p of batch) {
          addSnapshot(p.id, p, timestamp);
        }
        idx += 3;
        if (idx < otherPlayers.length) {
          requestAnimationFrame(addBatch);
        }
      };
      if (otherPlayers.length > 0) {
        requestAnimationFrame(addBatch);
      }
    }

    // [1.4.5] 연결 해제된 플레이어 버퍼 정리
    const activeIds = new Set(playersMap.keys());
    cleanStaleBuffers(activeIds);

    // [1.4.5] 서버 상태 업데이트
    set({
      players: playersMap,
      serverTimestamp: timestamp,
      transformTimeRemaining: transformTimeRemaining ?? get().transformTimeRemaining,
      myPlayer
    });
  },

  addPlayer: (player) => {
    const { players } = get();
    const newPlayers = new Map(players);
    newPlayers.set(player.id, player);
    set({ players: newPlayers });
  },

  removePlayer: (playerId) => {
    const { players } = get();
    const newPlayers = new Map(players);
    newPlayers.delete(playerId);
    removePlayerBuffer(playerId); // 보간 버퍼도 제거
    set({ players: newPlayers });
  },

  updateRankings: (rankings) => set({ rankings }),

  setPendingTransform: (state) => set({ pendingTransform: state }),

  setTransformWarning: (timeRemaining) => set({ transformWarningTime: timeRemaining }),

  setDashState: (isDashing, cooldownEndTime) =>
    set({ isDashing, dashCooldownEndTime: cooldownEndTime }),

  setDeathInfo: (eliminatorNickname, deathMessage, eliminatorRpsState, eliminatedRpsState, killCount) =>
    set({ eliminatorNickname, deathMessage, eliminatorRpsState: eliminatorRpsState ?? null, eliminatedRpsState: eliminatedRpsState ?? null, finalKillCount: killCount ?? 0, phase: 'dead' }),

  clearDeathInfo: () =>
    set({ eliminatorNickname: null, deathMessage: null, eliminatorRpsState: null, eliminatedRpsState: null, finalKillCount: 0 }),

  reset: () => {
    clearAllBuffers(); // 모든 보간 버퍼 초기화
    set(initialState);
  },
}));
