import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthStatus } from '@/components/AuthStatus';
import { MobileNavServer } from '@/components/MobileNavServer';
import { HeaderSearch } from '@/components/HeaderSearch';
import { HeaderNavServer } from '@/components/HeaderNavServer';
import { CardClickTracker } from '@/components/CardClickTracker';
import { NavProgress } from '@/components/NavProgress';
import { SiteFooter } from '@/components/SiteFooter';
import { AnalyticsGate } from '@/components/AnalyticsGate';
import { ConsentBanner } from '@/components/ConsentBanner';
import { FeedbackWidgetLoader } from '@/components/FeedbackWidgetLoader';
import { AtlaskitProvider } from '@/components/AtlaskitProvider';
import './globals.css';
import { SITE_URL } from '@/lib/site';

// Pretendard 변수폰트 셀프호스팅 — CDN(jsdelivr) 의존/렌더블로킹 제거.
// display:swap → 폰트 로드 전 시스템 폰트로 즉시 렌더, 로드되면 교체.
const pretendard = localFont({
  src: './fonts/PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
  variable: '--font-pretendard',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // default = 홈 절대 title(템플릿 안 탐). 하위 페이지는 각자 title만 주면 '%s | 맥비 자료실'로.
  title: {
    default: '맥비 자료실 | 기획자 실무 자료·템플릿 모음',
    template: '%s | 맥비 자료실',
  },
  description:
    '서비스 기획자·PM을 위한 실무 자료실. 화면설계서·기획서 양식부터 UX·IA 아티클, 실무 Q&A까지 현직 기획자들이 모아 정리한 자료를 검색해 보세요.',
  // Google Search Console 소유권 확인 (HTML 태그 방식) → <head>에 meta 렌더
  verification: { google: 'dfXxCDr107K4DJR_dCCIe7aWRvKAJup_fLAZKYk1keE' },
  // ⛔ 정식 오픈 전 검색 차단 — 전 페이지 noindex. 오픈 시 이 robots 줄만 삭제하면 색인 재개.
  robots: { index: false, follow: false },
  // 카톡·슬랙 공유 미리보기 — 톡방 공유가 주 유입 경로라 필수. (건수는 바뀌므로 넣지 않음)
  openGraph: {
    title: '맥비 자료실 | 기획자 실무 자료·템플릿 모음',
    description: '서비스 기획자·PM을 위한 실무 자료실 — 화면설계서·기획서 양식, UX·IA 아티클, 실무 Q&A를 한 곳에.',
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
    <html lang="ko" className={`h-full antialiased ${pretendard.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: EARLY_STYLE }} />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--fg)]">
        {/* GA4·PostHog는 쿠키 동의 후에만 로드 (AnalyticsGate). 동의 배너는 ConsentBanner. */}
        <Suspense fallback={null}><AnalyticsGate /></Suspense>
        <ConsentBanner />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-3 focus:py-2 focus:bg-[var(--accent)] focus:text-white focus:rounded-[var(--r-sm)]"
        >
          본문 바로가기
        </a>
        <AtlaskitProvider>
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
