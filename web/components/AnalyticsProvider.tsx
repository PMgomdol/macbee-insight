'use client';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';

/**
 * PostHog 초기화 + Next 16 App Router 라우트 전환 시 pageview 자동 캡처.
 * 환경변수 없거나 dev면 no-op.
 */
export function AnalyticsProvider() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    if (posthog.__loaded) return;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      capture_pageview: false, // 수동 캡처 (App Router라우팅 감지 X)
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
      autocapture: {
        dom_event_allowlist: ['click', 'submit', 'change'],
      },
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') ph.debug();
      },
    });
  }, []);

  // App Router pageview — pathname/search 변할 때마다
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    const url = pathname + (search?.toString() ? `?${search}` : '');
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, search]);

  return null;
}
