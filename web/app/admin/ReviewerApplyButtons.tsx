'use client';
import { useState } from 'react';
import { approveReviewer, rejectReviewer } from '../admin1229/actions';

export function ReviewerApplyButtons({ profileId }: { profileId: string }) {
  const [loading, setLoading] = useState(false);

  async function onApprove() {
    if (!confirm('운영진으로 승인합니다. 진행할까요?')) return;
    setLoading(true);
    const r = await approveReviewer(profileId);
    if (!r.ok) alert('실패: ' + r.error);
    setLoading(false);
  }

  async function onReject() {
    const reason = window.prompt('거절 사유 (선택):') ?? '';
    if (!confirm('운영진 신청을 거절합니다. 진행할까요?')) return;
    setLoading(true);
    const r = await rejectReviewer(profileId, reason);
    if (!r.ok) alert('실패: ' + r.error);
    setLoading(false);
  }

  return (
    <div className="flex gap-1.5 mt-1">
      <button onClick={onApprove} disabled={loading} className="fc-btn fc-btn-primary px-3 py-1.5 text-xs">
        {loading ? '처리 중...' : '승인'}
      </button>
      <button onClick={onReject} disabled={loading} className="fc-btn fc-btn-subtle px-3 py-1.5 text-xs">
        거절
      </button>
    </div>
  );
}
