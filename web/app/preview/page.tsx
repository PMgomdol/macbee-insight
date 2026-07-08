import Link from 'next/link';
import { ItemCard } from '@/components/ItemCard';
import { HorizontalScroll } from '@/components/HorizontalScroll';
import { SearchAutocomplete } from '@/components/SearchAutocomplete';
import { getMonthlyPopularItems, getCategoryCounts } from '@/lib/queries';
import { InteractiveHero } from './InteractiveHero';

export const metadata = {
  title: '자료 검색 (프리뷰) · 맥비기획 자료실',
  description: '검색 중심 랜딩 프리뷰 — 페르소나 검토용',
};

const PLACEHOLDERS = [
  '회원가입 정책이 궁금해요',
  'PRD 템플릿 있을까요?',
  'SNS 로그인 프로세스',
  '결제 화면 참고자료',
  'AI 프롬프트 예시',
  '와이어프레임 레퍼런스',
];

const QUICK_TAGS = ['화면설계서', '피그마 컴포넌트', 'GA4', '리서치', '구독 결제'];

const FOOTER_LINKS = [
  { href: '/faq', label: '처음이신가요? FAQ 보기' },
  { href: '/submit', label: '+ 자료 제안하기' },
  { href: '/files', label: '양식·템플릿 전체' },
  { href: '/insights', label: '아티클·영상 전체' },
];

export default async function PreviewLanding() {
  const [popular, counts] = await Promise.all([
    getMonthlyPopularItems(10),
    getCategoryCounts(),
  ]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col items-stretch gap-14 sm:gap-20 pt-4 sm:pt-8 pb-10">
      {/* 프리뷰 배너 */}
      <div className="w-full max-w-3xl mx-auto">
        <div className="text-[11px] text-[var(--muted-2)] border border-dashed border-[var(--border)] rounded-[var(--r-sm)] px-3 py-1.5 text-center">
          프리뷰 화면 — 검토용 랜딩 시안. 정식 반영 전 상태입니다.
        </div>
      </div>

      {/* 검색 히어로 — 인터랙티브 배경 wrapper */}
      <InteractiveHero>
        <div className="flex flex-col items-center gap-2 text-center px-2">
          <h1 className="text-[26px] leading-[1.2] sm:text-4xl font-bold tracking-tight">
            무엇을 찾아드릴까요?
          </h1>
          <p className="text-xs sm:text-sm text-[var(--muted)] max-w-md">
            {total > 0
              ? `${total.toLocaleString()}건의 실무 자료 · 카톡방 공유 아카이브`
              : '기획자에게 필요한 실무 자료'}
          </p>
        </div>

        <div className="w-full">
          <SearchAutocomplete variant="hero" placeholders={PLACEHOLDERS} />
        </div>

        <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1.5 text-[11px] sm:text-xs text-[var(--muted-2)]">
          <span className="opacity-70">자주 찾는 자료</span>
          {QUICK_TAGS.map((k) => (
            <Link
              key={k}
              href={`/search?q=${encodeURIComponent(k)}`}
              className="hover:text-[var(--fg)] underline decoration-dotted underline-offset-2 whitespace-nowrap"
            >
              {k}
            </Link>
          ))}
        </div>
      </InteractiveHero>

      {/* Top 10 캐러셀 — 배경 없음. 히어로와 자연 대비 */}
      {popular.length > 0 && (
        <section className="w-full flex flex-col gap-3" aria-label="이번 달 인기 자료">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm sm:text-base font-semibold tracking-tight text-[var(--muted)]">
              사람들이 많이 보고 있어요
            </h2>
            <Link
              href="/"
              className="text-xs text-[var(--muted-2)] hover:text-[var(--fg)] whitespace-nowrap"
            >
              전체 자료 →
            </Link>
          </div>
          <HorizontalScroll label="인기 자료 가로 스크롤">
            {popular.map((it) => (
              <div key={it.id} data-card className="shrink-0 w-[220px] sm:w-[260px]">
                <ItemCard item={it} />
              </div>
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* 하단 링크 */}
      <nav
        aria-label="빠른 이동"
        className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-[var(--muted)] pt-2"
      >
        {FOOTER_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-[var(--fg)] whitespace-nowrap">
            {l.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
