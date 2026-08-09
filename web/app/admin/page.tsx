import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getAuthState } from '@/lib/auth';
import Link from 'next/link';
import { UILinkButton } from '@/components/ui/Button';
import { BarChart3, ExternalLink, UserPlus } from 'lucide-react';
import { ApproveButton, ForceApproveButton, RejectButton } from './buttons';
import { ReviewerApplyButtons } from './ReviewerApplyButtons';

function roleLabel(r: string | null): string {
  if (r === 'admin') return '관리자';
  if (r === 'reviewer') return '운영진';
  return r ?? '권한 없음';
}

export default async function AdminPage() {
  // layout에서 호출된 getAuthState와 동일 요청 — React cache로 DB round-trip 한 번
  const { user, role, displayName, isReviewer, isAdmin } = await getAuthState();
  const sb = await createClient();

  if (!user) {
    return (
      <div className="flex flex-col gap-3 max-w-md py-8 mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">운영진 검토</h1>
        <p className="text-sm text-[var(--muted)]">검토 페이지를 보려면 운영진으로 로그인해주세요.</p>
        <UILinkButton href="/admin1229" className="w-fit">진입점으로 가기</UILinkButton>
      </div>
    );
  }

  if (!isReviewer) {
    return (
      <div className="flex flex-col gap-3 max-w-md py-8 mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">운영진 검토</h1>
        <p className="text-sm text-[var(--muted)]">
          {user.email} 계정은 아직 운영진이 아니에요.
        </p>
        <Link href="/admin1229" className="text-sm text-[var(--accent)] hover:underline">→ 운영진 신청하러 가기</Link>
      </div>
    );
  }

  // 3개 쿼리 병렬 — 순차 round-trip 제거 (이전: 직렬 → ~800ms+, 병렬 → ~200ms)
  const sbaShared = createAdminClient();
  const [reviewerCountRes, pendingRes, pendingAppsRes] = await Promise.all([
    sb.from('profile').select('id', { count: 'exact', head: true }).in('role', ['reviewer', 'admin']),
    sb
      .from('staging_proposal')
      .select('id, title, summary, external_url, file_url, main_category, sub_category, tags, format, proposer, proposed_at, approvers')
      .eq('status', 'pending')
      .order('proposed_at', { ascending: true }),
    sbaShared
      .from('profile')
      .select('id, display_name, notes, created_at')
      .eq('role', 'pending')
      .order('created_at', { ascending: true }),
  ]);

  const reviewerCount = reviewerCountRes.count;
  const pending = pendingRes.data;

  // notes 컬럼 마이그레이션 안 된 환경 fallback
  let pendingApps: Array<{ id: string; display_name: string; notes: string | null; created_at: string }> = [];
  if (pendingAppsRes.error && /notes/.test(pendingAppsRes.error.message)) {
    const r2 = await sbaShared
      .from('profile')
      .select('id, display_name, created_at')
      .eq('role', 'pending')
      .order('created_at', { ascending: true });
    pendingApps = (r2.data ?? []).map((p) => ({ ...p, notes: null }));
  } else {
    pendingApps = pendingAppsRes.data ?? [];
  }

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
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">운영진 영역</h1>
          <span className="text-xs text-[var(--muted-2)]">{displayName ?? user.email} · {roleLabel(role)}</span>
        </div>
        <p className="text-sm text-[var(--muted)]">멤버가 제안한 자료와 새 운영진 신청을 확인해주세요.</p>
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline w-fit mt-1"
        >
          <BarChart3 size={14} aria-hidden /> 지표 대시보드 열기
        </Link>
        {(reviewerCount ?? 0) < 2 && isAdmin && (
          <p className="text-xs text-[var(--warning)] mt-1">
            지금 운영진이 {reviewerCount ?? 0}명이에요. 2명 승인이 필요한데 아직 부족해요. 관리자는 사유를 적고 <strong>단독 승인</strong>할 수 있어요.
          </p>
        )}
        <div className="text-[11px] text-[var(--muted-2)] mt-1">
          새 운영진 초대용 비공개 URL: <code className="px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--border)]">/admin1229</code>
        </div>
      </section>

      {/* 운영진(reviewer/admin) — 운영진 신청 큐 */}
      {isReviewer && pendingApps.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold tracking-tight inline-flex items-center gap-1.5">
            <UserPlus size={16} aria-hidden /> 운영진 신청 ({pendingApps.length})
          </h2>
          <p className="text-xs text-[var(--muted)]">본인 신청은 다른 운영진이 승인해요.</p>
          <div className="flex flex-col gap-2">
            {pendingApps.map((app) => {
              const m = (app.notes ?? '').match(/reviewer-applied:([\d\-T:.Z]+)/);
              const at = m?.[1] ?? app.created_at;  // notes 없으면 profile 생성 시각 사용
              const reasonM = (app.notes ?? '').match(/reason:(.+)$/);
              const reason = reasonM?.[1]?.trim();
              return (
                <article key={app.id} className="app-card flex flex-col gap-1.5 p-3 sm:p-4 bg-[var(--card)]">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{app.display_name}</span>
                    <span className="text-[11px] text-[var(--muted)]">
                      {at ? new Date(at).toLocaleString('ko-KR') : '신청 시각을 모르겠어요'}
                    </span>
                  </div>
                  {reason && (
                    <p className="text-xs text-[var(--muted)] leading-relaxed">사유: {reason}</p>
                  )}
                  <ReviewerApplyButtons profileId={app.id} isSelf={app.id === user.id} />
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* 자료 제안 검토 */}
      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold tracking-tight">자료 검토 큐 ({items.length})</h2>
        <p className="text-xs text-[var(--muted)]">멤버가 제안한 자료를 기다리고 있어요. 운영진 2명이 승인하면 자료실로 옮겨가요.</p>
        {items.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--muted)]">대기 중인 자료가 없어요</div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {items.map((p) => (
              <article key={p.id} id={`p-${p.id}`} className="app-card flex flex-col gap-2 p-3 sm:p-4 min-w-0 bg-[var(--card)] scroll-mt-20 target:ring-2 target:ring-[var(--accent)]">
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
      </section>
    </div>
  );
}
