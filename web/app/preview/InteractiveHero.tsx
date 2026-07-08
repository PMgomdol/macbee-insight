'use client';
import { useRef, useState, useEffect } from 'react';

/**
 * 검색 히어로 인터랙티브 배경.
 * - 정적 base gradient (다크모드 대응, CSS var)
 * - 마우스 위치 따라 이동하는 radial glow (desktop only)
 * - subtle dot pattern overlay
 */
export function InteractiveHero({ children }: { children: React.ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 40 });
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(window.matchMedia('(hover: none)').matches);
  }, []);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (isTouch) return;
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }

  return (
    <section
      ref={wrapRef}
      onMouseMove={onMove}
      aria-label="자료 검색"
      className="relative w-full overflow-hidden rounded-[var(--r-lg)] py-14 sm:py-20 px-4 sm:px-6"
      style={{
        background: `
          radial-gradient(ellipse 80% 60% at 50% 0%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 60%),
          radial-gradient(ellipse 70% 50% at 20% 100%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 55%),
          radial-gradient(ellipse 60% 45% at 90% 90%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 55%),
          var(--card)
        `,
      }}
    >
      {/* 마우스 follow glow — desktop only */}
      {!isTouch && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-[background] duration-150"
          style={{
            background: `radial-gradient(circle 320px at ${pos.x}% ${pos.y}%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 60%)`,
          }}
        />
      )}

      {/* dot pattern */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage: `radial-gradient(circle, var(--muted-2) 0.9px, transparent 1px)`,
          backgroundSize: '22px 22px',
          maskImage:
            'radial-gradient(ellipse 70% 55% at 50% 45%, black, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 70% 55% at 50% 45%, black, transparent 75%)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-5 sm:gap-6 max-w-2xl mx-auto">
        {children}
      </div>
    </section>
  );
}
