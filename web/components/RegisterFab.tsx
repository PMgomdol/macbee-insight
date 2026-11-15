'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus } from 'lucide-react';
import { eventPromoVisible } from '@/lib/event';

/**
 * 자료 등록 플로팅 버튼 — 챌린지 기간 동안 (맥비님 요청 11/12). '의견 보내기' 버튼(높이 40px) 바로 위.
 * 등록·운영진 화면에선 숨김. data-cta로 홈 배너 클릭과 구분해 집계(PostHog 자동수집).
 */
export function RegisterFab() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  useEffect(() => setShow(eventPromoVisible()), []);
  if (!show || pathname.startsWith('/submit') || pathname.startsWith('/admin-mb26')) return null;

  return (
    <Link
      href="/submit"
      data-cta="fab"
      style={{ bottom: 'calc(max(1.25rem, env(safe-area-inset-bottom)) + 3rem)' }}
      className="fixed z-40 right-5 sm:right-6 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[var(--accent)] text-white font-semibold text-sm shadow-[var(--shadow-8)] hover:bg-[var(--accent-hover)] transition"
    >
      <Plus size={16} aria-hidden />
      자료 등록하기
    </Link>
  );
}
