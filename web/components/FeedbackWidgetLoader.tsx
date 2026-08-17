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

  // 스켈레톤 FAB — 실 위젯 FAB와 동일 위치·크기·스타일. ready 전과 청크 로딩 중(Suspense
  // fallback) 둘 다에 써서, 실 위젯으로 교체될 때 사라지는 틈(깜빡임)이 없게 한다.
  const fab = (
    <button
      type="button"
      aria-label="의견 보내기"
      onClick={() => setReady(true)}
      style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      className="fixed z-40 right-5 sm:bottom-6 sm:right-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--accent)] text-white font-semibold text-sm shadow-[var(--shadow-8)] hover:bg-[var(--accent-hover)] transition"
    >
      <MessageCircle size={16} aria-hidden />
      의견 보내기
    </button>
  );

  if (!ready) return fab;

  return (
    <Suspense fallback={fab}>
      <FeedbackWidgetLazy />
    </Suspense>
  );
}
