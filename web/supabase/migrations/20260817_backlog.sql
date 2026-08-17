-- 운영진 공용 백로그 보드 (자료 등록·정리 등 운영 작업 관리)
create table if not exists backlog (
  id bigint generated always as identity primary key,
  title text not null,
  detail text,
  category text,
  status text not null default 'todo',      -- todo | doing | done
  assignee text,
  priority text not null default 'normal',  -- low | normal | high
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_backlog_status on backlog (status, priority, created_at desc);

-- 서버 액션(service_role)으로만 접근 — 공개 REST 차단
alter table backlog enable row level security;
