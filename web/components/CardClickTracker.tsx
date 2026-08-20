'use client';
import { useEffect } from 'react';
import { track } from '@/lib/track';

/**
 * 카드 클릭(좌/중클릭) 시:
 *   1. /api/view ping (일 UV 카운트 + view_event 로그)
 *   2. PostHog 'card_click' 이벤트 (카테고리·kind·출처 페이지 함께)
 * ItemCard마다 'use client' 하이드레이션 없이 페이지 전역 위임.
 */
export function CardClickTracker() {
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (e.button !== 0 && e.button !== 1) return;
      const target = (e.target as HTMLElement | null)?.closest('[data-card-id]') as HTMLElement | null;
      if (!target) return;
      const idStr = target.dataset.cardId;
      if (!idStr) return;
      const id = Number(idStr);
      if (!Number.isFinite(id)) return;
      // 자료 조회수 ping
      try {
        const body = JSON.stringify({ id });
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/view', new Blob([body], { type: 'application/json' }));
        } else {
          fetch('/api/view', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true,
          });
        }
      } catch {}
      // PostHog 이벤트
      track('card_click', {
        id,
        kind: (target.dataset.cardKind as 'files' | 'insights') ?? 'insights',
        category: target.dataset.cardCategory ?? '',
        from: window.location.pathname,
        action: (target.dataset.cardAction as 'download' | 'external' | 'video') ?? 'external',
      });
    }
    document.addEventListener('click', handler);
    document.addEventListener('auxclick', handler as EventListener);
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('auxclick', handler as EventListener);
    };
  }, []);
  return null;
}
