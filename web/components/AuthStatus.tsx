import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export async function AuthStatus() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();

  if (!user) {
    return (
      <Link href="/login" className="text-sm px-3 py-1.5 rounded border border-[var(--border)] hover:bg-[var(--card)]">
        로그인
      </Link>
    );
  }

  const { data: prof } = await sb.from('profile').select('display_name, role').eq('id', user.id).maybeSingle();
  const name = prof?.display_name ?? user.email?.split('@')[0] ?? '?';
  const isReviewer = prof?.role === 'reviewer' || prof?.role === 'admin';

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-[var(--muted)]">
        {name} {isReviewer && <span className="text-[var(--accent)]">·운영진</span>}
      </span>
      <form action="/auth/signout" method="post">
        <button type="submit" className="px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--card)] text-[var(--muted)]">
          로그아웃
        </button>
      </form>
    </div>
  );
}
