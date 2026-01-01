/**
 * 게임 상태 관리 스토어
 * Zustand를 사용하여 게임 관련 전역 상태를 관리합니다.
 */
import { create } from 'zustand';
import type { Player, RankingEntry, RPSState } from '@chaos-rps/shared';
import { addSnapshot, removePlayerBuffer, clearAllBuffers } from '../services/interpolationService';

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
  updatePlayers: (players: Player[], timestamp: number) => void;
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

  updatePlayers: (players, timestamp) => {
    const playersMap = new Map<string, Player>();
    players.forEach((p) => {
      playersMap.set(p.id, p);
      // 각 플레이어를 보간 버퍼에 추가
      addSnapshot(p.id, p, timestamp);
    });

    const { nickname } = get();
    // 닉네임으로 내 플레이어 찾기 (서버에서 생성된 ID가 다를 수 있음)
    let myPlayer: Player | null = null;
    if (nickname) {
      for (const p of players) {
        if (p.nickname === nickname && !p.isBot) {
          myPlayer = p;
          break;
        }
      }
    }

    set({ players: playersMap, serverTimestamp: timestamp, myPlayer });
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
