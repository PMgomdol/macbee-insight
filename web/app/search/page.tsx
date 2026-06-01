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
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">검색</h1>
        <Suspense fallback={null}><SearchBox initial={q} /></Suspense>
      </section>

      {q && (
        <p className="text-sm text-[var(--muted)]">
          <strong className="text-[var(--fg)]">{q}</strong> 결과 — 자료 {archives.length} · FAQ {faqs.length}
        </p>
      )}

      {q && archives.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-sm font-semibold text-[var(--muted)] uppercase">자료·인사이트</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
            {archives.map((it) => <ItemCard key={it.id} item={it} />)}
          </div>
        </section>
      )}

      {q && faqs.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-[var(--muted)] uppercase">FAQ</h2>
          <div className="flex flex-col">
            {faqs.map((f) => (
              <details key={f.id} className="border-b border-[var(--border)]">
                <summary className="cursor-pointer py-3 text-sm font-medium select-none flex items-start justify-between gap-3 hover:text-[var(--accent)]">
                  <span className="flex-1 min-w-0">{f.question}</span>
                  <span className="text-xs text-[var(--muted-2)] shrink-0">{f.main_category}</span>
                </summary>
                <div className="pb-4 text-sm text-[var(--muted)] whitespace-pre-wrap">{f.answer}</div>
              </details>
            ))}
          </div>
        </section>
      )}

      {q && archives.length === 0 && faqs.length === 0 && (
        <div className="py-16 text-center text-sm text-[var(--muted)]">결과가 없습니다. 다른 키워드로 시도해보세요.</div>
      )}
    </div>
  );
}
