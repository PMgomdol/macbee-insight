'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { visibleNav } from '@/lib/nav';

export function HeaderNav({ isReviewer = false }: { isReviewer?: boolean }) {
  const pathname = usePathname();
  const items = visibleNav(isReviewer);
  return (
    <nav className="hidden sm:flex items-center gap-0.5 text-sm" aria-label="주요 메뉴">
      {items.map((n) => {
        const active = pathname === n.href || (n.href !== '/' && pathname.startsWith(n.href));
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? 'page' : undefined}
            className={`px-2.5 sm:px-3 py-1.5 rounded-[var(--r-sm)] font-medium transition ${
              active
                ? 'text-[var(--accent)] bg-[var(--accent-bg)]'
                : 'text-[var(--fg)] hover:bg-[var(--card)]'
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
