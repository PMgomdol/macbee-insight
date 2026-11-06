'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getConsent, setConsent, CONSENT_EVENT } from '@/lib/consent';

/**
 * 분석 쿠키 사전동의 배너 (개인정보보호법). 결정 전에는 GA·PostHog가 로드되지 않는다.
 * 하단 고정, 비침습(본문 가리지 않음). 동의/거부 선택은 localStorage에 저장.
 * 푸터의 '쿠키 설정'으로 재선택 가능(resetConsent → 배너 재노출).
 */
export function ConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const sync = () => setShow(getConsent() === null);
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="쿠키 사용 동의"
      className="fixed inset-x-0 bottom-0 z-[90] p-3 sm:p-4"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      {/* 모바일: 짧은 문구 + 버튼 한 줄 (첫 화면을 덜 가리게). 버튼은 손가락 터치 영역 44px. */}
      <div className="max-w-3xl mx-auto flex items-center gap-2 sm:gap-3 app-card p-3 sm:p-4 shadow-lg">
        <p className="text-[13px] text-[var(--muted)] leading-snug sm:leading-relaxed flex-1">
          <span className="sm:hidden">더 나은 자료실을 위해 방문 분석에 쿠키를 써요.</span>
          <span className="hidden sm:inline">
            더 나은 자료실을 만들기 위해 방문 분석에 쿠키를 사용해요. 동의해주시면 어떤 자료가 도움이 되는지 파악해 서비스를 개선하는 데 큰 힘이 돼요.
          </span>{' '}
          <Link href="/privacy" className="underline text-[var(--fg)] hover:text-[var(--accent)]">
            자세히
          </Link>
        </p>
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setConsent('denied')}
            className="min-h-11 px-2 sm:min-h-0 sm:px-0 text-[13px] text-[var(--muted)] hover:text-[var(--fg)] underline underline-offset-2 transition"
          >
            거부
          </button>
          <button
            type="button"
            onClick={() => setConsent('granted')}
            className="min-h-11 sm:min-h-0 px-4 sm:px-5 py-2 text-[13px] font-semibold rounded-[var(--r-sm)] bg-[var(--accent)] text-white hover:opacity-90 transition"
          >
            <span className="sm:hidden">동의하기</span>
            <span className="hidden sm:inline">동의하고 개선 돕기</span>
          </button>
        </div>
      </div>
    </div>
  );
}
