'use client';
import { useEffect } from 'react';

/**
 * 카드 클릭(좌/중클릭) 시 fire-and-forget view ping.
 * ItemCard에 `data-card-id={item.id}` 부여 → 이 컴포넌트가 페이지 전역 위임 처리.
 * ItemCard마다 `'use client'` 하이드레이션하던 비용 제거.
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
