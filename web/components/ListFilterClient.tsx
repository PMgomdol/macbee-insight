'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, X, LayoutGrid, LayoutList } from 'lucide-react';
import { ItemCard, ItemRow } from './ItemCard';
import type { ArchiveItem } from '@/types/db';
import { track } from '@/lib/track';

type Props = {
  kind: 'files' | 'insights';
  title: string;
  desc: string;
  items: ArchiveItem[];
  /** 전체 건수 — 헤더에는 표시하지 않음(분류 칩의 숫자로 충분). 호환용으로 남김 */
  total?: number;
};

const STEP = 24;

export function ListFilterClient({ kind, title, desc, items }: Props) {
  const [main, setMain] = useState<string | null>(null);
  const [sub, setSub] = useState<string | null>(null);
  const [sort, setSort] = useState<'default' | 'popular'>('default');
  const [q, setQ] = useState('');
  const [showCount, setShowCount] = useState(STEP);
  const [view, setView] = useState<'card' | 'list'>('card');

  // 뷰 선호 기억 (localStorage) — 렌더 후 로드해 하이드레이션 불일치 방지
  useEffect(() => {
    const saved = localStorage.getItem('archive_view');
    if (saved === 'list' || saved === 'card') setView(saved);
  }, []);

  function changeView(next: 'card' | 'list') {
    setView(next);
    localStorage.setItem('archive_view', next);
    track('filter_change', { type: 'view', value: next, page: kind });
  }

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
    // 공백 분리 토큰 AND 매칭 — "화면 기획"이면 두 단어가 각각 어디든 있으면 매칭 (전역 검색과 동일 감각)
    const kws = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let list = items;
    if (main) list = list.filter((it) => it.main_category === main);
    if (sub) list = list.filter((it) => it.sub_category === sub);
    if (kws.length) {
      list = list.filter((it) => {
        const hay = `${it.title} ${it.summary ?? ''} ${(it.tags ?? []).join(' ')}`.toLowerCase();
        return kws.every((kw) => hay.includes(kw));
      });
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
        <p className="text-sm text-[var(--muted)]">{desc}</p>
      </section>

      {/* 페이지 내 검색 — 높이는 h-11(44px) 고정. py-*로 만들면 모바일 input min-height:44px가
          패딩 위에 쌓여 pill이 커진다(FaqList·검색페이지와 동일 패턴). */}
      <div className="flex items-center gap-2 px-4 h-11 rounded-full border border-[var(--border-strong)] bg-[var(--bg)] focus-within:border-[var(--accent)]">
        <Search size={16} className="text-[var(--muted)] shrink-0" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => changeQ(e.target.value)}
          placeholder={`${title}에서 제목·설명·태그로 찾아보세요`}
          className="flex-1 min-w-0 bg-transparent outline-none text-base sm:text-sm"
          aria-label={`${title} 내 검색`}
        />
        {q && (
          <button onClick={() => changeQ('')} className="text-[var(--muted)] hover:text-[var(--fg)] shrink-0 p-2 -m-2" aria-label="입력 지우기">
            <X size={14} />
          </button>
        )}
      </div>

      {q && (
        <p className="text-xs text-[var(--muted)]">
          <strong className="text-[var(--fg)]">{q}</strong> 결과 {filtered.length.toLocaleString()}건
          <button onClick={() => changeQ('')} className="ml-2 text-[var(--accent)] hover:underline">검색 지우기</button>
        </p>
      )}

      {/* 대분류 chips */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
        <button
          onClick={() => selectMain(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm border whitespace-nowrap transition ${
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
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm border whitespace-nowrap transition ${
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
            className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition ${
              !sub ? 'bg-[var(--card)] text-[var(--fg)]' : 'text-[var(--muted)] hover:bg-[var(--card)]'
            }`}
          >
            전체
          </button>
          {subCounts.map(([s, n]) => (
            <button
              key={s}
              onClick={() => selectSub(s)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition ${
                sub === s ? 'bg-[var(--card)] text-[var(--fg)]' : 'text-[var(--muted)] hover:bg-[var(--card)]'
              }`}
            >
              {s} <span className="opacity-60">({n})</span>
            </button>
          ))}
        </div>
      )}

      {/* 뷰 전환(세그먼트) + 정렬(인기순 토글). 뷰 토글은 필터 칩과 구분되게 세그먼트형. */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="inline-flex items-center rounded-full border border-[var(--border)] p-0.5">
          <button
            onClick={() => changeView('card')}
            aria-pressed={view === 'card'}
            aria-label="카드 보기"
            className={`inline-flex items-center px-2.5 py-1.5 rounded-full transition ${view === 'card' ? 'bg-[var(--card)] text-[var(--fg)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`}
          >
            <LayoutGrid size={14} aria-hidden />
          </button>
          <button
            onClick={() => changeView('list')}
            aria-pressed={view === 'list'}
            aria-label="목록 보기"
            className={`inline-flex items-center px-2.5 py-1.5 rounded-full transition ${view === 'list' ? 'bg-[var(--card)] text-[var(--fg)] shadow-sm' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`}
          >
            <LayoutList size={14} aria-hidden />
          </button>
        </div>
        <button
          onClick={() => changeSort(sort === 'popular' ? 'default' : 'popular')}
          className={`px-2.5 py-1 rounded-full font-medium transition ${sort === 'popular' ? 'bg-[var(--card)] text-[var(--fg)]' : 'text-[var(--muted)] hover:bg-[var(--card)]'}`}
        >
          인기순
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-[var(--muted)]">조건에 맞는 자료를 못 찾았어요</div>
      ) : view === 'list' ? (
        <div className="flex flex-col divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {visible.map((it) => <ItemRow key={it.id} item={it} />)}
        </div>
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
