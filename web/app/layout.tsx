import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthStatus } from '@/components/AuthStatus';
import { MobileNavServer } from '@/components/MobileNavServer';
import { HeaderSearch } from '@/components/HeaderSearch';
import { HeaderNavServer } from '@/components/HeaderNavServer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { CardClickTracker } from '@/components/CardClickTracker';
import { NavProgress } from '@/components/NavProgress';
import { SiteFooter } from '@/components/SiteFooter';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';
import { FeedbackWidgetLoader } from '@/components/FeedbackWidgetLoader';
import { AtlaskitProvider } from '@/components/AtlaskitProvider';
import { Analytics as VercelAnalytics } from '@vercel/analytics/next';
import './globals.css';

export const metadata: Metadata = {
  title: '맥비기획 자료실',
  description: '기획자에게 필요한 양식·템플릿·아티클·영상·실무 Q&A를 한 곳에 모았어요.',
};

const THEME_INIT = `
(function(){
  var t = 'light';
  try {
    var s = localStorage.getItem('theme');
    if (s === 'dark' || s === 'light') t = s;
  } catch(e) {}
  document.documentElement.setAttribute('data-theme', t);
})();
`;

// 외부 CSS 로드 전 FOUC 방지 — 초기 배경/글자색을 인라인으로 잡아둠.
const EARLY_STYLE = `
:root { background:#FFFFFF; color:#292A2E; }
:root[data-theme="dark"] { background:#1F1F21; color:#CECFD2; }
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <style dangerouslySetInnerHTML={{ __html: EARLY_STYLE }} />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--fg)]">
        <AtlaskitProvider>
        <Suspense fallback={null}><AnalyticsProvider /></Suspense>
        <VercelAnalytics />
        <NavProgress />
        <CardClickTracker />
        <header className="border-b border-[var(--border)] sticky top-0 bg-[var(--bg)] z-50">
          <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
            <Link href="/" className="font-bold text-base sm:text-lg tracking-tight shrink-0 justify-self-start">
              맥비기획 자료실
            </Link>
            <div className="flex justify-center">
              <Suspense fallback={null}><HeaderNavServer /></Suspense>
            </div>
            <div className="flex justify-end items-center gap-1.5 sm:gap-2">
              <Suspense fallback={null}><HeaderSearch /></Suspense>
              <ThemeToggle />
              <Suspense fallback={null}><AuthStatus /></Suspense>
              <Suspense fallback={null}><MobileNavServer /></Suspense>
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8">
          {children}
        </main>
        <SiteFooter />
        <FeedbackWidgetLoader />
        </AtlaskitProvider>
      </body>
    </html>
  );
}
