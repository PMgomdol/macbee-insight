import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ApproveButton, RejectButton } from './buttons';

export default async function AdminPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();

  // 미로그인 또는 비-운영진 안내
  let role: string | null = null;
  let dbg: any = null;
  if (user) {
    const r = await sb.from('profile').select('role, display_name').eq('id', user.id).maybeSingle();
    role = r.data?.role ?? null;
    dbg = { user_id: user.id, profile_data: r.data, profile_error: r.error?.message ?? null };
  }
  const isReviewer = role === 'reviewer' || role === 'admin';

  if (!user) {
    return (
      <div className="flex flex-col gap-3 max-w-md py-8">
        <h1 className="text-2xl font-bold">운영진 검토</h1>
        <p className="text-sm text-[var(--muted)]">검토 페이지는 운영진 로그인이 필요합니다.</p>
        <Link href="/login" className="px-4 py-2 rounded bg-[var(--accent)] text-white text-sm w-fit">
          로그인
        </Link>
      </div>
    );
  }

  if (!isReviewer) {
    return (
      <div className="flex flex-col gap-3 max-w-2xl py-8">
        <h1 className="text-2xl font-bold">운영진 검토</h1>
        <p className="text-sm text-[var(--muted)]">
          {user.email} 계정은 운영진 권한이 없습니다.
        </p>
        <details className="text-xs text-[var(--muted)] mt-4">
          <summary className="cursor-pointer">디버그 정보</summary>
          <pre className="mt-2 p-3 rounded bg-[var(--card)] border border-[var(--border)] overflow-auto">
{JSON.stringify(dbg, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  const { data: pending } = await sb
    .from('staging_proposal')
    .select('*')
    .eq('status', 'pending')
    .order('proposed_at', { ascending: true });

  const items = (pending ?? []) as Array<any>;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold">검토 큐</h1>
        <p className="text-sm text-[var(--muted)]">
          멤버 제안 대기 {items.length}건. 운영진 2명 승인 시 자료실로 자동 이관.
        </p>
        <p className="text-xs text-[var(--muted)]">로그인: {user.email} ({role})</p>
      </section>

      {items.length === 0 ? (
        <div className="py-16 text-center text-[var(--muted)]">대기 중인 항목 없음</div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((p) => (
            <div key={p.id} className="flex flex-col gap-3 p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex gap-2 items-center text-xs text-[var(--muted)]">
                    <span>{p.main_category ?? '미분류'}</span>
                    {p.sub_category && <span>· {p.sub_category}</span>}
                    {p.format && <span className="px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)]">{p.format}</span>}
                  </div>
                  <h3 className="font-semibold text-sm">{p.title}</h3>
                  {p.summary && <p className="text-xs text-[var(--muted)]">{p.summary}</p>}
                  <a href={p.external_url} target="_blank" className="text-xs text-[var(--accent)] hover:underline break-all">
                    {p.external_url}
                  </a>
                  {p.tags && p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.tags.map((t: string) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg)] border border-[var(--border)] text-[var(--muted)]">{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="text-[11px] text-[var(--muted)] mt-1">
                    제안자 {p.proposer ?? '익명'} · {new Date(p.proposed_at).toLocaleString('ko-KR')}
                    {p.approvers && p.approvers.length > 0 && (
                      <span> · 승인 {p.approvers.length}/2 ({p.approvers.join(', ')})</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 self-end">
                <ApproveButton id={p.id} disabled={p.approvers?.includes(user.email)} />
                <RejectButton id={p.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
