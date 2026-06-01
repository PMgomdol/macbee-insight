import { getFAQs } from '@/lib/queries';
import { FaqList } from '@/components/FaqList';

export default async function FaqPage() {
  const faqs = await getFAQs();

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold">FAQ</h1>
        <p className="text-sm text-[var(--muted)]">기획·PM·디자인 실무 Q&A. 총 {faqs.length}건.</p>
      </section>
      <FaqList faqs={faqs} />
    </div>
  );
}
