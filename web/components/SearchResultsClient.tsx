'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, LayoutGrid, LayoutList } from 'lucide-react';
import { ItemCard, ItemRow } from './ItemCard';
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
  const [view, setView] = useState<'card' | 'list'>('card');

  useEffect(() => {
    const saved = localStorage.getItem('archive_view');
    if (saved === 'list' || saved === 'card') setView(saved);
  }, []);

  function changeView(next: 'card' | 'list') {
    setView(next);
    localStorage.setItem('archive_view', next);
    track('filter_change', { type: 'view', value: next, page: 'search' });
  }

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
      {/* 종류 = 최상위 스코프 전환 → 탭(섹션 전환류). 양식·템플릿/콘텐츠는 원래 별도 메뉴라 탭이 위계상 맞음. */}
      <div role="tablist" aria-label="자료 종류" className="flex gap-1 border-b border-[var(--border)] overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
        <KindTab active={!kind} onClick={() => pickKind(undefined)} label="전체" n={archives.length} />
        <KindTab active={kind === 'files'} onClick={() => pickKind('files')} label="양식·템플릿" n={kindCounts.files} />
        <KindTab active={kind === 'insights'} onClick={() => pickKind('insights')} label="콘텐츠" n={kindCounts.insights} />
      </div>

      {/* 대분류 chips — 콘텐츠/템플릿 페이지와 동일한 accent 필터 칩 */}
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

      {/* 뷰 전환(세그먼트) + 정렬(인기순 토글) — files/insights 페이지와 동일 컴포넌트 */}
      {sorted.length > 0 && (
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="inline-flex items-center rounded-full border border-[var(--border)] p-0.5">
            <button
              onClick={() => changeView('card')}
              aria-pressed={view === 'card'}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition ${view === 'card' ? 'bg-[var(--card)] text-[var(--fg)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`}
            >
              <LayoutGrid size={13} aria-hidden /> 카드
            </button>
            <button
              onClick={() => changeView('list')}
              aria-pressed={view === 'list'}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition ${view === 'list' ? 'bg-[var(--card)] text-[var(--fg)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`}
            >
              <LayoutList size={13} aria-hidden /> 목록
            </button>
          </div>
          <button
            onClick={() => pickSort(sort === 'popular' ? 'relevance' : 'popular')}
            className={`px-2.5 py-1 rounded-full font-medium transition ${sort === 'popular' ? 'bg-[var(--card)] text-[var(--fg)]' : 'text-[var(--muted)] hover:bg-[var(--card)]'}`}
          >
            인기순
          </button>
        </div>
      )}

      {/* 자료 그리드 */}
      {sorted.length > 0 && (
        <section className="flex flex-col gap-2.5 mt-1">
          <div
            className={view === 'list' ? 'flex flex-col divide-y divide-[var(--border)] border-y border-[var(--border)]' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'}
            onClick={(e) => trackResultClick(e, '[data-card-id]', 'archive')}
            onAuxClick={(e) => trackResultClick(e, '[data-card-id]', 'archive')}
          >
            {sorted.map((it) => view === 'list' ? <ItemRow key={it.id} item={it} /> : <ItemCard key={it.id} item={it} />)}
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
              <details key={f.id} className="group border-b border-[var(--border)]">
                <summary className="cursor-pointer py-3 text-sm font-medium select-none flex items-start justify-between gap-3 hover:text-[var(--accent)] list-none">
                  <span className="flex-1 min-w-0">{f.question}</span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-[var(--muted-2)]">{f.main_category}</span>
                    <ChevronDown size={16} className="text-[var(--muted-2)] group-open:rotate-180 transition" aria-hidden />
                  </span>
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

// 종류 탭 — 제출 폼 탭과 동일한 언더라인 스타일. "섹션 전환"이라 필터 칩과 시각 언어를 구분.
function KindTab({ active, onClick, label, n }: { active: boolean; onClick: () => void; label: string; n: number }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`shrink-0 px-3 sm:px-4 py-2.5 text-sm -mb-px border-b-2 whitespace-nowrap transition ${
        active ? 'border-[var(--accent)] text-[var(--accent)] font-semibold' : 'border-transparent text-[var(--muted)] hover:text-[var(--fg)]'
      }`}
    >
      {label} <span className="text-xs opacity-70">{n}</span>
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm border whitespace-nowrap transition ${
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
      className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition ${
        active ? 'bg-[var(--card)] text-[var(--fg)]' : 'text-[var(--muted)] hover:bg-[var(--card)]'
      }`}
    >
      {children}
    </button>
  );
}
