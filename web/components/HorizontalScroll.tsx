'use client';
import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function HorizontalScroll({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);

  function scroll(dir: 1 | -1) {
    if (!ref.current) return;
    const w = ref.current.clientWidth;
    ref.current.scrollBy({ left: dir * w * 0.8, behavior: 'smooth' });
  }

  return (
    <div className="relative group">
      <div
        ref={ref}
        className="flex gap-2.5 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-pl-3 sm:scroll-pl-0 -mx-3 px-3 sm:mx-0 sm:px-0 pb-1"
        role="region"
        aria-label={label}
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => scroll(-1)}
        className="hidden sm:flex absolute left-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[var(--bg)] border border-[var(--border)] shadow items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-[var(--card)]"
        aria-label="이전"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={() => scroll(1)}
        className="hidden sm:flex absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[var(--bg)] border border-[var(--border)] shadow items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-[var(--card)]"
        aria-label="다음"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
