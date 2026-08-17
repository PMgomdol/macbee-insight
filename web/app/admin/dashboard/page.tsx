import Link from 'next/link';
import { UILinkButton } from '@/components/ui/Button';
import { getAuthState } from '@/lib/auth';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { DashboardTabs } from './DashboardTabs';

export const metadata = {
  title: '지표 대시보드 · 맥비 자료실',
};

export default async function AdminDashboardPage() {
  const { user, isReviewer, displayName, role } = await getAuthState();

  if (!user) {
    return (
      <div className="flex flex-col gap-3 max-w-md py-8 mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">지표 대시보드</h1>
        <p className="text-sm text-[var(--muted)]">운영진만 볼 수 있어요.</p>
        <UILinkButton href="/admin1229" className="w-fit">
          로그인
        </UILinkButton>
      </div>
    );
  }

  if (!isReviewer) {
    return (
      <div className="flex flex-col gap-3 max-w-md py-8 mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">지표 대시보드</h1>
        <p className="text-sm text-[var(--muted)]">
          {user.email} 계정은 아직 운영진이 아니에요.
        </p>
        <Link href="/admin1229" className="text-sm text-[var(--accent)] hover:underline">
          → 운영진 신청하러 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--fg)] w-fit"
        >
          <ArrowLeft size={12} aria-hidden /> 운영진 영역으로
        </Link>
        <div className="flex items-baseline justify-between gap-3 flex-wrap mt-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">지표 대시보드</h1>
          <span className="text-xs text-[var(--muted-2)]">
            {displayName ?? user.email} · {role === 'admin' ? '관리자' : '운영진'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-[var(--muted)]">
            PostHog 실시간 지표. 트래픽·콘텐츠·전환 세 관점으로 정리했어요.
          </p>
          <Link
            href="/admin/feedback"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline"
          >
            <MessageSquare size={14} aria-hidden /> 의견 관리 (VOC)
          </Link>
        </div>
      </section>

      <DashboardTabs />
    </div>
  );
}
