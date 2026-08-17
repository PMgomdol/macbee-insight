'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UIButton } from '@/components/ui/Button';
import { approveReviewer, rejectReviewer } from '../actions';

export function ReviewerApplyButtons({ profileId, isSelf = false }: { profileId: string; isSelf?: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (isSelf) {
    return <p className="text-[11px] text-[var(--muted-2)] mt-1">본인 신청은 다른 운영진이 처리해요.</p>;
  }

  function onApprove() {
    if (!confirm('운영진으로 승인할게요. 계속할까요?')) return;
    startTransition(async () => {
      const r = await approveReviewer(profileId);
      if (!r.ok) alert('승인하지 못했어요 — ' + r.error);
      else router.refresh();
    });
  }

  function onReject() {
    const reason = window.prompt('거절 사유를 적어주세요 (선택):') ?? '';
    if (!confirm('운영진 신청을 거절할게요. 계속할까요?')) return;
    startTransition(async () => {
      const r = await rejectReviewer(profileId, reason);
      if (!r.ok) alert('거절하지 못했어요 — ' + r.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex gap-1.5 mt-1">
      <UIButton size="sm" onClick={onApprove} disabled={pending}>
        {pending ? '처리 중…' : '승인'}
      </UIButton>
      <UIButton variant="secondary" size="sm" onClick={onReject} disabled={pending}>
        거절
      </UIButton>
    </div>
  );
}
