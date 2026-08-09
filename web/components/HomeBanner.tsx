'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// openpath.kr 하단 배너 스타일: 라운드 다크 카드 + 좌측 뱃지/타이틀/서브 + 우측 일러스트
const SLIDES = [
  {
    href: '/submit',
    badge: 'SUGGEST',
    title: '좋은 자료를 알고 계신가요?',
    sub: '링크만 남겨주세요. 운영진이 검토 후 자료실에 등록해 드려요.',
    bg: '#1868DB',
    badgeColor: '#8FBFF8',
    art: (
      // 말풍선 + 플러스
      <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden>
        <rect x="18" y="26" width="84" height="56" rx="12" fill="rgba(255,255,255,0.92)" />
        <path d="M44 82l-8 14 22-14z" fill="rgba(255,255,255,0.92)" />
        <path d="M60 40v20M50 50h20" stroke="#1868DB" strokeWidth="7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/files',
    badge: 'TEMPLATE',
    title: '바로 쓰는 양식·템플릿',
    sub: 'PRD, 기획서, WBS, 정책서… 실무에서 검증된 문서로 시작하세요.',
    bg: '#1B1C1F',
    badgeColor: '#9BA0A8',
    art: (
      // 겹쳐 쌓인 문서
      <svg viewBox="0 0 120 120" className="w-full h-full" aria-hidden>
        <rect x="34" y="18" width="56" height="72" rx="6" fill="rgba(255,255,255,0.25)" transform="rotate(6 62 54)" />
        <rect x="30" y="22" width="56" height="72" rx="6" fill="rgba(255,255,255,0.92)" />
        <path d="M40 38h36M40 50h36M40 62h24" stroke="#1B1C1F" strokeWidth="5" strokeLinecap="round" />
      </svg>
    ),
  },
];

const INTERVAL = 5000;

export function HomeBanner() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused) return;
    timer.current = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), INTERVAL);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [paused]);

  const go = (i: number) => setIdx((i + SLIDES.length) % SLIDES.length);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="바로가기 배너"
      className="w-full relative group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="overflow-hidden rounded-xl">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {SLIDES.map((s, i) => (
            <Link
              key={s.href}
              href={s.href}
              tabIndex={i === idx ? 0 : -1}
              aria-hidden={i !== idx}
              className="w-full shrink-0 flex items-center justify-between gap-4 px-6 sm:px-12 py-7 sm:py-10 text-white"
              style={{ background: s.bg }}
            >
              <div className="flex flex-col items-start gap-2 sm:gap-2.5 min-w-0">
                <span
                  className="text-[10px] sm:text-[11px] font-bold tracking-[0.08em] px-2.5 py-1 rounded-full border"
                  style={{ color: s.badgeColor, borderColor: s.badgeColor }}
                >
                  {s.badge}
                </span>
                <strong className="text-lg sm:text-2xl font-bold tracking-tight leading-snug">
                  {s.title}
                </strong>
                <p className="text-xs sm:text-sm text-white/75 leading-relaxed">{s.sub}</p>
              </div>
              <div className="w-[72px] h-[72px] sm:w-[110px] sm:h-[110px] shrink-0" aria-hidden>
                {s.art}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 좌우 화살표 — 데스크톱 hover 시 노출 */}
      <button
        type="button"
        onClick={() => go(idx - 1)}
        aria-label="이전 배너"
        className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 items-center justify-center rounded-full bg-black/30 text-white opacity-0 group-hover:opacity-100 transition hover:bg-black/50"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={() => go(idx + 1)}
        aria-label="다음 배너"
        className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 items-center justify-center rounded-full bg-black/30 text-white opacity-0 group-hover:opacity-100 transition hover:bg-black/50"
      >
        <ChevronRight size={18} />
      </button>

      {/* 인디케이터 */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
        {SLIDES.map((s, i) => (
          <button
            key={s.href}
            type="button"
            onClick={() => go(i)}
            aria-label={`${i + 1}번 배너로 이동`}
            aria-current={i === idx}
            className={`h-1.5 rounded-full transition-all ${
              i === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
            }`}
          />
        ))}
      </div>
    </section>
  );
}
