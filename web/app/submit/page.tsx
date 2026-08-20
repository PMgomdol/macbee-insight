import type { Metadata } from 'next';
import { getCategories } from '@/lib/queries';
import { SubmitForm } from './SubmitForm';

// 제보 폼 — 검색 유입 가치 없고 얇은 페이지라 색인 제외(링크는 따라가게).
export const metadata: Metadata = {
  title: '자료 등록·제보',
  description: '기획에 도움 되는 양식·아티클·영상 URL을 제보해 주세요. 운영진 검토를 거쳐 맥비 자료실에 공유됩니다.',
  robots: { index: false, follow: true },
};

export default async function SubmitPage() {
  const categories = await getCategories();

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto w-full min-w-0">
      <section className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">자료 등록</h1>
        <p className="text-sm text-[var(--muted)]">
          URL만 붙여넣으면 자동으로 정리돼요. 운영진 검토를 거쳐 자료실에 올라가요.
        </p>
      </section>

      <SubmitForm categories={categories.map((c) => ({ main_category: c.main_category, sub_category: c.sub_category }))} />
    </div>
  );
}
