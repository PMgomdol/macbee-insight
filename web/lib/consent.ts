// 분석 쿠키 동의 상태 (개인정보보호법 — 행동분석 쿠키 사전동의).
// 'granted' 전에는 GA·PostHog(쿠키/로컬스토리지 사용)를 로드하지 않는다.
// Vercel Analytics는 쿠키리스라 동의 대상 아님(항상 동작).
export type Consent = 'granted' | 'denied';

const KEY = 'analytics_consent';
export const CONSENT_EVENT = 'macbe:consentchange';

export function getConsent(): Consent | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(v: Consent): void {
  try {
    localStorage.setItem(KEY, v);
  } catch {}
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

// 동의 철회/재선택 — 저장값을 지워 배너를 다시 띄운다(PIPA 동의철회권).
export function resetConsent(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

export function hasConsent(): boolean {
  return getConsent() === 'granted';
}
