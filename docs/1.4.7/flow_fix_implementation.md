# 1.4.7 게임 흐름 및 로딩 프로세스 개선 구현 계획서

## 1. 개요

버전 1.4.7에서 게임 진입 시 발생하는 로딩 화면 및 UI 표시 문제를 분석하고 개선합니다.

### 문제 요약
| 문제 코드 | 현상 | 근본 원인 |
|---------|------|----------|
| C-1 | 로딩 화면 사라진 직후 UI 미표시 | 로딩 종료 조건이 `connectionStatus`에만 의존 |
| C-2 | 사설방 재시작 시 로딩 스킵 | 상태 리셋 없이 `setPhase('playing')` 즉시 호출 |
| C-3 | 새로고침 시 UI 동기화 실패 | 에셋 로딩과 UI 렌더링 간 Race Condition |

---

## 2. 현재 흐름 분석

### 문제 발생 지점

1. **`GameLoadingScreen.tsx`** (lines 13-15):
   ```tsx
   if (connectionStatus === 'connected') {
       return null;  // ❌ 서버 연결만 확인, UI 마운트 미확인
   }
   ```

2. **`DeathScreen.tsx`** (lines 105-111, 사설방 재시작):
   ```tsx
   if (isPrivateRoom && roomCode) {
       socketService.sendReady();  // ❌ 중복 플레이어 생성 위험
       setPhase('playing');  // ❌ 로딩 과정 스킵
   }
   ```

3. **`MainScene.ts`**: `phase === 'loading'`일 때만 로딩 프로세스 시작
   - 사설방 재시작 시 `dead` → `playing`으로 변경되어 로딩 스킵됨

---

## 3. 개선 방안

### 3.1 로딩 종료 조건 강화

| 조건 | 설명 |
|-----|------|
| 서버 연결 완료 | `connectionStatus === 'connected'` |
| 최소 대기 시간 | 1초 이상 로딩 화면 유지 (이미 구현됨) |
| 에셋 배치 완료 | Pool 생성 및 스프라이트 배치 |
| UI 마운트 완료 | HUD 컴포넌트 렌더링 완료 (**신규**) |

### 3.2 상태 리셋 로직 추가

- `uiStore`에 `isUIReady` 플래그 추가
- `gameStore`에 `isSceneReady` 플래그 추가

### 3.3 사설방 부활 로직 개선

서버에 `player:respawn` 이벤트 추가하여 기존 플레이어 리스폰

---

## 4. 상세 구현 계획

### Component 1: 클라이언트 상태 관리

#### [MODIFY] [uiStore.ts](file:///c:/Users/user/Desktop/DEV/rps_io/client/src/stores/uiStore.ts)
- `isUIReady: boolean` 상태 추가
- `setUIReady(ready: boolean)` 액션 추가

#### [MODIFY] [gameStore.ts](file:///c:/Users/user/Desktop/DEV/rps_io/client/src/stores/gameStore.ts)
- `isSceneReady: boolean` 상태 추가
- `setSceneReady(ready: boolean)` 액션 추가

---

### Component 2: 로딩 화면 개선

#### [MODIFY] [GameLoadingScreen.tsx](file:///c:/Users/user/Desktop/DEV/rps_io/client/src/components/ui/GameLoadingScreen.tsx)
- 로딩 종료 조건: `connectionStatus === 'connected' && isUIReady && isSceneReady`

---

### Component 3: UI Ready 콜백

#### [MODIFY] [App.tsx](file:///c:/Users/user/Desktop/DEV/rps_io/client/src/App.tsx)
- HUD 컴포넌트 렌더링 후 `setUIReady(true)` 호출

---

### Component 4: MainScene 로딩 완료 신호

#### [MODIFY] [MainScene.ts](file:///c:/Users/user/Desktop/DEV/rps_io/client/src/game/scenes/MainScene.ts)
- `onLoadingComplete()`에서 `setSceneReady(true)` 호출

---

### Component 5: 재시작 로직 개선

#### [MODIFY] [DeathScreen.tsx](file:///c:/Users/user/Desktop/DEV/rps_io/client/src/components/ui/DeathScreen.tsx)
- 사설방 재시작: 서버에 `player:respawn` 이벤트 전송

#### [MODIFY] [socketService.ts](file:///c:/Users/user/Desktop/DEV/rps_io/client/src/services/socketService.ts)
- `sendRespawn()` 메서드 추가

---

### Component 6: 서버 부활 처리

#### [MODIFY] [index.ts](file:///c:/Users/user/Desktop/DEV/rps_io/server/src/index.ts)
- `player:respawn` 이벤트 핸들러 추가

#### [MODIFY] [GameRoom.ts](file:///c:/Users/user/Desktop/DEV/rps_io/server/src/game/GameRoom.ts)
- `respawnPlayer(playerId: string)` 메서드 추가

---

## 5. 파일 변경 요약

| 파일 | 변경 내용 |
|-----|----------|
| `client/src/stores/uiStore.ts` | `isUIReady`, `setUIReady` 추가 |
| `client/src/stores/gameStore.ts` | `isSceneReady`, `setSceneReady` 추가 |
| `client/src/components/ui/GameLoadingScreen.tsx` | 로딩 종료 조건 강화 |
| `client/src/App.tsx` | HUD 마운트 추적 |
| `client/src/game/scenes/MainScene.ts` | `setSceneReady` 호출 |
| `client/src/components/ui/DeathScreen.tsx` | 사설방 재시작 로직 개선 |
| `client/src/services/socketService.ts` | `sendRespawn()` 추가 |
| `server/src/index.ts` | `player:respawn` 핸들러 추가 |
| `server/src/game/GameRoom.ts` | `respawnPlayer()` 추가 |

---

## 6. 검증 계획

### 6.1 기존 테스트 실행

```bash
# 서버 테스트
cd server && npm test

# 클라이언트 테스트  
cd client && npm test
```

### 6.2 수동 검증 시나리오

#### 시나리오 A: 빠른 시작 (공개방)
1. 브라우저 캐시 삭제 후 사이트 접속
2. 닉네임 입력 → [바로 시작] 클릭
3. **확인**: 로딩 완료 후 미니맵, 랭킹, 타이머 등 모든 UI 표시됨

#### 시나리오 B: 사설방 재시작
1. [방 만들기] → 사설방 입장
2. 게임 플레이 중 사망
3. [다시하기] 클릭
4. **확인**: 같은 방에서 부활, 모든 UI 정상 표시

#### 시나리오 C: 새로고침 후 재접속
1. 게임 플레이 중 F5 새로고침
2. 같은 방 코드로 재입장
3. **확인**: 로딩 정상 진행, UI 정상 표시

---

## 7. 사용자 확인 필요 사항

1. **사설방 부활 시 킬 수 처리**: 리셋할지 유지할지?
2. **최소 로딩 시간**: 현재 1초, 변경 필요?
3. **추가 개선 사항**: 위 계획 외 추가 필요 부분?
