import posthog from 'posthog-js';

/**
 * 클라이언트 사이드 이벤트 트래킹 헬퍼.
 * PostHog 미세팅 시 no-op. 이벤트명은 스네이크 케이스 통일.
 * KPI 지표에 맞춰 좁게 유지 — 무분별한 이벤트 지양.
 */
export type TrackEvent =
  | { name: 'search_submit'; props: { query: string; source: 'hero' | 'header' | 'page' } }
  | { name: 'search_result_click'; props: { query: string; position: number; kind: 'archive' | 'faq' } }
  | { name: 'card_click'; props: { id: number; kind: 'files' | 'insights'; category: string; from: string } }
  | { name: 'filter_change'; props: { type: 'category' | 'sub_category' | 'kind' | 'sort'; value: string; page: string } }
  | { name: 'submit_start'; props: { mode: 'url' | 'file' } }
  | { name: 'submit_analyzed'; props: { mode: 'url' | 'file'; ai_used: boolean } }
  | { name: 'submit_success'; props: { mode: 'url' | 'file'; category: string } }
  | { name: 'feedback_open'; props: Record<string, never> }
  | { name: 'feedback_submit'; props: { kind: string } };

export function track<E extends TrackEvent>(event: E['name'], props: E['props']) {
  if (typeof window === 'undefined') return;
  try {
    posthog.capture(event, props as Record<string, unknown>);
  } catch {}
}
