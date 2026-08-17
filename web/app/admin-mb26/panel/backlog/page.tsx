import { UILinkButton } from '@/components/ui/Button';
import { getAuthState } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { BacklogBoard } from './BacklogBoard';
import type { BacklogItem } from './actions';

export const metadata = { title: '백로그 · 운영/관리' };

export default async function BacklogPage() {
  const { user, isReviewer, displayName, role } = await getAuthState();

  if (!user || !isReviewer) {
    return (
      <div className="flex flex-col gap-3 max-w-md py-8 mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">백로그</h1>
        <p className="text-sm text-[var(--muted)]">운영진만 볼 수 있어요.</p>
        <UILinkButton href="/admin-mb26" className="w-fit">로그인</UILinkButton>
      </div>
    );
  }

  const sb = createAdminClient();
  const { data, error } = await sb.from('backlog').select('*').order('created_at', { ascending: false });

  const header = (
    <section className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">백로그</h1>
        <span className="text-xs text-[var(--muted-2)]">{displayName ?? user.email} · {role === 'admin' ? '관리자' : '운영진'}</span>
      </div>
      <p className="text-sm text-[var(--muted)]">운영진이 함께 관리하는 작업 보드예요. 자료 등록·정리·개선 할 일을 기록하고 나눠 처리해요.</p>
    </section>
  );

  // 테이블 미생성 → 안내
  if (error) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <div className="rounded-[var(--r-md)] border border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_8%,var(--bg))] p-4 flex flex-col gap-2 text-sm">
          <p className="font-semibold text-[var(--danger-text)]">백로그 테이블 준비가 필요해요</p>
          <p className="text-[var(--muted)]">
            Supabase SQL Editor에서 아래 마이그레이션을 한 번 실행하면 보드가 켜져요.
            (파일: <code>supabase/migrations/20260817_backlog.sql</code>)
          </p>
          <pre className="text-[11px] bg-[var(--card)] border border-[var(--border)] rounded-[var(--r-sm)] p-2 overflow-x-auto whitespace-pre">{`create table if not exists backlog (
  id bigint generated always as identity primary key,
  title text not null,
  detail text,
  category text,
  status text not null default 'todo',
  assignee text,
  priority text not null default 'normal',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_backlog_status on backlog (status, priority, created_at desc);
alter table backlog enable row level security;`}</pre>
          <p className="text-[11px] text-[var(--muted-2)]">에러: {error.message}</p>
        </div>
      </div>
    );
  }

  const { data: profs } = await sb.from('profile').select('display_name').in('role', ['reviewer', 'admin']);
  const assignees = (profs ?? []).map((p) => p.display_name).filter((n): n is string => !!n);
  const items = (data ?? []) as BacklogItem[];

  return (
    <div className="flex flex-col gap-4">
      {header}
      <BacklogBoard items={items} assignees={assignees} />
    </div>
  );
}
