'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Pencil, ExternalLink, Eye, EyeOff, Trash2, RotateCcw } from 'lucide-react';
import { UIButton } from '@/components/ui/Button';
import { updateArchiveItem, setArchiveStatus } from './actions';

const FORMATS = ['아티클', '영상', '기획서', '가이드', '템플릿', '세미나'];

export type ArchiveRowItem = {
  id: number;
  title: string;
  summary: string | null;
  main_category: string;
  sub_category: string | null;
  tags: string[] | null;
  format: string | null;
  kind: 'files' | 'insights';
  status: string;
  external_url: string | null;
  file_url: string | null;
  views: number;
};

type Cat = { main_category: string; sub_category: string | null };

const inputCls =
  'w-full px-2.5 py-1.5 rounded-[var(--r-sm)] border border-[var(--border-strong)] bg-[var(--bg)] text-sm focus:border-[var(--focus-ring)] transition-colors';

const STEP = 30;

export function ArchiveManager({ items, categories }: { items: ArchiveRowItem[]; categories: Cat[] }) {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'' | 'files' | 'insights'>('');
  const [status, setStatus] = useState<'public' | 'hidden' | 'deleted' | 'all'>('public');
  const [showCount, setShowCount] = useState(STEP);

  // 종류·검색까지 적용한 기준 집합 — 상태 탭 숫자와 목록이 항상 같은 기준을 쓰게 한다.
  const byKindSearch = useMemo(() => {
    const kws = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter((it) => {
      if (kind && it.kind !== kind) return false;
      if (kws.length) {
        const hay = `${it.title} ${it.summary ?? ''} ${(it.tags ?? []).join(' ')} ${it.main_category} ${it.sub_category ?? ''}`.toLowerCase();
        if (!kws.every((k) => hay.includes(k))) return false;
      }
      return true;
    });
  }, [items, q, kind]);

  // 상태별 건수 = 현재 종류·검색 필터 기준 (탭 숫자 = 목록과 일치)
  const counts = useMemo(() => {
    const c = { public: 0, hidden: 0, deleted: 0 };
    for (const it of byKindSearch) if (it.status in c) (c as any)[it.status]++;
    return c;
  }, [byKindSearch]);

  const filtered = useMemo(
    () => (status === 'all' ? byKindSearch : byKindSearch.filter((it) => it.status === status)),
    [byKindSearch, status]
  );

  const visible = filtered.slice(0, showCount);

  const statusTabs = [
    ['public', `공개 ${counts.public}`],
    ['hidden', `숨김 ${counts.hidden}`],
    ['deleted', `삭제됨 ${counts.deleted}`],
    ['all', `전체 ${byKindSearch.length}`],
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">자료 관리</h1>
        <p className="text-sm text-[var(--muted)]">자료실에 올라간 자료를 직접 수정하고 숨기거나 삭제해요. 전체 {items.length}건.</p>
      </section>

      {/* 검색 */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-[var(--border-strong)] bg-[var(--bg)] focus-within:border-[var(--accent)]">
        <Search size={16} className="text-[var(--muted)] shrink-0" aria-hidden />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setShowCount(STEP); }}
          placeholder="제목·설명·태그·분류로 찾기"
          className="flex-1 min-w-0 bg-transparent outline-none text-base sm:text-sm"
          aria-label="자료 검색"
        />
        {q && <button onClick={() => setQ('')} className="text-[var(--muted)] hover:text-[var(--fg)] p-1 -m-1" aria-label="지우기"><X size={14} /></button>}
      </div>

      {/* 상태 탭 + 종류 필터 */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div role="tablist" className="flex gap-1 border-b border-[var(--border)] -mb-px">
          {statusTabs.map(([s, label]) => (
            <button
              key={s}
              role="tab"
              aria-selected={status === s}
              onClick={() => { setStatus(s); setShowCount(STEP); }}
              className={`px-3 py-2 -mb-px border-b-2 whitespace-nowrap transition ${
                status === s ? 'border-[var(--accent)] text-[var(--accent)] font-semibold' : 'border-transparent text-[var(--muted)] hover:text-[var(--fg)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {([['', '전체'], ['files', '양식·템플릿'], ['insights', '콘텐츠']] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => { setKind(k); setShowCount(STEP); }}
              className={`px-2.5 py-1 rounded-full font-medium transition ${kind === k ? 'bg-[var(--card)] text-[var(--fg)]' : 'text-[var(--muted)] hover:bg-[var(--card)]'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--muted)]">조건에 맞는 자료가 없어요</div>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((it) => (
            <ArchiveRow key={it.id} item={it} categories={categories} />
          ))}
        </div>
      )}

      {filtered.length > showCount && (
        <button
          onClick={() => setShowCount((c) => c + STEP)}
          className="self-center mt-1 px-5 py-2.5 rounded-[var(--r-sm)] border border-[var(--border-strong)] hover:bg-[var(--card)] text-sm font-medium"
        >
          더 보기 ({filtered.length - showCount}건)
        </button>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    public: { label: '공개', cls: 'text-[var(--success)] bg-[var(--success)]/10' },
    hidden: { label: '숨김', cls: 'text-[var(--warning)] bg-[var(--warning)]/10' },
    deleted: { label: '삭제됨', cls: 'text-[var(--danger)] bg-[var(--danger)]/10' },
  };
  const s = map[status] ?? { label: status, cls: 'text-[var(--muted)] bg-[var(--card)]' };
  return <span className={`shrink-0 px-1.5 py-0.5 rounded-[var(--r-sm)] text-[10px] font-semibold ${s.cls}`}>{s.label}</span>;
}

