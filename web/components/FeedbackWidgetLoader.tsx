'use client';
import { useEffect, useState, Suspense, lazy } from 'react';
import { MessageCircle } from 'lucide-react';

const FeedbackWidgetLazy = lazy(() =>
  import('./FeedbackWidget').then((m) => ({ default: m.FeedbackWidget }))
);

/**
 * FeedbackWidget는 @atlaskit/textfield·textarea·button 을 끌어와서 무겁다.
 * FAB만 먼저 렌더하고, 사용자가 FAB를 실제로 볼 준비가 되면 그때 위젯을 프리페치.
 * requestIdleCallback으로 유휴 시간에 로드 → 모든 페이지의 첫 화면 JS 부담 감소.
 */
export function FeedbackWidgetLoader() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const idle = (window as any).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1500));
    const id = idle(() => setReady(true));
    return () => {
      const cancel = (window as any).cancelIdleCallback;
      if (cancel && typeof id !== 'object') cancel(id);
    };
  }, []);

  if (!ready) {
    // 초기 스켈레톤 FAB (실 위젯과 동일 위치·크기, 아이콘만)
    return (
      <button
        type="button"
        aria-label="의견 보내기"
        onClick={() => setReady(true)}
        className="fixed z-40 bottom-5 right-5 sm:bottom-6 sm:right-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--accent)] text-white font-semibold text-sm shadow-[var(--shadow-8)] hover:bg-[var(--accent-hover)] transition"
      >
        <MessageCircle size={16} aria-hidden />
        의견 보내기
      </button>
    );
  }

  return (
    <Suspense fallback={null}>
      <FeedbackWidgetLazy />
    </Suspense>
  );
}
