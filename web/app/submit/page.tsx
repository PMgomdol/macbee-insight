import { getCategories } from '@/lib/queries';
import { SubmitForm } from './SubmitForm';

export default async function SubmitPage() {
  const categories = await getCategories();

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto w-full min-w-0">
      <section className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">자료 등록</h1>
        <p className="text-sm text-[var(--muted)]">
          URL만 붙여넣으면 자동 분석 → 운영진 검토 후 자료실로 이관됩니다.
        </p>
      </section>

      <SubmitForm categories={categories.map((c) => ({ main_category: c.main_category, sub_category: c.sub_category }))} />
    </div>
  );
}
