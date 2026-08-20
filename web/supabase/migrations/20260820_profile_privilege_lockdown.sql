-- =========================================================================
-- 2026-08-20 — profile 권한 상승(자가 admin 승격) 차단
--
-- 문제:
--   RLS "profile_self_update" 가 컬럼 제한 없이 본인 행 UPDATE를 허용한다.
--   Supabase 기본 grant는 permissive(RLS로만 통제)하므로, 로그인한 일반 멤버가
--   앱을 거치지 않고 REST로 직접 자기 role을 바꿀 수 있다:
--     PATCH /rest/v1/profile?id=eq.<본인 uid>   { "role": "admin" }
--   RLS check(auth.uid()=id)만 통과하면 role 컬럼까지 그대로 써진다 → 자가 admin 승격.
--
-- 조치:
--   role·team 컬럼은 service_role만 쓰게 컬럼 단위로 grant를 좁힌다.
--   앱의 정상 역할 변경(applyReviewer/approveReviewer/reject/panel)은 전부
--   service_role(createAdminClient) 경유라 영향 없다.
--   authenticated 클라이언트가 직접 쓰는 유일한 경로는 로그인 콜백의 profile INSERT뿐
--   → (id, display_name)만 허용, role은 컬럼 default('member')로 채워진다.
--     (auth/callback/route.ts 에서 insert 시 role 지정을 제거함)
-- =========================================================================

revoke insert, update on table profile from anon, authenticated;

grant insert (id, display_name) on table profile to authenticated;
grant update (display_name)     on table profile to authenticated;

-- 확인용 — authenticated에 role/team 쓰기 권한이 남아있지 않아야 한다:
--   select grantee, privilege_type, column_name
--   from information_schema.column_privileges
--   where table_name='profile' and grantee in ('anon','authenticated')
--   order by grantee, column_name;
-- role·team 행이 나오면 아직 열려있는 것.
