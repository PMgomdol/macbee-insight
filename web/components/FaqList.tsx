'use client';
import { useMemo, useState } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import type { FAQItem } from '@/types/db';

function slugify(s: string) {
  return 'cat-' + encodeURIComponent(s.replace(/\s+/g, '-').toLowerCase());
}

export function FaqList({ faqs }: { faqs: FAQItem[] }) {
  const [q, setQ] = useState('');

  // 전체 카테고리 (검색과 무관 — 점프 메뉴는 항상 노출)
  const allCats = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of faqs) m.set(f.main_category, (m.get(f.main_category) ?? 0) + 1);
    return [...m.entries()];
  }, [faqs]);

  const k = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!k) return faqs;
    return faqs.filter(
      (f) =>
        f.question.toLowerCase().includes(k) ||
        f.answer.toLowerCase().includes(k) ||
        (f.main_category ?? '').toLowerCase().includes(k)
    );
  }, [k, faqs]);

  const byCat = useMemo(() => {
    const m = new Map<string, FAQItem[]>();
    for (const f of filtered) {
      if (!m.has(f.main_category)) m.set(f.main_category, []);
      m.get(f.main_category)!.push(f);
    }
    return m;
  }, [filtered]);

  // 검색 중에도 카테고리 점프 메뉴 유지: 매칭 카운트 표시
  function matchCount(cat: string) {
    return byCat.get(cat)?.length ?? 0;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 큰 검색 박스 — FAQ 전용 */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-[var(--r-md)] border border-[var(--border-strong)] bg-[var(--bg)] focus-within:border-[var(--accent)] focus-within:border-b-2">
        <Search size={18} className="text-[var(--muted)] shrink-0" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="FAQ 검색 — 질문·답변·카테고리 (예: 면접, 피그마, 휴가)"
          className="flex-1 min-w-0 bg-transparent outline-none text-sm sm:text-base"
          aria-label="FAQ 검색"
        />
        {q && (
          <button
            onClick={() => setQ('')}
            className="text-[var(--muted)] hover:text-[var(--fg)] shrink-0"
            aria-label="검색 지우기"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* 카테고리 점프 메뉴 — 항상 노출 (검색 중에도) */}
      {allCats.length > 1 && (
        <nav
          aria-label="카테고리 점프"
          className="sticky top-14 z-30 bg-[var(--bg)] py-2 -mt-2 flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap border-b border-[var(--border)]"
        >
          {allCats.map(([cat, total]) => {
            const hits = matchCount(cat);
            const disabled = !!k && hits === 0;
            return (
              <a
                key={cat}
                href={`#${slugify(cat)}`}
                aria-disabled={disabled}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm border whitespace-nowrap transition ${
                  disabled
                    ? 'border-[var(--border)] text-[var(--muted-2)] opacity-50 pointer-events-none'
                    : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                }`}
              >
                {cat} <span className="opacity-70">({k ? hits : total})</span>
              </a>
            );
          })}
        </nav>
      )}

      {q && (
        <p className="text-xs text-[var(--muted)]">
          <strong className="text-[var(--fg)]">{q}</strong> 결과 {filtered.length}건
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--muted)]">결과가 없습니다. 다른 키워드로 시도하세요.</div>
      ) : (
        // 카테고리 순서는 allCats 기준 (검색해도 그룹 순서 유지)
        allCats.map(([cat]) => {
          const items = byCat.get(cat);
          if (!items || items.length === 0) return null;
          return (
            <section key={cat} id={slugify(cat)} className="flex flex-col gap-1.5 scroll-mt-32">
              <h2 className="text-sm font-semibold text-[var(--fg)] tracking-tight pt-2 sticky top-[7.5rem] bg-[var(--bg)] py-1.5 z-20 border-b border-[var(--border)]">
                {cat} <span className="text-[var(--muted-2)] font-normal">({items.length})</span>
              </h2>
              <div className="flex flex-col">
                {items.map((f) => (
                  <details key={f.id} className="group border-b border-[var(--border)]">
                    <summary className="cursor-pointer py-3 px-1 text-sm font-medium select-none flex items-start justify-between gap-3 hover:text-[var(--accent)] list-none">
                      <span className="flex-1 min-w-0">{f.question}</span>
                      <ChevronDown size={16} className="text-[var(--muted-2)] group-open:rotate-180 transition shrink-0 mt-0.5" aria-hidden />
                    </summary>
                    <div className="px-1 pb-4 pt-1 text-sm text-[var(--muted)] leading-relaxed whitespace-pre-wrap">
                      {f.answer}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
