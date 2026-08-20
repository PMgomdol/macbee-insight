'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Pencil, ExternalLink, Eye, EyeOff, Trash2, RotateCcw, ArrowUpDown, Undo2, FolderInput } from 'lucide-react';
import { UIButton } from '@/components/ui/Button';
import { updateArchiveItem, setArchiveStatus, bulkSetArchiveStatus, bulkSetCategory, reconsiderProposal } from './actions';

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
  registered_at?: string | null;
};

export type RejectedRow = {
  id: string;
  title: string;
  external_url: string | null;
  file_url: string | null;
  proposer: string | null;
  proposed_at: string;
  reviewer_note: string | null;
  reviewed_at: string | null;
};

type SortKey = 'recent' | 'views' | 'title' | 'category';
const SORTS: [SortKey, string][] = [
  ['recent', '최신순'],
  ['views', '조회순'],
  ['title', '이름순'],
  ['category', '분류순'],
];

type Cat = { main_category: string; sub_category: string | null };
type LinkInfo = { result: string; checked_at: string | null };
type StatusTab = 'public' | 'hidden' | 'deleted' | 'rejected' | 'dup' | 'all';

/** 링크 점검 배지 — 죽은링크만 강조, 확인필요는 은은하게, ok/미점검은 표시 안 함. */
function LinkBadge({ info }: { info?: LinkInfo }) {
  if (!info || info.result === 'ok') return null;
  const days = info.checked_at ? Math.floor((Date.now() - new Date(info.checked_at).getTime()) / 86400000) : null;
  const when = days === null ? '' : days <= 0 ? ' · 오늘 점검' : ` · ${days}일 전 점검`;
  if (info.result === 'dead') {
    return <span className="shrink-0 px-1.5 py-0.5 rounded-[var(--r-sm)] text-[10px] font-semibold text-[var(--danger)] bg-[var(--danger)]/10" title={`링크 점검 결과 죽은 링크${when}`}>🔴 죽은 링크</span>;
  }
  return <span className="shrink-0 px-1.5 py-0.5 rounded-[var(--r-sm)] text-[10px] font-medium text-[var(--muted-2)] bg-[var(--card)]" title={`자동 점검으로 확정 못 함(봇 차단 등)${when}`}>링크 확인필요</span>;
}

const TRACKING = ['fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'si', 'rd_src', 'usg', 'ust', 'sa'];
/** 중복 판정용 URL 정규화 — 프로토콜·www·m·추적파라미터·트레일링슬래시 제거. */
function normUrl(u: string | null): string {
  if (!u) return '';
  let s = u.trim();
  if (s.includes('&sa=D')) s = s.split('&sa=D')[0];
  try {
    const p = new URL(s.startsWith('http') ? s : 'https://' + s);
    TRACKING.forEach((k) => p.searchParams.delete(k));
    const host = p.hostname.replace(/^www\./, '').replace(/^m\./, '').toLowerCase();
    const path = p.pathname.replace(/\/+$/, '');
    const q = p.searchParams.toString();
    return host + path + (q ? '?' + q : '');
  } catch {
    return s.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '').toLowerCase();
  }
}

const inputCls =
  'w-full px-2.5 py-1.5 rounded-[var(--r-sm)] border border-[var(--border-strong)] bg-[var(--bg)] text-sm focus:border-[var(--focus-ring)] transition-colors';

const STEP = 30;

