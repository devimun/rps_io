# Git에 민감 정보(API 키) 노출 시 대처 방법

## 🚨 상황
Chrome Performance Trace 파일(`Trace-*.json`)을 Git에 커밋했더니, 파일 내에 Google API 키가 포함되어 있어 GitHub에서 경고 메일이 왔습니다.

### 왜 이런 일이 발생했나?
Chrome DevTools Performance 트레이스 파일은 브라우저 세션의 **모든 정보**를 기록합니다:
- 네트워크 요청 URL (API 키 포함)
- 쿠키, 인증 토큰
- 확장 프로그램 정보
- 로컬 파일 경로

---

## 🔧 즉시 대처 방법

### 1단계: 노출된 파일 삭제
```bash
# 파일 삭제
git rm docs/1.4.4/Trace-20260105T002129.json

# 커밋
git commit -m "chore: 민감 정보 포함된 트레이스 파일 삭제"

# 푸시
git push
```

### 2단계: .gitignore에 추가
```bash
echo "# Chrome DevTools Trace files (may contain API keys)" >> .gitignore
echo "*.trace" >> .gitignore
echo "Trace-*.json" >> .gitignore
git add .gitignore
git commit -m "chore: 트레이스 파일 gitignore 추가"
git push
```

### 3단계: API 키 재발급 (중요!)
노출된 API 키는 **반드시 재발급**해야 합니다:

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) 접속
2. 노출된 API 키 찾기
3. "키 재생성" 또는 새 키 생성
4. 기존 키 삭제 또는 비활성화

### 4단계: Git 히스토리에서 완전 삭제 (선택)
단순 삭제로는 히스토리에 파일이 남아있습니다. 완전히 제거하려면:

```bash
# BFG Repo-Cleaner 사용 (권장)
# https://rtyley.github.io/bfg-repo-cleaner/
bfg --delete-files Trace-20260105T002129.json

# 또는 git filter-branch 사용 (느림)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch docs/1.4.4/Trace-20260105T002129.json" \
  --prune-empty --tag-name-filter cat -- --all

# 강제 푸시
git push origin --force --all
```

> ⚠️ **주의**: 히스토리 재작성은 다른 협업자에게 영향을 줍니다. 혼자 작업하는 경우에만 권장.

---

## ✅ 예방 방법

### 1. .gitignore 사전 설정
```gitignore
# 트레이스 파일
*.trace
Trace-*.json

# 민감 정보
.env
.env.local
*.pem
*.key

# IDE/OS 파일
.DS_Store
Thumbs.db
```

### 2. 커밋 전 확인
```bash
# 스테이징 파일 확인
git status

# 대용량/민감 파일 체크
git diff --cached --stat
```

### 3. Git Hooks 활용
`.git/hooks/pre-commit` 스크립트로 자동 체크:
```bash
#!/bin/sh
# 트레이스 파일 커밋 방지
if git diff --cached --name-only | grep -E "Trace-.*\.json$"; then
  echo "❌ 트레이스 파일은 커밋하지 마세요!"
  exit 1
fi
```

### 4. 트레이스 분석 시 주의사항
- 트레이스 파일은 **로컬에서만** 분석
- 분석 완료 후 즉시 삭제
- 공유 필요 시 민감 정보 마스킹

---

## 📚 참고 자료
- [GitHub: Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [Google Cloud: API 키 보안 권장사항](https://cloud.google.com/docs/authentication/api-keys)

---

## 결론
Chrome 트레이스 파일은 **절대 Git에 커밋하지 마세요**. 분석에 유용하지만, 브라우저 세션의 모든 민감 정보가 포함되어 있습니다.
