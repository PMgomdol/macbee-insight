import Link from 'next/link';
import { ItemCard } from '@/components/ItemCard';
import { HorizontalScroll } from '@/components/HorizontalScroll';
import { SearchAutocomplete } from '@/components/SearchAutocomplete';
import { getMonthlyPopularItems, getCategoryCounts, getTopTags } from '@/lib/queries';

// 카톡 실제 요청 패턴에서 뽑은 순환 힌트 (2년치 대화 상위 요청 문구)
const PLACEHOLDERS = [
  '회원가입 정책이 궁금해요',
  'PRD 템플릿 있을까요?',
  'SNS 로그인 프로세스',
  '결제 화면 참고자료',
  'AI 프롬프트 예시',
  '와이어프레임 레퍼런스',
];

const FOOTER_LINKS = [
  { href: '/submit', label: '+ 자료 제안하기' },
  { href: '/files', label: '양식·템플릿 전체' },
  { href: '/insights', label: '콘텐츠 전체' },
];

export default async function Home() {
  const [popular, counts, topTags] = await Promise.all([
    getMonthlyPopularItems(10),
    getCategoryCounts(),
    getTopTags(5),
  ]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col items-center gap-10 sm:gap-16 pt-8 sm:pt-20 pb-10">
      {/* 중앙 검색 영역 */}
      <section
        className="w-full max-w-2xl flex flex-col items-center gap-5 sm:gap-6"
        aria-label="자료 검색"
      >
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

        {topTags.length > 0 && (
          <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1.5 text-[11px] sm:text-xs text-[var(--muted-2)]">
            <span className="opacity-70">인기 태그</span>
            {topTags.map((k) => (
              <Link
                key={k}
                href={`/search?q=${encodeURIComponent(k)}`}
                className="hover:text-[var(--fg)] underline decoration-dotted underline-offset-2 whitespace-nowrap"
              >
                {k}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Top 10 캐러셀 */}
      {popular.length > 0 && (
        <section className="w-full flex flex-col gap-3" aria-label="이번 달 인기 자료">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm sm:text-base font-semibold tracking-tight text-[var(--muted)]">
              사람들이 많이 보고 있어요
            </h2>
            <Link
              href="/insights"
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
