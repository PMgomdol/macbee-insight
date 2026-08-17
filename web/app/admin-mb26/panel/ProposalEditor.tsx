'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { UIButton } from '@/components/ui/Button';
import { updateProposal } from './actions';

const FORMATS = ['아티클', '영상', '기획서', '가이드', '템플릿', '세미나'];

type Proposal = {
  id: string;
  title: string;
  summary: string | null;
  main_category: string | null;
  sub_category: string | null;
  tags: string[] | null;
  format: string | null;
};

type Cat = { main_category: string; sub_category: string | null };

const inputCls =
  'w-full px-2.5 py-1.5 rounded-[var(--r-sm)] border border-[var(--border-strong)] bg-[var(--bg)] text-sm focus:border-[var(--focus-ring)] transition-colors';

export function ProposalEditor({ proposal, categories }: { proposal: Proposal; categories: Cat[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // 로컬 상태 — 저장 성공 시 즉시 반영(+ router.refresh로 서버 동기화)
  const [title, setTitle] = useState(proposal.title);
  const [summary, setSummary] = useState(proposal.summary ?? '');
  const [main, setMain] = useState(proposal.main_category ?? '');
  const [sub, setSub] = useState(proposal.sub_category ?? '');
  const [tags, setTags] = useState((proposal.tags ?? []).join(', '));
  const [format, setFormat] = useState(proposal.format ?? '');

  const mains = Array.from(new Set(categories.map((c) => c.main_category)));
  const subs = categories.filter((c) => c.main_category === main && c.sub_category).map((c) => c.sub_category!);

  function cancel() {
    setTitle(proposal.title);
    setSummary(proposal.summary ?? '');
    setMain(proposal.main_category ?? '');
    setSub(proposal.sub_category ?? '');
    setTags((proposal.tags ?? []).join(', '));
    setFormat(proposal.format ?? '');
    setEditing(false);
  }

  async function save() {
    if (!title.trim()) { alert('제목은 비울 수 없어요'); return; }
    setSaving(true);
    try {
      await updateProposal(proposal.id, {
        title: title.trim(),
        summary,
        main_category: main,
        sub_category: sub,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        format,
      });
      setEditing(false);
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-[11px] text-[var(--muted)]">
          제목
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-[var(--muted)]">
          한 줄 설명
          <textarea className={`${inputCls} resize-y min-h-[3.5rem]`} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="한 줄 설명" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[11px] text-[var(--muted)]">
            대분류
            <select className={inputCls} value={main} onChange={(e) => { setMain(e.target.value); setSub(''); }}>
              <option value="">선택</option>
              {mains.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-[var(--muted)]">
            소분류
            <input className={inputCls} value={sub} onChange={(e) => setSub(e.target.value)} list={`subs-${proposal.id}`} placeholder="선택·입력" />
            <datalist id={`subs-${proposal.id}`}>{subs.map((s) => <option key={s} value={s} />)}</datalist>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[11px] text-[var(--muted)]">
            형식
            <select className={inputCls} value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="">선택</option>
              {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-[var(--muted)]">
            태그 (쉼표 구분)
            <input className={inputCls} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="피그마, Figma" />
          </label>
        </div>
        <div className="flex gap-1.5 mt-0.5">
          <UIButton size="sm" onClick={save} disabled={saving}>{saving ? '저장 중…' : '저장'}</UIButton>
          <UIButton size="sm" variant="secondary" onClick={cancel} disabled={saving}>취소</UIButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] text-[var(--muted-2)] flex-wrap min-w-0">
          <span className="font-medium">{main || '미분류'}</span>
          {sub && <span>· {sub}</span>}
          {format && <span className="slds-badge">{format}</span>}
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="shrink-0 inline-flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
        >
          <Pencil size={11} aria-hidden /> 수정
        </button>
      </div>
      <h3 className="font-semibold text-sm break-words">{title}</h3>
      {summary && <p className="text-xs text-[var(--muted)] leading-relaxed break-words">{summary}</p>}
      {tags.trim() && (
        <div className="flex flex-wrap gap-1">
          {tags.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
            <span key={t} className="slds-badge">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
