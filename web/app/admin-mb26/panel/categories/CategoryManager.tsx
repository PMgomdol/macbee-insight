'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, FolderTree } from 'lucide-react';
import { UIButton } from '@/components/ui/Button';
import { createCategory, updateCategory, deleteCategory, type CategoryFields } from './actions';

export type CatRow = {
  id: number;
  main_category: string;
  sub_category: string | null;
  description: string | null;
  owner: string | null;
  channels: string | null;
  monitor_days: number | null;
  count: number;
};

const inputCls =
  'w-full px-2.5 py-1.5 rounded-[var(--r-sm)] border border-[var(--border-strong)] bg-[var(--bg)] text-sm focus:border-[var(--focus-ring)] transition-colors';

const emptyFields = (main = ''): CategoryFields => ({
  main_category: main, sub_category: '', description: '', owner: '', channels: '', monitor_days: '',
});

export function CategoryManager({ rows }: { rows: CatRow[] }) {
  const [adding, setAdding] = useState<CategoryFields | null>(null);

  const mains = useMemo(() => Array.from(new Set(rows.map((r) => r.main_category))), [rows]);

  // 대분류별 그룹 — 표시 순서는 서버 정렬(대분류→소분류)을 그대로 따른다.
  const groups = useMemo(() => {
    const m = new Map<string, CatRow[]>();
    for (const r of rows) {
      if (!m.has(r.main_category)) m.set(r.main_category, []);
      m.get(r.main_category)!.push(r);
    }
    return Array.from(m.entries());
  }, [rows]);

  return (
    <div className="flex flex-col gap-4">
      <section className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">카테고리 관리</h1>
          <p className="text-sm text-[var(--muted)]">
            자료 분류(대분류·소분류)를 추가·수정·삭제해요. 이름을 바꾸면 그 분류를 쓰는 자료도 함께 바뀝니다. 분류 {rows.length}개.
          </p>
        </div>
        {!adding && (
          <UIButton size="sm" onClick={() => setAdding(emptyFields())}>
            <Plus size={14} aria-hidden /> 분류 추가
          </UIButton>
        )}
      </section>

      {adding && (
        <CategoryForm
          title="새 분류 추가"
          initial={adding}
          mains={mains}
          submitLabel="추가"
          onCancel={() => setAdding(null)}
          onSubmit={async (f) => { await createCategory(f); setAdding(null); }}
        />
      )}

      <div className="flex flex-col gap-4">
        {groups.map(([main, subs]) => {
          const total = subs.reduce((n, s) => n + s.count, 0);
          return (
            <section key={main} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-xs text-[var(--muted-2)] px-0.5">
                <FolderTree size={13} aria-hidden />
                <span className="font-semibold text-[var(--fg)]">{main}</span>
                <span>· 자료 {total}건</span>
                <button
                  onClick={() => setAdding(emptyFields(main))}
                  className="ml-auto inline-flex items-center gap-1 text-[var(--muted)] hover:text-[var(--accent)] transition"
                >
                  <Plus size={12} aria-hidden /> 소분류 추가
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                {subs.map((r) => <CategoryRow key={r.id} row={r} mains={mains} />)}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function CategoryRow({ row, mains }: { row: CatRow; mains: string[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function del() {
    const msg = row.count > 0
      ? `'${row.sub_category ?? row.main_category}' 분류를 쓰는 자료 ${row.count}건을 '미분류'로 옮기고 삭제할까요?`
      : `'${row.sub_category ?? row.main_category}' 분류를 삭제할까요?`;
    if (!confirm(msg)) return;
    setBusy(true);
    try {
      await deleteCategory(row.id, { main: row.main_category, sub: row.sub_category }, row.count > 0);
      router.refresh();
    } catch (e: any) { alert(e.message); setBusy(false); }
  }

  if (editing) {
    return (
      <CategoryForm
        title="분류 수정"
        initial={{
          main_category: row.main_category,
          sub_category: row.sub_category ?? '',
          description: row.description ?? '',
          owner: row.owner ?? '',
          channels: row.channels ?? '',
          monitor_days: row.monitor_days != null ? String(row.monitor_days) : '',
        }}
        mains={mains}
        submitLabel="저장"
        renameCount={row.count}
        onCancel={() => setEditing(false)}
        onSubmit={async (f) => {
          await updateCategory(row.id, { main: row.main_category, sub: row.sub_category }, f);
          setEditing(false);
          router.refresh();
        }}
      />
    );
  }

  return (
    <div className="app-card flex items-start justify-between gap-3 p-3 bg-[var(--card)] min-w-0">
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-sm break-words">
            {row.sub_category ?? <span className="text-[var(--muted)]">(대분류 직속)</span>}
          </h3>
          <span className="text-[11px] text-[var(--muted-2)]">자료 {row.count}건</span>
          {row.owner && <span className="slds-badge">담당 {row.owner}</span>}
          {row.monitor_days && <span className="slds-badge">모니터링 {row.monitor_days}일</span>}
        </div>
        {row.description && <p className="text-xs text-[var(--muted)] leading-relaxed break-words">{row.description}</p>}
        {row.channels && <p className="text-[11px] text-[var(--muted-2)] break-words">채널: {row.channels}</p>}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <button onClick={() => setEditing(true)} disabled={busy} className="inline-flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-[var(--accent)] transition">
          <Pencil size={12} aria-hidden /> 수정
        </button>
        <button onClick={del} disabled={busy} className="inline-flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-[var(--danger)] transition">
          <Trash2 size={12} aria-hidden /> 삭제
        </button>
      </div>
    </div>
  );
}

function CategoryForm({
  title, initial, mains, submitLabel, renameCount, onCancel, onSubmit,
}: {
  title: string;
  initial: CategoryFields;
  mains: string[];
  submitLabel: string;
  renameCount?: number;
  onCancel: () => void;
  onSubmit: (f: CategoryFields) => Promise<void>;
}) {
  const [f, setF] = useState<CategoryFields>(initial);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof CategoryFields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const renamed = !!renameCount && renameCount > 0 &&
    (f.main_category.trim() !== initial.main_category || f.sub_category.trim() !== initial.sub_category);

  async function submit() {
    if (!f.main_category.trim()) { alert('대분류는 비울 수 없어요'); return; }
    setBusy(true);
    try { await onSubmit(f); } catch (e: any) { alert(e.message); setBusy(false); }
  }

  return (
    <div className="app-card flex flex-col gap-2 p-3 sm:p-4 bg-[var(--card)]">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[var(--muted)]">대분류</label>
          <input className={inputCls} value={f.main_category} onChange={set('main_category')} list="cat-mains" placeholder="예: UX/디자인" />
          <datalist id="cat-mains">{mains.map((m) => <option key={m} value={m} />)}</datalist>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-[var(--muted)]">소분류 <span className="text-[var(--muted-2)]">(비우면 대분류 직속)</span></label>
          <input className={inputCls} value={f.sub_category} onChange={set('sub_category')} placeholder="예: UI 패턴" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-[var(--muted)]">설명</label>
        <textarea className={`${inputCls} resize-y min-h-[2.5rem]`} value={f.description} onChange={set('description')} placeholder="이 분류에 어떤 자료가 들어가는지" />
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-xs text-[var(--muted)] hover:text-[var(--fg)]">운영 메타 (담당·채널·모니터링)</summary>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[var(--muted)]">담당</label>
            <input className={inputCls} value={f.owner} onChange={set('owner')} placeholder="담당자" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[var(--muted)]">모니터링 주기(일)</label>
            <input className={inputCls} value={f.monitor_days} onChange={set('monitor_days')} inputMode="numeric" placeholder="예: 30" />
          </div>
          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-[11px] text-[var(--muted)]">채널</label>
            <input className={inputCls} value={f.channels} onChange={set('channels')} placeholder="수집 채널 메모" />
          </div>
        </div>
      </details>

      {renamed && (
        <p className="text-[11px] text-[var(--warning)]">이름을 바꾸면 이 분류를 쓰는 자료 {renameCount}건도 함께 바뀌어요.</p>
      )}

      <div className="flex gap-1.5 mt-0.5">
        <UIButton size="sm" onClick={submit} disabled={busy}>{busy ? '처리 중…' : submitLabel}</UIButton>
        <UIButton size="sm" variant="secondary" onClick={onCancel} disabled={busy}>취소</UIButton>
      </div>
    </div>
  );
}
