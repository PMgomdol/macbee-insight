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
  format          text,                          -- 아티클|영상|기획서|가이드|템플릿|세미나 (자료 카테고리성 값)
  file_ext        text,                          -- PDF|워드|PPT|엑셀|한글|이미지|영상|ZIP|구글 문서|구글 시트|구글 슬라이드 (배지용)
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
  -- 메뉴 배치 (2026-07-08 회의: 자료 형식이 SSOT — 템플릿만 files, 나머지 insights)
  -- 과거엔 URL 기반 generated column이었으나 수동 분류로 전환 (sync·승인 플로우가 세팅)
  kind            text not null default 'insights'
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
-- role·team 은 service_role만 쓸 수 있게 컬럼 단위로 제한 (RLS만으론 컬럼을 못 막아
-- 본인 행 UPDATE로 자가 admin 승격이 가능해진다 — 20260820 마이그레이션 참고).
revoke insert, update on table profile from anon, authenticated;
grant insert (id, display_name) on table profile to authenticated;
grant update (display_name)     on table profile to authenticated;

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

-- ================== 승인 원자화 (2026-07-09) ==================
-- 2인 승인 동시성 버그 수정: read-modify-write가 아니라 행 잠금(FOR UPDATE) 후
-- append. 동시 승인 시에도 유실 없음. MIN 도달을 감지한 요청 하나만
-- approved=true를 받아 자료실 이관을 수행한다.
create or replace function approve_proposal_atomic(p_id uuid, p_email text, p_min int)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_row staging_proposal%rowtype;
  v_new text[];
begin
  select * into v_row from staging_proposal where id = p_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_row.status <> 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'not_pending');
  end if;
  if p_email = any(coalesce(v_row.approvers, '{}')) then
    v_new := v_row.approvers;
  else
    v_new := coalesce(v_row.approvers, '{}') || p_email;
  end if;
  if coalesce(array_length(v_new, 1), 0) >= p_min then
    update staging_proposal
       set approvers = v_new, status = 'approved', reviewed_at = now()
     where id = p_id;
    return jsonb_build_object('ok', true, 'approved', true, 'approvers', to_jsonb(v_new));
  else
    update staging_proposal set approvers = v_new where id = p_id;
    return jsonb_build_object('ok', true, 'approved', false, 'approvers', to_jsonb(v_new));
  end if;
end $$;
