'use client';
import { useState } from 'react';
import { approveProposal, rejectProposal } from './actions';

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
      className="px-3 py-1.5 rounded bg-[var(--accent)] text-white text-xs hover:bg-[var(--accent-hover)] disabled:opacity-50"
    >
      {disabled ? '승인됨' : loading ? '처리 중...' : '승인'}
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
      className="px-3 py-1.5 rounded border border-[var(--border)] text-xs hover:bg-[var(--card)] disabled:opacity-50"
    >
      {loading ? '처리 중...' : '거절'}
    </button>
  );
}
