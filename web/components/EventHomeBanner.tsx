'use client';
import { useEffect, useState } from 'react';
import { UILinkButton } from '@/components/ui/Button';
import { EVENT, eventPromoVisible } from '@/lib/event';

/**
 * 홈 최상단 챌린지 배너 (맥비님 요청 11/12 — 등록 퍼널 개선).
 * 서버 HTML에 바로 그려 검색창이 밀려 내려가는 일이 없게 하고, 종료 후엔 브라우저에서 숨긴다.
 * 홈 위쪽 여백(pt-9/sm:pt-20)이 배너엔 과해서 음수 마진으로 당김 — 배너가 사라지면 원래 여백 그대로.
 * '자료 등록하기'는 플로팅 버튼과 같은 모양(같은 동작) — 바로 등록 화면으로.
 */
export function EventHomeBanner() {
  const [show, setShow] = useState(true);
  useEffect(() => setShow(eventPromoVisible()), []);
  if (!show) return null;

  return (
    <section
      aria-label="자료 등록 챌린지"
      className="w-full max-w-2xl -mt-3 sm:-mt-12 flex items-center gap-3 sm:gap-4 p-4 sm:px-6 sm:py-5 rounded-[var(--r-lg)] bg-[#E6F4EA] text-[#0B5323]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/banner/event.png" alt="" className="hidden sm:block w-16 h-16 object-contain shrink-0" />
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <span className="text-[10px] font-semibold tracking-[0.08em] text-[#1E8E3E]">EVENT · {EVENT.label}</span>
        <strong className="text-[15px] sm:text-lg font-bold tracking-tight leading-snug">자료 1건만 올려도 커피 추첨</strong>
        <a
          href={EVENT.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-fit py-0.5 text-xs underline underline-offset-2 opacity-80 hover:opacity-100"
        >
          참여 방법·시상 보기
        </a>
      </div>
      <UILinkButton href="/submit" data-cta="event-banner" className="shrink-0 min-h-11 font-semibold">
        자료 등록하기
      </UILinkButton>
    </section>
  );
}
