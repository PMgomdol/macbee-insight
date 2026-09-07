---
name: 배포
description: 맥비 자료실을 프로덕션(macbe-archive.com)에 배포한다. 빌드 검증 → 커밋 → main push → 프로덕션 확인. 코드 변경을 라이브에 올릴 때 사용.
user-invocable: true
---

# 맥비 자료실 배포

git push → Vercel 자동배포 방식. **공개 레포(PMgomdol/macbee-insight)라 tracked 파일에 시크릿 절대 금지.**

## 절차

1. **node PATH 세팅**: `export PATH="$HOME/.nvm/versions/node/v20.20.1/bin:$PATH"`
2. **빌드 검증**: `cd web && npm run build` → `✓ Compiled successfully` 확인, error/fail 없어야 함. 있으면 중단하고 고치기.
3. **커밋** (레포 루트에서 — cwd가 web/이면 경로 겹침 `web/web/` 버그 주의):
   - 변경 파일만 명시적으로 `git add <files>` (`.env*`·QA·시크릿 안 딸려가게)
   - 커밋 메시지: `타입(범위): 요약` 한글, 본문에 왜/무엇. 끝에 `Co-Authored-By: Claude <noreply@anthropic.com>`
4. **동시작업 대비**: `git pull --rebase origin main` (다른 세션이 먼저 올렸을 수 있음)
5. **push**: `git push origin HEAD:main` (계정 PMgomdol)
6. **배포 확인**: Vercel이 main에서 자동빌드(~1분, 리전 서울 icn1). 라이브 = `macbe-archive` 프로젝트(도메인 macbe-archive.com). ⚠️중복 `macbee-insight-delete`도 같이 빌드됨(삭제 예정).
   - UI 변경 → 헤드리스 WebKit으로 macbe-archive.com 확인(uxui-qa 방식). 서버/콘텐츠 변경 → `curl -s https://macbe-archive.com/<path>`로 확인.
   - HTML은 `max-age=0` 즉시반영, 청크는 content-hash. 사용자 캐시면 강력새로고침 안내.

## 주의
- 시크릿은 `web/.env.local`에서 `node --env-file=.env.local`로 내부 로드(화면·커밋 출력 금지).
- Next 16 breaking changes — 새 API 쓰기 전 `node_modules/next/dist/docs/` 확인.
