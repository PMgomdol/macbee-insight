import { getPosthog } from './posthog';

/**
 * 클라이언트 사이드 이벤트 트래킹 헬퍼.
 * posthog-js는 lib/posthog.ts에서 dynamic import — 초기 번들에서 제거.
 * PostHog 미세팅 시 no-op. 이벤트명은 스네이크 케이스 통일.
 */
export type TrackEvent =
  | { name: 'search_submit'; props: { query: string; source: 'hero' | 'header' | 'page' } }
  | { name: 'search_results'; props: { query: string; count: number; fallback: 'chosung' | 'fuzzy' | 'none' } }
  | { name: 'search_result_click'; props: { query: string; position: number; kind: 'archive' | 'faq' } }
  | { name: 'card_click'; props: { id: number; kind: 'files' | 'insights'; category: string; from: string; action?: 'download' | 'external' | 'video' } }
  | { name: 'filter_change'; props: { type: 'category' | 'sub_category' | 'kind' | 'sort' | 'view'; value: string; page: string } }
  | { name: 'submit_start'; props: { mode: 'url' | 'file' } }
  | { name: 'submit_analyzed'; props: { mode: 'url' | 'file'; ai_used: boolean } }
  | { name: 'submit_manual_fallback'; props: { mode: 'url' | 'file' } }
  | { name: 'submit_success'; props: { mode: 'url' | 'file'; category: string } }
  | { name: 'feedback_open'; props: Record<string, never> }
  | { name: 'feedback_submit'; props: { kind: string } };

export function track<E extends TrackEvent>(event: E['name'], props: E['props']) {
  const p = getPosthog();
  if (!p) return;
  p.then((ph) => {
    try { ph.capture(event, props as Record<string, unknown>); } catch {}
  });
}
