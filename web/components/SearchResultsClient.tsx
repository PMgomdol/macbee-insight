'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ItemCard } from './ItemCard';
import { CollapsibleAnswer } from './FaqList';
import { track } from '@/lib/track';
import type { ArchiveItem, FAQItem } from '@/types/db';

type Kind = 'files' | 'insights' | undefined;
type Sort = 'relevance' | 'popular';

type Props = {
  q: string;
  archives: ArchiveItem[]; // 관련도 순 (서버 정렬 유지)
  faqs: FAQItem[];
  initialKind?: Kind;
  initialMain?: string;
  initialSub?: string;
  initialSort?: Sort;
};

// 필터는 클라이언트 상태 — 클릭마다 서버 왕복·스켈레톤 깜빡임 없음.
// URL은 replaceState로 동기화 (링크 공유·새로고침 대응, 히스토리 오염 없음)
function syncUrl(q: string, kind: Kind, main?: string, sub?: string, sort?: Sort) {
  try {
    const u = new URLSearchParams();
    u.set('q', q);
    if (kind) u.set('kind', kind);
    if (main) u.set('main', main);
    if (sub) u.set('sub', sub);
    if (sort && sort !== 'relevance') u.set('sort', sort);
    window.history.replaceState(null, '', `/search?${u.toString()}`);
  } catch {}
}

