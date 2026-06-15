'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { applyReviewer } from './actions';

export function ApplyReviewerForm({ defaultName }: { defaultName: string }) {
  const [name, setName] = useState(defaultName);
  const [reason, setReason] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('이름·닉네임 필수'); return; }
    startTransition(async () => {
      const r = await applyReviewer(name.trim(), reason.trim());
      if (r.ok) {
        setDone(true);
        router.refresh();
      } else {
        setError(r.error ?? '신청 실패');
      }
    });
  }

  if (done) {
    return (
      <div className="flex flex-col gap-2 p-4 rounded-[var(--r-md)] border border-[var(--success)]/40 bg-[var(--success)]/10 text-sm">
        <div className="flex items-center gap-2 font-semibold">
          <CheckCircle2 size={16} className="text-[var(--success)]" aria-hidden />
          신청 완료
        </div>
        <p className="text-xs text-[var(--muted)]">기존 운영진 검토 대기 중. 승인 시 자료 검토 페이지에 접근 가능합니다.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 p-4 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg)]">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          이름·닉네임 <span className="text-[var(--danger)]">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="실명 또는 카톡방 닉네임"
          className="px-3 py-2 rounded-[var(--r-sm)] border border-[var(--border-strong)] border-b-2 bg-[var(--bg)] text-sm focus:border-b-[var(--accent)] outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="reason" className="text-sm font-medium">
          신청 사유 <span className="text-[var(--muted-2)] font-normal">(선택)</span>
        </label>
        <textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="어떤 부분을 도와줄 수 있는지 짧게..."
          className="px-3 py-2 rounded-[var(--r-sm)] border border-[var(--border-strong)] border-b-2 bg-[var(--bg)] text-sm focus:border-b-[var(--accent)] outline-none resize-y"
        />
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 p-2.5 rounded-[var(--r-sm)] border border-[var(--danger)]/40 bg-[var(--danger)]/10 text-xs">
          <AlertCircle size={14} className="text-[var(--danger)] shrink-0 mt-0.5" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={pending || !name.trim()}
        className="fc-btn fc-btn-primary mt-1"
      >
        {pending && <Loader2 size={14} className="animate-spin" aria-hidden />}
        {pending ? '신청 중...' : '운영진 신청'}
      </button>
    </form>
  );
}
