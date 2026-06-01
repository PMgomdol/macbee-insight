'use client';
import { useState } from 'react';
import { ItemCard } from './ItemCard';
import type { ArchiveItem } from '@/types/db';

type Props = {
  items: ArchiveItem[];
  categories: { name: string; count: number }[];
};

export function CategoryTabs({ items, categories }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = selected
    ? items.filter((it) => it.main_category === selected)
    : items;

  const totalCount = items.length;
  const sortedCats = [...categories].sort((a, b) => b.count - a.count);

  return (
    <section className="flex flex-col gap-3" aria-label="카테고리별 자료">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <h2 className="text-base sm:text-lg font-semibold">카테고리별 자료</h2>
        <span className="text-xs text-[var(--muted)]">{filtered.length}건 / 전체 {totalCount}건</span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap" role="tablist">
        <button
          role="tab"
          aria-selected={selected === null}
          onClick={() => setSelected(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-sm border whitespace-nowrap transition ${
            selected === null
              ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
              : 'bg-[var(--bg)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--accent)]'
          }`}
        >
          전체
        </button>
        {sortedCats.map((c) => (
          <button
            key={c.name}
            role="tab"
            aria-selected={selected === c.name}
            onClick={() => setSelected(c.name)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm border whitespace-nowrap transition ${
              selected === c.name
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'bg-[var(--bg)] text-[var(--muted)] border-[var(--border)] hover:border-[var(--accent)]'
            }`}
          >
            {c.name} <span className="opacity-70">({c.count})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-8 text-center text-sm text-[var(--muted)]">이 카테고리에 자료 없음</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
          {filtered.slice(0, 12).map((it) => <ItemCard key={it.id} item={it} />)}
        </div>
      )}
    </section>
  );
}