export function ArchiveManager({
  items,
  rejected = [],
  categories,
  linkStatus = {},
}: {
  items: ArchiveRowItem[];
  rejected?: RejectedRow[];
  categories: Cat[];
  linkStatus?: Record<number, LinkInfo>;
}) {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'' | 'files' | 'insights'>('');
  const [status, setStatus] = useState<StatusTab>('public');
  const [sort, setSort] = useState<SortKey>('recent');
  const [showCount, setShowCount] = useState(STEP);
  const [sel, setSel] = useState<Set<number>>(new Set());

  const isRejectedTab = status === 'rejected';
  const isDupTab = status === 'dup';
  const isSpecialTab = isRejectedTab || isDupTab;

  // 필터 바꿀 때마다 선택·표시개수 초기화 (안 보이는 항목에 일괄작업 되는 사고 방지)
  function reset() { setShowCount(STEP); setSel(new Set()); }

  // 중복 그룹 — 같은 정규화 URL을 공유하는 공개/숨김 자료 2건 이상. (검색어도 적용)
  const dupGroups = useMemo(() => {
    const kws = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const live = items.filter((it) => it.status === 'public' || it.status === 'hidden');
    const map = new Map<string, ArchiveRowItem[]>();
    for (const it of live) {
      const key = normUrl(it.external_url || it.file_url);
      if (!key) continue;
      (map.get(key) ?? map.set(key, []).get(key)!).push(it);
    }
    let groups = Array.from(map.entries())
      .filter(([, arr]) => arr.length > 1)
      .map(([key, arr]) => ({ key, items: arr.sort((a, b) => a.id - b.id) }));
    if (kws.length) {
      groups = groups.filter((g) =>
        g.items.some((it) => {
          const hay = `${it.title} ${it.main_category} ${it.sub_category ?? ''} ${it.external_url ?? ''} ${it.file_url ?? ''}`.toLowerCase();
          return kws.every((k) => hay.includes(k));
        })
      );
    }
    return groups.sort((a, b) => b.items.length - a.items.length);
  }, [items, q]);

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

  const counts = useMemo(() => {
    const c = { public: 0, hidden: 0, deleted: 0 };
    for (const it of byKindSearch) if (it.status in c) (c as any)[it.status]++;
    return c;
  }, [byKindSearch]);

  // 거절됨 — staging_proposal, 검색어(제목·링크)만 적용
  const rejectedFiltered = useMemo(() => {
    const kws = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!kws.length) return rejected;
    return rejected.filter((r) => {
      const hay = `${r.title} ${r.external_url ?? ''} ${r.file_url ?? ''} ${r.reviewer_note ?? ''}`.toLowerCase();
      return kws.every((k) => hay.includes(k));
    });
  }, [rejected, q]);

  const filtered = useMemo(
    () => (status === 'all' ? byKindSearch : byKindSearch.filter((it) => it.status === status)),
    [byKindSearch, status]
  );

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sort) {
      case 'views':
        arr.sort((a, b) => b.views - a.views);
        break;
      case 'title':
        arr.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
        break;
      case 'category':
        arr.sort(
          (a, b) =>
            (a.main_category || '').localeCompare(b.main_category || '', 'ko') ||
            (a.sub_category || '').localeCompare(b.sub_category || '', 'ko') ||
            a.title.localeCompare(b.title, 'ko')
        );
        break;
      default: // recent
        arr.sort((a, b) => (b.registered_at || '').localeCompare(a.registered_at || '') || b.id - a.id);
    }
    return arr;
  }, [filtered, sort]);

  const visible = sorted.slice(0, showCount);

  const statusTabs: [StatusTab, string][] = [
    ['public', `공개 ${counts.public}`],
    ['hidden', `숨김 ${counts.hidden}`],
    ['deleted', `삭제됨 ${counts.deleted}`],
    ['rejected', `거절됨 ${rejected.length}`],
    ['dup', `중복 ${dupGroups.length}`],
    ['all', `전체 ${byKindSearch.length}`],
  ];

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
          onChange={(e) => { setQ(e.target.value); reset(); }}
          placeholder="제목·설명·태그·분류로 찾기"
          className="flex-1 min-w-0 bg-transparent outline-none text-base sm:text-sm"
          aria-label="자료 검색"
        />
        {q && <button onClick={() => setQ('')} className="text-[var(--muted)] hover:text-[var(--fg)] p-1 -m-1" aria-label="지우기"><X size={14} /></button>}
      </div>

      {/* 상태 탭 + 종류 필터 + 정렬 */}
      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
        <div role="tablist" className="flex gap-1 border-b border-[var(--border)] -mb-px">
          {statusTabs.map(([s, label]) => (
            <button
              key={s}
              role="tab"
              aria-selected={status === s}
              onClick={() => { setStatus(s); reset(); }}
              className={`px-3 py-2 -mb-px border-b-2 whitespace-nowrap transition ${
                status === s ? 'border-[var(--accent)] text-[var(--accent)] font-semibold' : 'border-transparent text-[var(--muted)] hover:text-[var(--fg)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {!isSpecialTab && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {([['', '전체'], ['files', '양식·템플릿'], ['insights', '콘텐츠']] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => { setKind(k); reset(); }}
                  className={`px-2.5 py-1 rounded-full font-medium transition ${kind === k ? 'bg-[var(--card)] text-[var(--fg)]' : 'text-[var(--muted)] hover:bg-[var(--card)]'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="inline-flex items-center gap-1 text-[var(--muted)]">
              <ArrowUpDown size={13} aria-hidden />
              <span className="sr-only">정렬</span>
              <select
                value={sort}
                onChange={(e) => { setSort(e.target.value as SortKey); reset(); }}
                className="px-1.5 py-1 rounded-[var(--r-sm)] border border-[var(--border-strong)] bg-[var(--bg)] text-xs text-[var(--fg)] outline-none focus:border-[var(--accent)] cursor-pointer"
              >
                {SORTS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </label>
          </div>
        )}
      </div>

      {/* 중복 탭 */}
      {isDupTab ? (
        dupGroups.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--muted)]">중복(같은 링크) 자료가 없어요</div>
        ) : (
          <div className="flex flex-col gap-5">
            <p className="text-xs text-[var(--muted-2)]">같은 링크를 가진 공개·숨김 자료 묶음이에요. 한 건만 남기고 나머지를 숨김·삭제하면 정리돼요. (각 행에서 바로, 또는 체크해서 일괄 처리)</p>
            <BulkBar items={dupGroups.flatMap((g) => g.items)} sel={sel} setSel={setSel} categories={categories} />
            {dupGroups.map((g) => (
              <div key={g.key} className="flex flex-col gap-2">
                <div className="text-[11px] text-[var(--muted-2)] break-all">
                  <span className="font-semibold text-[var(--danger)]">중복 {g.items.length}건</span> · {g.key}
                </div>
                {g.items.map((it) => (
                  <ArchiveRow
                    key={it.id}
                    item={it}
                    categories={categories}
                    link={linkStatus[it.id]}
                    selected={sel.has(it.id)}
                    onToggle={() => setSel((prev) => { const n = new Set(prev); n.has(it.id) ? n.delete(it.id) : n.add(it.id); return n; })}
                  />
                ))}
              </div>
            ))}
          </div>
        )
      ) : isRejectedTab ? (
        rejectedFiltered.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--muted)]">거절된 자료가 없어요</div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-[var(--muted-2)]">거절된 제안과 사유 기록이에요. 같은 자료가 다시 올라오면 여기서 이유를 확인할 수 있어요. 다시 올릴 만하면 "다시 검토"로 등록요청 큐에 되돌릴 수 있어요.</p>
            {rejectedFiltered.map((r) => <RejectedRowItem key={r.id} item={r} />)}
          </div>
        )
      ) : (
        <>
          {/* 일괄 작업 툴바 */}
          {sorted.length > 0 && (
            <BulkBar items={sorted} sel={sel} setSel={setSel} categories={categories} />
          )}

          {visible.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--muted)]">조건에 맞는 자료가 없어요</div>
          ) : (
            <div className="flex flex-col gap-2">
              {visible.map((it) => (
                <ArchiveRow
                  key={it.id}
                  item={it}
                  categories={categories}
                  link={linkStatus[it.id]}
                  selected={sel.has(it.id)}
                  onToggle={() => setSel((prev) => { const n = new Set(prev); n.has(it.id) ? n.delete(it.id) : n.add(it.id); return n; })}
                />
              ))}
            </div>
          )}

          {sorted.length > showCount && (
            <button
              onClick={() => setShowCount((c) => c + STEP)}
              className="self-center mt-1 px-5 py-2.5 rounded-[var(--r-sm)] border border-[var(--border-strong)] hover:bg-[var(--card)] text-sm font-medium"
            >
              더 보기 ({sorted.length - showCount}건)
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** 일괄 작업 바 — 전체선택 + 선택 건에 숨김/공개/삭제/분류변경. */
function BulkBar({
  items,
  sel,
  setSel,
  categories,
}: {
  items: ArchiveRowItem[];
  sel: Set<number>;
  setSel: (s: Set<number>) => void;
  categories: Cat[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [main, setMain] = useState('');
  const [sub, setSub] = useState('');

  const ids = items.map((it) => it.id);
  const allSel = ids.length > 0 && ids.every((id) => sel.has(id));
  const mains = Array.from(new Set(categories.map((c) => c.main_category)));
  const subs = categories.filter((c) => c.main_category === main && c.sub_category).map((c) => c.sub_category!);

  function toggleAll() {
    setSel(allSel ? new Set() : new Set(ids));
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); setSel(new Set()); setCatOpen(false); router.refresh(); }
    catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }

  const selIds = Array.from(sel);

  async function bulkStatus(next: 'public' | 'hidden' | 'deleted') {
    const labels = { public: '공개', hidden: '숨김', deleted: '삭제' } as const;
    if (next === 'deleted' && !confirm(`선택한 ${selIds.length}건을 삭제할까요? "삭제됨"에서 되살릴 수 있어요.`)) return;
    await run(() => bulkSetArchiveStatus(selIds, next).then(() => { void labels; }));
  }

  async function applyCategory() {
    if (!main) { alert('대분류를 선택해주세요'); return; }
    await run(() => bulkSetCategory(selIds, main, sub));
  }

  return (
    <div className="flex flex-col gap-2 text-xs">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="inline-flex items-center gap-1.5 cursor-pointer text-[var(--muted)] select-none">
          <input type="checkbox" checked={allSel} onChange={toggleAll} className="accent-[var(--accent)] w-3.5 h-3.5" />
          전체 선택
        </label>
        {sel.size > 0 && (
          <>
            <span className="font-medium text-[var(--fg)]">{sel.size}건 선택</span>
            <button onClick={() => bulkStatus('public')} disabled={busy} className="inline-flex items-center gap-1 hover:text-[var(--success)] transition"><Eye size={13} /> 공개</button>
            <button onClick={() => bulkStatus('hidden')} disabled={busy} className="inline-flex items-center gap-1 hover:text-[var(--warning)] transition"><EyeOff size={13} /> 숨김</button>
            <button onClick={() => bulkStatus('deleted')} disabled={busy} className="inline-flex items-center gap-1 hover:text-[var(--danger)] transition"><Trash2 size={13} /> 삭제</button>
            <button onClick={() => setCatOpen((v) => !v)} disabled={busy} className="inline-flex items-center gap-1 hover:text-[var(--accent)] transition"><FolderInput size={13} /> 분류 변경</button>
            <button onClick={() => setSel(new Set())} disabled={busy} className="text-[var(--muted-2)] hover:text-[var(--fg)] transition">선택 해제</button>
          </>
        )}
      </div>
      {sel.size > 0 && catOpen && (
        <div className="flex items-center gap-2 flex-wrap p-2 rounded-[var(--r-sm)] bg-[var(--card)] border border-[var(--border)]">
          <select value={main} onChange={(e) => { setMain(e.target.value); setSub(''); }} className={`${inputCls} w-auto`}>
            <option value="">대분류 선택</option>
            {mains.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input value={sub} onChange={(e) => setSub(e.target.value)} list="bulk-sub" placeholder="소분류(선택)" className={`${inputCls} w-auto`} />
          <datalist id="bulk-sub">{subs.map((s) => <option key={s} value={s} />)}</datalist>
          <UIButton size="sm" onClick={applyCategory} disabled={busy || !main}>{busy ? '적용 중…' : `${sel.size}건 분류 적용`}</UIButton>
        </div>
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

function ArchiveRow({
  item,
  categories,
  link,
  selected,
  onToggle,
}: {
  item: ArchiveRowItem;
  categories: Cat[];
  link?: LinkInfo;
  selected: boolean;
  onToggle: () => void;
}) {
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
  const [extUrl, setExtUrl] = useState(item.external_url ?? '');
  const [fileUrl, setFileUrl] = useState(item.file_url ?? '');
  const [status, setStatus] = useState(item.status);

  const mains = Array.from(new Set(categories.map((c) => c.main_category)));
  const subs = categories.filter((c) => c.main_category === main && c.sub_category).map((c) => c.sub_category!);
  const src = item.external_url || item.file_url;

  function cancel() {
    setTitle(item.title); setSummary(item.summary ?? ''); setMain(item.main_category ?? '');
    setSub(item.sub_category ?? ''); setTags((item.tags ?? []).join(', ')); setFormat(item.format ?? '');
    setKind(item.kind); setExtUrl(item.external_url ?? ''); setFileUrl(item.file_url ?? ''); setEditing(false);
  }

  async function save() {
    if (!title.trim()) { alert('제목은 비울 수 없어요'); return; }
    setBusy(true);
    try {
      await updateArchiveItem(item.id, {
        title: title.trim(), summary, main_category: main, sub_category: sub,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean), format, kind,
        external_url: extUrl, file_url: fileUrl,
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
        <label className="text-[11px] text-[var(--muted-2)] -mb-1">외부 링크</label>
        <input className={inputCls} value={extUrl} onChange={(e) => setExtUrl(e.target.value)} placeholder="https:// (외부 링크가 없으면 비움)" inputMode="url" />
        <label className="text-[11px] text-[var(--muted-2)] -mb-1">파일 링크</label>
        <input className={inputCls} value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="업로드된 파일 링크 (없으면 비움)" inputMode="url" />
        <div className="flex gap-1.5 mt-0.5">
          <UIButton size="sm" onClick={save} disabled={busy}>{busy ? '저장 중…' : '저장'}</UIButton>
          <UIButton size="sm" variant="secondary" onClick={cancel} disabled={busy}>취소</UIButton>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-card flex items-start gap-3 p-3 sm:p-4 bg-[var(--card)] min-w-0 ${selected ? 'ring-1 ring-[var(--accent)]' : ''}`}>
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="mt-1 shrink-0 accent-[var(--accent)] w-4 h-4"
        aria-label={`${item.title} 선택`}
      />
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[11px] text-[var(--muted-2)] flex-wrap">
          <StatusBadge status={status} />
          <LinkBadge info={link} />
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

/** 거절된 제안 한 건 — 사유 표시 + "다시 검토"(pending 복귀). */
function RejectedRowItem({ item }: { item: RejectedRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const src = item.external_url || item.file_url;

  async function reconsider() {
    if (!confirm('이 자료를 다시 검토 대기로 되돌릴까요? 자료등록요청 큐에 다시 떠요.')) return;
    setBusy(true);
    try { await reconsiderProposal(item.id); router.refresh(); }
    catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="app-card flex items-start justify-between gap-3 p-3 sm:p-4 bg-[var(--card)] min-w-0">
      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status="rejected" />
          <span className="text-[11px] text-[var(--muted-2)]">제안 {item.proposer ?? '익명'} · {new Date(item.proposed_at).toLocaleDateString('ko-KR')}{item.reviewed_at ? ` · 거절 ${new Date(item.reviewed_at).toLocaleDateString('ko-KR')}` : ''}</span>
        </div>
        <h3 className="font-semibold text-sm break-words">{item.title}</h3>
        {src && (
          <a href={src} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[var(--muted-2)] hover:text-[var(--accent)] hover:underline break-all inline-flex items-center gap-1 line-clamp-1">
            <ExternalLink size={11} className="shrink-0" aria-hidden /><span>{src}</span>
          </a>
        )}
        <p className="text-xs text-[var(--fg)] bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)] px-2 py-1.5 break-words">
          <span className="text-[var(--muted-2)]">거절 사유 · </span>{item.reviewer_note || '사유 없음'}
        </p>
      </div>
      <button onClick={reconsider} disabled={busy} className="inline-flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-[var(--accent)] transition shrink-0">
        <Undo2 size={12} aria-hidden /> {busy ? '처리 중…' : '다시 검토'}
      </button>
    </div>
  );
}
