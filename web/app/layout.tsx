import type { Metadata } from 'next';
import Link from 'next/link';
import Script from 'next/script';
import { Suspense } from 'react';
import { AuthStatus } from '@/components/AuthStatus';
import { MobileNavServer } from '@/components/MobileNavServer';
import { HeaderSearch } from '@/components/HeaderSearch';
import { HeaderNavServer } from '@/components/HeaderNavServer';
import { CardClickTracker } from '@/components/CardClickTracker';
import { NavProgress } from '@/components/NavProgress';
import { SiteFooter } from '@/components/SiteFooter';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';
import { FeedbackWidgetLoader } from '@/components/FeedbackWidgetLoader';
import { AtlaskitProvider } from '@/components/AtlaskitProvider';
import { Analytics as VercelAnalytics } from '@vercel/analytics/next';
import './globals.css';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: '맥비 자료실',
  description: '기획자에게 필요한 양식·템플릿과 아티클·영상·가이드 콘텐츠, 실무 Q&A를 한 곳에 모았어요.',
  // 카톡·슬랙 공유 미리보기 — 톡방 공유가 주 유입 경로라 필수
  openGraph: {
    title: '맥비 자료실',
    description: '기획자에게 필요한 양식·템플릿, 아티클·영상 콘텐츠, 실무 Q&A 596건을 한 곳에.',
    url: SITE_URL,
    siteName: '맥비 자료실',
    locale: 'ko_KR',
    type: 'website',
  },
};

// 외부 CSS 로드 전 FOUC 방지 — 초기 배경/글자색을 인라인으로 잡아둠.
const EARLY_STYLE = `
:root { background:#FFFFFF; color:#292A2E; }
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <style dangerouslySetInnerHTML={{ __html: EARLY_STYLE }} />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--fg)]">
        {/* GA4 — 유입 채널 분석용 (행동 이벤트는 PostHog 담당). 측정 ID는 공개 값이라 하드코딩 (env 오설정 사고 방지). */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-LT2K006JPF" strategy="afterInteractive" />
        <Script id="ga4-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-LT2K006JPF');
        `}</Script>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-2 focus:bg-[var(--accent)] focus:text-white focus:rounded-[var(--r-sm)]"
        >
          본문 바로가기
        </a>
        <AtlaskitProvider>
        <Suspense fallback={null}><AnalyticsProvider /></Suspense>
        <VercelAnalytics />
        <NavProgress />
        <CardClickTracker />
        <header className="border-b border-[var(--border)] sticky top-0 bg-[var(--bg)] z-50">
          <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="flex items-center gap-1 font-bold text-base sm:text-lg tracking-tight shrink-0 justify-self-start"
            >
              {/* 선반 M 심볼 — currentColor라 라이트/다크 자동 대응 */}
              <svg viewBox="0 0 64 64" className="w-[22px] h-[22px] shrink-0" aria-hidden fill="currentColor">
                <path d="M10 44V10h13l9 17 9-17h13v34H42V28l-7 13h-6l-7-13v16z" />
                <rect x="10" y="50" width="44" height="6" rx="2" />
              </svg>
              맥비 자료실
            </Link>
            <div className="flex justify-center">
              <Suspense fallback={null}><HeaderNavServer /></Suspense>
            </div>
            <div className="flex justify-end items-center gap-1.5 sm:gap-2">
              <Suspense fallback={null}><HeaderSearch /></Suspense>
              <Suspense fallback={null}><AuthStatus /></Suspense>
              <Suspense fallback={null}><MobileNavServer /></Suspense>
            </div>
          </div>
        </header>
        <main id="main" className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8">
          {children}
        </main>
        <SiteFooter />
        <FeedbackWidgetLoader />
        </AtlaskitProvider>
      </body>
    </html>
  );
}
