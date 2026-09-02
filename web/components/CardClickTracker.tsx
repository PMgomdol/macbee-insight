'use client';
import { useEffect } from 'react';
import { track } from '@/lib/track';
import { isInAppBrowser } from '@/lib/in-app-browser';

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
        action: (target.dataset.cardAction as 'download' | 'external' | 'video' | 'preview') ?? 'external',
      });

      // 카톡 등 인앱 브라우저: target=_blank가 새 탭을 못 열고 같은 웹뷰를 교체해
      // 뒤로가기 시 목록이 아니라 앱(채팅)으로 빠져나간다. 같은 탭으로 이동시켜
      // 웹뷰 히스토리에 목록→상세를 쌓아 뒤로가기가 카드 페이지로 복귀하게 한다.
      // (평범한 좌클릭만; 미들클릭/보조클릭·데스크톱 새 탭은 그대로 둔다)
      if (
        e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey &&
        target instanceof HTMLAnchorElement && target.target === '_blank' &&
        isInAppBrowser(navigator.userAgent)
      ) {
        const href = target.href;
        if (href && !href.endsWith('#')) {
          e.preventDefault();
          window.location.assign(href);
        }
      }
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
