# Railway 배포 가이드

## 개요

Railway는 개발자 친화적인 클라우드 플랫폼으로, GitHub 저장소를 연결하면 자동으로 빌드하고 배포하는 PaaS(Platform as a Service, 플랫폼 서비스)입니다. Heroku의 대안으로 떠오르며, 특히 Node.js와 WebSocket 애플리케이션에 적합합니다.

## Railway를 선택한 이유

### 장점

1. **간편한 설정**: GitHub 연동만으로 자동 배포가 가능합니다
2. **WebSocket 지원**: Socket.IO 같은 실시간 통신을 안정적으로 지원합니다
3. **모노레포 지원**: 하나의 저장소에서 여러 서비스를 배포할 수 있습니다
4. **환경 변수 관리**: 대시보드에서 쉽게 환경 변수를 설정할 수 있습니다
5. **자동 HTTPS**: SSL 인증서를 자동으로 발급하고 관리합니다
6. **커스텀 도메인**: 무료 플랜에서도 커스텀 도메인 연결이 가능합니다

### 요금 체계

| 플랜 | 비용 | 특징 |
|------|------|------|
| Hobby | $5/월 크레딧 | 개인 프로젝트에 적합 |
| Pro | $20/월~ | 팀 협업, 더 많은 리소스 |

무료 크레딧으로 소규모 프로젝트는 충분히 운영할 수 있습니다.

## 핵심 개념

### 프로젝트(Project)

프로젝트는 Railway에서 가장 상위 단위입니다. 하나의 프로젝트 안에 여러 서비스를 포함할 수 있습니다.

```
프로젝트: ChaosRPS.io
├── 서비스: server (Node.js 백엔드)
├── 서비스: client (정적 사이트)
└── 서비스: database (선택사항)
```

### 서비스(Service)

서비스는 실제로 실행되는 애플리케이션 단위입니다. 각 서비스는 독립적인 환경 변수, 도메인, 리소스를 가집니다.

### 환경(Environment)

Railway는 기본적으로 `production` 환경을 제공하며, 필요에 따라 `staging`, `development` 등 추가 환경을 만들 수 있습니다.

## 배포 방식

### 1. GitHub 연동 (권장)

가장 일반적인 방식으로, GitHub 저장소를 연결하면 push할 때마다 자동으로 배포됩니다.

```
GitHub Push → Railway 감지 → 자동 빌드 → 배포
```

### 2. Railway CLI

로컬에서 직접 배포할 때 사용합니다.

```bash
# CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 연결
railway link

# 배포
railway up
```

### 3. Docker

Dockerfile이 있으면 Railway가 자동으로 감지하여 Docker 빌드를 수행합니다.

## 설정 파일: railway.json

프로젝트 루트 또는 서비스 디렉토리에 `railway.json` 파일을 생성하여 빌드 및 배포 설정을 정의할 수 있습니다.

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pnpm install && pnpm build"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### 주요 설정 옵션

| 옵션 | 설명 |
|------|------|
| `builder` | 빌드 도구 (NIXPACKS, DOCKERFILE) |
| `buildCommand` | 빌드 시 실행할 명령어 |
| `startCommand` | 서비스 시작 명령어 |
| `healthcheckPath` | 헬스체크 엔드포인트 |
| `restartPolicyType` | 재시작 정책 (ON_FAILURE, ALWAYS, NEVER) |

## 환경 변수 설정

Railway 대시보드에서 환경 변수를 설정할 수 있습니다.

### 필수 환경 변수 예시

```bash
# 서버
PORT=3001                    # Railway가 자동 설정
NODE_ENV=production
CORS_ORIGIN=https://chaosrps.io

# 클라이언트
VITE_SERVER_URL=https://api.chaosrps.io
```

### Railway 제공 변수

Railway는 자동으로 몇 가지 환경 변수를 제공합니다:

- `PORT`: 서비스가 리스닝해야 할 포트
- `RAILWAY_ENVIRONMENT`: 현재 환경 이름
- `RAILWAY_SERVICE_NAME`: 서비스 이름

