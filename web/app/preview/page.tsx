import Link from 'next/link';
import { ItemCard } from '@/components/ItemCard';
import { HorizontalScroll } from '@/components/HorizontalScroll';
import { SearchAutocomplete } from '@/components/SearchAutocomplete';
import { getMonthlyPopularItems, getCategoryCounts } from '@/lib/queries';

export const metadata = {
  title: '자료 검색 (프리뷰) · 맥비기획 자료실',
  description: '검색 중심 랜딩 프리뷰 — 페르소나 검토용',
};

// 카톡 실제 요청 패턴에서 뽑은 순환 힌트 (2년치 대화 상위 요청 문구)
const PLACEHOLDERS = [
  '회원가입 정책이 궁금해요',
  'PRD 템플릿 있을까요?',
  'SNS 로그인 프로세스',
  '결제 화면 참고자료',
  'AI 프롬프트 예시',
  '와이어프레임 레퍼런스',
];

export default async function PreviewLanding() {
  const [popular, counts] = await Promise.all([
    getMonthlyPopularItems(10),
    getCategoryCounts(),
  ]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col items-center gap-14 sm:gap-20 pt-6 sm:pt-16 pb-10">
      {/* 프리뷰 배너 */}
      <div className="w-full max-w-3xl px-3 sm:px-0">
        <div className="text-[11px] text-[var(--muted-2)] border border-dashed border-[var(--border)] rounded-[var(--r-sm)] px-3 py-1.5 text-center">
          프리뷰 화면 — 검토용 랜딩 시안. 정식 반영 전 상태입니다.
        </div>
      </div>

      {/* 중앙 검색 영역 */}
      <section
        className="w-full max-w-2xl flex flex-col items-center gap-5 sm:gap-6 px-3 sm:px-0"
        aria-label="자료 검색"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
            무엇을 찾아드릴까요?
          </h1>
          <p className="text-sm text-[var(--muted)]">
            {total > 0 ? `${total.toLocaleString()}건의 실무 자료 · 카톡방 공유 아카이브` : '기획자에게 필요한 실무 자료'}
          </p>
        </div>

        <div className="w-full">
          <SearchAutocomplete
            variant="hero"
            placeholders={PLACEHOLDERS}
            autoFocus
          />
        </div>

        {/* 자주 찾는 예시 — 빈 검색창 클릭 시 드롭다운의 '추천 키워드'와 별개로,
            검색창 밖에서도 노출해 첫 인상에서 성격을 즉시 전달 */}
        <div className="flex flex-wrap justify-center gap-1.5 text-[11px] text-[var(--muted-2)]">
          <span className="opacity-70">자주 찾는 자료:</span>
          {['화면설계서', '피그마 컴포넌트', 'GA4', '리서치', '구독 결제'].map((k) => (
            <Link
              key={k}
              href={`/search?q=${encodeURIComponent(k)}`}
              className="hover:text-[var(--fg)] underline decoration-dotted underline-offset-2"
            >
              {k}
            </Link>
          ))}
        </div>
      </section>

      {/* Top 10 캐러셀 */}
      {popular.length > 0 && (
        <section className="w-full flex flex-col gap-3" aria-label="이번 달 인기 자료">
          <div className="flex items-baseline justify-between gap-3 px-3 sm:px-0">
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[var(--muted)]">
              사람들이 많이 보고 있어요
            </h2>
            <Link
              href="/"
              className="text-xs text-[var(--muted-2)] hover:text-[var(--fg)]"
            >
              전체 자료 →
            </Link>
          </div>
          <HorizontalScroll label="인기 자료 가로 스크롤">
            {popular.map((it) => (
              <div key={it.id} data-card className="shrink-0 w-[240px] sm:w-[260px]">
                <ItemCard item={it} />
              </div>
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* 하단 액션 링크 — 온보딩·자료 제안 */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-[var(--muted)] pt-2">
        <Link href="/faq" className="hover:text-[var(--fg)]">
          처음이신가요? FAQ 보기
        </Link>
        <span className="text-[var(--muted-2)]">·</span>
        <Link href="/submit" className="hover:text-[var(--fg)]">
          + 자료 제안하기
        </Link>
        <span className="text-[var(--muted-2)]">·</span>
        <Link href="/files" className="hover:text-[var(--fg)]">
          양식·템플릿 전체
        </Link>
        <span className="text-[var(--muted-2)]">·</span>
        <Link href="/insights" className="hover:text-[var(--fg)]">
          아티클·영상 전체
        </Link>
      </div>
    </div>
  );
}
