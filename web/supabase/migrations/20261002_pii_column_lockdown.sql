-- =========================================================================
-- 2026-10-02 — 공개(anon) 읽기에서 PII 컬럼 차단 (archive_item · staging_proposal)
--
-- 문제:
--   RLS는 행(row)만 거르고 컬럼은 못 거른다. 두 테이블은 anon/authenticated 에
--   테이블 단위 SELECT 가 열려 있어, 공개 anon 키(공개값)로 PostgREST 직격 조회가 된다:
--     GET /rest/v1/archive_item?select=id,notes&status=eq.public   → notes 에 운영진 이메일
--     GET /rest/v1/archive_item?select=proposer_email&status=eq.public → 참가자 이메일(이벤트)
--     GET /rest/v1/staging_proposal?select=proposer_email         → 승인 전 참가자 이메일
--   실측(2026-10-02): notes 공개행 중 18건에 실제 운영진/admin 이메일 포함.
--   공개 앱 UI(카드·검색·suggest·sitemap)는 이 컬럼들을 전혀 select 하지 않음 → 누수는
--   오직 anon 키 직격 PostgREST 경로. (profile 은 2026-08-20 에 같은 방식으로 잠갔음)
--
-- 조치(컬럼 단위 grant):
--   - 공개 앱 읽기(createPublicClient=anon)는 카드 컬럼만 select → 영향 없음.
--   - 어드민 페이지·승인/채점·중복검사(findDuplicate)는 전부 service_role(createAdminClient)
--     경유라 grant 를 우회 → 영향 없음.
--   - staging_proposal 익명 insert 는 `.insert(row).select('id')` 반환 때문에 id SELECT 만 필요.
-- =========================================================================

-- archive_item: proposer · proposer_email · notes 제외, 나머지 공개 컬럼만 허용
revoke select on table archive_item from anon, authenticated;
grant select (
  id, main_category, sub_category, tags, title, summary,
  external_url, file_url, format, published_at, registered_at,
  status, last_checked_at, category_owner, exposure_grade,
  views, downloads, file_ext, kind, featured_at
) on table archive_item to anon, authenticated;

-- staging_proposal: 익명이 읽을 이유 없음(중복검사도 service_role). insert 반환용 id 만 허용.
revoke select on table staging_proposal from anon, authenticated;
grant select (id) on table staging_proposal to anon, authenticated;

-- 확인용 — anon/authenticated 에 민감 컬럼 SELECT 가 남아있지 않아야 한다:
--   select grantee, table_name, column_name
--   from information_schema.column_privileges
--   where table_name in ('archive_item','staging_proposal')
--     and grantee in ('anon','authenticated') and privilege_type='SELECT'
--   order by table_name, grantee, column_name;
-- proposer / proposer_email / notes 행이 나오면 아직 열려있는 것.
