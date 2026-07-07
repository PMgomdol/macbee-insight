'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import Button from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
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
    if (!name.trim()) { setError('이름이나 닉네임을 적어주세요'); return; }
    startTransition(async () => {
      const r = await applyReviewer(name.trim(), reason.trim());
      if (r.ok) {
        setDone(true);
        router.refresh();
      } else {
        setError(r.error ?? '신청하지 못했어요');
      }
    });
  }

  if (done) {
    return (
      <div className="flex flex-col gap-2 p-4 rounded-[var(--r-md)] border border-[var(--success)]/40 bg-[var(--success)]/10 text-sm">
        <div className="flex items-center gap-2 font-semibold">
          <CheckCircle2 size={16} className="text-[var(--success)]" aria-hidden />
          잘 보냈어요
        </div>
        <p className="text-xs text-[var(--muted)]">기존 운영진이 확인하고 있어요. 승인되면 자료 검토 페이지로 들어갈 수 있어요.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 p-4 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg)]">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          이름·닉네임 <span className="text-[var(--danger)]">*</span>
        </label>
        <Textfield
          id="name"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          isRequired
          placeholder="실명이나 카톡방 닉네임"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="reason" className="text-sm font-medium">
          신청 사유 <span className="text-[var(--muted-2)] font-normal">(선택)</span>
        </label>
        <TextArea
          id="reason"
          value={reason}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
          minimumRows={3}
          placeholder="어떻게 도와줄 수 있는지 짧게 적어주세요"
        />
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 p-2.5 rounded-[var(--r-sm)] border border-[var(--danger)]/40 bg-[var(--danger)]/10 text-xs">
          <AlertCircle size={14} className="text-[var(--danger)] shrink-0 mt-0.5" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="submit"
        appearance="primary"
        isDisabled={pending || !name.trim()}
      >
        {pending ? '보내고 있어요…' : '운영진 신청'}
      </Button>
    </form>
  );
}
