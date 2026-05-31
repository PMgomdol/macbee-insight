-- =========================================================================
-- 맥비기획 자료실 — Supabase 스키마 v1
-- Phase 2: Apps Script + 시트 → Postgres
-- 실행: Supabase Dashboard → SQL Editor에 붙여넣고 Run
-- =========================================================================

-- ================== 1. 카테고리 마스터 ==================
create table if not exists category (
  id              bigserial primary key,
  main_category   text not null,
  sub_category    text,
  description     text,
  owner           text,                          -- 담당 운영자
  channels        text[],                        -- 모니터링 채널
  monitor_days    text,                          -- 모니터링 요일
  created_at      timestamptz not null default now(),
  unique (main_category, sub_category)
);

create index if not exists idx_category_main on category (main_category);

-- ================== 2. 자료 (자료실 + 인사이트 통합) ==================
create table if not exists archive_item (
  id              bigserial primary key,
  main_category   text not null,
  sub_category    text,
  tags            text[] default '{}',
  title           text not null,
  summary         text,
  external_url    text,                          -- 외부 링크 (아티클·영상)
  file_url        text,                          -- 다운로드 파일 (Drive/Storage)
  format          text,                          -- 아티클|영상|기획서|가이드|템플릿|세미나
  published_at    date,                          -- 원본 발행일 (없으면 NULL)
  registered_at   timestamptz not null default now(),
  proposer        text,
  status          text not null default 'public',  -- public|broken|archived
  last_checked_at timestamptz,
  category_owner  text,
  exposure_grade  text default 'free',           -- free|premium
  notes           text,
  views           integer not null default 0,
  downloads       integer not null default 0,
  -- 자료실 vs 인사이트 자동 판별 (computed)
  kind            text generated always as (
    case
      when file_url is not null and file_url <> '' then 'files'
      when external_url ~* 'https?://(?:m\.|www\.)?(docs|drive|sheets|slides)\.google\.com' then 'files'
      else 'insights'
    end
  ) stored
);

create index if not exists idx_archive_kind on archive_item (kind);
create index if not exists idx_archive_main on archive_item (main_category);
create index if not exists idx_archive_sub on archive_item (sub_category);
create index if not exists idx_archive_status on archive_item (status);
create index if not exists idx_archive_registered on archive_item (registered_at desc);
create index if not exists idx_archive_views on archive_item (views desc);
-- 풀텍스트 검색
create index if not exists idx_archive_search on archive_item using gin (
  to_tsvector('simple'::regconfig, coalesce(title, '') || ' ' || coalesce(summary, ''))
);
-- 태그 배열 GIN 인덱스 (where 'tag' = any(tags) / where tags && array['tag1'])
create index if not exists idx_archive_tags on archive_item using gin (tags);

-- ================== 3. FAQ ==================
create table if not exists faq (
  id              bigserial primary key,
  main_category   text not null,
  sub_category    text,
  question        text not null,
  answer          text not null,
  registered_at   timestamptz not null default now(),
  views           integer not null default 0,
  notes           text
);

create index if not exists idx_faq_main on faq (main_category);
create index if not exists idx_faq_search on faq using gin (
  to_tsvector('simple'::regconfig, coalesce(question, '') || ' ' || coalesce(answer, ''))
);

-- ================== 4. Staging (제안 → 검토 대기) ==================
create table if not exists staging_proposal (
  id              uuid primary key default gen_random_uuid(),
  proposed_at     timestamptz not null default now(),
  proposer        text,
  proposer_email  text,
  external_url    text,
  file_url        text,
  title           text,
  summary         text,
  main_category   text,
  sub_category    text,
  tags            text[],
  format          text,
  published_at    date,
  status          text not null default 'pending',  -- pending|approved|rejected|duplicate
  approvers       text[] default '{}',              -- 승인자 이메일 배열
  reviewer_note   text,
  reviewed_at     timestamptz
);

create index if not exists idx_staging_status on staging_proposal (status);

-- ================== 5. 검토 큐 (시의성 보류) ==================
create table if not exists review_queue (
  id              uuid primary key default gen_random_uuid(),
  main_category   text,
  sub_category    text,
  title           text,
  external_url    text,
  format          text,
  published_at    date,
  origin_category text,
  hold_reason     text,
  result          text,                          -- keep|drop|moved
  reviewer        text,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);

-- ================== 6. 깨진 링크 백업 ==================
create table if not exists broken_archive (
  id              bigserial primary key,
  original_id     bigint,
  payload         jsonb not null,                -- archive_item 행 통째 백업
  http_code       integer,
  removed_at      timestamptz not null default now()
);

-- ================== 7. 점검 로그 ==================
create table if not exists check_log (
  id              bigserial primary key,
  checked_at      timestamptz not null default now(),
  target_title    text,
  url             text,
  result          text,
  note            text
);

-- ================== 8. 사용자 프로필 + 권한 ==================
-- Supabase Auth의 auth.users 와 1:1 매핑
create table if not exists profile (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text not null,
  role            text not null default 'member',  -- member|reviewer|admin
  team            text,                            -- maintainer|operator
  created_at      timestamptz not null default now()
);

-- ================== 9. RLS (Row Level Security) ==================
alter table archive_item enable row level security;
alter table faq enable row level security;
alter table staging_proposal enable row level security;
alter table review_queue enable row level security;
alter table category enable row level security;
alter table profile enable row level security;
alter table broken_archive enable row level security;
alter table check_log enable row level security;

-- 공개 자료 — 모두 SELECT 가능
create policy "archive_public_select" on archive_item for select using (status = 'public');
create policy "faq_public_select" on faq for select using (true);
create policy "category_public_select" on category for select using (true);

-- staging_proposal — 누구나 INSERT (제안), 본인 것만 SELECT
create policy "staging_anyone_insert" on staging_proposal for insert with check (true);

-- 검토자(reviewer) 이상만 staging SELECT/UPDATE
create policy "staging_reviewer_select" on staging_proposal for select using (
  exists (select 1 from profile where profile.id = auth.uid() and profile.role in ('reviewer', 'admin'))
);
create policy "staging_reviewer_update" on staging_proposal for update using (
  exists (select 1 from profile where profile.id = auth.uid() and profile.role in ('reviewer', 'admin'))
);

-- profile — 본인 row만 SELECT (admin 검사 제거 — 무한 재귀 방지)
create policy "profile_self_select" on profile for select using (auth.uid() = id);
-- profile — 본인 행만 INSERT/UPDATE (callback에서 자기 profile 생성 가능)
create policy "profile_self_insert" on profile for insert with check (auth.uid() = id);
create policy "profile_self_update" on profile for update using (auth.uid() = id);

-- review_queue, broken_archive, check_log — admin/reviewer만
create policy "review_queue_admin" on review_queue for all using (
  exists (select 1 from profile where profile.id = auth.uid() and profile.role in ('reviewer', 'admin'))
);
create policy "broken_admin" on broken_archive for all using (
  exists (select 1 from profile where profile.id = auth.uid() and profile.role in ('reviewer', 'admin'))
);
create policy "checklog_admin" on check_log for all using (
  exists (select 1 from profile where profile.id = auth.uid() and profile.role in ('reviewer', 'admin'))
);

-- ================== 10. updated_at 트리거 (선택) ==================
-- 추후 필요 시 추가
