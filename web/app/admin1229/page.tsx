import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { LoginButton } from './LoginButton';
import { ApplyReviewerButton } from './ApplyReviewerButton';

export const metadata = {
  title: '운영진 진입 — 맥비기획',
  robots: { index: false, follow: false },
};

export default async function Admin1229Page() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();

  let role: string | null = null;
  let displayName: string | null = null;
  let appliedAt: string | null = null;
  if (user) {
    const { data: prof } = await sb
      .from('profile')
      .select('display_name, role, notes')
      .eq('id', user.id)
      .maybeSingle();
    role = prof?.role ?? null;
    displayName = prof?.display_name ?? null;
    // notes 안에 신청 시각 기록 (예: 'reviewer-applied:2026-06-15T...')
    const m = (prof?.notes ?? '').match(/reviewer-applied:([\d-T:.Z]+)/);
    appliedAt = m?.[1] ?? null;
  }

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto py-12">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">운영진 진입</h1>
        <p className="text-sm text-[var(--muted)]">
          맥비기획 자료실 운영진·등록자 전용 진입점입니다.
        </p>
      </header>

      {!user ? (
        <>
          <LoginButton />
          <p className="text-xs text-[var(--muted-2)] text-center">
            Google 계정으로 로그인 후 운영진 신청 가능합니다.
          </p>
        </>
      ) : (
        <div className="flex flex-col gap-4 p-4 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{displayName ?? user.email}</span>
              <span className="text-xs text-[var(--muted)]">
                권한: {roleLabel(role)}
              </span>
            </div>
            <form action="/auth/signout" method="post">
              <button type="submit" className="text-xs px-2 py-1 rounded-[var(--r-sm)] border border-[var(--border)] hover:bg-[var(--bg)] text-[var(--muted)]">
                로그아웃
              </button>
            </form>
          </div>

          {(role === 'reviewer' || role === 'admin') && (
            <Link href="/admin" className="fc-btn fc-btn-primary text-center">
              운영진 검토 페이지로
            </Link>
          )}

          {role === 'pending' && (
            <div className="flex flex-col gap-1 p-3 rounded-[var(--r-sm)] border border-[var(--warning)]/40 bg-[var(--warning)]/10 text-sm">
              <span className="font-semibold">신청 접수됨</span>
              <span className="text-xs text-[var(--muted)]">
                관리자 승인 대기 중. {appliedAt ? `(${new Date(appliedAt).toLocaleDateString('ko-KR')} 신청)` : ''}
              </span>
            </div>
          )}

          {(role === null || role === 'member') && (
            <ApplyReviewerButton />
          )}
        </div>
      )}
    </div>
  );
}

function roleLabel(r: string | null): string {
  switch (r) {
    case 'admin': return '관리자 (admin)';
    case 'reviewer': return '운영진 (reviewer)';
    case 'pending': return '운영진 신청 — 승인 대기';
    case 'member': return '일반 멤버';
    case null: return '프로필 미생성';
    default: return r;
  }
}
