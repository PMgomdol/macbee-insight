'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type State =
  | { kind: 'guest' }
  | { kind: 'user'; name: string; isReviewer: boolean };

/**
 * 로그인 영역 노출 정책 (사용자 합의):
 * - 일반 페이지(홈/자료실/인사이트/FAQ/검색)에서는 로그인 버튼 숨김
 * - /admin, /login, /submit 경로 + 이미 로그인한 사용자만 표시
 */
export function AuthStatusClient({ state }: { state: State }) {
  const pathname = usePathname();
  const authPath = pathname.startsWith('/admin') || pathname.startsWith('/login') || pathname.startsWith('/submit') || pathname.startsWith('/auth');
  const loggedIn = state.kind === 'user';

  if (!loggedIn && !authPath) return null;

  if (state.kind === 'guest') {
    return (
      <Link
        href="/login"
        className="hidden sm:inline-flex text-xs px-3 py-1.5 rounded-[var(--r-sm)] border border-[var(--border)] hover:bg-[var(--card)] whitespace-nowrap"
      >
        로그인
      </Link>
    );
  }

  return (
    <div className="hidden sm:flex items-center gap-1.5 text-xs">
      <span className="text-[var(--muted)] whitespace-nowrap">
        {state.name}{state.isReviewer && <span className="text-[var(--accent)] ml-1">·운영진</span>}
      </span>
      <form action="/auth/signout" method="post">
        <button type="submit" className="px-2 py-1 rounded-[var(--r-sm)] border border-[var(--border)] hover:bg-[var(--card)] text-[var(--muted)] whitespace-nowrap">
          로그아웃
        </button>
      </form>
    </div>
  );
}
