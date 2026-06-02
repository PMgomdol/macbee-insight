'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: '홈' },
  { href: '/files', label: '자료실' },
  { href: '/insights', label: '인사이트' },
  { href: '/faq', label: 'FAQ' },
  { href: '/submit', label: '등록' },
];

export function HeaderNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden sm:flex items-center gap-0.5 text-sm" aria-label="주요 메뉴">
      {NAV.map((n) => {
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
