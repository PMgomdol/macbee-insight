import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CheckCircle2, Clock } from 'lucide-react';
import { getAuthState } from '@/lib/auth';
import { LoginButton } from './LoginButton';
import { ApplyReviewerForm } from './ApplyReviewerForm';

export const metadata = {
  title: '운영진 진입 — 맥비기획',
  robots: { index: false, follow: false },
};

export default async function Admin1229Page() {
  // layout에서 이미 호출된 getAuthState 재사용 — DB 추가 조회 없음
  const { user, role, displayName, isReviewer } = await getAuthState();

  if (user) {
    if (isReviewer) redirect('/admin');
    return <Logged user={user} displayName={displayName} role={role} />;
  }
  return <Guest />;
}

function Guest() {
  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto py-12">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">운영진 진입</h1>
        <p className="text-sm text-[var(--muted)]">
          맥비 자료실 운영진 전용 입구예요.<br />
          Google 계정으로 로그인하면 운영진 신청을 할 수 있어요.
        </p>
      </header>
      <LoginButton />
    </div>
  );
}

function Logged({ user, displayName, role }: { user: { email?: string }; displayName: string | null; role: string | null }) {
  const isPending = role === 'pending';
  const fallbackName = displayName ?? user.email?.split('@')[0] ?? '';

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto py-10">
      <header className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">운영진 신청</h1>
        <p className="text-sm text-[var(--muted)]">
          신청하면 기존 운영진이 확인해드려요.
        </p>
      </header>

      <div className="flex items-center justify-between gap-2 p-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--card)]">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">{displayName ?? user.email}</span>
          <span className="text-xs text-[var(--muted)]">{user.email}</span>
        </div>
        <form action="/auth/signout" method="post">
          <button type="submit" className="text-xs px-2 py-1 rounded-[var(--r-sm)] border border-[var(--border)] hover:bg-[var(--bg)] text-[var(--muted)]">
            로그아웃
          </button>
        </form>
      </div>

      {isPending ? (
        <div className="flex flex-col gap-2 p-4 rounded-[var(--r-md)] bg-[var(--warning)]/10 text-sm">
          <div className="flex items-center gap-2 font-semibold">
            <Clock size={16} className="text-[var(--warning)]" aria-hidden />
            승인을 기다리고 있어요
          </div>
          <p className="text-xs text-[var(--muted)]">
            기존 운영진이 신청을 확인하면 자료 검토 페이지로 들어갈 수 있어요.
            승인되면 새로고침했을 때 검토 페이지로 바로 이동해요.
          </p>
          <Link href="/admin1229" className="self-start text-xs text-[var(--accent)] hover:underline mt-1">새로고침</Link>
        </div>
      ) : (
        <ApplyReviewerForm defaultName={fallbackName} />
      )}

      <p className="text-xs text-[var(--muted-2)] text-center">
        이 URL은 검색이나 NAV에 안 보여요. 다른 분께 공유하지 말아주세요.
      </p>
    </div>
  );
}
