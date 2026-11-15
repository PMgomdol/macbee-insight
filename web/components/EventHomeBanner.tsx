'use client';
import { useEffect, useState } from 'react';
import { Coffee, ChevronRight } from 'lucide-react';
import { EVENT, eventPromoVisible } from '@/lib/event';

/**
 * 홈 최상단 챌린지 배너 (맥비님 요청 11/12).
 * 배너 = 링크 하나 (인프런·예스24 등 홈 배너 관례): 카드 전체를 누르면 이벤트 안내로. 안에 버튼·링크 여러 개 두지 않음.
 * 역할 분담: 배너는 '왜 참여할지'(이벤트 안내), 오른쪽 아래 [자료 등록하기] 버튼은 '바로 등록'.
 * 진한 초록 = 등록 화면 이벤트 안내와 같은 이벤트 아이덴티티. 연한 초록은 성공 알림처럼 보여서 안 씀.
 * 서버 HTML에 바로 그려 검색창이 밀려 내려가는 일이 없게 하고, 종료 후엔 브라우저에서 숨긴다.
 * 홈 위쪽 여백(pt-9/sm:pt-20)이 배너엔 과해서 음수 마진으로 당김 — 배너가 사라지면 원래 여백 그대로.
 */
export function EventHomeBanner() {
  const [show, setShow] = useState(true);
  useEffect(() => setShow(eventPromoVisible()), []);
  if (!show) return null;

  return (
    <a
      href={EVENT.url}
      target="_blank"
      rel="noopener noreferrer"
      data-cta="event-banner"
      aria-label={`꿀 아티클·북마크 폭풍 등록 챌린지 ${EVENT.label} — 1건만 올려도 커피 추첨, 이벤트 안내 보기`}
      className="w-full max-w-2xl -mt-3 sm:-mt-12 flex items-center gap-3 pl-5 pr-3 py-4 sm:pl-8 sm:pr-8 sm:py-5 rounded-[var(--r-lg)] bg-[#0B5323] text-white hover:bg-[#0E5E28] transition-colors"
    >
      <div className="flex flex-col items-start gap-2 min-w-0 flex-1">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--r-sm)] bg-white text-[#0B5323] text-[11px] sm:text-xs font-bold">
          <Coffee size={12} aria-hidden /> 1건만 올려도 커피 추첨
        </span>
        <strong className="text-[19px] sm:text-2xl font-bold tracking-tight leading-[1.25]">
          꿀 아티클·북마크
          {/* 모바일만 두 줄 — PC는 폭이 넉넉해 한 줄 */}
          <br className="sm:hidden" />{' '}
          <span className="text-[#8FE0A8]">폭풍 등록 챌린지</span>
        </strong>
        <span className="inline-flex items-center gap-0.5 text-[11px] sm:text-xs text-white/70">
          {EVENT.label} · 이벤트 안내 <ChevronRight size={12} aria-hidden />
        </span>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/banner/event.png" alt="" className="w-[88px] h-[88px] sm:w-24 sm:h-24 object-contain shrink-0" />
    </a>
  );
}
