'use client';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { getPosthog } from '@/lib/posthog';

/**
 * PostHog 사전 로드 + Next 16 App Router 라우트 전환 시 pageview 자동 캡처.
 * init은 lib/posthog.ts(getPosthog)가 보장 — 여기서는 idle 시점에 미리
 * 로드만 걸어두고(첫 이벤트 지연 최소화), 라우트별 $pageview를 캡처한다.
 */
export function AnalyticsProvider() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    const idle = (window as any).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 300));
    const id = idle(() => { getPosthog(); });
    return () => {
      const cancel = (window as any).cancelIdleCallback;
      if (cancel && typeof id !== 'object') cancel(id);
    };
  }, []);

  useEffect(() => {
    const p = getPosthog();
    if (!p) return;
    const url = pathname + (search?.toString() ? `?${search}` : '');
    p.then((ph) => {
      try { ph.capture('$pageview', { $current_url: url }); } catch {}
    });
  }, [pathname, search]);

  return null;
}
