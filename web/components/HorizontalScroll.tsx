'use client';
import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function HorizontalScroll({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; scrollLeft: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      setCanLeft(el.scrollLeft > 8);
      setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', update); ro.disconnect(); };
  }, []);

  function scroll(dir: 1 | -1) {
    if (!ref.current) return;
    const el = ref.current;
    // 카드 너비 추정: 첫 자식 width + gap (10px)
    const firstCard = el.querySelector<HTMLElement>('[data-card]');
    const cardW = firstCard ? firstCard.offsetWidth + 10 : 240;
    el.scrollBy({ left: dir * cardW * 2, behavior: 'smooth' });
  }

  // 마우스 드래그 스크롤 (PC) — 모바일은 native touch scroll
  function onMouseDown(e: React.MouseEvent) {
    if (!ref.current) return;
    setIsDragging(true);
    dragStart.current = { x: e.pageX, scrollLeft: ref.current.scrollLeft };
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging || !dragStart.current || !ref.current) return;
    e.preventDefault();
    const dx = e.pageX - dragStart.current.x;
    ref.current.scrollLeft = dragStart.current.scrollLeft - dx;
  }
  function endDrag() { setIsDragging(false); dragStart.current = null; }

  return (
    <div className="relative">
      <div
        ref={ref}
        className={`flex gap-2.5 overflow-x-auto no-scrollbar scroll-smooth pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 ${isDragging ? 'cursor-grabbing select-none' : 'sm:cursor-grab'}`}
        role="region"
        aria-label={label}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        style={{ WebkitOverflowScrolling: 'touch', scrollSnapType: 'none' }}
      >
        {children}
      </div>
      {canLeft && (
        <button
          type="button"
          onClick={() => scroll(-1)}
          className="hidden sm:flex absolute left-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[var(--bg)] border border-[var(--border)] shadow-md items-center justify-center hover:bg-[var(--card)] z-10"
          aria-label="이전"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      {canRight && (
        <button
          type="button"
          onClick={() => scroll(1)}
          className="hidden sm:flex absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[var(--bg)] border border-[var(--border)] shadow-md items-center justify-center hover:bg-[var(--card)] z-10"
          aria-label="다음"
        >
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  );
}
