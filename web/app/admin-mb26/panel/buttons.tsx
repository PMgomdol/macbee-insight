'use client';
import { useState } from 'react';
import { UIButton } from '@/components/ui/Button';
import { approveProposal, forceApproveProposal, rejectProposal } from './actions';

export function ApproveButton({ id, disabled }: { id: string; disabled?: boolean }) {
  const [loading, setLoading] = useState(false);
  return (
    <UIButton
      size="sm"
      disabled={disabled || loading}
      onClick={async () => {
        setLoading(true);
        try { await approveProposal(id); }
        catch (e: any) { alert(e.message); }
        finally { setLoading(false); }
      }}
    >
      {disabled ? '승인했어요' : loading ? '처리 중…' : '승인'}
    </UIButton>
  );
}

export function ForceApproveButton({ id, isAdmin }: { id: string; isAdmin: boolean }) {
  const [loading, setLoading] = useState(false);
  if (!isAdmin) return null;
  return (
    <UIButton
      variant="secondary"
      size="sm"
      disabled={loading}
      onClick={async () => {
        const reason = window.prompt('단독 승인 사유를 적어주세요 (필수, 기록에 남아요):');
        if (!reason?.trim()) return;
        if (!confirm('운영진 한 명만으로 자료실에 올릴게요. 계속할까요?')) return;
        setLoading(true);
        try { await forceApproveProposal(id, reason.trim()); }
        catch (e: any) { alert(e.message); }
        finally { setLoading(false); }
      }}
    >
      {loading ? '처리 중…' : '단독 승인'}
    </UIButton>
  );
}

export function RejectButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <UIButton
      variant="secondary"
      size="sm"
      disabled={loading}
      onClick={async () => {
        const note = window.prompt('거절 사유를 적어주세요 (선택):') ?? '';
        if (!confirm('거절할게요. 계속할까요?')) return;
        setLoading(true);
        try { await rejectProposal(id, note); }
        catch (e: any) { alert(e.message); }
        finally { setLoading(false); }
      }}
    >
      {loading ? '처리 중…' : '거절'}
    </UIButton>
  );
}
