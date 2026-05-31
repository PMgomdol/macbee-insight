import { Suspense } from 'react';
import { ItemCard } from '@/components/ItemCard';
import { SearchBox } from '@/components/SearchBox';
import { searchAll } from '@/lib/search';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const { archives, faqs } = q ? await searchAll(q) : { archives: [], faqs: [] };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold">검색</h1>
        <Suspense><SearchBox initial={q} /></Suspense>
      </section>

      {q && (
        <p className="text-sm text-[var(--muted)]">
          "{q}" 결과 — 자료 {archives.length}건 · FAQ {faqs.length}건
        </p>
      )}

      {q && archives.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">자료·인사이트</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {archives.map((it) => <ItemCard key={it.id} item={it} />)}
          </div>
        </section>
      )}

      {q && faqs.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">FAQ</h2>
          <div className="flex flex-col gap-1">
            {faqs.map((f) => (
              <details key={f.id} className="rounded border border-[var(--border)] bg-[var(--card)]">
                <summary className="cursor-pointer px-4 py-3 text-sm font-medium select-none flex items-center justify-between">
                  <span className="flex-1">{f.question}</span>
                  <span className="text-xs text-[var(--muted)]">{f.main_category}</span>
                </summary>
                <div className="px-4 pb-3 text-sm text-[var(--muted)] whitespace-pre-wrap">{f.answer}</div>
              </details>
            ))}
          </div>
        </section>
      )}

      {q && archives.length === 0 && faqs.length === 0 && (
        <div className="py-16 text-center text-[var(--muted)]">결과가 없습니다. 다른 키워드로 시도해보세요.</div>
      )}
    </div>
  );
}
