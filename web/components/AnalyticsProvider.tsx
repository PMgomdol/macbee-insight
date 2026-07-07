'use client';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { getPosthog } from '@/lib/posthog';

/**
 * PostHog 초기화 + Next 16 App Router 라우트 전환 시 pageview 자동 캡처.
 * posthog-js는 lib/posthog.ts의 dynamic import — 초기 JS 번들에서 제외.
 * requestIdleCallback으로 브라우저 유휴 시점에 init.
 */
export function AnalyticsProvider() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    const idle = (window as any).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 300));
    const id = idle(async () => {
      const ph = await getPosthog();
      if (!ph || ph.__loaded) return;
      ph.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        capture_pageview: false,
        capture_pageleave: true,
        persistence: 'localStorage+cookie',
        autocapture: {
          dom_event_allowlist: ['click', 'submit', 'change'],
        },
        loaded: (loaded: any) => {
          if (process.env.NODE_ENV === 'development') loaded.debug();
        },
      });
    });
    return () => {
      const cancel = (window as any).cancelIdleCallback;
      if (cancel && typeof id !== 'object') cancel(id);
    };
  }, []);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    const p = getPosthog();
    if (!p) return;
    const url = pathname + (search?.toString() ? `?${search}` : '');
    p.then((ph) => {
      try { ph.capture('$pageview', { $current_url: url }); } catch {}
    });
  }, [pathname, search]);

  return null;
}
