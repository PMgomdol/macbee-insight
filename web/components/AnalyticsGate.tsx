'use client';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import { getConsent, CONSENT_EVENT } from '@/lib/consent';
import { AnalyticsProvider } from './AnalyticsProvider';

/**
 * 쿠키 동의('granted') 이후에만 GA4 + PostHog를 로드한다.
 * 동의 전에는 아무것도 렌더 안 함(추적 스크립트/쿠키 없음).
 * 동의 시 CONSENT_EVENT로 즉시 반영. (Vercel Analytics는 쿠키리스라 layout에서 상시 로드)
 */
export function AnalyticsGate() {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    const sync = () => setGranted(getConsent() === 'granted');
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  if (!granted) return null;

  return (
    <>
      {/* GA4 — 유입 채널 분석 (측정 ID는 공개 값이라 하드코딩) */}
      <Script src="https://www.googletagmanager.com/gtag/js?id=G-LT2K006JPF" strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-LT2K006JPF');
      `}</Script>
      {/* PostHog(행동 이벤트) 로드 + 라우트별 pageview */}
      <AnalyticsProvider />
    </>
  );
}
