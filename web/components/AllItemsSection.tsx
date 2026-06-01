'use client';
import { useMemo, useState } from 'react';
import { ItemCard } from './ItemCard';
import type { ArchiveItem } from '@/types/db';

type Props = {
  items: ArchiveItem[];
  categories: { name: string; count: number }[];
};

const FORMATS = ['아티클', '영상', '가이드', '템플릿', '기획서', '세미나'];
const KINDS = [
  { v: 'all', label: '전체', color: 'var(--muted)' },
  { v: 'files', label: '자료실', color: 'var(--files)' },
  { v: 'insights', label: '인사이트', color: 'var(--insights)' },
] as const;

export function AllItemsSection({ items, categories }: Props) {
  const [kind, setKind] = useState<'all' | 'files' | 'insights'>('all');
  const [main, setMain] = useState<string | null>(null);
  const [format, setFormat] = useState<string | null>(null);
  const [sort, setSort] = useState<'recent' | 'popular'>('recent');
  const [showCount, setShowCount] = useState(24);

  const filtered = useMemo(() => {
    let r = items;
    if (kind !== 'all') r = r.filter((it) => it.kind === kind);
    if (main) r = r.filter((it) => it.main_category === main);
    if (format) r = r.filter((it) => it.format === format);
    if (sort === 'popular') r = [...r].sort((a, b) => b.views - a.views);
    return r;
  }, [items, kind, main, format, sort]);

  const sortedCats = [...categories].sort((a, b) => b.count - a.count);

  function reset() {
    setKind('all'); setMain(null); setFormat(null); setSort('recent');
  }
  const hasFilter = kind !== 'all' || main || format || sort !== 'recent';

  return (
    <section className="flex flex-col gap-3" aria-label="전체 자료">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-base sm:text-lg font-semibold">전체 자료</h2>
        <span className="text-xs text-[var(--muted)]">{filtered.length.toLocaleString()}건</span>
      </div>

      {/* kind 토글 — 색으로 구분 */}
      <div className="flex gap-1.5">
        {KINDS.map((k) => {
          const active = kind === k.v;
          return (
            <button
              key={k.v}
              onClick={() => setKind(k.v)}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg border-2 text-sm font-medium transition ${
                active
                  ? 'border-transparent text-white'
                  : 'bg-[var(--bg)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--border-strong)]'
              }`}
              style={active ? { backgroundColor: `var(${k.v === 'all' ? '--muted' : k.v === 'files' ? '--files' : '--insights'})` } : undefined}
            >
              {k.label}
            </button>
          );
        })}
      </div>

      {/* 카테고리 chips */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
        <button
          onClick={() => setMain(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm border whitespace-nowrap ${
            !main ? 'bg-[var(--fg)] text-[var(--bg)] border-[var(--fg)]' : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]'
          }`}
        >
          전체 카테고리
        </button>
        {sortedCats.map((c) => (
          <button
            key={c.name}
            onClick={() => setMain(main === c.name ? null : c.name)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm border whitespace-nowrap ${
              main === c.name
                ? 'bg-[var(--fg)] text-[var(--bg)] border-[var(--fg)]'
                : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]'
            }`}
          >
            {c.name} <span className="opacity-70">({c.count})</span>
          </button>
        ))}
      </div>

      {/* 형식 + 정렬 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
          <button
            onClick={() => setFormat(null)}
            className={`shrink-0 px-2.5 py-1 rounded text-xs ${!format ? 'bg-[var(--card)] text-[var(--fg)] font-medium' : 'text-[var(--muted)] hover:bg-[var(--card)]'}`}
          >
            모든 형식
          </button>
          {FORMATS.map((f) => (
            <button
              key={f}
              onClick={() => setFormat(format === f ? null : f)}
              className={`shrink-0 px-2.5 py-1 rounded text-xs ${format === f ? 'bg-[var(--card)] text-[var(--fg)] font-medium' : 'text-[var(--muted)] hover:bg-[var(--card)]'}`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs shrink-0">
          <button
            onClick={() => setSort('recent')}
            className={`px-2.5 py-1 rounded ${sort === 'recent' ? 'bg-[var(--card)] text-[var(--fg)] font-medium' : 'text-[var(--muted)] hover:bg-[var(--card)]'}`}
          >
            최신순
          </button>
          <button
            onClick={() => setSort('popular')}
            className={`px-2.5 py-1 rounded ${sort === 'popular' ? 'bg-[var(--card)] text-[var(--fg)] font-medium' : 'text-[var(--muted)] hover:bg-[var(--card)]'}`}
          >
            인기순
          </button>
        </div>
      </div>

      {hasFilter && (
        <button
          onClick={reset}
          className="self-start text-xs text-[var(--accent)] hover:underline"
        >
          ✕ 필터 초기화
        </button>
      )}

      {/* 카드 그리드 */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--muted)]">조건에 맞는 자료가 없습니다</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filtered.slice(0, showCount).map((it) => <ItemCard key={it.id} item={it} />)}
          </div>
          {filtered.length > showCount && (
            <button
              onClick={() => setShowCount((c) => c + 24)}
              className="mx-auto mt-2 px-5 py-2.5 rounded-md border border-[var(--border)] hover:bg-[var(--card)] text-sm"
            >
              더 보기 ({filtered.length - showCount}건)
            </button>
          )}
        </>
      )}
    </section>
  );
}
