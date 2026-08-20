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
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3 app-card p-4 shadow-lg">
        <p className="text-[13px] text-[var(--muted)] leading-relaxed flex-1">
          방문 분석(구글 애널리틱스·PostHog)을 위해 쿠키를 사용해요. 동의하시면 서비스 개선에 도움이 돼요.{' '}
          <Link href="/privacy" className="underline text-[var(--fg)] hover:text-[var(--accent)]">
            개인정보처리방침
          </Link>
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setConsent('denied')}
            className="px-3 py-2 text-[13px] rounded-[var(--r-sm)] border border-[var(--border)] text-[var(--fg)] hover:bg-[var(--card)] transition"
          >
            거부
          </button>
          <button
            type="button"
            onClick={() => setConsent('granted')}
            className="px-4 py-2 text-[13px] font-medium rounded-[var(--r-sm)] bg-[var(--accent)] text-white hover:opacity-90 transition"
          >
            동의
          </button>
        </div>
      </div>
    </div>
  );
}
