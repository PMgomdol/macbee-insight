-- 의견(feedback)을 CS/VOC 티켓으로 관리하기 위한 필드 추가.
-- status 파이프라인: new → in_progress → answered → closed (+ hold 보류)
alter table feedback add column if not exists status      text not null default 'new';   -- new|in_progress|hold|answered|closed
alter table feedback add column if not exists assignee    text;                            -- 담당자 display_name
alter table feedback add column if not exists priority    text not null default 'normal'; -- low|normal|high
alter table feedback add column if not exists answer      text;                            -- 답변 내용(기록)
alter table feedback add column if not exists answered_at timestamptz;
alter table feedback add column if not exists answered_by text;
alter table feedback add column if not exists updated_at  timestamptz not null default now();

-- 기존 resolved 처리분을 종료 상태로 반영 (하위호환: resolved 컬럼은 유지)
update feedback set status = 'closed' where resolved = true and status = 'new';

create index if not exists idx_feedback_status on feedback (status, submitted_at desc);
