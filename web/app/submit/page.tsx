import { getCategories } from '@/lib/queries';
import { SubmitForm } from './SubmitForm';

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const categories = await getCategories();

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto w-full min-w-0">
      <section className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold">자료 등록</h1>
        <p className="text-sm text-[var(--muted)]">
          URL이나 파일을 등록하면 운영진 검토 후 자료실로 이관됩니다.
        </p>
      </section>

      {sp.ok && (
        <div role="status" className="p-3 rounded border border-green-500/40 bg-green-500/10 text-sm">
          ✅ 등록 완료. 운영진 검토 대기 중.
        </div>
      )}
      {sp.error && (
        <div role="alert" className="p-3 rounded border border-red-500/40 bg-red-500/10 text-sm">
          ⚠ {sp.error}
        </div>
      )}

      <SubmitForm categories={categories.map((c) => ({ main_category: c.main_category, sub_category: c.sub_category }))} />
    </div>
  );
}
