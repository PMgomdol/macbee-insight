-- 사용자 의견 수집 — 우측 하단 "의견 보내기" 폼 저장소
create table if not exists feedback (
  id            bigserial primary key,
  kind          text not null,                       -- 'suggestion' | 'bug' | 'inquiry' | 'praise'
  message       text not null,
  email         text,
  page_url      text,
  user_agent    text,
  submitted_at  timestamptz not null default now(),
  resolved      boolean not null default false,
  reviewer_note text
);

create index if not exists idx_feedback_recent on feedback (submitted_at desc);
create index if not exists idx_feedback_unresolved on feedback (resolved, submitted_at desc) where resolved = false;

alter table feedback enable row level security;

-- anon insert 허용, read/update는 서버(service_role)만
drop policy if exists "feedback anon insert" on feedback;
create policy "feedback anon insert" on feedback
  for insert to anon, authenticated
  with check (true);
