import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ApproveButton, RejectButton } from './buttons';

export default async function AdminPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();

  let role: string | null = null;
  let displayName: string | null = null;
  if (user) {
    const { data } = await sb.from('profile').select('role, display_name').eq('id', user.id).maybeSingle();
    role = data?.role ?? null;
    displayName = data?.display_name ?? null;
  }
  const isReviewer = role === 'reviewer' || role === 'admin';

  if (!user) {
    return (
      <div className="flex flex-col gap-3 max-w-md py-8 mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold">운영진 검토</h1>
        <p className="text-sm text-[var(--muted)]">검토 페이지는 운영진 로그인이 필요합니다.</p>
        <Link href="/login" className="px-4 py-2.5 rounded bg-[var(--accent)] text-white text-sm w-fit">
          로그인
        </Link>
      </div>
    );
  }

  if (!isReviewer) {
    return (
      <div className="flex flex-col gap-3 max-w-md py-8 mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold">운영진 검토</h1>
        <p className="text-sm text-[var(--muted)]">
          {user.email} 계정은 운영진 권한이 없습니다.
        </p>
      </div>
    );
  }

  const { data: pending } = await sb
    .from('staging_proposal')
    .select('*')
    .eq('status', 'pending')
    .order('proposed_at', { ascending: true });

  const items = (pending ?? []) as Array<{
    id: string;
    title: string;
    summary: string | null;
    external_url: string | null;
    file_url: string | null;
    main_category: string | null;
    sub_category: string | null;
    tags: string[] | null;
    format: string | null;
    proposer: string | null;
    proposed_at: string;
    approvers: string[] | null;
  }>;

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold">검토 큐</h1>
          <span className="text-xs text-[var(--muted-2)]">{displayName ?? user.email} ({role})</span>
        </div>
        <p className="text-sm text-[var(--muted)]">
          멤버 제안 대기 {items.length}건. 운영진 2명 승인 시 자료실로 자동 이관.
        </p>
      </section>

      {items.length === 0 ? (
        <div className="py-16 text-center text-sm text-[var(--muted)]">대기 중인 항목 없음</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((p) => (
            <article key={p.id} className="flex flex-col gap-2 p-3 sm:p-4 rounded-lg border border-[var(--border)] bg-[var(--card)] min-w-0">
              <div className="flex items-center gap-2 text-[11px] text-[var(--muted-2)] flex-wrap">
                <span className="font-medium">{p.main_category ?? '미분류'}</span>
                {p.sub_category && <span>· {p.sub_category}</span>}
                {p.format && <span className="px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)]">{p.format}</span>}
              </div>
              <h3 className="font-semibold text-sm break-words">{p.title}</h3>
              {p.summary && <p className="text-xs text-[var(--muted)] leading-relaxed break-words">{p.summary}</p>}
              {(p.external_url || p.file_url) && (
                <a
                  href={p.external_url ?? p.file_url ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--accent)] hover:underline break-all line-clamp-2"
                >
                  {p.external_url ?? p.file_url}
                </a>
              )}
              {p.tags && p.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {p.tags.map((t) => (
                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--muted)]">{t}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between gap-2 mt-1 pt-2 border-t border-[var(--border)] flex-wrap">
                <div className="text-[11px] text-[var(--muted-2)]">
                  {p.proposer ?? '익명'} · {new Date(p.proposed_at).toLocaleDateString('ko-KR')}
                  {p.approvers && p.approvers.length > 0 && (
                    <span> · 승인 {p.approvers.length}/2</span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <ApproveButton id={p.id} disabled={p.approvers?.includes(user.email ?? '')} />
                  <RejectButton id={p.id} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
