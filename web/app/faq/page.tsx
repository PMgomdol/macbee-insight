import { getFAQs } from '@/lib/queries';

export default async function FaqPage() {
  const faqs = await getFAQs();
  const byCat = new Map<string, typeof faqs>();
  for (const f of faqs) {
    if (!byCat.has(f.main_category)) byCat.set(f.main_category, []);
    byCat.get(f.main_category)!.push(f);
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold">FAQ</h1>
        <p className="text-sm text-[var(--muted)]">기획·PM·디자인 실무 Q&A. 총 {faqs.length}건.</p>
      </section>

      {Array.from(byCat.entries()).map(([cat, items]) => (
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
      ))}
    </div>
  );
}
