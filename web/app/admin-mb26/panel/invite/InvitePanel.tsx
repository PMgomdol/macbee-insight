'use client';

import { useState } from 'react';
import { Mail, Copy, Check } from 'lucide-react';
import { UIButton } from '@/components/ui/Button';
import Textfield from '@atlaskit/textfield';

const PATH = '/admin-mb26';

export function InvitePanel() {
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const link = typeof window !== 'undefined' ? window.location.origin + PATH : PATH;

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const mailto = valid
    ? `mailto:${email.trim()}?subject=${encodeURIComponent('[맥비 자료실] 운영진 초대')}&body=${encodeURIComponent(
        `안녕하세요,\n맥비 자료실 운영진으로 초대드려요.\n\n아래 링크로 접속해서 구글 로그인 후 "운영진 신청"을 해주세요. 운영진이 확인하고 승인해 드릴게요.\n\n${link}\n\n감사합니다.`
      )}`
    : '';

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard 불가 시 무시 */
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--card)] p-4">
      {/* 이메일로 초대 */}
      <div className="flex flex-col gap-2">
        <label htmlFor="invite-email" className="text-sm font-semibold">이메일로 초대</label>
        <p className="text-xs text-[var(--muted)]">초대할 분의 이메일을 넣고 보내면, 초대 링크가 담긴 메일이 내 메일앱에서 열려요.</p>
        <div className="flex gap-2 flex-wrap items-end">
          <div className="flex-1 min-w-[200px]">
            <Textfield
              id="invite-email"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              placeholder="invitee@example.com"
            />
          </div>
          {mailto ? (
            <a
              href={mailto}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--r-md)] text-sm bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] transition"
            >
              <Mail size={15} aria-hidden /> 초대 메일 보내기
            </a>
          ) : (
            <UIButton disabled className="opacity-50">초대 메일 보내기</UIButton>
          )}
        </div>
      </div>

      <div className="border-t border-[var(--border)]" />

      {/* 링크 직접 공유 */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">또는 링크 직접 공유</span>
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-xs px-2 py-1.5 rounded-[var(--r-sm)] bg-[var(--bg)] border border-[var(--border)] break-all flex-1 min-w-[200px]">
            {link}
          </code>
          <UIButton variant="secondary" size="sm" onClick={copy}>
            {copied ? <><Check size={13} aria-hidden /> 복사됨</> : <><Copy size={13} aria-hidden /> 링크 복사</>}
          </UIButton>
        </div>
        <p className="text-[11px] text-[var(--muted-2)]">
          받은 분이 링크 접속 → 구글 로그인 → 운영진 신청 → 아래에서 운영진이 승인하면 완료돼요.
        </p>
      </div>
    </div>
  );
}
