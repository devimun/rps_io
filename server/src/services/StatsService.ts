/**
 * 서버 통계 서비스
 * CCU, 방 수 등 서버 상태를 추적합니다.
 */

/** 통계 데이터 인터페이스 */
export interface ServerStats {
  /** 현재 동시 접속자 수 */
  currentCCU: number;
  /** 오늘 피크 CCU */
  peakCCU: number;
  /** 피크 CCU 시간 */
  peakCCUTime: Date | null;
  /** 현재 활성 방 수 */
  activeRooms: number;
  /** 오늘 총 게임 시작 수 */
  totalGamesStarted: number;
  /** 서버 시작 시간 */
  serverStartTime: Date;
}

/**
 * 서버 통계 서비스 클래스
 */
class StatsServiceClass {
  private currentCCU = 0;
  private peakCCU = 0;
  private peakCCUTime: Date | null = null;
  private activeRooms = 0;
  private totalGamesStarted = 0;
  private serverStartTime = new Date();
  private lastResetDate = new Date().toDateString();

  /**
   * 일일 통계 리셋 (자정에 호출)
   */
  private checkDailyReset(): void {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.peakCCU = this.currentCCU;
      this.peakCCUTime = this.currentCCU > 0 ? new Date() : null;
      this.totalGamesStarted = 0;
      this.lastResetDate = today;
      console.log('[Stats] 일일 통계 리셋');
    }
  }

  /**
   * 플레이어 연결 시 호출
   */
  playerConnected(): void {
    this.checkDailyReset();
    this.currentCCU++;
    
    if (this.currentCCU > this.peakCCU) {
      this.peakCCU = this.currentCCU;
      this.peakCCUTime = new Date();
    }
  }

  /**
   * 플레이어 연결 해제 시 호출
   */
  playerDisconnected(): void {
    this.currentCCU = Math.max(0, this.currentCCU - 1);
  }

  /**
   * 방 생성 시 호출
   */
  roomCreated(): void {
    this.activeRooms++;
    this.totalGamesStarted++;
  }

  /**
   * 방 종료 시 호출
   */
  roomClosed(): void {
    this.activeRooms = Math.max(0, this.activeRooms - 1);
  }

  /**
   * 현재 통계 조회
   */
  getStats(): ServerStats {
    this.checkDailyReset();
    return {
      currentCCU: this.currentCCU,
      peakCCU: this.peakCCU,
      peakCCUTime: this.peakCCUTime,
      activeRooms: this.activeRooms,
      totalGamesStarted: this.totalGamesStarted,
      serverStartTime: this.serverStartTime,
    };
  }

  /**
   * 콘솔에 통계 출력 (디버깅용)
   */
  logStats(): void {
    const stats = this.getStats();
    console.log(`[Stats] CCU: ${stats.currentCCU} | Peak: ${stats.peakCCU} | Rooms: ${stats.activeRooms}`);
  }
}

/** 싱글톤 인스턴스 */
export const StatsService = new StatsServiceClass();
