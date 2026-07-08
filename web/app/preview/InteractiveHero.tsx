/**
 * 검색 히어로 배경 wrapper — 정적 gradient + dot pattern.
 * 섹션 구분용. 마우스 인터랙션 없음.
 */
export function InteractiveHero({ children }: { children: React.ReactNode }) {
  return (
    <section
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
