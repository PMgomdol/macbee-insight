'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type State =
  | { kind: 'guest' }
  | { kind: 'user'; name: string; isReviewer: boolean };

/**
 * 로그인 영역 노출 정책:
 * - 일반 사용자(비로그인) 에게는 로그인 버튼 일체 노출 안 함
 * - 로그인된 사용자만 헤더 우상단에 이름·로그아웃 표시 (모든 페이지)
 * - 운영진 진입점은 비공개 URL `/admin1229` — 외부 NAV에 없음
 */
export function AuthStatusClient({ state }: { state: State }) {
  const pathname = usePathname();
  if (state.kind === 'guest') return null;
  // 로그인 사용자 — 어떤 페이지든 상태 표시
  void pathname;
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
