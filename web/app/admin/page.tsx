import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { ApproveButton, ForceApproveButton, RejectButton } from './buttons';

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
  const isAdmin = role === 'admin';

  if (!user) {
    return (
      <div className="flex flex-col gap-3 max-w-md py-8 mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">운영진 검토</h1>
        <p className="text-sm text-[var(--muted)]">검토 페이지는 운영진 로그인이 필요합니다.</p>
        <Link href="/login" className="fc-btn fc-btn-primary w-fit px-4 py-2.5">로그인</Link>
      </div>
    );
  }

  if (!isReviewer) {
    return (
      <div className="flex flex-col gap-3 max-w-md py-8 mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">운영진 검토</h1>
        <p className="text-sm text-[var(--muted)]">
          {user.email} 계정은 운영진 권한이 없습니다.
        </p>
      </div>
    );
  }

  // 활성 운영진 수 확인 — 1명이면 단독 승인 안내 표시
  const { count: reviewerCount } = await sb
    .from('profile')
    .select('id', { count: 'exact', head: true })
    .in('role', ['reviewer', 'admin']);

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
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">검토 큐</h1>
          <span className="text-xs text-[var(--muted-2)]">{displayName ?? user.email} ({role})</span>
        </div>
        <p className="text-sm text-[var(--muted)]">
          멤버 제안 대기 {items.length}건. 운영진 2명 승인 시 자료실로 자동 이관.
        </p>
        {(reviewerCount ?? 0) < 2 && isAdmin && (
          <p className="text-xs text-[var(--warning)] mt-1">
            현재 운영진 {reviewerCount ?? 0}명 — 2인 승인 충족 불가. admin은 사유 기록과 함께 <strong>단독 승인</strong> 가능.
          </p>
        )}
      </section>

      {items.length === 0 ? (
        <div className="py-16 text-center text-sm text-[var(--muted)]">대기 중인 항목 없음</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((p) => (
            <article key={p.id} className="fc-card flex flex-col gap-2 p-3 sm:p-4 min-w-0 bg-[var(--card)]">
              <div className="flex items-center gap-2 text-[11px] text-[var(--muted-2)] flex-wrap">
                <span className="font-medium">{p.main_category ?? '미분류'}</span>
                {p.sub_category && <span>· {p.sub_category}</span>}
                {p.format && <span className="fc-badge">{p.format}</span>}
              </div>
              <h3 className="font-semibold text-sm break-words">{p.title}</h3>
              {p.summary && <p className="text-xs text-[var(--muted)] leading-relaxed break-words">{p.summary}</p>}
              {(p.external_url || p.file_url) && (
                <a
                  href={p.external_url ?? p.file_url ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--accent)] hover:underline break-all line-clamp-2 inline-flex items-start gap-1"
                >
                  <ExternalLink size={12} className="shrink-0 mt-0.5" aria-hidden />
                  <span>{p.external_url ?? p.file_url}</span>
                </a>
              )}
              {p.tags && p.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {p.tags.map((t) => (
                    <span key={t} className="fc-badge">{t}</span>
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
                <div className="flex gap-1.5 flex-wrap">
                  <ApproveButton id={p.id} disabled={p.approvers?.includes(user.email ?? '')} />
                  {(reviewerCount ?? 0) < 2 && <ForceApproveButton id={p.id} isAdmin={isAdmin} />}
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
