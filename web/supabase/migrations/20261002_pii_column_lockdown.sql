-- =========================================================================
-- 2026-10-02 — archive_item 의 PII 컬럼을 공개(anon) 읽기에서 차단
--
-- 문제:
--   RLS 는 행(row)만 거르고 컬럼은 못 거른다. archive_item 은 anon/authenticated 에
--   테이블 단위 SELECT 가 열려 있고, 공개행(status='public')은 RLS 가 허용하므로
--   공개 anon 키(브라우저 번들에 있는 공개값)로 PostgREST 직격 조회가 된다:
--     GET /rest/v1/archive_item?select=notes&status=eq.public
--       → 실측(2026-10-02): notes 공개행 17건에 운영진 gmail 주소 포함(승인 기록 문구).
--          회사 도메인 노출은 0건.
--     GET /rest/v1/archive_item?select=proposer_email&status=eq.public
--       → 지금은 0건이지만, 챌린지 승인 시 migrateToArchive 가 참가자 이메일을
--          공개행에 복사하므로 승인되는 순간부터 수집 가능해진다.
--   공개 앱(카드·검색·suggest·sitemap)은 이 컬럼들을 select 하지 않음 → 누수는
--   anon 키 직격 경로 한정.
--   참고: staging_proposal 은 RLS 가 anon 행 조회를 이미 막고 있어(실측 anon 0행 /
--   실제 32행) 이번 조치 대상 아님.
--
-- 조치(컬럼 단위 grant — profile 2026-08-20 락다운과 같은 방식):
--   proposer · proposer_email · notes 를 anon/authenticated SELECT 에서 제외.
--   - 공개 읽기(createPublicClient=anon)는 명시 컬럼만 select, select('*') 없음 → 영향 없음.
--   - 어드민·승인·채점·중복검사·지표는 전부 service_role(createAdminClient) → grant 우회.
--
-- ⚠️ 이후 주의: archive_item 에 "공개로 읽을" 새 컬럼을 추가하면 반드시
--    grant select (새컬럼) on table archive_item to anon, authenticated;
--    를 같이 실행할 것. 안 하면 그 컬럼을 select 하는 공개 쿼리가 permission denied 로 실패.
-- =========================================================================

revoke select on table archive_item from anon, authenticated;
grant select (
  id, main_category, sub_category, tags, title, summary,
  external_url, file_url, format, published_at, registered_at,
  status, last_checked_at, category_owner, exposure_grade,
  views, downloads, file_ext, kind, featured_at
) on table archive_item to anon, authenticated;

-- 확인용 — anon/authenticated 에 proposer / proposer_email / notes SELECT 가 없어야 한다:
--   select grantee, column_name
--   from information_schema.column_privileges
--   where table_name='archive_item' and grantee in ('anon','authenticated')
--     and privilege_type='SELECT' and column_name in ('proposer','proposer_email','notes');
-- 결과가 0행이면 정상.
