import { getFAQs } from '@/lib/queries';

export default async function FaqPage() {
  const faqs = await getFAQs();
  const byCat = new Map<string, typeof faqs>();
  for (const f of faqs) {
    if (!byCat.has(f.main_category)) byCat.set(f.main_category, []);
    byCat.get(f.main_category)!.push(f);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold">FAQ</h1>
        <p className="text-sm text-[var(--muted)]">기획·PM·디자인 실무 Q&A 모음. 총 {faqs.length}건.</p>
      </section>

      {Array.from(byCat.entries()).map(([cat, items]) => (
        <section key={cat} className="flex flex-col gap-2">
          <h2 className="text-base font-semibold border-b border-[var(--border)] pb-1.5">
            {cat} <span className="text-xs text-[var(--muted)] font-normal">({items.length})</span>
          </h2>
          <div className="flex flex-col gap-1">
            {items.map((f) => (
              <details key={f.id} className="group rounded border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)] transition">
                <summary className="cursor-pointer px-4 py-3 text-sm font-medium select-none flex items-center justify-between gap-2">
                  <span className="flex-1">{f.question}</span>
                  <span className="text-xs text-[var(--muted)] group-open:rotate-180 transition">▼</span>
                </summary>
                <div className="px-4 pb-3 pt-1 text-sm text-[var(--muted)] leading-relaxed whitespace-pre-wrap">
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
