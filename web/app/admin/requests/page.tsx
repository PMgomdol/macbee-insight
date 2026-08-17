import Link from 'next/link';
import { getAuthState } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { UILinkButton } from '@/components/ui/Button';
import { ExternalLink } from 'lucide-react';
import { ApproveButton, ForceApproveButton, RejectButton } from '../buttons';

export const metadata = { title: '자료등록요청 · 운영/관리' };

type Proposal = {
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
};

export default async function RequestsPage() {
  const { user, isReviewer, isAdmin } = await getAuthState();

  if (!user || !isReviewer) {
    return (
      <div className="flex flex-col gap-3 max-w-md py-8">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">자료등록요청</h1>
        <p className="text-sm text-[var(--muted)]">운영진만 볼 수 있어요.</p>
        <UILinkButton href="/admin1229" className="w-fit">로그인</UILinkButton>
      </div>
    );
  }

  const sb = createAdminClient();
  const [countRes, pendingRes] = await Promise.all([
    sb.from('profile').select('id', { count: 'exact', head: true }).in('role', ['reviewer', 'admin']),
    sb
      .from('staging_proposal')
      .select('id, title, summary, external_url, file_url, main_category, sub_category, tags, format, proposer, proposed_at, approvers')
      .eq('status', 'pending')
      .order('proposed_at', { ascending: true }),
  ]);
  const reviewerCount = countRes.count ?? 0;
  const items = (pendingRes.data ?? []) as Proposal[];

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">자료등록요청 ({items.length})</h1>
        <p className="text-sm text-[var(--muted)]">멤버가 제안한 자료예요. 운영진 2명이 승인하면 자료실로 옮겨가요.</p>
        {reviewerCount < 2 && isAdmin && (
          <p className="text-xs text-[var(--warning)] mt-1">
            운영진이 {reviewerCount}명이라 2인 승인이 어려워요. 관리자는 사유를 적고 <strong>단독 승인</strong>할 수 있어요.
            <Link href="/admin/invite" className="text-[var(--accent)] hover:underline ml-1">운영진 초대 →</Link>
          </p>
        )}
      </section>

      {items.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--muted)]">대기 중인 자료가 없어요</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((p) => (
            <article
              key={p.id}
              id={`p-${p.id}`}
              className="app-card flex flex-col gap-2 p-3 sm:p-4 min-w-0 bg-[var(--card)] scroll-mt-20 target:ring-2 target:ring-[var(--accent)]"
            >
              <div className="flex items-center gap-2 text-[11px] text-[var(--muted-2)] flex-wrap">
                <span className="font-medium">{p.main_category ?? '미분류'}</span>
                {p.sub_category && <span>· {p.sub_category}</span>}
                {p.format && <span className="slds-badge">{p.format}</span>}
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
                    <span key={t} className="slds-badge">{t}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between gap-2 mt-1 pt-2 border-t border-[var(--border)] flex-wrap">
                <div className="text-[11px] text-[var(--muted-2)]">
                  {p.proposer ?? '익명'} · {new Date(p.proposed_at).toLocaleDateString('ko-KR')}
                  {p.approvers && p.approvers.length > 0 && <span> · 승인 {p.approvers.length}/2</span>}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <ApproveButton id={p.id} disabled={p.approvers?.includes(user.email ?? '')} />
                  {reviewerCount < 2 && <ForceApproveButton id={p.id} isAdmin={isAdmin} />}
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
