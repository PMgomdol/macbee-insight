import type { Metadata } from 'next';
import { getFAQs } from '@/lib/queries';
import { FaqList } from '@/components/FaqList';

export const metadata: Metadata = {
  title: '기획·PM 실무 Q&A',
  description:
    '회원가입·결제 프로세스, 기획 산출물, 커리어 등 서비스 기획·PM 실무에서 자주 나오는 질문과 현직자 답변을 모았어요.',
};

export default async function FaqPage() {
  const faqs = await getFAQs();

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">실무 Q&A</h1>
        <p className="text-sm text-[var(--muted)]">기획·PM·디자인 실무 질문과 답변을 모았어요. 총 {faqs.length}건.</p>
      </section>
      <FaqList faqs={faqs} />
    </div>
  );
}
