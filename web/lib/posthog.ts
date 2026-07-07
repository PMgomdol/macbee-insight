/**
 * PostHog SDK 지연 로더. posthog-js 는 ~200KB — 정적 import하면 모든 페이지
 * 초기 번들에 잡히니 dynamic import 로 브라우저 idle 시점에만 로드.
 * getPosthog()는 캐시된 Promise를 반환 — 여러 콜러가 같은 인스턴스를 공유.
 */
let posthogPromise: Promise<any> | null = null;

export function getPosthog(): Promise<any> | null {
  if (typeof window === 'undefined') return null;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return null;
  if (!posthogPromise) {
    posthogPromise = import('posthog-js').then((m) => m.default);
  }
  return posthogPromise;
}