export function SearchResultsClient({ q, archives, faqs, initialKind, initialMain, initialSub, initialSort }: Props) {
  const [kind, setKind] = useState<Kind>(initialKind);
  const [main, setMain] = useState<string | undefined>(initialMain);
  const [sub, setSub] = useState<string | undefined>(initialSub);
  const [sort, setSort] = useState<Sort>(initialSort ?? 'relevance');

  // 계단식 필터 — 분포는 자기보다 상위 필터만 적용된 집합 기준
  const byKind = useMemo(() => (kind ? archives.filter((it) => it.kind === kind) : archives), [archives, kind]);
  const byMain = useMemo(() => (main ? byKind.filter((it) => it.main_category === main) : byKind), [byKind, main]);
  const filtered = useMemo(() => (sub ? byMain.filter((it) => it.sub_category === sub) : byMain), [byMain, sub]);

  const sorted = useMemo(() => {
    if (sort === 'popular') return [...filtered].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    return filtered; // relevance = 서버가 준 순서
  }, [filtered, sort]);

  const kindCounts = useMemo(() => {
    const c = { files: 0, insights: 0 };
    for (const it of archives) c[it.kind] += 1;
    return c;
  }, [archives]);

  const sortedMains = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of byKind) m.set(it.main_category, (m.get(it.main_category) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [byKind]);

  const sortedSubs = useMemo(() => {
    if (!main) return [] as [string, number][];
    const m = new Map<string, number>();
    for (const it of byMain) {
      if (!it.sub_category) continue;
      m.set(it.sub_category, (m.get(it.sub_category) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [byMain, main]);

  function pickKind(k: Kind) {
    setKind(k); setSub(undefined);
    syncUrl(q, k, main, undefined, sort);
    track('filter_change', { type: 'kind', value: k ?? 'all', page: 'search' });
  }
  function pickMain(m?: string) {
    setMain(m); setSub(undefined);
    syncUrl(q, kind, m, undefined, sort);
    track('filter_change', { type: 'category', value: m ?? 'all', page: 'search' });
  }
  function pickSub(s?: string) {
    setSub(s);
    syncUrl(q, kind, main, s, sort);
  }
  function pickSort(s: Sort) {
    setSort(s);
    syncUrl(q, kind, main, sub, s);
  }
  function resetAll() {
    setKind(undefined); setMain(undefined); setSub(undefined);
    syncUrl(q, undefined, undefined, undefined, sort);
  }

  // 검색 결과 클릭 트래킹 — ItemCard/FAQ는 공용이라 손 안 대고, 여기서 위임으로
  // 잡는다. position은 컨테이너 안 DOM 순서(0-base)로 계산. 좌/중클릭만.
  function trackResultClick(
    e: React.MouseEvent<HTMLElement>,
    sel: string,
    kind: 'archive' | 'faq',
  ) {
    if (e.button !== 0 && e.button !== 1) return;
    const el = (e.target as HTMLElement).closest(sel) as HTMLElement | null;
    const box = e.currentTarget;
    if (!el || !box.contains(el)) return;
    const position = Array.from(box.querySelectorAll(sel)).indexOf(el);
    track('search_result_click', { query: q, position, kind });
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-[var(--muted)]">
        <strong className="text-[var(--fg)]">{q}</strong> 결과 — 자료 {sorted.length}
        {sorted.length !== archives.length && (
          <span className="text-[var(--muted-2)]"> (전체 {archives.length})</span>
        )}
        {' '}· 실무 Q&A {faqs.length}
      </p>

      {/* kind + 정렬 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1 text-xs flex-wrap">
          <FilterBtn onClick={() => pickKind(undefined)} active={!kind}>전체 ({archives.length})</FilterBtn>
          <FilterBtn onClick={() => pickKind('files')} active={kind === 'files'}>양식·템플릿 ({kindCounts.files})</FilterBtn>
          <FilterBtn onClick={() => pickKind('insights')} active={kind === 'insights'}>콘텐츠 ({kindCounts.insights})</FilterBtn>
        </div>
        <div className="flex gap-1 text-xs">
          <FilterBtn onClick={() => pickSort('relevance')} active={sort === 'relevance'}>관련도</FilterBtn>
          <FilterBtn onClick={() => pickSort('popular')} active={sort === 'popular'}>인기순</FilterBtn>
        </div>
      </div>

      {/* 대분류 chips */}
      {sortedMains.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
          <Chip active={!main} onClick={() => pickMain(undefined)}>전체 카테고리</Chip>
          {sortedMains.map(([cat, n]) => (
            <Chip key={cat} active={main === cat} onClick={() => pickMain(main === cat ? undefined : cat)}>
              {cat} <span className="opacity-70">({n})</span>
            </Chip>
          ))}
        </div>
      )}

      {/* 소분류 chips */}
      {main && sortedSubs.length > 0 && (
        <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap items-center">
          <SubChip active={!sub} onClick={() => pickSub(undefined)}>전체</SubChip>
          {sortedSubs.map(([s, n]) => (
            <SubChip key={s} active={sub === s} onClick={() => pickSub(sub === s ? undefined : s)}>
              {s} <span className="opacity-60">({n})</span>
            </SubChip>
          ))}
        </div>
      )}

      {/* 자료 그리드 */}
      {sorted.length > 0 && (
        <section className="flex flex-col gap-2.5 mt-2">
          <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide">자료</h2>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            onClick={(e) => trackResultClick(e, '[data-card-id]', 'archive')}
            onAuxClick={(e) => trackResultClick(e, '[data-card-id]', 'archive')}
          >
            {sorted.map((it) => <ItemCard key={it.id} item={it} />)}
          </div>
        </section>
      )}

      {/* 필터로 0건 */}
      {sorted.length === 0 && archives.length > 0 && (
        <div className="py-6 text-center text-sm text-[var(--muted)]">
          이 필터 조합에는 자료가 없어요.{' '}
          <button onClick={resetAll} className="text-[var(--accent)] hover:underline">필터 초기화</button>
        </div>
      )}

      {/* 실무 Q&A */}
      {faqs.length > 0 && (
        <section className="flex flex-col gap-2 mt-2">
          <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide">실무 Q&A</h2>
          <div className="flex flex-col" onClick={(e) => trackResultClick(e, 'details', 'faq')}>
            {faqs.map((f) => (
              <details key={f.id} className="border-b border-[var(--border)]">
                <summary className="cursor-pointer py-3 text-sm font-medium select-none flex items-start justify-between gap-3 hover:text-[var(--accent)] list-none">
                  <span className="flex-1 min-w-0">{f.question}</span>
                  <span className="text-xs text-[var(--muted-2)] shrink-0">{f.main_category}</span>
                </summary>
                <CollapsibleAnswer answer={f.answer} />
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded-[var(--r-sm)] ${active ? 'bg-[var(--card)] text-[var(--fg)] font-medium' : 'text-[var(--muted)] hover:bg-[var(--card)]'}`}
    >
      {children}
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-[var(--r-sm)] text-xs border whitespace-nowrap transition ${
        active
          ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
          : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]'
      }`}
    >
      {children}
    </button>
  );
}

function SubChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-2.5 py-1.5 rounded-[var(--r-sm)] text-xs ${
        active ? 'bg-[var(--card)] text-[var(--fg)] font-medium' : 'text-[var(--muted)] hover:bg-[var(--card)]'
      }`}
    >
      {children}
    </button>
  );
}