function ArchiveRow({ item, categories }: { item: ArchiveRowItem; categories: Cat[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState(item.title);
  const [summary, setSummary] = useState(item.summary ?? '');
  const [main, setMain] = useState(item.main_category ?? '');
  const [sub, setSub] = useState(item.sub_category ?? '');
  const [tags, setTags] = useState((item.tags ?? []).join(', '));
  const [format, setFormat] = useState(item.format ?? '');
  const [kind, setKind] = useState<'files' | 'insights'>(item.kind);
  const [status, setStatus] = useState(item.status);

  const mains = Array.from(new Set(categories.map((c) => c.main_category)));
  const subs = categories.filter((c) => c.main_category === main && c.sub_category).map((c) => c.sub_category!);
  const src = item.external_url || item.file_url;

  function cancel() {
    setTitle(item.title); setSummary(item.summary ?? ''); setMain(item.main_category ?? '');
    setSub(item.sub_category ?? ''); setTags((item.tags ?? []).join(', ')); setFormat(item.format ?? '');
    setKind(item.kind); setEditing(false);
  }

  async function save() {
    if (!title.trim()) { alert('제목은 비울 수 없어요'); return; }
    setBusy(true);
    try {
      await updateArchiveItem(item.id, {
        title: title.trim(), summary, main_category: main, sub_category: sub,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean), format, kind,
      });
      setEditing(false);
      router.refresh();
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }

  async function changeStatus(next: 'public' | 'hidden' | 'deleted') {
    if (next === 'deleted' && !confirm('이 자료를 삭제할까요? 목록의 "삭제됨"에서 되살릴 수 있어요.')) return;
    setBusy(true);
    try {
      await setArchiveStatus(item.id, next);
      setStatus(next);
      router.refresh();
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }

  if (editing) {
    return (
      <div className="app-card flex flex-col gap-2 p-3 sm:p-4 bg-[var(--card)]">
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" />
        <textarea className={`${inputCls} resize-y min-h-[3rem]`} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="한 줄 설명" />
        <div className="grid grid-cols-2 gap-2">
          <select className={inputCls} value={main} onChange={(e) => { setMain(e.target.value); setSub(''); }}>
            <option value="">분류 선택</option>
            {mains.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input className={inputCls} value={sub} onChange={(e) => setSub(e.target.value)} list={`asub-${item.id}`} placeholder="소분류" />
          <datalist id={`asub-${item.id}`}>{subs.map((s) => <option key={s} value={s} />)}</datalist>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select className={inputCls} value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="">형식 선택</option>
            {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as 'files' | 'insights')}>
            <option value="insights">콘텐츠 메뉴</option>
            <option value="files">양식·템플릿 메뉴</option>
          </select>
        </div>
        <input className={inputCls} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="태그 (쉼표 구분)" />
        <div className="flex gap-1.5 mt-0.5">
          <UIButton size="sm" onClick={save} disabled={busy}>{busy ? '저장 중…' : '저장'}</UIButton>
          <UIButton size="sm" variant="secondary" onClick={cancel} disabled={busy}>취소</UIButton>
        </div>
      </div>
    );
  }

  return (
    <div className="app-card flex items-start justify-between gap-3 p-3 sm:p-4 bg-[var(--card)] min-w-0">
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[11px] text-[var(--muted-2)] flex-wrap">
          <StatusBadge status={status} />
          <span>{item.kind === 'files' ? '양식·템플릿' : '콘텐츠'}</span>
          <span>· {main || '미분류'}{sub ? ` · ${sub}` : ''}</span>
          {item.format && <span className="slds-badge">{item.format}</span>}
          <span>· 조회 {item.views}</span>
        </div>
        <h3 className="font-semibold text-sm break-words">{title}</h3>
        {summary && <p className="text-xs text-[var(--muted)] leading-relaxed break-words line-clamp-2">{summary}</p>}
        {src && (
          <a href={src} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[var(--accent)] hover:underline break-all inline-flex items-start gap-1 line-clamp-1">
            <ExternalLink size={11} className="shrink-0 mt-0.5" aria-hidden /><span>{src}</span>
          </a>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <button onClick={() => setEditing(true)} disabled={busy} className="inline-flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-[var(--accent)] transition">
          <Pencil size={12} aria-hidden /> 수정
        </button>
        {status === 'public' ? (
          <button onClick={() => changeStatus('hidden')} disabled={busy} className="inline-flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-[var(--warning)] transition">
            <EyeOff size={12} aria-hidden /> 숨김
          </button>
        ) : (
          <button onClick={() => changeStatus('public')} disabled={busy} className="inline-flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-[var(--success)] transition">
            <Eye size={12} aria-hidden /> 공개
          </button>
        )}
        {status === 'deleted' ? (
          <button onClick={() => changeStatus('public')} disabled={busy} className="inline-flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-[var(--fg)] transition">
            <RotateCcw size={12} aria-hidden /> 복구
          </button>
        ) : (
          <button onClick={() => changeStatus('deleted')} disabled={busy} className="inline-flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-[var(--danger)] transition">
            <Trash2 size={12} aria-hidden /> 삭제
          </button>
        )}
      </div>
    </div>
  );
}
