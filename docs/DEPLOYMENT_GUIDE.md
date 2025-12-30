# ChaosRPS.io 배포 가이드

초보자를 위한 로컬 테스트부터 실제 배포까지의 완전 가이드입니다.

---

## 목차

1. [로컬에서 테스트하기](#1-로컬에서-테스트하기)
2. [배포 준비하기](#2-배포-준비하기)
3. [서버 배포하기 (Railway)](#3-서버-배포하기-railway)
4. [클라이언트 배포하기 (Vercel)](#4-클라이언트-배포하기-vercel)
5. [도메인 연결하기](#5-도메인-연결하기)
6. [문제 해결](#6-문제-해결)

---

## 1. 로컬에서 테스트하기

### 1.1 필수 프로그램 설치

먼저 컴퓨터에 다음 프로그램이 설치되어 있어야 합니다:

1. **Node.js** (v18 이상)
   - https://nodejs.org 에서 LTS 버전 다운로드
   - 설치 후 터미널에서 확인: `node --version`

2. **pnpm** (패키지 매니저)
   ```bash
   npm install -g pnpm
   ```

### 1.2 의존성 설치

프로젝트 폴더에서 터미널을 열고 실행:

```bash
pnpm install
```

### 1.3 서버 실행

터미널 창 하나를 열고:

```bash
cd server
pnpm dev
```

성공하면 다음 메시지가 표시됩니다:
```
Server running on http://localhost:3000
```

### 1.4 클라이언트 실행

**새 터미널 창**을 열고:

```bash
cd client
pnpm dev
```

성공하면 다음 메시지가 표시됩니다:
```
Local: http://localhost:5173
```

### 1.5 브라우저에서 테스트

1. 브라우저를 열고 `http://localhost:5173` 접속
2. 닉네임 입력 후 "바로 시작" 클릭
3. 게임이 시작되면 성공!

### 1.6 모바일에서 테스트 (같은 Wi-Fi)

1. 컴퓨터의 IP 주소 확인:
   - Windows: `ipconfig` 명령어 실행 → IPv4 주소 확인
   - Mac: `ifconfig` 명령어 실행 → en0의 inet 주소 확인

2. 클라이언트 실행 시 호스트 지정:
   ```bash
   cd client
   pnpm dev --host
   ```

3. 모바일에서 `http://[컴퓨터IP]:5173` 접속

---

## 2. 배포 준비하기

### 2.1 환경 변수 파일 생성

**client/.env.production** 파일 생성:
```env
VITE_API_URL=https://your-server-url.railway.app
VITE_WS_URL=https://your-server-url.railway.app
```

### 2.2 빌드 테스트

배포 전에 빌드가 정상적으로 되는지 확인:

```bash
# 서버 빌드
cd server
pnpm build

# 클라이언트 빌드
cd ../client
pnpm build
```

오류 없이 완료되면 배포 준비 완료입니다.

---

## 3. 서버 배포하기 (Railway)

Railway는 무료로 시작할 수 있는 서버 호스팅 서비스입니다.

### 3.1 GitHub에 코드 올리기

1. https://github.com 에서 계정 생성 (없다면)
2. 새 저장소(Repository) 생성
3. 코드 업로드:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/[사용자명]/[저장소명].git
   git push -u origin main
   ```

### 3.2 Railway 설정

1. https://railway.app 접속 → GitHub로 로그인
2. "New Project" 클릭
3. "Deploy from GitHub repo" 선택
4. 방금 만든 저장소 선택

### 3.3 서버 서비스 설정

1. "Add Service" → "GitHub Repo" 선택
2. 설정(Settings) 탭에서:
   - **Root Directory**: `server`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`

3. Variables 탭에서 환경 변수 추가:
   ```
   PORT=3000
   NODE_ENV=production
   ```

4. "Deploy" 클릭

### 3.4 서버 URL 확인

배포 완료 후 Settings → Domains에서 URL 확인
예: `https://chaosrps-server.railway.app`

---

## 4. 클라이언트 배포하기 (Vercel)

Vercel은 프론트엔드 배포에 최적화된 무료 서비스입니다.

### 4.1 Vercel 설정

1. https://vercel.com 접속 → GitHub로 로그인
2. "Add New Project" 클릭
3. GitHub 저장소 선택
4. 설정:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `dist`

### 4.2 환경 변수 설정

Environment Variables 섹션에서 추가:
```
VITE_API_URL=https://[Railway에서-받은-서버-URL]
VITE_WS_URL=https://[Railway에서-받은-서버-URL]
```

### 4.3 배포

"Deploy" 클릭 → 2-3분 후 배포 완료

배포 완료 후 URL 확인
예: `https://chaosrps.vercel.app`

---

## 5. 도메인 연결하기 (선택사항)

자신만의 도메인(예: chaosrps.io)을 사용하고 싶다면:

### 5.1 도메인 구매

- https://namecheap.com
- https://godaddy.com
- https://gabia.com (한국)

### 5.2 Vercel에 도메인 연결

1. Vercel 프로젝트 → Settings → Domains
2. 구매한 도메인 입력
3. 도메인 업체에서 DNS 설정:
   - Type: `CNAME`
   - Name: `@` 또는 `www`
   - Value: `cname.vercel-dns.com`

### 5.3 Railway에 도메인 연결 (API용)

1. Railway 프로젝트 → Settings → Domains
2. Custom Domain 추가: `api.yourdomain.com`
3. 도메인 업체에서 DNS 설정

---

## 6. 문제 해결

### 서버가 시작되지 않음

```bash
# 포트 충돌 확인
netstat -ano | findstr :3000

# 다른 포트로 실행
PORT=3001 pnpm dev
```

### 클라이언트에서 서버 연결 실패

1. 서버가 실행 중인지 확인
2. CORS 설정 확인 (server/src/index.ts)
3. 환경 변수 URL이 올바른지 확인

### 배포 후 WebSocket 연결 실패

Railway/Vercel 모두 WebSocket을 지원하지만, URL이 `https://`로 시작해야 합니다.

### 모바일에서 게임이 느림

저사양 모드가 자동 활성화되어야 합니다. 그래도 느리다면:
- 다른 앱 종료
- 브라우저 캐시 삭제
- 외부 브라우저(Chrome, Safari) 사용

---

## 빠른 참조

| 작업 | 명령어 |
|------|--------|
| 의존성 설치 | `pnpm install` |
| 서버 개발 모드 | `cd server && pnpm dev` |
| 클라이언트 개발 모드 | `cd client && pnpm dev` |
| 전체 테스트 | `pnpm test` |
| 서버 빌드 | `cd server && pnpm build` |
| 클라이언트 빌드 | `cd client && pnpm build` |

---

## 다음 단계

배포가 완료되면:
1. 친구들에게 URL 공유
2. 피드백 수집
3. 버그 수정 및 기능 추가
4. Google Analytics 연동 (사용자 분석)
5. 광고 SDK 연동 (수익화)

궁금한 점이 있으면 언제든 질문하세요!
