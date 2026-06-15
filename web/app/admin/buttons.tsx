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
      {disabled ? '승인했어요' : loading ? '처리하고 있어요...' : '승인'}
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
        const reason = window.prompt('단독 승인 사유를 적어주세요 (필수, 기록에 남아요):');
        if (!reason?.trim()) return;
        if (!confirm('운영진 한 명만으로 자료실에 올릴게요. 계속할까요?')) return;
        setLoading(true);
        try { await forceApproveProposal(id, reason.trim()); }
        catch (e: any) { alert(e.message); }
        finally { setLoading(false); }
      }}
      disabled={loading}
      className="fc-btn fc-btn-subtle px-3 py-1.5 text-xs"
      title="운영진 2인이 갖춰지기 전 한시적 처리예요"
    >
      {loading ? '처리하고 있어요...' : '단독 승인'}
    </button>
  );
}

export function RejectButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      onClick={async () => {
        const note = window.prompt('거절 사유를 적어주세요 (선택):') ?? '';
        if (!confirm('거절할게요. 계속할까요?')) return;
        setLoading(true);
        try { await rejectProposal(id, note); }
        catch (e: any) { alert(e.message); }
        finally { setLoading(false); }
      }}
      disabled={loading}
      className="fc-btn fc-btn-subtle px-3 py-1.5 text-xs"
    >
      {loading ? '처리하고 있어요...' : '거절'}
    </button>
  );
}
