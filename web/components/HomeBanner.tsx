'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// 파스텔 배너 (인프런풍): 연한 배경 50 + 진한 텍스트 900 + 중간 뱃지 500 — 단계별 톤 스케일
// Blue:   50 #E9F2FF · 500 #1868DB · 900 #09326C
// Yellow: 50 #FFF7D6 · 500 #946F00 · 900 #533F04
type Slide = {
  href: string; badge: string; title: string; sub: string;
  bg: string; fg: string; badgeColor: string;
  img?: string; art?: React.ReactNode;
};
const SLIDES: Slide[] = [
  {
    href: '/submit',
    badge: 'SUGGEST',
    title: '좋은 자료를 알고 계신가요?',
    sub: '링크만 남겨주세요. 운영진이 검토 후 자료실에 등록해 드려요.',
    bg: '#E9F2FF',
    fg: '#09326C',
    badgeColor: '#1868DB',
    img: '/banner/suggest.png',
  },
  {
    href: '/files',
    badge: 'TEMPLATE',
    title: '바로 쓰는 양식·템플릿',
    sub: 'PRD, 기획서, WBS, 정책서… 실무에서 검증된 문서로 시작하세요.',
    bg: '#FFF7D6',
    fg: '#533F04',
    badgeColor: '#946F00',
    img: '/banner/template.png',
  },
];

const INTERVAL = 5000;

export function HomeBanner() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  // 재개 시점마다 증가 — 진행 바 애니메이션과 타이머를 함께 리셋해 항상 동기 유지
  const [epoch, setEpoch] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (paused) return;
    timer.current = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), INTERVAL);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [paused, idx, epoch]);

  const go = (i: number) => setIdx((i + SLIDES.length) % SLIDES.length);
  const resume = () => { setPaused(false); setEpoch((e) => e + 1); };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="바로가기 배너"
      className="w-full relative group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={resume}
      onFocus={() => setPaused(true)}
      onBlur={resume}
    >
      <div className="overflow-hidden rounded-xl relative">
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
              className="w-full shrink-0 flex items-center justify-between gap-4 px-6 sm:px-12 py-7 sm:py-10"
              style={{ background: s.bg, color: s.fg }}
            >
              <div className="flex flex-col items-start gap-2 sm:gap-2.5 min-w-0">
                <span
                  className="text-[9px] sm:text-[10px] font-semibold tracking-[0.08em] px-2 py-0.5 rounded-full border"
                  style={{ color: s.badgeColor, borderColor: s.badgeColor }}
                >
                  {s.badge}
                </span>
                <strong className="text-lg sm:text-2xl font-bold tracking-tight leading-snug">
                  {s.title}
                </strong>
                <p className="text-xs sm:text-sm opacity-70 leading-relaxed">{s.sub}</p>
              </div>
              <div className="w-[84px] h-[84px] sm:w-[120px] sm:h-[120px] shrink-0" aria-hidden>
                {s.img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.img} alt="" className="w-full h-full object-contain" />
                ) : (
                  s.art
                )}
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
        className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 items-center justify-center rounded-full bg-black/15 text-black/70 opacity-0 group-hover:opacity-100 transition hover:bg-black/30"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={() => go(idx + 1)}
        aria-label="다음 배너"
        className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 items-center justify-center rounded-full bg-black/15 text-black/70 opacity-0 group-hover:opacity-100 transition hover:bg-black/30"
      >
        <ChevronRight size={18} />
      </button>

      {/* 게이지 도트 — 활성 도트가 필로 늘어나고 안에 남은 시간 게이지가 채워짐 (위치+시간+이동 통합) */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {SLIDES.map((s, i) => (
          <button
            key={s.href}
            type="button"
            onClick={() => go(i)}
            aria-label={`${i + 1}번 배너로 이동`}
            aria-current={i === idx}
            className={`h-1.5 rounded-full transition-all overflow-hidden ${
              i === idx ? 'w-8 bg-black/15' : 'w-1.5 bg-black/20 hover:bg-black/40'
            }`}
          >
            {i === idx && (
              <span
                key={`${idx}-${epoch}`}
                className="block h-full bg-black/60 rounded-full"
                style={{
                  animation: `banner-progress ${INTERVAL}ms linear forwards`,
                  animationPlayState: paused ? 'paused' : 'running',
                }}
              />
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
