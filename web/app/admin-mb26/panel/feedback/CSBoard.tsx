'use client';

import { useMemo, useState, useTransition } from 'react';
import { X, Mail, ExternalLink, Search, User, Flag, Send } from 'lucide-react';
import { UIButton } from '@/components/ui/Button';
import { updateTicket, saveAnswer, type FeedbackTicket, type FeedbackStatus } from './actions';

const COLUMNS: { key: FeedbackStatus; label: string }[] = [
  { key: 'new', label: '신규' },
  { key: 'in_progress', label: '처리중' },
  { key: 'hold', label: '보류' },
  { key: 'answered', label: '답변완료' },
  { key: 'closed', label: '종료' },
];
const KIND: Record<string, string> = { suggestion: '제안', bug: '오류', inquiry: '문의', praise: '칭찬' };
const PRIORITY: { key: 'low' | 'normal' | 'high'; label: string; cls: string }[] = [
  { key: 'high', label: '높음', cls: 'text-[var(--danger-text)]' },
  { key: 'normal', label: '보통', cls: 'text-[var(--muted)]' },
  { key: 'low', label: '낮음', cls: 'text-[var(--muted-2)]' },
];
const PRI_ORDER: Record<string, number> = { high: 0, normal: 1, low: 2 };
const OPEN_STATUSES: FeedbackStatus[] = ['new', 'in_progress', 'hold'];

function fmt(s: string | null): string {
  if (!s) return '';
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  return m ? `${m[2]}.${m[3]} ${m[4]}:${m[5]}` : s;
}

