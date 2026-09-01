-- 자료 용도(usage) 컬럼 — 등록 시 AI가 내용을 읽고 판정
-- "받아서 쓰는 자료면 양식·템플릿, 읽거나 보는 자료면 콘텐츠" (2026-09-01 확정)
-- 값: '쓰는것' | '읽는것' | null(판정 불가 — 승인 시 그릇 기준 폴백)
alter table staging_proposal add column if not exists usage text;
