'use client';
import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { FAQItem } from '@/types/db';

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

  return (
    <div className="flex flex-col gap-4">
      {/* 검색 */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-md border border-[var(--border)] bg-[var(--card)] focus-within:border-[var(--accent)]">
        <Search size={16} className="text-[var(--muted)] shrink-0" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="FAQ 검색..."
          className="flex-1 min-w-0 bg-transparent outline-none text-sm"
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

      {q && (
        <p className="text-xs text-[var(--muted)]">
          <strong className="text-[var(--fg)]">{q}</strong> 결과 {filtered.length}건
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-[var(--muted)]">결과가 없습니다</div>
      ) : (
        Array.from(byCat.entries()).map(([cat, items]) => (
          <section key={cat} className="flex flex-col gap-1.5">
            <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide">
              {cat} <span className="text-[var(--muted-2)] font-normal normal-case">({items.length})</span>
            </h2>
            <div className="flex flex-col">
              {items.map((f) => (
                <details key={f.id} className="group border-b border-[var(--border)]">
                  <summary className="cursor-pointer py-3 px-1 text-sm font-medium select-none flex items-start justify-between gap-3 hover:text-[var(--accent)]">
                    <span className="flex-1 min-w-0">{f.question}</span>
                    <span className="text-xs text-[var(--muted-2)] group-open:rotate-180 transition shrink-0 mt-1" aria-hidden>▼</span>
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
