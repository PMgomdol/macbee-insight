'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * 페이지 이동 중 상단 진행 바 — 라우터 트랜지션 시작/완료 감지.
 * Next 16 App Router의 pending 상태를 시각화. dead time 동안 사용자 피드백 0 문제 해결.
 */
export function NavProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);

  // 같은 origin <a>·<Link> 클릭 시 진행 시작
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest('a') as HTMLAnchorElement | null;
      if (!a) return;
      if (a.target === '_blank') return;
      if (a.hasAttribute('download')) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      try {
        const url = new URL(a.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      } catch { return; }
      setActive(true);
      setProgress(0);
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  // 진행 중 게이지 점진 증가 (실제 진행률 아님 — UX 피드백)
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setProgress((p) => (p < 90 ? p + (90 - p) * 0.15 : p));
    }, 100);
    return () => clearInterval(id);
  }, [active]);

  // pathname 바뀌면 완료
  useEffect(() => {
    if (!active) return;
    setProgress(100);
    const t = setTimeout(() => { setActive(false); setProgress(0); }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!active) return null;
  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 h-[2px] z-[60] pointer-events-none"
    >
      <div
        className="h-full bg-[var(--accent)] transition-[width] duration-100 ease-out shadow-[0_0_8px_var(--accent)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