## 모노레포 배포 전략

모노레포(Monorepo, 하나의 저장소에 여러 프로젝트를 관리하는 방식)에서는 각 서비스를 별도로 배포해야 합니다.

### 디렉토리 구조

```
chaos-rps-io/
├── client/          # 클라이언트 서비스
├── server/          # 서버 서비스
├── shared/          # 공유 코드
└── package.json     # 루트 패키지
```

### 서비스별 설정

Railway에서 서비스를 생성할 때 "Root Directory"를 지정하여 특정 디렉토리만 배포할 수 있습니다.

- 서버 서비스: Root Directory = `server`
- 클라이언트 서비스: Root Directory = `client`

### 빌드 순서 문제

모노레포에서는 공유 패키지(shared)를 먼저 빌드해야 합니다. `buildCommand`에서 이를 처리합니다:

```json
{
  "build": {
    "buildCommand": "cd .. && pnpm install && pnpm --filter shared build && pnpm --filter server build"
  }
}
```

## 커스텀 도메인 연결

### 1. Railway에서 도메인 추가

1. 서비스 설정 → Domains 탭
2. "Add Custom Domain" 클릭
3. 도메인 입력 (예: `chaosrps.io`)

### 2. DNS 설정

도메인 등록 업체에서 DNS 레코드를 추가합니다:

```
타입: CNAME
이름: @ 또는 www
값: <railway-provided-domain>.railway.app
```

### 서브도메인 구성 예시

```
chaosrps.io          → 클라이언트 서비스
api.chaosrps.io      → 서버 서비스
```

## 헬스체크(Health Check)

헬스체크는 서비스가 정상적으로 동작하는지 확인하는 메커니즘입니다. Railway는 주기적으로 헬스체크 엔드포인트를 호출하여 서비스 상태를 모니터링합니다.

### 서버 측 구현

```typescript
// server/src/index.ts
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: Date.now() };
});
```

### railway.json 설정

```json
{
  "deploy": {
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30
  }
}
```

## 로그 확인

Railway 대시보드에서 실시간 로그를 확인할 수 있습니다:

1. 서비스 선택
2. "Deployments" 탭
3. 특정 배포 선택
4. "View Logs" 클릭

### CLI로 로그 확인

```bash
railway logs
```

## 트러블슈팅

### 빌드 실패

**증상**: 빌드 단계에서 에러 발생

**해결 방법**:
1. 로컬에서 `pnpm build` 실행하여 동일한 에러 재현
2. `buildCommand`가 올바른지 확인
3. 필요한 devDependencies가 설치되는지 확인

### 포트 바인딩 에러

**증상**: 서비스가 시작되지 않음

**해결 방법**:
```typescript
// 환경 변수에서 PORT 읽기
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = '0.0.0.0';  // 반드시 0.0.0.0으로 설정

server.listen(PORT, HOST);
```

### WebSocket 연결 실패

**증상**: Socket.IO 연결이 끊김

**해결 방법**:
1. CORS 설정 확인
2. 클라이언트의 서버 URL이 올바른지 확인
3. WebSocket 폴백(polling)이 활성화되어 있는지 확인

## Railway vs 다른 플랫폼 비교

| 기능 | Railway | Vercel | Heroku | Render |
|------|---------|--------|--------|--------|
| WebSocket | ✅ | ❌ | ✅ | ✅ |
| 정적 사이트 | ✅ | ✅ | ✅ | ✅ |
| 무료 티어 | $5 크레딧 | 넉넉함 | 없음 | 제한적 |
| 커스텀 도메인 | ✅ | ✅ | ✅ | ✅ |
| 자동 배포 | ✅ | ✅ | ✅ | ✅ |
| 모노레포 | ✅ | ✅ | 제한적 | ✅ |

## 참고 자료

- [Railway 공식 문서](https://docs.railway.app/)
- [Railway CLI 문서](https://docs.railway.app/develop/cli)
- [Nixpacks 빌드 시스템](https://nixpacks.com/)
