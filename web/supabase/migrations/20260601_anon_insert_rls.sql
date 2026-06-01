-- =========================================================================
-- 2026-06-01 — staging_proposal anon INSERT 정책 명시 + GRANT
-- 새 publishable 키 시스템 호환성 — `to anon, authenticated` 명시 필요
-- =========================================================================

-- 기존 정책 재작성 (idempotent)
drop policy if exists "staging_anyone_insert" on staging_proposal;
create policy "staging_anyone_insert"
  on staging_proposal
  for insert
  to anon, authenticated
  with check (true);

-- INSERT 시 id 반환받기 위한 SELECT 정책 (본인 row만 — id로 조회)
drop policy if exists "staging_self_insert_select" on staging_proposal;
create policy "staging_self_insert_select"
  on staging_proposal
  for select
  to anon, authenticated
  using (false);  -- 일반 사용자는 SELECT 불가, INSERT의 RETURNING은 별도 처리됨

-- anon role에 INSERT/SELECT 권한 부여
grant insert on table staging_proposal to anon, authenticated;
grant select (id) on table staging_proposal to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- 검토자 SELECT/UPDATE 정책 재확인
drop policy if exists "staging_reviewer_select" on staging_proposal;
create policy "staging_reviewer_select"
  on staging_proposal
  for select
  to authenticated
  using (
    exists (select 1 from profile where profile.id = auth.uid() and profile.role in ('reviewer', 'admin'))
  );

drop policy if exists "staging_reviewer_update" on staging_proposal;
create policy "staging_reviewer_update"
  on staging_proposal
  for update
  to authenticated
  using (
    exists (select 1 from profile where profile.id = auth.uid() and profile.role in ('reviewer', 'admin'))
  );
