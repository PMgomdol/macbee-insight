'use client';

import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { ItemCard } from './ItemCard';
import type { ArchiveItem } from '@/types/db';
import { track } from '@/lib/track';

type Props = {
  kind: 'files' | 'insights';
  title: string;
  desc: string;
  items: ArchiveItem[];
  total: number;
};

const STEP = 24;

export function ListFilterClient({ kind, title, desc, items, total }: Props) {
  const [main, setMain] = useState<string | null>(null);
  const [sub, setSub] = useState<string | null>(null);
  const [sort, setSort] = useState<'default' | 'popular'>('default');
  const [q, setQ] = useState('');
  const [showCount, setShowCount] = useState(STEP);

  // 대분류 카운트 — 전체 데이터 기준
  const mainCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) m.set(it.main_category, (m.get(it.main_category) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [items]);

  // 선택된 대분류의 소분류 카운트
  const subCounts = useMemo(() => {
    if (!main) return [];
    const m = new Map<string, number>();
    for (const it of items) {
      if (it.main_category !== main || !it.sub_category) continue;
      m.set(it.sub_category, (m.get(it.sub_category) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [items, main]);

  // 필터 + 검색 + 정렬
  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    let list = items;
    if (main) list = list.filter((it) => it.main_category === main);
    if (sub) list = list.filter((it) => it.sub_category === sub);
    if (kw) {
      list = list.filter(
        (it) =>
          it.title.toLowerCase().includes(kw) ||
          (it.summary ?? '').toLowerCase().includes(kw) ||
          (it.tags ?? []).some((t) => t.toLowerCase().includes(kw))
      );
    }
    if (sort === 'popular') {
      list = [...list].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    }
    return list;
  }, [items, main, sub, q, sort]);

  function selectMain(next: string | null) {
    setMain(next);
    setSub(null);
    setShowCount(STEP);
    track('filter_change', { type: 'category', value: next ?? 'all', page: kind });
  }

  function selectSub(next: string | null) {
    setSub(next);
    setShowCount(STEP);
    track('filter_change', { type: 'sub_category', value: next ?? 'all', page: kind });
  }

  function changeSort(next: 'default' | 'popular') {
    setSort(next);
    setShowCount(STEP);
    track('filter_change', { type: 'sort', value: next, page: kind });
  }

  function changeQ(next: string) {
    setQ(next);
    setShowCount(STEP);
  }

  const visible = filtered.slice(0, showCount);

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-[var(--muted)]">
          {desc} <span className="text-[var(--muted-2)]">· 총 {total.toLocaleString()}건</span>
        </p>
      </section>

      {/* 페이지 내 검색 */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-[var(--border-strong)] bg-[var(--bg)] focus-within:border-[var(--accent)] focus-within:border-b-2">
        <Search size={16} className="text-[var(--muted)] shrink-0" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => changeQ(e.target.value)}
          placeholder={`${title}에서 제목·설명·태그로 찾아보세요`}
          className="flex-1 min-w-0 bg-transparent outline-none text-sm"
          aria-label={`${title} 내 검색`}
        />
        {q && (
          <button onClick={() => changeQ('')} className="text-[var(--muted)] hover:text-[var(--fg)] shrink-0" aria-label="입력 지우기">
            <X size={14} />
          </button>
        )}
      </div>

      {q && (
        <p className="text-xs text-[var(--muted)]">
          <strong className="text-[var(--fg)]">{q}</strong> 결과 {filtered.length.toLocaleString()}건
          <button onClick={() => changeQ('')} className="ml-2 text-[var(--accent)] hover:underline">검색 지울게요</button>
        </p>
      )}

      {/* 대분류 chips */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
        <button
          onClick={() => selectMain(null)}
          className={`shrink-0 px-3 py-1.5 rounded-[var(--r-sm)] text-xs sm:text-sm border whitespace-nowrap transition ${
            !main
              ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
              : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]'
          }`}
        >
          전체
        </button>
        {mainCounts.map(([cat, n]) => (
          <button
            key={cat}
            onClick={() => selectMain(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-[var(--r-sm)] text-xs sm:text-sm border whitespace-nowrap transition ${
              main === cat
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]'
            }`}
          >
            {cat} <span className="opacity-70">({n})</span>
          </button>
        ))}
      </div>

      {/* 소분류 chips */}
      {main && subCounts.length > 0 && (
        <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap items-center">
          <button
            onClick={() => selectSub(null)}
            className={`shrink-0 px-2.5 py-1 rounded-[var(--r-sm)] text-xs ${
              !sub ? 'bg-[var(--card)] text-[var(--fg)] font-medium' : 'text-[var(--muted)] hover:bg-[var(--card)]'
            }`}
          >
            전체
          </button>
          {subCounts.map(([s, n]) => (
            <button
              key={s}
              onClick={() => selectSub(s)}
              className={`shrink-0 px-2.5 py-1 rounded-[var(--r-sm)] text-xs ${
                sub === s ? 'bg-[var(--card)] text-[var(--fg)] font-medium' : 'text-[var(--muted)] hover:bg-[var(--card)]'
              }`}
            >
              {s} <span className="opacity-60">({n})</span>
            </button>
          ))}
        </div>
      )}

      {/* 정렬 — 인기순 토글 (기본=등록 순서). 등록일이 전건 동일해 최신순은 제거. */}
      <div className="flex items-center justify-end gap-1 text-xs">
        <button
          onClick={() => changeSort(sort === 'popular' ? 'default' : 'popular')}
          className={`px-2.5 py-1 rounded-[var(--r-sm)] ${sort === 'popular' ? 'bg-[var(--card)] text-[var(--fg)] font-medium' : 'text-[var(--muted)] hover:bg-[var(--card)]'}`}
        >
          인기순
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-[var(--muted)]">조건에 맞는 자료를 못 찾았어요</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((it) => <ItemCard key={it.id} item={it} />)}
        </div>
      )}

      {filtered.length > showCount && (
        <button
          onClick={() => setShowCount((c) => c + STEP)}
          className="self-center mt-2 px-5 py-2.5 rounded-[var(--r-sm)] border border-[var(--border-strong)] hover:bg-[var(--card)] text-sm font-medium"
        >
          더 보기 ({(filtered.length - showCount).toLocaleString()}건)
        </button>
      )}
    </div>
  );
}
