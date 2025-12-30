# 모노레포(Monorepo) 구조 가이드

## 개요

모노레포(Monorepo)는 여러 프로젝트나 패키지를 하나의 저장소(Repository)에서 관리하는 방식입니다. ChaosRPS.io 프로젝트에서는 클라이언트, 서버, 공유 코드를 하나의 저장소에서 효율적으로 관리하기 위해 모노레포 구조를 채택하였습니다.

## 모노레포를 선택한 이유

### 장점

1. **코드 공유 용이성**: 클라이언트와 서버 간에 타입 정의, 상수, 유틸리티 함수를 쉽게 공유할 수 있습니다.
2. **일관된 개발 환경**: 모든 패키지가 동일한 린터(Linter), 포매터(Formatter), TypeScript 설정을 공유합니다.
3. **원자적 변경(Atomic Changes)**: 여러 패키지에 걸친 변경사항을 하나의 커밋으로 관리할 수 있습니다.
4. **의존성 관리 단순화**: 공통 의존성을 루트에서 관리하여 버전 충돌을 방지합니다.

### 단점

1. **저장소 크기 증가**: 모든 코드가 한 곳에 있어 저장소가 커질 수 있습니다.
2. **빌드 복잡성**: 패키지 간 의존성을 고려한 빌드 순서 관리가 필요합니다.
3. **권한 관리 어려움**: 특정 패키지에만 접근 권한을 부여하기 어렵습니다.

## 프로젝트 구조

```
chaos-rps-io/
├── client/                 # 프론트엔드 (React + Phaser)
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── server/                 # 백엔드 (Node.js + Socket.IO)
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── shared/                 # 공유 코드 (타입, 상수, 유틸리티)
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── docs/                   # 문서
├── package.json            # 루트 패키지 설정
├── pnpm-workspace.yaml     # pnpm 워크스페이스 설정
└── tsconfig.base.json      # 공통 TypeScript 설정
```

## pnpm Workspace 설정

### pnpm을 선택한 이유

pnpm(Performant npm)은 다음과 같은 이유로 모노레포에 적합합니다:

1. **디스크 공간 절약**: 심볼릭 링크(Symbolic Link)를 사용하여 중복 패키지를 저장하지 않습니다.
2. **빠른 설치 속도**: 캐시된 패키지를 효율적으로 재사용합니다.
3. **엄격한 의존성 관리**: 명시적으로 선언하지 않은 패키지에 접근할 수 없어 의존성 문제를 조기에 발견합니다.
4. **내장 워크스페이스 지원**: 별도의 도구 없이 모노레포를 구성할 수 있습니다.

### pnpm-workspace.yaml 설정

```yaml
packages:
  - 'client'
  - 'server'
  - 'shared'
```

이 설정은 pnpm에게 `client`, `server`, `shared` 디렉토리가 각각 독립적인 패키지임을 알려줍니다.

### 워크스페이스 패키지 참조

패키지 간 의존성은 `workspace:*` 프로토콜을 사용하여 선언합니다:

```json
{
  "dependencies": {
    "@chaos-rps/shared": "workspace:*"
  }
}
```

`workspace:*`는 "현재 워크스페이스에 있는 최신 버전을 사용하라"는 의미입니다. 이렇게 하면 로컬 개발 시 항상 최신 코드를 참조하게 됩니다.

## TypeScript 프로젝트 참조 (Project References)

### 프로젝트 참조란?

TypeScript 프로젝트 참조(Project References)는 대규모 TypeScript 프로젝트를 여러 개의 작은 프로젝트로 분할하여 관리하는 기능입니다. 이를 통해:

1. **증분 빌드(Incremental Build)**: 변경된 프로젝트만 다시 컴파일합니다.
2. **타입 검사 분리**: 각 프로젝트가 독립적으로 타입 검사를 수행합니다.
3. **명확한 의존성**: 프로젝트 간 의존 관계가 명시적으로 선언됩니다.

### 기본 설정 (tsconfig.base.json)

모든 패키지가 공유하는 기본 TypeScript 설정입니다:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 주요 옵션 설명

| 옵션 | 설명 |
|------|------|
| `strict: true` | 엄격한 타입 검사를 활성화합니다. `any` 타입 사용을 최소화하고 타입 안전성을 높입니다. |
| `moduleResolution: "bundler"` | Vite, esbuild 등 모던 번들러와 호환되는 모듈 해석 방식입니다. |
| `isolatedModules: true` | 각 파일을 독립적으로 트랜스파일할 수 있도록 보장합니다. |
| `noUnusedLocals: true` | 사용하지 않는 지역 변수가 있으면 에러를 발생시킵니다. |

### 패키지별 설정

각 패키지는 기본 설정을 확장(extends)하고 필요한 옵션을 추가합니다:

```json
// server/tsconfig.json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [
    { "path": "../shared" }
  ]
}
```

`references` 배열은 이 프로젝트가 `shared` 패키지에 의존함을 선언합니다.

## 자주 사용하는 명령어

### 전체 패키지 명령 실행

```bash
# 모든 패키지에서 dev 스크립트 병렬 실행
pnpm -r --parallel dev

# 모든 패키지 빌드
pnpm -r build

# 모든 패키지 테스트
pnpm -r test
```

### 특정 패키지 명령 실행

```bash
# client 패키지에서만 dev 실행
pnpm --filter client dev

# server 패키지에서만 테스트 실행
pnpm --filter @chaos-rps/server test
```

### 의존성 설치

```bash
# 루트에 개발 의존성 추가
pnpm add -D -w prettier

# 특정 패키지에 의존성 추가
pnpm --filter client add react

# 특정 패키지에 개발 의존성 추가
pnpm --filter server add -D vitest
```

## 코드 공유 전략

### shared 패키지의 역할

`shared` 패키지는 클라이언트와 서버 모두에서 사용되는 코드를 담습니다:

1. **타입 정의**: `Player`, `GameRoom`, `RPSState` 등 공통 인터페이스
2. **상수**: 게임 설정값, 에러 코드 등
3. **유틸리티 함수**: 충돌 판정, 검증 로직 등 순수 함수
4. **이벤트 타입**: Socket.IO 이벤트 타입 정의

### 주의사항

- shared 패키지에는 **플랫폼 특정 코드**를 넣지 않습니다.
- 브라우저 전용 API(DOM, localStorage 등)나 Node.js 전용 API(fs, path 등)는 각 패키지에서 구현합니다.
- shared 패키지의 코드는 **순수 함수(Pure Function)**로 작성하여 테스트 용이성을 확보합니다.

## 결론

모노레포 구조는 ChaosRPS.io와 같이 클라이언트-서버 간 코드 공유가 많은 프로젝트에 적합합니다. pnpm workspace와 TypeScript 프로젝트 참조를 활용하면 효율적인 개발 환경을 구축할 수 있습니다.

다만, 프로젝트 규모가 작거나 팀원이 모노레포에 익숙하지 않다면 별도의 저장소로 분리하는 것도 고려해볼 수 있습니다. 중요한 것은 팀의 상황에 맞는 구조를 선택하는 것입니다.
