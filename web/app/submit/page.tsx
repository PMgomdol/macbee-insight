import { CheckCircle2, AlertCircle } from 'lucide-react';
import { getCategories } from '@/lib/queries';
import { SubmitForm } from './SubmitForm';

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; id?: string }>;
}) {
  const sp = await searchParams;
  const categories = await getCategories();

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto w-full min-w-0">
      <section className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">자료 등록</h1>
        <p className="text-sm text-[var(--muted)]">
          URL이나 파일을 등록하면 운영진 검토 후 자료실로 이관됩니다.
        </p>
      </section>

      {sp.ok && (
        <div role="status" className="flex flex-col gap-1.5 p-3 rounded-[var(--r-sm)] border border-[var(--success)]/40 bg-[var(--success)]/10 text-sm">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 size={16} className="text-[var(--success)]" aria-hidden /> 등록 완료
          </div>
          <p className="text-[var(--muted)]">운영진 2명 검토 후 자료실로 이관됩니다. 검토 결과는 입력하신 이메일로 안내됩니다 (이메일 입력 시).</p>
          {sp.id && (
            <p className="text-[11px] text-[var(--muted-2)] font-mono break-all">제안 ID: {sp.id}</p>
          )}
        </div>
      )}
      {sp.error && (
        <div role="alert" className="flex items-start gap-2 p-3 rounded-[var(--r-sm)] border border-[var(--danger)]/40 bg-[var(--danger)]/10 text-sm">
          <AlertCircle size={16} className="text-[var(--danger)] shrink-0 mt-0.5" aria-hidden />
          <span>{sp.error}</span>
        </div>
      )}

      <SubmitForm categories={categories.map((c) => ({ main_category: c.main_category, sub_category: c.sub_category }))} />
    </div>
  );
}
