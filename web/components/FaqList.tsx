'use client';
import { useMemo, useState } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import type { FAQItem } from '@/types/db';

function slugify(s: string) {
  return 'cat-' + encodeURIComponent(s.replace(/\s+/g, '-').toLowerCase());
}

export function FaqList({ faqs }: { faqs: FAQItem[] }) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return faqs;
    return faqs.filter(
      (f) =>
        f.question.toLowerCase().includes(k) ||
        f.answer.toLowerCase().includes(k) ||
        (f.main_category ?? '').toLowerCase().includes(k)
    );
  }, [q, faqs]);

  const byCat = useMemo(() => {
    const m = new Map<string, FAQItem[]>();
    for (const f of filtered) {
      if (!m.has(f.main_category)) m.set(f.main_category, []);
      m.get(f.main_category)!.push(f);
    }
    return m;
  }, [filtered]);

  const cats = Array.from(byCat.entries());

  return (
    <div className="flex flex-col gap-4">
      {/* 검색 */}
      <div className="fc-input px-3 py-2.5">
        <Search size={16} className="text-[var(--muted)] shrink-0" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="FAQ 검색..."
          className="text-sm"
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

      {/* 카테고리 점프 칩 */}
      {!q && cats.length > 1 && (
        <nav aria-label="카테고리 점프" className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
          {cats.map(([cat, items]) => (
            <a
              key={cat}
              href={`#${slugify(cat)}`}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm border border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)] whitespace-nowrap transition"
            >
              {cat} <span className="opacity-70">({items.length})</span>
            </a>
          ))}
        </nav>
      )}

      {q && (
        <p className="text-xs text-[var(--muted)]">
          <strong className="text-[var(--fg)]">{q}</strong> 결과 {filtered.length}건
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--muted)]">결과가 없습니다</div>
      ) : (
        cats.map(([cat, items]) => (
          <section key={cat} id={slugify(cat)} className="flex flex-col gap-1.5 scroll-mt-20">
            <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide pt-2">
              {cat} <span className="text-[var(--muted-2)] font-normal normal-case">({items.length})</span>
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
        ))
      )}
    </div>
  );
}