export function CSBoard({ tickets: initial, assignees }: { tickets: FeedbackTicket[]; assignees: string[] }) {
  const [tickets, setTickets] = useState(initial);
  const [openId, setOpenId] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [fAssignee, setFAssignee] = useState('');
  const [fKind, setFKind] = useState('');
  const [q, setQ] = useState('');

  const filtered = useMemo(
    () =>
      tickets.filter(
        (t) =>
          (!fAssignee || (fAssignee === '__none__' ? !t.assignee : t.assignee === fAssignee)) &&
          (!fKind || t.kind === fKind) &&
          (!q || t.message.toLowerCase().includes(q.toLowerCase()) || (t.email ?? '').includes(q))
      ),
    [tickets, fAssignee, fKind, q]
  );

  const openCount = tickets.filter((t) => OPEN_STATUSES.includes(t.status)).length;
  const highCount = tickets.filter((t) => t.priority === 'high' && t.status !== 'closed').length;

  function patchLocal(id: number, p: Partial<FeedbackTicket>) {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...p } : t)));
  }

  async function move(id: number, status: FeedbackStatus) {
    const prev = tickets.find((t) => t.id === id);
    if (!prev || prev.status === status) return;
    patchLocal(id, { status });
    const r = await updateTicket(id, { status });
    if (!r.ok) {
      patchLocal(id, { status: prev.status });
      alert('상태 변경 실패: ' + r.error);
    }
  }

  const open = tickets.find((t) => t.id === openId) ?? null;

  return (
    <div className="flex flex-col gap-3">
      {/* 필터 바 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="내용·이메일 검색"
            className="app-input pl-7 pr-2 py-1 text-xs rounded-full w-44"
          />
        </div>
        <select value={fKind} onChange={(e) => setFKind(e.target.value)} className="app-input text-xs py-1 rounded-[var(--r-sm)]">
          <option value="">종류 전체</option>
          {Object.entries(KIND).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={fAssignee} onChange={(e) => setFAssignee(e.target.value)} className="app-input text-xs py-1 rounded-[var(--r-sm)]">
          <option value="">담당자 전체</option>
          <option value="__none__">미지정</option>
          {assignees.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <span className="text-[11px] text-[var(--muted-2)] ml-auto">
          미처리 <b className="text-[var(--fg)]">{openCount}</b> · 높음{' '}
          <b className={highCount ? 'text-[var(--danger-text)]' : 'text-[var(--fg)]'}>{highCount}</b> · 전체 {tickets.length}
        </span>
      </div>

      {/* 칸반 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {COLUMNS.map((col) => {
          const items = filtered
            .filter((t) => t.status === col.key)
            .sort((a, b) => PRI_ORDER[a.priority] - PRI_ORDER[b.priority]); // 높은 우선순위 먼저 (동순위는 최신순 유지)
          return (
            <div
              key={col.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragId != null) move(dragId, col.key);
                setDragId(null);
              }}
              className="flex flex-col gap-2 rounded-[var(--r-md)] bg-[var(--card)] border border-[var(--border)] p-2 min-h-[120px]"
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-[var(--fg)]">{col.label}</span>
                <span className="text-[11px] text-[var(--muted-2)]">{items.length}</span>
              </div>
              {items.map((t) => {
                const pri = PRIORITY.find((p) => p.key === t.priority);
                return (
                  <button
                    key={t.id}
                    type="button"
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => setOpenId(t.id)}
                    className="text-left rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--bg)] p-2 flex flex-col gap-1.5 hover:border-[var(--accent)] transition cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted-2)]">
                      <span className="slds-badge">{KIND[t.kind] ?? t.kind}</span>
                      {t.priority !== 'normal' && (
                        <span className={`inline-flex items-center gap-0.5 ${pri?.cls}`}>
                          <Flag size={9} aria-hidden />
                          {pri?.label}
                        </span>
                      )}
                      <span className="ml-auto">{fmt(t.submitted_at)}</span>
                    </div>
                    <p className="text-[12px] text-[var(--fg)] line-clamp-2 leading-snug break-words">{t.message}</p>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--muted-2)]">
                      <span className="inline-flex items-center gap-0.5">
                        <User size={9} aria-hidden />
                        {t.assignee ?? '미지정'}
                      </span>
                      {t.email && <Mail size={9} aria-hidden />}
                    </div>
                  </button>
                );
              })}
              {items.length === 0 && <span className="text-[11px] text-[var(--muted-2)] px-1 py-2">비어 있음</span>}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-[var(--muted-2)]">
        카드를 다른 칸으로 끌어다 놓으면 상태가 바뀌어요. 카드를 누르면 상세에서 담당자·상태·답변을 처리할 수 있어요.
        (모바일에선 카드를 눌러 상태를 바꿔주세요.)
      </p>

      {open && (
        <Drawer
          key={open.id}
          ticket={open}
          assignees={assignees}
          onClose={() => setOpenId(null)}
          onPatch={patchLocal}
        />
      )}
    </div>
  );
}

function Drawer({
  ticket,
  assignees,
  onClose,
  onPatch,
}: {
  ticket: FeedbackTicket;
  assignees: string[];
  onClose: () => void;
  onPatch: (id: number, p: Partial<FeedbackTicket>) => void;
}) {
  const [pending, start] = useTransition();
  const [answer, setAnswer] = useState(ticket.answer ?? '');
  const [note, setNote] = useState(ticket.reviewer_note ?? '');

  function field<K extends 'status' | 'assignee' | 'priority'>(key: K, value: FeedbackTicket[K]) {
    onPatch(ticket.id, { [key]: value } as Partial<FeedbackTicket>);
    start(async () => {
      const r = await updateTicket(ticket.id, { [key]: value } as never);
      if (!r.ok) alert('변경 실패: ' + r.error);
    });
  }

  // 답변 = 기록 + 메일앱 열기를 한 번에. 실제 발송은 담당자 개인 메일에서.
  function onReply() {
    start(async () => {
      const r = await saveAnswer(ticket.id, answer);
      if (!r.ok) {
        alert('저장 실패: ' + r.error);
        return;
      }
      onPatch(ticket.id, { answer, status: 'answered', answered_by: r.answeredBy ?? null, answered_at: r.answeredAt ?? null });
      if (mailto) window.location.href = mailto;
    });
  }

  function onSaveNote() {
    onPatch(ticket.id, { reviewer_note: note });
    start(async () => {
      const r = await updateTicket(ticket.id, { reviewer_note: note });
      if (!r.ok) alert('메모 저장 실패: ' + r.error);
    });
  }

  const mailto = ticket.email
    ? `mailto:${ticket.email}?subject=${encodeURIComponent('[맥비 자료실] 남겨주신 의견 답변')}&body=${encodeURIComponent(
        `${answer}\n\n———\n보내주신 의견:\n${ticket.message}`
      )}`
    : null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-[460px] h-full bg-[var(--bg)] border-l border-[var(--border)] overflow-y-auto p-4 flex flex-col gap-4 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-[var(--muted-2)]">
            <span className="slds-badge">{KIND[ticket.kind] ?? ticket.kind}</span>
            <span>#{ticket.id}</span>
            <span>{fmt(ticket.submitted_at)}</span>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--muted)] hover:text-[var(--fg)]" aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        {/* 제출자 */}
        <div className="flex items-center gap-3 text-xs text-[var(--muted)] flex-wrap">
          {ticket.name && (
            <span className="inline-flex items-center gap-1 font-medium text-[var(--fg)]">
              <User size={12} aria-hidden /> {ticket.name}
            </span>
          )}
          {ticket.email ? (
            <a href={`mailto:${ticket.email}`} className="inline-flex items-center gap-1 hover:text-[var(--accent)]">
              <Mail size={12} aria-hidden /> {ticket.email}
            </a>
          ) : (
            <span className="text-[var(--muted-2)]">이메일 없음</span>
          )}
          {ticket.page_url && (
            <a href={ticket.page_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-[var(--accent)]">
              남긴 페이지 <ExternalLink size={11} aria-hidden />
            </a>
          )}
        </div>

        {/* 본문 */}
        <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--card)] p-3 text-sm whitespace-pre-wrap break-words text-[var(--fg)]">
          {ticket.message}
        </div>

        {/* 관리 컨트롤 */}
        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1 text-[11px] text-[var(--muted)]">
            상태
            <select value={ticket.status} onChange={(e) => field('status', e.target.value as FeedbackStatus)} className="app-input text-xs py-1 rounded-[var(--r-sm)]">
              {COLUMNS.map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-[var(--muted)]">
            담당자
            <select value={ticket.assignee ?? ''} onChange={(e) => field('assignee', (e.target.value || null) as never)} className="app-input text-xs py-1 rounded-[var(--r-sm)]">
              <option value="">미지정</option>
              {assignees.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-[var(--muted)]">
            우선순위
            <select value={ticket.priority} onChange={(e) => field('priority', e.target.value as never)} className="app-input text-xs py-1 rounded-[var(--r-sm)]">
              {PRIORITY.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
          </label>
        </div>

        {/* 처리 메모 (내부 기록) — 항상 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-[var(--muted)]">처리 메모 (내부 기록)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="이 의견을 어떻게 처리했는지 기록 (예: 카드 태그 수정 반영함 / 메일로 답변 완료)"
            className="app-input text-sm p-2 rounded-[var(--r-sm)] resize-y"
          />
          <UIButton variant="secondary" size="sm" onClick={onSaveNote} disabled={pending} className="w-fit">
            메모 저장
          </UIButton>
        </div>

        {/* 답변 (제출자에게 메일) — 이메일 있을 때만 */}
        {ticket.email ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-[var(--muted)]">답변 (제출자에게 메일)</span>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={5}
              placeholder="제출자에게 보낼 답변. '메일로 답장 보내기'를 누르면 기록되고, 내 메일앱이 열려요(보내기는 직접)."
              className="app-input text-sm p-2 rounded-[var(--r-sm)] resize-y"
            />
            <UIButton size="sm" onClick={onReply} disabled={pending || !answer.trim()} className="w-fit">
              <Send size={12} aria-hidden /> 메일로 답장 보내기
            </UIButton>
            {ticket.answered_by && (
              <span className="text-[11px] text-[var(--muted-2)]">최근 답변: {ticket.answered_by} · {fmt(ticket.answered_at)}</span>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-[var(--muted-2)]">
            제출자 이메일이 없어 메일 답변은 불가해요(수정 요청형). 위 처리 메모에 기록하고 상태만 바꿔주세요.
          </p>
        )}
      </div>
    </div>
  );
}
