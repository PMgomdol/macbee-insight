'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ExternalLink, Mail } from 'lucide-react';
import { setFeedbackResolved, type FeedbackRow } from './feedback-actions';

const KIND_LABEL: Record<string, string> = {
  suggestion: '제안',
  bug: '오류',
  inquiry: '문의',
  praise: '칭찬',
};

function fmtDate(s: string | null): string {
  if (!s) return '';
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  return m ? `${m[1]}.${m[2]}.${m[3]} ${m[4]}:${m[5]}` : s;
}

export function FeedbackList({ feedback }: { feedback: FeedbackRow[] }) {
  const [onlyOpen, setOnlyOpen] = useState(false);
  const rows = onlyOpen ? feedback.filter((f) => !f.resolved) : feedback;

  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-[var(--muted)]">
          사용자가 [의견 보내기]로 남긴 내용이에요. 전체 {feedback.length}건 · 미처리{' '}
          {feedback.filter((f) => !f.resolved).length}건
        </p>
        <label className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyOpen}
            onChange={(e) => setOnlyOpen(e.target.checked)}
          />
          미처리만 보기
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-[var(--muted-2)] py-8 text-center">
          {feedback.length === 0 ? '아직 들어온 의견이 없어요.' : '미처리 의견이 없어요.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((f) => (
            <FeedbackItem key={f.id} f={f} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FeedbackItem({ f }: { f: FeedbackRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function toggle() {
    start(async () => {
      const r = await setFeedbackResolved(f.id, !f.resolved);
      if (r.ok) router.refresh();
    });
  }

  return (
    <li
      className={`rounded-[var(--r-md)] border border-[var(--border)] p-3 flex flex-col gap-2 ${
        f.resolved ? 'bg-[var(--card)] opacity-70' : 'bg-[var(--bg)]'
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap text-[11px] text-[var(--muted-2)]">
        <span className="slds-badge">{KIND_LABEL[f.kind] ?? f.kind}</span>
        <span>{fmtDate(f.submitted_at)}</span>
        {f.email && (
          <a
            href={`mailto:${f.email}`}
            className="inline-flex items-center gap-1 hover:text-[var(--accent)]"
          >
            <Mail size={11} aria-hidden />
            {f.email}
          </a>
        )}
        {f.page_url && (
          <a
            href={f.page_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-[var(--accent)]"
          >
            페이지 <ExternalLink size={10} aria-hidden />
          </a>
        )}
      </div>

      <p className="text-sm text-[var(--fg)] whitespace-pre-wrap break-words">{f.message}</p>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-[var(--r-sm)] border transition disabled:opacity-50 ${
            f.resolved
              ? 'border-[var(--border)] text-[var(--muted)] hover:bg-[var(--card)]'
              : 'border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-bg)]'
          }`}
        >
          <Check size={12} aria-hidden />
          {f.resolved ? '처리됨 (되돌리기)' : '처리 완료로 표시'}
        </button>
      </div>
    </li>
  );
}
