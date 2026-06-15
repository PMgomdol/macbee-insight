'use client';
import { useState } from 'react';
import { applyReviewer } from './actions';

export function ApplyReviewerButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onClick() {
    const name = window.prompt('운영진 신청에 표시할 이름·닉네임:');
    if (!name?.trim()) return;
    const reason = window.prompt('신청 사유 (간단히, 선택):') ?? '';
    if (!confirm(`${name.trim()} 으로 운영진 신청합니다. 관리자 승인 후 운영진 권한이 부여됩니다. 진행할까요?`)) return;
    setLoading(true);
    try {
      const r = await applyReviewer(name.trim(), reason.trim());
      if (r.ok) {
        setMsg('신청 완료. 관리자 승인 대기 중. 새로고침해보세요.');
      } else {
        setMsg('실패: ' + r.error);
      }
    } catch (e: any) {
      setMsg('오류: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={onClick}
        disabled={loading}
        className="fc-btn fc-btn-primary"
      >
        {loading ? '신청 중...' : '운영진 신청'}
      </button>
      {msg && <p className="text-xs text-[var(--muted)]">{msg}</p>}
    </div>
  );
}
