'use client';
import { useEffect, useState, useTransition } from 'react';
import { MessageCircle, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { UIButton, UILinkButton } from '@/components/ui/Button';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import { submitFeedback, type FeedbackKind } from '@/app/actions/feedback';
import { track } from '@/lib/track';

const KINDS: { v: FeedbackKind; label: string }[] = [
  { v: 'suggestion', label: '개선 제안' },
  { v: 'bug', label: '버그·오류' },
  { v: 'inquiry', label: '문의' },
  { v: 'praise', label: '칭찬' },
];

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>('suggestion');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function openWidget() {
    setOpen(true);
    track('feedback_open', {});
  }

  function close() {
    setOpen(false);
    // status는 유지 (닫고 다시 열면 초기화)
    setTimeout(() => setStatus(null), 300);
  }

  function reset() {
    setKind('suggestion');
    setMessage('');
    setName('');
    setEmail('');
    setStatus(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) { setStatus({ kind: 'error', text: '내용을 입력해주세요' }); return; }
    setStatus(null);
    startTransition(async () => {
      const r = await submitFeedback({
        kind,
        message,
        name: name || undefined,
        email: email || undefined,
        pageUrl: typeof window !== 'undefined' ? window.location.pathname + window.location.search : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      });
      if (r.ok) {
        track('feedback_submit', { kind });
        setStatus({ kind: 'ok', text: '보내주셔서 고마워요. 운영진이 확인할게요.' });
        setMessage('');
      } else {
        setStatus({ kind: 'error', text: r.error ?? '보내지 못했어요' });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openWidget}
        aria-label="의견 보내기"
        style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
        className="fixed z-40 right-5 sm:bottom-6 sm:right-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--accent)] text-white font-semibold text-sm shadow-[var(--shadow-8)] hover:bg-[var(--accent-hover)] transition"
      >
        <MessageCircle size={16} aria-hidden />
        의견 보내기
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-title"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={close}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-md)] shadow-[var(--shadow-3)] max-w-md w-full max-h-[90vh] overflow-y-auto flex flex-col"
          >
            <div className="flex items-start justify-between gap-3 p-4 border-b border-[var(--border)]">
              <div className="flex flex-col">
                <h2 id="feedback-title" className="font-bold text-base">의견 보내기</h2>
                {status?.kind !== 'ok' && (
                  <p className="text-xs text-[var(--muted)] mt-0.5">개선 제안·버그·문의 뭐든 편하게 보내주세요.</p>
                )}
              </div>
              <button type="button" onClick={close} aria-label="닫기" className="p-1 -m-1 text-[var(--muted)] hover:text-[var(--fg)]">
                <X size={18} aria-hidden />
              </button>
            </div>

            {status?.kind === 'ok' ? (
              <div className="p-6 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[var(--success)]/12 flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-[var(--success)]" aria-hidden />
                </div>
                <h3 className="font-bold text-lg">의견을 보냈어요</h3>
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  소중한 의견 고마워요. 운영진이 꼭 확인할게요.
                  {email.trim() ? ' 남겨주신 이메일로 답변드릴게요.' : ''}
                </p>
                <div className="flex flex-col sm:flex-row gap-2 w-full mt-2">
                  <UIButton variant="secondary" onClick={reset} className="flex-1">의견 하나 더 보내기</UIButton>
                  <UILinkButton href="/" onClick={close} className="flex-1">홈으로</UILinkButton>
                </div>
                <button type="button" onClick={close} className="text-xs text-[var(--muted)] hover:text-[var(--fg)] mt-1">닫기</button>
              </div>
            ) : (
            <form onSubmit={onSubmit} className="p-4 flex flex-col gap-3">
              {/* 종류 — 밑줄 탭 (UI 규칙: 전환은 탭답게, 등록폼과 동일 패턴) */}
              <div role="radiogroup" aria-label="종류" className="flex gap-1 border-b border-[var(--border)]">
                {KINDS.map(({ v, label }) => {
                  const active = kind === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setKind(v)}
                      className={`px-3 py-2.5 text-sm -mb-px border-b-2 transition ${
                        active
                          ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                          : 'border-transparent text-[var(--muted)] hover:text-[var(--fg)]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              <div>
                <label htmlFor="fb-message" className="text-xs font-medium text-[var(--muted)] block mb-1.5">
                  내용 <span className="text-[var(--danger)]">*</span>
                </label>
                <TextArea
                  id="fb-message"
                  value={message}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                  isRequired
                  minimumRows={5}
                  maxLength={5000}
                  placeholder="어떤 게 불편했는지·어떻게 개선하면 좋을지 자유롭게 적어주세요"
                />
                <div className="text-[10px] text-[var(--muted-2)] text-right mt-1">{message.length}/5000</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="fb-name" className="text-xs font-medium text-[var(--muted)] block mb-1.5">
                    이름 <span className="text-[var(--muted-2)] font-normal">· 선택</span>
                  </label>
                  <Textfield
                    id="fb-name"
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    maxLength={80}
                    placeholder="닉네임 또는 이름"
                  />
                </div>
                <div>
                  <label htmlFor="fb-email" className="text-xs font-medium text-[var(--muted)] block mb-1.5">
                    이메일 <span className="text-[var(--muted-2)] font-normal">· 선택</span>
                  </label>
                  <Textfield
                    id="fb-email"
                    type="email"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <p className="text-[11px] text-[var(--muted-2)] -mt-1.5">답변이 필요하시면 이메일을 남겨주세요. 남겨주신 주소로 운영진이 회신드려요.</p>

              {status?.kind === 'error' && (
                <div
                  role="alert"
                  className="flex items-start gap-2 p-2.5 rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--danger)]/10 text-xs text-[var(--fg)]"
                >
                  <AlertCircle size={14} className="text-[var(--danger)] shrink-0 mt-0.5" aria-hidden />
                  <span className="flex-1">{status.text}</span>
                </div>
              )}

              <div className="flex gap-2 mt-2">
                <UIButton variant="secondary" onClick={close} className="flex-1">취소</UIButton>
                <UIButton type="submit" disabled={pending || !message.trim()} className="flex-1">
                  {pending ? '보내는 중…' : '보내기'}
                </UIButton>
              </div>
            </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
