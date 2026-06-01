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
    <div className="flex flex-col gap-6 max-w-2xl">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold">자료 등록</h1>
        <p className="text-sm text-[var(--muted)]">
          URL 또는 파일을 등록하면 운영진 2명이 검토 후 자료실로 이관됩니다. URL은 자동 분석 후 내용 확인·수정 가능.
        </p>
      </section>

      {sp.ok && (
        <div className="p-4 rounded border border-green-500/40 bg-green-500/10 text-sm">
          ✅ 등록 완료. 운영진 검토 대기 중.
        </div>
      )}
      {sp.error && (
        <div className="p-4 rounded border border-red-500/40 bg-red-500/10 text-sm">
          ⚠ {sp.error}
        </div>
      )}

      <SubmitForm categories={categories.map((c) => ({ main_category: c.main_category, sub_category: c.sub_category }))} />
    </div>
  );
}
