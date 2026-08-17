import { getAuthState } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { UILinkButton } from '@/components/ui/Button';
import { UserPlus } from 'lucide-react';
import { ReviewerApplyButtons } from '../ReviewerApplyButtons';
import { InvitePanel } from './InvitePanel';

export const metadata = { title: '운영진 초대 · 운영/관리' };

type App = { id: string; display_name: string; notes: string | null; created_at: string };

export default async function InvitePage() {
  const { user, isReviewer } = await getAuthState();

  if (!user || !isReviewer) {
    return (
      <div className="flex flex-col gap-3 max-w-md py-8">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">운영진 초대</h1>
        <p className="text-sm text-[var(--muted)]">운영진만 볼 수 있어요.</p>
        <UILinkButton href="/admin1229" className="w-fit">로그인</UILinkButton>
      </div>
    );
  }

  const sb = createAdminClient();
  const res = await sb
    .from('profile')
    .select('id, display_name, notes, created_at')
    .eq('role', 'pending')
    .order('created_at', { ascending: true });

  let apps: App[] = [];
  if (res.error && /notes/.test(res.error.message)) {
    const r2 = await sb.from('profile').select('id, display_name, created_at').eq('role', 'pending').order('created_at', { ascending: true });
    apps = (r2.data ?? []).map((p) => ({ ...p, notes: null }));
  } else {
    apps = (res.data ?? []) as App[];
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">운영진 초대</h1>
        <p className="text-sm text-[var(--muted)]">새 운영진을 초대하고, 들어온 신청을 승인해요.</p>
      </section>

      <InvitePanel />

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-semibold tracking-tight inline-flex items-center gap-1.5">
          <UserPlus size={16} aria-hidden /> 운영진 신청 ({apps.length})
        </h2>
        {apps.length === 0 ? (
          <p className="text-sm text-[var(--muted-2)] py-6 text-center">대기 중인 신청이 없어요.</p>
        ) : (
          <>
            <p className="text-xs text-[var(--muted)]">본인 신청은 다른 운영진이 승인해요.</p>
            <div className="flex flex-col gap-2">
              {apps.map((app) => {
                const m = (app.notes ?? '').match(/reviewer-applied:([\d\-T:.Z]+)/);
                const at = m?.[1] ?? app.created_at;
                const reasonM = (app.notes ?? '').match(/reason:(.+)$/);
                const reason = reasonM?.[1]?.trim();
                return (
                  <article key={app.id} className="app-card flex flex-col gap-1.5 p-3 sm:p-4 bg-[var(--card)]">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{app.display_name}</span>
                      <span className="text-[11px] text-[var(--muted)]">
                        {at ? new Date(at).toLocaleString('ko-KR') : '신청 시각 정보가 없어요'}
                      </span>
                    </div>
                    {reason && <p className="text-xs text-[var(--muted)] leading-relaxed">사유: {reason}</p>}
                    <ReviewerApplyButtons profileId={app.id} isSelf={app.id === user.id} />
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
