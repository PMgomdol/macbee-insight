import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthStatus } from '@/components/AuthStatus';
import { MobileNav } from '@/components/MobileNav';
import { HeaderSearch } from '@/components/HeaderSearch';
import { ThemeToggle } from '@/components/ThemeToggle';
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

// FOUC 방지 — 첫 페인트 전 저장된 테마 적용
const THEME_INIT = `
(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--fg)]">
        <header className="border-b border-[var(--border)] sticky top-0 bg-[var(--bg)] z-50 backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--bg)_85%,transparent)]">
          <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 flex items-center gap-2 sm:gap-4">
            <Link href="/" className="font-bold text-base sm:text-lg tracking-tight shrink-0 mr-1">
              맥비기획
            </Link>
            <nav className="hidden md:flex items-center gap-1 text-sm" aria-label="주요 메뉴">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="px-2.5 py-1.5 rounded-[var(--r-sm)] hover:bg-[var(--card)] text-[var(--muted)] hover:text-[var(--fg)] transition"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="flex-1 flex justify-end items-center gap-1.5 sm:gap-2">
              <Suspense fallback={null}><HeaderSearch /></Suspense>
              <ThemeToggle />
              <Suspense fallback={null}><AuthStatus /></Suspense>
              <MobileNav />
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8">
          {children}
        </main>
        <footer className="border-t border-[var(--border)] mt-6">
          <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5 text-xs text-[var(--muted)] flex flex-col sm:flex-row gap-1.5 sm:gap-4 justify-between">
            <div>© 2026 맥비기획 자료실 운영팀</div>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin" className="hover:text-[var(--fg)]">운영진</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
