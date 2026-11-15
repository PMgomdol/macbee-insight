'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus } from 'lucide-react';
import { eventPromoVisible } from '@/lib/event';

/**
 * 자료 등록 버튼이 떠 있는 화면인가 — 챌린지 기간 + 등록·운영진 화면 제외.
 * 떠 있는 버튼은 한 화면에 하나: 이 버튼이 뜨는 동안 '의견 보내기'는 숨기고 푸터 링크로 연다(재찬 B안, 11/15).
 * 초기값 true — 서버 HTML에 바로 그려 버튼이 바뀌며 깜빡이지 않게. 종료 후엔 브라우저에서 꺼짐.
 */
export function useRegisterFabShown() {
  const pathname = usePathname();
  const [live, setLive] = useState(true);
  useEffect(() => setLive(eventPromoVisible()), []);
  return live && !pathname.startsWith('/submit') && !pathname.startsWith('/admin-mb26');
}

/** 자료 등록 플로팅 버튼 — 챌린지 기간 동안 (맥비님 요청 11/12). data-cta로 홈 배너 클릭과 구분해 집계. */
export function RegisterFab() {
  if (!useRegisterFabShown()) return null;
  return (
    <Link
      href="/submit"
      data-cta="fab"
      style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
      className="fixed z-40 right-5 sm:right-6 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[var(--accent)] text-white font-semibold text-sm shadow-[var(--shadow-8)] hover:bg-[var(--accent-hover)] transition"
    >
      <Plus size={16} aria-hidden />
      자료 등록하기
    </Link>
  );
}
