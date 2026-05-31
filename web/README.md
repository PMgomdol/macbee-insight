# 맥비기획 자료실 — Phase 2 (Next.js + Supabase)

Phase 1 (Apps Script + 시트)의 후속 마이그레이션. 운영 단계 진입 시 본격 사용을 목표로 함.

## 스택

- **Next.js 16** (App Router, Turbopack)
- **TypeScript**, **Tailwind CSS 4**
- **Supabase** (Postgres + Auth + Storage)
- **Lucide React** (아이콘)
- **Vercel** 배포

## 폴더 구조

```
web/
├── app/                    # Next.js App Router 페이지
├── components/             # UI 컴포넌트
├── lib/
│   └── supabase/           # Supabase 클라이언트 (server/client)
├── supabase/
│   └── schema.sql          # DB 스키마 (1회 실행)
├── public/
└── .env.local.example      # 환경변수 템플릿
```

## 개발 시작

```bash
cd web
cp .env.local.example .env.local
# .env.local 안에 Supabase URL/키 + Gemini 키 입력
npm install
npm run dev
# http://localhost:3000
```

## 배포 (Vercel)

1. https://vercel.com → New Project → GitHub `PMgomdol/macbee-insight` 선택
2. Root Directory: `web` 지정 (이 repo의 web/만 사용)
3. Environment Variables에 `.env.local` 항목 그대로 등록
4. Deploy → 무료 `*.vercel.app` 서브도메인 자동 발급

## DB 초기 셋업 (1회)

Supabase Dashboard → SQL Editor → `supabase/schema.sql` 내용 붙여넣고 Run

## 데이터 이전 (시트 → Postgres)

이전 스크립트는 별도로 작성됨 (Phase 2.1).

## Phase 1 (Apps Script)와의 관계

- Phase 1: `../apps_script/` — 그대로 운영 유지
- Phase 2: 본 폴더 — 본격 운영 시 마이그레이션 대상
- 두 시스템은 **시점이 다른 SSOT**를 가짐. 운영팀 합의 후 cut-over 시점에 시트 데이터를 1회 import → 이후 Supabase가 SSOT.
