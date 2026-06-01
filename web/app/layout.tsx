import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Search } from 'lucide-react';
import { AuthStatus } from '@/components/AuthStatus';
import { MobileNav } from '@/components/MobileNav';
import './globals.css';

export const metadata: Metadata = {
  title: '맥비기획 자료실',
  description: '기획자·PM·디자이너를 위한 자료실. 자료실·인사이트·FAQ를 한 곳에서.',
};

const NAV = [
  { href: '/', label: '홈' },
  { href: '/files', label: '자료실' },
  { href: '/insights', label: '인사이트' },
  { href: '/faq', label: 'FAQ' },
  { href: '/submit', label: '등록' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--fg)]">
        <header className="border-b border-[var(--border)] sticky top-0 bg-[var(--bg)]/85 backdrop-blur z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
            <Link href="/" className="font-bold text-base tracking-tight shrink-0">
              맥비기획 자료실
            </Link>
            <nav className="hidden sm:flex items-center gap-3 text-sm">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="px-2 py-1 rounded hover:bg-[var(--card)] text-[var(--muted)] hover:text-[var(--fg)] transition"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-1 sm:gap-2">
              <Link href="/search" className="p-2 rounded hover:bg-[var(--card)] text-[var(--muted)] hover:text-[var(--fg)] transition">
                <Search size={18} />
              </Link>
              <Suspense fallback={null}><AuthStatus /></Suspense>
              <MobileNav />
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-10">
          {children}
        </main>
        <footer className="border-t border-[var(--border)] mt-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 text-xs text-[var(--muted)] flex flex-col sm:flex-row gap-2 sm:gap-4 justify-between">
            <div>© 2026 맥비기획 자료실 운영팀</div>
            <div className="flex gap-3">
              <Link href="/admin" className="hover:text-[var(--fg)]">운영진</Link>
              <a
                href="https://script.google.com/macros/s/AKfycbx_X7ZhLbfXeJJllri3eqJBADelepPYoBGftsotm_64kmmU7X03y8qlSbBeiPMn_Ty1/exec"
                className="hover:text-[var(--fg)]"
                target="_blank"
                rel="noopener noreferrer"
              >
                레거시(Apps Script)
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
