'use client';
import { FEEDBACK_OPEN_EVENT } from './FeedbackWidgetLoader';

/** 푸터의 '의견 보내기' — 떠 있는 의견 버튼이 숨은 동안(챌린지 기간)에도 의견 창을 열 수 있게. */
export function FeedbackOpenLink({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(FEEDBACK_OPEN_EVENT))} className={className}>
      의견 보내기
    </button>
  );
}
