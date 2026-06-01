-- =========================================================================
-- 2026-06-01 — 운영진 reviewer 계정 시드
-- 사용법: 운영팀 각자 Google OAuth로 1회 로그인 후, 본인 이메일 확인.
-- 그 다음 admin이 아래 UPDATE 실행 (이메일로 매칭).
-- =========================================================================

-- 예시 (이메일은 실제 운영팀 Google 계정으로 교체):
-- update profile set role = 'reviewer' where id = (
--   select id from auth.users where email = '서지연이메일@example.com'
-- );
-- update profile set role = 'reviewer' where id = (
--   select id from auth.users where email = '임종헌이메일@example.com'
-- );

-- 2인 확보 전까지는 admin(안재찬)이 forceApproveProposal로 사유 기록 후 단독 승인 가능.
