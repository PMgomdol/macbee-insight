'use client';

import { useMemo, useState, useTransition } from 'react';
import { X, Plus, User, Flag, Search, Trash2, Tag } from 'lucide-react';
import { UIButton } from '@/components/ui/Button';
import { createBacklog, updateBacklog, deleteBacklog, type BacklogItem, type BacklogStatus } from './actions';

const COLUMNS: { key: BacklogStatus; label: string }[] = [
  { key: 'todo', label: '할 일' },
  { key: 'doing', label: '진행중' },
  { key: 'done', label: '완료' },
];
const PRIORITY: { key: 'low' | 'normal' | 'high'; label: string; cls: string }[] = [
  { key: 'high', label: '높음', cls: 'text-[var(--danger-text)]' },
  { key: 'normal', label: '보통', cls: 'text-[var(--muted)]' },
  { key: 'low', label: '낮음', cls: 'text-[var(--muted-2)]' },
];
const PRI_ORDER: Record<string, number> = { high: 0, normal: 1, low: 2 };
// 운영 백로그 기본 분류 — 기존 데이터의 분류와 합쳐 드롭다운에 노출
const PRESET_CATEGORIES = ['자료 등록', '자료 정리/분류', '기능 개선', '버그 수정', '문의 대응', '운영', '기타'];

