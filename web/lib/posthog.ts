/**
 * PostHog SDK 지연 로더 + init 보장. posthog-js 는 ~200KB — 정적 import하면
 * 모든 페이지 초기 번들에 잡히니 dynamic import 로 필요 시점에만 로드.
 *
 * init을 여기서 수행하는 이유: posthog-js는 init 전에 capture하면 이벤트를
 * 조용히 버린다. 검색처럼 랜딩 직후 발생하는 이벤트가 AnalyticsProvider의
 * idle init보다 먼저 발화하면 전량 유실 (실제로 search_submit이 8일간 0건).
 * getPosthog()를 통과하면 항상 init 완료된 인스턴스를 받는다.
 */
let posthogPromise: Promise<any> | null = null;

export function getPosthog(): Promise<any> | null {
  if (typeof window === 'undefined') return null;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!posthogPromise) {
    posthogPromise = import('posthog-js').then((m) => {
      const ph = m.default;
      if (!ph.__loaded) {
        // api_host는 하드코딩: Vercel의 NEXT_PUBLIC_POSTHOG_HOST에 설정 페이지 URL이
        // 잘못 들어가 2026-07-13~18 수집이 전면 중단된 사고가 있었다. 수집 호스트는
        // 비밀값이 아니고 바뀔 일도 없으므로 env를 신뢰하지 않는다.
        ph.init(key, {
          api_host: 'https://us.i.posthog.com',
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
      }
      return ph;
    });
  }
  return posthogPromise;
}
