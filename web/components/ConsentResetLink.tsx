'use client';
import { resetConsent } from '@/lib/consent';

/** 푸터의 '쿠키 설정' — 클릭 시 동의 선택을 초기화해 배너를 다시 띄운다(동의 철회권). */
export function ConsentResetLink() {
  return (
    <button type="button" onClick={resetConsent} className="hover:text-white transition-colors">
      쿠키 설정
    </button>
  );
}
