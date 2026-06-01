'use client';
import { useState } from 'react';
import { approveProposal, forceApproveProposal, rejectProposal } from './actions';

export function ApproveButton({ id, disabled }: { id: string; disabled?: boolean }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      onClick={async () => {
        setLoading(true);
        try { await approveProposal(id); }
        catch (e: any) { alert(e.message); }
        finally { setLoading(false); }
      }}
      disabled={disabled || loading}
      className="fc-btn fc-btn-primary px-3 py-1.5 text-xs"
    >
      {disabled ? '승인됨' : loading ? '처리 중...' : '승인'}
    </button>
  );
}

/** admin 단독 승인 — 운영진 2인 미확보 한시 폴백 */
export function ForceApproveButton({ id, isAdmin }: { id: string; isAdmin: boolean }) {
  const [loading, setLoading] = useState(false);
  if (!isAdmin) return null;
  return (
    <button
      onClick={async () => {
        const reason = window.prompt('단독 승인 사유 (필수, 기록 남음):');
        if (!reason?.trim()) return;
        if (!confirm('운영진 1명만으로 자료실 이관합니다. 진행할까요?')) return;
        setLoading(true);
        try { await forceApproveProposal(id, reason.trim()); }
        catch (e: any) { alert(e.message); }
        finally { setLoading(false); }
      }}
      disabled={loading}
      className="fc-btn fc-btn-subtle px-3 py-1.5 text-xs"
      title="2인 운영진 확보 전 한시 폴백"
    >
      {loading ? '처리 중...' : '단독 승인'}
    </button>
  );
}

export function RejectButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      onClick={async () => {
        const note = window.prompt('거절 사유 (선택):') ?? '';
        if (!confirm('거절하시겠습니까?')) return;
        setLoading(true);
        try { await rejectProposal(id, note); }
        catch (e: any) { alert(e.message); }
        finally { setLoading(false); }
      }}
      disabled={loading}
      className="fc-btn fc-btn-subtle px-3 py-1.5 text-xs"
    >
      {loading ? '처리 중...' : '거절'}
    </button>
  );
}
