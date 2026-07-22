'use client';
import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { ItemCard } from './ItemCard';
import type { ArchiveItem } from '@/types/db';
import { track } from '@/lib/track';

type Props = {
  items: ArchiveItem[];
  categories: { name: string; count: number }[];
};

const KINDS = [
  { v: 'all', label: '전체' },
  { v: 'files', label: '양식·템플릿' },
  { v: 'insights', label: '콘텐츠' },
] as const;
const STEP = 24;

export function AllItemsSection({ items, categories }: Props) {
  const [kind, setKind] = useState<'all' | 'files' | 'insights'>('all');
  const [main, setMain] = useState<string | null>(null);
  const [sub, setSub] = useState<string | null>(null);
  const [sort, setSort] = useState<'recent' | 'popular'>('recent');
  const [showCount, setShowCount] = useState(STEP);

  const filtered = useMemo(() => {
    let r = items;
    if (kind !== 'all') r = r.filter((it) => it.kind === kind);
    if (main) r = r.filter((it) => it.main_category === main);
    if (sub) r = r.filter((it) => it.sub_category === sub);
    if (sort === 'popular') r = [...r].sort((a, b) => b.views - a.views);
    return r;
  }, [items, kind, main, sub, sort]);

  const sortedCats = useMemo(() => [...categories].sort((a, b) => b.count - a.count), [categories]);

  // 대분류 선택 시 그 안의 소분류 카운트 (현재 kind 필터 반영)
  const sortedSubs = useMemo(() => {
    if (!main) return [] as { name: string; count: number }[];
    const counts = new Map<string, number>();
    for (const it of items) {
      if (kind !== 'all' && it.kind !== kind) continue;
      if (it.main_category !== main) continue;
      const s = it.sub_category;
      if (!s) continue;
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [items, kind, main]);

  const hasFilter = kind !== 'all' || main || sub;

  function reset() {
    setKind('all'); setMain(null); setSub(null);
  }

  function pickMain(name: string | null) {
    setMain(name);
    setSub(null);
    setShowCount(STEP);
    track('filter_change', { type: 'category', value: name ?? 'all', page: 'home' });
  }

  return (
    <section className="flex flex-col gap-3" aria-label="전체 자료">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-lg sm:text-xl font-semibold tracking-tight">전체 자료</h2>
        <span className="text-xs text-[var(--muted)]">{filtered.length.toLocaleString()}건</span>
      </div>

      {/* kind segmented control */}
      <div role="tablist" aria-label="자료 종류" className="inline-flex p-0.5 rounded-[var(--r-sm)] bg-[var(--card)] border border-[var(--border)] self-start">
        {KINDS.map((k) => {
          const active = kind === k.v;
          return (
            <button
              key={k.v}
              role="tab"
              aria-selected={active}
              onClick={() => { setKind(k.v); setSub(null); track('filter_change', { type: 'kind', value: k.v, page: 'home' }); }}
              className={`px-3 py-1.5 rounded-[var(--r-sm)] text-sm transition ${
                active
                  ? 'bg-[var(--bg)] text-[var(--fg)] font-semibold shadow-[var(--shadow-2)]'
                  : 'text-[var(--muted)] hover:text-[var(--fg)]'
              }`}
            >
              {k.label}
            </button>
          );
        })}
      </div>

      {/* 대분류 chips */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
        <button
          onClick={() => pickMain(null)}
          className={`shrink-0 px-3 py-1.5 rounded-[var(--r-sm)] text-xs sm:text-sm border whitespace-nowrap transition ${
            !main ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]'
          }`}
        >
          전체 카테고리
        </button>
        {sortedCats.map((c) => (
          <button
            key={c.name}
            onClick={() => pickMain(main === c.name ? null : c.name)}
            className={`shrink-0 px-3 py-1.5 rounded-[var(--r-sm)] text-xs sm:text-sm border whitespace-nowrap transition ${
              main === c.name
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]'
            }`}
          >
            {c.name} <span className="opacity-70">({c.count})</span>
          </button>
        ))}
      </div>

      {/* 소분류 chips — 대분류 선택 시 */}
      {main && sortedSubs.length > 0 && (
        <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap items-center">
          <button
            onClick={() => { setSub(null); setShowCount(STEP); }}
            className={`shrink-0 px-2.5 py-1 rounded-[var(--r-sm)] text-xs ${
              !sub ? 'bg-[var(--card)] text-[var(--fg)] font-medium' : 'text-[var(--muted)] hover:bg-[var(--card)]'
            }`}
          >
            전체
          </button>
          {sortedSubs.map((s) => (
            <button
              key={s.name}
              onClick={() => { setSub(sub === s.name ? null : s.name); setShowCount(STEP); }}
              className={`shrink-0 px-2.5 py-1 rounded-[var(--r-sm)] text-xs ${
                sub === s.name ? 'bg-[var(--card)] text-[var(--fg)] font-medium' : 'text-[var(--muted)] hover:bg-[var(--card)]'
              }`}
            >
              {s.name} <span className="opacity-60">({s.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* 정렬 */}
      <div className="flex items-center justify-end gap-1 text-xs">
        <button
          onClick={() => setSort('recent')}
          className={`px-2.5 py-1 rounded-[var(--r-sm)] ${sort === 'recent' ? 'bg-[var(--card)] text-[var(--fg)] font-medium' : 'text-[var(--muted)] hover:bg-[var(--card)]'}`}
        >
          최신순
        </button>
        <button
          onClick={() => setSort('popular')}
          className={`px-2.5 py-1 rounded-[var(--r-sm)] ${sort === 'popular' ? 'bg-[var(--card)] text-[var(--fg)] font-medium' : 'text-[var(--muted)] hover:bg-[var(--card)]'}`}
        >
          인기순
        </button>
      </div>

      {hasFilter && (
        <button
          onClick={reset}
          className="self-start text-xs text-[var(--accent)] hover:underline inline-flex items-center gap-1"
        >
          <X size={12} aria-hidden /> 필터 초기화
        </button>
      )}

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--muted)]">조건에 맞는 자료를 못 찾았어요</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.slice(0, showCount).map((it) => <ItemCard key={it.id} item={it} />)}
          </div>
          {filtered.length > showCount && (
            <button
              onClick={() => setShowCount((c) => c + STEP)}
              className="self-center mt-2 px-5 py-2.5 rounded-[var(--r-sm)] border border-[var(--border-strong)] hover:bg-[var(--card)] text-sm font-medium"
            >
              더 보기 ({(filtered.length - showCount).toLocaleString()}건)
            </button>
          )}
        </>
      )}
    </section>
  );
}
