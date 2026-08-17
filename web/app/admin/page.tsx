import Link from 'next/link';
import { getAuthState } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { UILinkButton } from '@/components/ui/Button';
import { Inbox, MessageSquare, UserPlus, ChevronRight } from 'lucide-react';

function roleLabel(r: string | null): string {
  if (r === 'admin') return '관리자';
  if (r === 'reviewer') return '운영진';
  return r ?? '권한 없음';
}

export const metadata = { title: '운영/관리 · 맥비 자료실' };

export default async function AdminHome() {
  const { user, isReviewer, displayName, role, isAdmin } = await getAuthState();

  if (!user) {
    return (
      <div className="flex flex-col gap-3 max-w-md py-8">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">운영/관리</h1>
        <p className="text-sm text-[var(--muted)]">운영진으로 로그인해주세요.</p>
        <UILinkButton href="/admin1229" className="w-fit">진입점으로 가기</UILinkButton>
      </div>
    );
  }
  if (!isReviewer) {
    return (
      <div className="flex flex-col gap-3 max-w-md py-8">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">운영/관리</h1>
        <p className="text-sm text-[var(--muted)]">{user.email} 계정은 아직 운영진이 아니에요.</p>
        <Link href="/admin1229" className="text-sm text-[var(--accent)] hover:underline">→ 운영진 신청하러 가기</Link>
      </div>
    );
  }

  const sb = createAdminClient();
  const [req, voc, apps, revs] = await Promise.all([
    sb.from('staging_proposal').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('feedback').select('id', { count: 'exact', head: true }).in('status', ['new', 'in_progress', 'hold']),
    sb.from('profile').select('id', { count: 'exact', head: true }).eq('role', 'pending'),
    sb.from('profile').select('id', { count: 'exact', head: true }).in('role', ['reviewer', 'admin']),
  ]);
  const reviewerCount = revs.count ?? 0;

  const rows = [
    { href: '/admin/requests', icon: Inbox, label: '자료 등록요청', count: req.count ?? 0, hint: '멤버가 제안한 자료 검토·승인' },
    { href: '/admin/feedback', icon: MessageSquare, label: '미처리 VOC', count: voc.count ?? 0, hint: '사용자 의견 처리·답변' },
    { href: '/admin/invite', icon: UserPlus, label: '운영진 신청', count: apps.count ?? 0, hint: '새 운영진 승인·초대' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">운영/관리</h1>
          <span className="text-xs text-[var(--muted-2)]">{displayName ?? user.email} · {roleLabel(role)}</span>
        </div>
        <p className="text-sm text-[var(--muted)]">처리할 일을 한눈에 보고 바로 이동해요.</p>
      </section>

      {reviewerCount < 2 && isAdmin && (
        <p className="text-xs text-[var(--warning)] rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--card)] p-2.5">
          지금 운영진이 {reviewerCount}명이에요. 자료 승인엔 2명이 필요한데, 관리자는 사유를 적고 단독 승인할 수 있어요.
          <Link href="/admin/invite" className="text-[var(--accent)] hover:underline ml-1">운영진 초대 →</Link>
        </p>
      )}

      <section className="flex flex-col gap-2">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <Link
              key={r.href}
              href={r.href}
              className="group flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--card)] p-3 sm:p-4 hover:border-[var(--accent)] transition"
            >
              <span className="text-[var(--muted)] group-hover:text-[var(--accent)]"><Icon size={20} aria-hidden /></span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{r.label}</span>
                  {r.count > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold bg-[var(--accent)] text-white">
                      {r.count}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--muted)] mt-0.5">{r.hint}</p>
              </div>
              <ChevronRight size={16} className="text-[var(--muted-2)] group-hover:text-[var(--accent)]" aria-hidden />
            </Link>
          );
        })}
      </section>

      <p className="text-[11px] text-[var(--muted-2)]">현재 운영진 {reviewerCount}명.</p>
    </div>
  );
}
