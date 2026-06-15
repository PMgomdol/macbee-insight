'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approveReviewer, rejectReviewer } from '../admin1229/actions';

export function ReviewerApplyButtons({ profileId, isSelf = false }: { profileId: string; isSelf?: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (isSelf) {
    return <p className="text-[11px] text-[var(--muted-2)] mt-1">본인 신청은 다른 운영진이 처리합니다.</p>;
  }

  function onApprove() {
    if (!confirm('운영진으로 승인합니다. 진행할까요?')) return;
    startTransition(async () => {
      const r = await approveReviewer(profileId);
      if (!r.ok) alert('실패: ' + r.error);
      else router.refresh();
    });
  }

  function onReject() {
    const reason = window.prompt('거절 사유 (선택):') ?? '';
    if (!confirm('운영진 신청을 거절합니다. 진행할까요?')) return;
    startTransition(async () => {
      const r = await rejectReviewer(profileId, reason);
      if (!r.ok) alert('실패: ' + r.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex gap-1.5 mt-1">
      <button onClick={onApprove} disabled={pending} className="fc-btn fc-btn-primary px-3 py-1.5 text-xs">
        {pending ? '처리 중...' : '승인'}
      </button>
      <button onClick={onReject} disabled={pending} className="fc-btn fc-btn-subtle px-3 py-1.5 text-xs">
        거절
      </button>
    </div>
  );
}