function fmt(s: string | null): string {
  if (!s) return '';
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[2]}.${m[3]}` : s;
}

export function BacklogBoard({ items: initial, assignees }: { items: BacklogItem[]; assignees: string[] }) {
  const [items, setItems] = useState(initial);
  const [openId, setOpenId] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [fAssignee, setFAssignee] = useState('');
  const [q, setQ] = useState('');
  const [adding, startAdd] = useTransition();

  // 추가 폼
  const [nTitle, setNTitle] = useState('');
  const [nCategory, setNCategory] = useState('');
  const [nAssignee, setNAssignee] = useState('');
  const [nPriority, setNPriority] = useState<BacklogItem['priority']>('normal');

  // 프리셋 + 실제 데이터에 쓰인 분류 합쳐서 드롭다운 목록
  const categories = useMemo(
    () => [...new Set([...PRESET_CATEGORIES, ...items.map((i) => i.category).filter((c): c is string => !!c)])],
    [items]
  );

  const filtered = useMemo(
    () =>
      items.filter(
        (t) =>
          (!fAssignee || (fAssignee === '__none__' ? !t.assignee : t.assignee === fAssignee)) &&
          (!q ||
            t.title.toLowerCase().includes(q.toLowerCase()) ||
            (t.detail ?? '').toLowerCase().includes(q.toLowerCase()) ||
            (t.category ?? '').toLowerCase().includes(q.toLowerCase()))
      ),
    [items, fAssignee, q]
  );

  const openCount = items.filter((t) => t.status !== 'done').length;
  const highCount = items.filter((t) => t.priority === 'high' && t.status !== 'done').length;

  function patchLocal(id: number, p: Partial<BacklogItem>) {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, ...p } : t)));
  }

  async function move(id: number, status: BacklogStatus) {
    const prev = items.find((t) => t.id === id);
    if (!prev || prev.status === status) return;
    patchLocal(id, { status });
    const r = await updateBacklog(id, { status });
    if (!r.ok) {
      patchLocal(id, { status: prev.status });
      alert('상태 변경 실패: ' + r.error);
    }
  }

  function addItem() {
    if (!nTitle.trim()) return;
    startAdd(async () => {
      const r = await createBacklog({ title: nTitle, category: nCategory || undefined, assignee: nAssignee || undefined, priority: nPriority });
      if (!r.ok || !r.item) {
        alert('추가 실패: ' + r.error);
        return;
      }
      setItems((prev) => [r.item!, ...prev]);
      setNTitle('');
      setNCategory('');
      setNAssignee('');
      setNPriority('normal');
    });
  }

  const open = items.find((t) => t.id === openId) ?? null;

  return (
    <div className="flex flex-col gap-3">
      {/* 추가 폼 */}
      <div className="flex items-center gap-2 flex-wrap rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--card)] p-2">
        <input
          value={nTitle}
          onChange={(e) => setNTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addItem(); }}
          placeholder="할 일 추가 (예: 게임기획 면접자료 카테고리 재분류)"
          className="app-input flex-1 min-w-[180px] text-sm py-1.5 px-2 rounded-[var(--r-sm)]"
        />
        <select value={nCategory} onChange={(e) => setNCategory(e.target.value)} className="app-input text-xs py-1.5 rounded-[var(--r-sm)]" aria-label="분류">
          <option value="">분류(선택)</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={nAssignee} onChange={(e) => setNAssignee(e.target.value)} className="app-input text-xs py-1.5 rounded-[var(--r-sm)]" aria-label="담당자">
          <option value="">담당자(선택)</option>
          {assignees.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={nPriority} onChange={(e) => setNPriority(e.target.value as BacklogItem['priority'])} className="app-input text-xs py-1.5 rounded-[var(--r-sm)]" aria-label="우선순위">
          {PRIORITY.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <UIButton size="sm" onClick={addItem} disabled={adding || !nTitle.trim()}>
          <Plus size={13} aria-hidden /> 추가
        </UIButton>
      </div>

      {/* 필터 바 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted-2)]" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="제목·분류 검색"
            className="app-input pl-7 pr-2 py-1 text-xs rounded-full w-44"
          />
        </div>
        <select value={fAssignee} onChange={(e) => setFAssignee(e.target.value)} className="app-input text-xs py-1 rounded-[var(--r-sm)]">
          <option value="">담당자 전체</option>
          <option value="__none__">미지정</option>
          {assignees.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="text-[11px] text-[var(--muted-2)] ml-auto">
          진행 <b className="text-[var(--fg)]">{openCount}</b> · 높음{' '}
          <b className={highCount ? 'text-[var(--danger-text)]' : 'text-[var(--fg)]'}>{highCount}</b> · 전체 {items.length}
        </span>
      </div>

      {/* 칸반 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {COLUMNS.map((col) => {
          const list = filtered
            .filter((t) => t.status === col.key)
            .sort((a, b) => PRI_ORDER[a.priority] - PRI_ORDER[b.priority]);
          return (
            <div
              key={col.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragId != null) move(dragId, col.key); setDragId(null); }}
              className="flex flex-col gap-2 rounded-[var(--r-md)] bg-[var(--card)] border border-[var(--border)] p-2 min-h-[120px]"
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-[var(--fg)]">{col.label}</span>
                <span className="text-[11px] text-[var(--muted-2)]">{list.length}</span>
              </div>
              {list.map((t) => {
                const pri = PRIORITY.find((p) => p.key === t.priority);
                return (
                  <button
                    key={t.id}
                    type="button"
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => setOpenId(t.id)}
                    className={`text-left rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--bg)] p-2 flex flex-col gap-1.5 hover:border-[var(--accent)] transition cursor-pointer ${t.status === 'done' ? 'opacity-70' : ''}`}
                  >
                    <p className={`text-[13px] font-medium text-[var(--fg)] line-clamp-2 leading-snug break-words ${t.status === 'done' ? 'line-through text-[var(--muted)]' : ''}`}>
                      {t.title}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--muted-2)] flex-wrap">
                      {t.category && <span className="slds-badge"><Tag size={9} aria-hidden /> {t.category}</span>}
                      {t.priority !== 'normal' && (
                        <span className={`inline-flex items-center gap-0.5 ${pri?.cls}`}>
                          <Flag size={9} aria-hidden /> {pri?.label}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-0.5 ml-auto">
                        <User size={9} aria-hidden /> {t.assignee ?? '미지정'}
                      </span>
                    </div>
                  </button>
                );
              })}
              {list.length === 0 && <span className="text-[11px] text-[var(--muted-2)] px-1 py-2">비어 있음</span>}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-[var(--muted-2)]">
        카드를 다른 칸으로 끌어다 놓으면 상태가 바뀌어요. 카드를 누르면 담당자·우선순위·내용을 편집하거나 삭제할 수 있어요.
        (모바일에선 카드를 눌러 상태를 바꿔주세요.)
      </p>

      {open && (
        <Drawer
          key={open.id}
          item={open}
          assignees={assignees}
          categories={categories}
          onClose={() => setOpenId(null)}
          onPatch={patchLocal}
          onRemove={(id) => { setItems((prev) => prev.filter((t) => t.id !== id)); setOpenId(null); }}
        />
      )}
    </div>
  );
}

function Drawer({
  item,
  assignees,
  categories,
  onClose,
  onPatch,
  onRemove,
}: {
  item: BacklogItem;
  assignees: string[];
  categories: string[];
  onClose: () => void;
  onPatch: (id: number, p: Partial<BacklogItem>) => void;
  onRemove: (id: number) => void;
}) {
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(item.title);
  const [detail, setDetail] = useState(item.detail ?? '');
  const [category, setCategory] = useState(item.category ?? '');

  function field<K extends 'status' | 'assignee' | 'priority'>(key: K, value: BacklogItem[K]) {
    onPatch(item.id, { [key]: value } as Partial<BacklogItem>);
    start(async () => {
      const r = await updateBacklog(item.id, { [key]: value } as never);
      if (!r.ok) alert('변경 실패: ' + r.error);
    });
  }

  function saveContent() {
    if (!title.trim()) { alert('제목은 비울 수 없어요'); return; }
    onPatch(item.id, { title: title.trim(), detail: detail.trim() || null, category: category.trim() || null });
    start(async () => {
      const r = await updateBacklog(item.id, { title: title.trim(), detail: detail.trim() || null, category: category.trim() || null });
      if (!r.ok) alert('저장 실패: ' + r.error);
    });
  }

  function remove() {
    if (!confirm('이 백로그를 삭제할까요?')) return;
    start(async () => {
      const r = await deleteBacklog(item.id);
      if (!r.ok) { alert('삭제 실패: ' + r.error); return; }
      onRemove(item.id);
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-[440px] h-full bg-[var(--bg)] border-l border-[var(--border)] overflow-y-auto p-4 flex flex-col gap-4 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-[var(--muted-2)]">
            <span>#{item.id}</span>
            <span>등록 {fmt(item.created_at)}{item.created_by ? ` · ${item.created_by}` : ''}</span>
          </div>
          <button type="button" onClick={onClose} className="text-[var(--muted)] hover:text-[var(--fg)]" aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        {/* 내용 편집 */}
        <div className="flex flex-col gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="app-input text-sm font-semibold py-1.5 px-2 rounded-[var(--r-sm)]"
            placeholder="제목"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="app-input text-xs py-1.5 rounded-[var(--r-sm)]"
            aria-label="분류"
          >
            <option value="">분류 없음</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={5}
            placeholder="상세 내용·메모 (선택)"
            className="app-input text-sm p-2 rounded-[var(--r-sm)] resize-y"
          />
          <UIButton variant="secondary" size="sm" onClick={saveContent} disabled={pending} className="w-fit">
            내용 저장
          </UIButton>
        </div>

        {/* 관리 컨트롤 */}
        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1 text-[11px] text-[var(--muted)]">
            상태
            <select value={item.status} onChange={(e) => field('status', e.target.value as BacklogStatus)} className="app-input text-xs py-1 rounded-[var(--r-sm)]">
              {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-[var(--muted)]">
            담당자
            <select value={item.assignee ?? ''} onChange={(e) => field('assignee', (e.target.value || null) as never)} className="app-input text-xs py-1 rounded-[var(--r-sm)]">
              <option value="">미지정</option>
              {assignees.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-[var(--muted)]">
            우선순위
            <select value={item.priority} onChange={(e) => field('priority', e.target.value as never)} className="app-input text-xs py-1 rounded-[var(--r-sm)]">
              {PRIORITY.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="inline-flex items-center gap-1 text-xs text-[var(--danger-text)] hover:underline w-fit mt-auto"
        >
          <Trash2 size={13} aria-hidden /> 백로그 삭제
        </button>
      </div>
    </div>
  );
}
