'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Coffee } from 'lucide-react';
import { EVENT, eventPromoVisible } from '@/lib/event';

/**
 * 홈 최상단 챌린지 배너 (맥비님 요청 11/12 — 등록 퍼널 개선).
 * 진한 초록 캠페인형(재찬 1안, 11/15): 연한 초록+파란 버튼은 성공 알림처럼 보이고 색이 충돌해서.
 * 초록 계열 = 등록 화면 이벤트 안내와 같은 이벤트 아이덴티티. 버튼은 진한 배경 대비 흰색.
 * 서버 HTML에 바로 그려 검색창이 밀려 내려가는 일이 없게 하고, 종료 후엔 브라우저에서 숨긴다.
 * 홈 위쪽 여백(pt-9/sm:pt-20)이 배너엔 과해서 음수 마진으로 당김 — 배너가 사라지면 원래 여백 그대로.
 */
export function EventHomeBanner() {
  const [show, setShow] = useState(true);
  useEffect(() => setShow(eventPromoVisible()), []);
  if (!show) return null;

  return (
    <section
      aria-label="자료 등록 챌린지"
      className="w-full max-w-2xl -mt-3 sm:-mt-12 flex items-center gap-3 sm:gap-5 p-4 sm:px-7 sm:py-6 rounded-[var(--r-lg)] bg-[#0B5323] text-white"
    >
      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        <span className="text-[11px] font-semibold tracking-[0.06em] text-[#A8DAB5]">EVENT · {EVENT.label}</span>
        <strong className="text-base sm:text-xl font-bold tracking-tight leading-snug">꿀 아티클·북마크 폭풍 등록 챌린지</strong>
        <span className="inline-flex w-fit items-center gap-1.5 mt-0.5 px-2.5 py-1 rounded-full bg-white/15 text-[12px] sm:text-[13px] font-semibold">
          <Coffee size={14} aria-hidden /> 1건만 올려도 커피 추첨
        </span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/banner/event.png" alt="" className="hidden sm:block w-20 h-20 object-contain shrink-0" />
      <div className="flex flex-col items-center gap-1 shrink-0">
        <Link
          href="/submit"
          data-cta="event-banner"
          className="inline-flex items-center min-h-11 px-4 rounded-[var(--r-md)] bg-white text-[#0B5323] text-sm font-bold hover:bg-[#E6F4EA] transition-colors"
        >
          자료 등록하기
        </Link>
        <a
          href={EVENT.url}
          target="_blank"
          rel="noopener noreferrer"
          className="py-1 text-[11px] text-white/70 underline underline-offset-2 hover:text-white"
        >
          시상 내역 보기
        </a>
      </div>
    </section>
  );
}
