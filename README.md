# 맥비기획 자료실 (Phase 2)

맥비기획(약 8,000명 규모 IT 기획 커뮤니티) 자료실. 링크·파일 자료를 분류·검색·다운로드할 수 있는 웹 아카이브.

- **운영 사이트**: https://macbe-archive.com
- **상태**: Phase 2 운영 중 (Vercel + Supabase). 신규 자료 등록·검수·노출 전부 웹 앱에서 처리.

## 아키텍처 (현재)

| 구성 | 내용 |
|---|---|
| 앱 | Next.js 16 (App Router, Server Components) — `web/` |
| 원본 데이터(SSOT) | **Supabase Postgres** `archive_item` 등. 사이트는 Supabase만 읽음 |
| 파일 저장소 | Supabase Storage (`archive-files` 버킷) |
| 인증 | Google OAuth (운영진 role: reviewer/admin) |
| 배포 | GitHub `main` push → Vercel 자동 배포 (Root Directory = `web`) |

### 데이터 흐름
- **신규 자료**: (1) `web/scripts/drive_import.mjs`가 드라이브에서 Supabase로 직접 임포트, (2) `/submit` 폼 → `staging_proposal` → 운영진 2인 승인 → `archive_item`.
- **어드민**: `/admin-mb26/panel` — 자료 관리·자료등록요청·대시보드·카테고리·VOC 등.

> ⚠️ **구글 시트는 레거시**다. 과거 Phase 1(Apps Script + 시트)의 원본이었으나, 시트↔Supabase 자동 동기화는 2026-08-18 종료됨. 지금 시트는 사람이 손으로 하는 검수·삭제 워크시트일 뿐이며 사이트 데이터의 원본이 아니다. 자세한 내용은 운영 시트의 `_README` 탭 참고.

## 폴더 구조

```
chan-macbee/
├── web/               # ⭐ 운영 웹 앱 (Next.js 16) — 실제 서비스. 개발 규칙은 web/AGENTS.md
│   ├── app/           # 라우트 (홈·검색·submit·admin-mb26 등)
│   ├── components/    # UI 컴포넌트 (디자인 기준 = app/design)
│   ├── lib/           # supabase·queries·metrics·search 등
│   ├── scripts/       # drive_import.mjs 등 운영 스크립트
│   └── supabase/      # schema.sql + 마이그레이션
├── apps_script/       # 레거시 Phase 1 (Google Apps Script). 현재 미사용, 히스토리 보존
├── scripts/           # 프로젝트 레벨 스크립트
├── docs/              # 기획안·가이드 (UX_Writing_가이드.md 등)
│   └── meetings/      # 미팅 진행안·브리핑 (녹취·회의록 원본은 private/ — gitignore)
├── proposals/         # 운영 효율화 제안
└── templates/ · prototype/ · macbee-document/   # 자료·시안·문서 원본
```

## 개발

```bash
cd web
npm run dev      # localhost:3000
```

- 개발·UI 규칙: [web/AGENTS.md](web/AGENTS.md) (Next 16 주의사항 + UI 일관성 규칙)
- `.env.local`에 Supabase 4개 키 + `NEXT_PUBLIC_SITE_URL` 필요

## 팀

| 팀 | 팀장 | 역할 |
|---|---|---|
| 정비팀 | 전용구 | 기존 자료 분류·정리, 카테고리/삭제·유지 정책 |
| 운영팀 | 서지연 | 신규 자료 수급, 자료실 활성화, 시스템 관리 |
| 구독서비스팀 | 이종석 | 유료 구독 모델 |
