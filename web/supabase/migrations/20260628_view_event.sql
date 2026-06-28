-- =========================================================================
-- 자료 조회 이벤트 로그 — 월간/주간 Top 집계용
-- archive_item.views(누적 카운터)는 그대로 유지. view_event는 시점 기록.
-- 30일 지난 row 주기 정리 cron 권장 (없어도 인덱스로 조회 가능).
-- =========================================================================

create table if not exists view_event (
  id          bigserial primary key,
  item_id     bigint not null references archive_item(id) on delete cascade,
  viewed_at   timestamptz not null default now()
);

create index if not exists idx_view_event_recent on view_event (viewed_at desc);
create index if not exists idx_view_event_item_recent on view_event (item_id, viewed_at desc);

-- RLS — anon insert 허용 (api/view에서 service_role 쓰지만 동일 정책 만들어둠)
alter table view_event enable row level security;

drop policy if exists "view_event anon insert" on view_event;
create policy "view_event anon insert" on view_event
  for insert to anon, authenticated
  with check (true);

drop policy if exists "view_event anon read" on view_event;
create policy "view_event anon read" on view_event
  for select to anon, authenticated
  using (true);

-- Atomic increment RPC — race condition 해결 (archive_item.views += 1)
create or replace function increment_archive_views(p_id bigint)
returns integer
language sql
security definer
as $$
  update archive_item set views = views + 1 where id = p_id returning views;
$$;

grant execute on function increment_archive_views(bigint) to anon, authenticated;
