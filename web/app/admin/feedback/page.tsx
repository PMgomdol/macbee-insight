import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { UILinkButton } from '@/components/ui/Button';
import { getAuthState } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { CSBoard } from './CSBoard';
import type { FeedbackTicket } from './actions';

export const metadata = { title: '의견 관리 · 맥비 자료실' };

const SELECT_BASE =
  'id, kind, message, email, page_url, submitted_at, status, assignee, priority, answer, answered_at, answered_by, reviewer_note, updated_at';
const SELECT = 'name, ' + SELECT_BASE;

export default async function FeedbackPage() {
  const { user, isReviewer, displayName, role } = await getAuthState();

  if (!user || !isReviewer) {
    return (
      <div className="flex flex-col gap-3 max-w-md py-8 mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">의견 관리</h1>
        <p className="text-sm text-[var(--muted)]">운영진만 볼 수 있어요.</p>
        <UILinkButton href="/admin1229" className="w-fit">로그인</UILinkButton>
      </div>
    );
  }

  const sb = createAdminClient();
  const primary = await sb.from('feedback').select(SELECT).order('submitted_at', { ascending: false });
  let rows: Record<string, unknown>[] = (primary.data as Record<string, unknown>[] | null) ?? [];
  let error = primary.error;
  // name 컬럼 미생성(마이그레이션 전)일 수 있음 → 이름 없이 재조회
  if (error) {
    const retry = await sb.from('feedback').select(SELECT_BASE).order('submitted_at', { ascending: false });
    if (!retry.error) {
      rows = ((retry.data as Record<string, unknown>[] | null) ?? []).map((r) => ({ ...r, name: null }));
      error = null;
    }
  }

  const header = (
    <section className="flex flex-col gap-1">
      <Link href="/admin/dashboard" className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--fg)] w-fit">
        <ArrowLeft size={12} aria-hidden /> 대시보드로
      </Link>
      <div className="flex items-baseline justify-between gap-3 flex-wrap mt-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">의견 관리 (VOC)</h1>
        <span className="text-xs text-[var(--muted-2)]">{displayName ?? user.email} · {role === 'admin' ? '관리자' : '운영진'}</span>
      </div>
      <p className="text-sm text-[var(--muted)]">사용자가 [의견 보내기]로 남긴 내용을 상태별로 관리하고 답변해요.</p>
    </section>
  );

  // 컬럼 미생성(마이그레이션 전) → 안내
  if (error) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <div className="rounded-[var(--r-md)] border border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_8%,var(--bg))] p-4 flex flex-col gap-2 text-sm">
          <p className="font-semibold text-[var(--danger-text)]">의견 관리 테이블 준비가 필요해요</p>
          <p className="text-[var(--muted)]">
            Supabase SQL Editor에서 아래 마이그레이션을 한 번 실행하면 보드가 켜져요.
            (파일: <code>supabase/migrations/20260817_feedback_cs.sql</code>)
          </p>
          <pre className="text-[11px] bg-[var(--card)] border border-[var(--border)] rounded-[var(--r-sm)] p-2 overflow-x-auto whitespace-pre">{`alter table feedback add column if not exists status text not null default 'new';
alter table feedback add column if not exists assignee text;
alter table feedback add column if not exists priority text not null default 'normal';
alter table feedback add column if not exists answer text;
alter table feedback add column if not exists answered_at timestamptz;
alter table feedback add column if not exists answered_by text;
alter table feedback add column if not exists updated_at timestamptz not null default now();
update feedback set status = 'closed' where resolved = true and status = 'new';
create index if not exists idx_feedback_status on feedback (status, submitted_at desc);`}</pre>
          <p className="text-[11px] text-[var(--muted-2)]">에러: {error.message}</p>
        </div>
      </div>
    );
  }

  const { data: profs } = await sb.from('profile').select('display_name').in('role', ['reviewer', 'admin']);
  const assignees = (profs ?? []).map((p) => p.display_name).filter((n): n is string => !!n);
  const tickets = rows as unknown as FeedbackTicket[];

  return (
    <div className="flex flex-col gap-4">
      {header}
      <CSBoard tickets={tickets} assignees={assignees} />
    </div>
  );
}
