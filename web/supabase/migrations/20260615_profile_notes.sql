-- =========================================================================
-- 2026-06-15 — profile.notes 컬럼 추가
-- /admin1229 운영진 신청 흐름에서 신청 시각·사유·거절 사유 기록용
-- =========================================================================

alter table profile add column if not exists notes text;

comment on column profile.notes is '운영진 신청·승인·거절 이벤트 메모 (reviewer-applied:<iso> reason:..., reviewer-rejected:<iso> reason:...)';
