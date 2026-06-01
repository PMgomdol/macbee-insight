import Link from 'next/link';
import { ItemCard } from '@/components/ItemCard';
import { CategoryTabs } from '@/components/CategoryTabs';
import { HorizontalScroll } from '@/components/HorizontalScroll';
import { getPopularItems, getRecentItems, getCategoryCounts, getItemsByKind } from '@/lib/queries';

export default async function Home() {
  const [popular, recent, counts, allInsights, allFiles] = await Promise.all([
    getPopularItems(10),
    getRecentItems(6),
    getCategoryCounts(),
    getItemsByKind('insights', { pageSize: 100 }),
    getItemsByKind('files', { pageSize: 50 }),
  ]);

  const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);
  const categories = Object.entries(counts).map(([name, count]) => ({ name, count }));
  const allItems = [...allInsights.items, ...allFiles.items];

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      {/* Hero — 간결 */}
      <section className="flex flex-col gap-2.5 pt-2 sm:pt-4">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
          기획자·PM·디자이너를 위한
          <br className="sm:hidden" />
          <span className="text-[var(--accent)]"> 자료실</span>
        </h1>
        <p className="text-sm text-[var(--muted)]">
          정비된 자료 {totalItems.toLocaleString()}건. 검색·카테고리로 빠르게 찾기.
        </p>
      </section>

      {/* 인기 자료 — 가로 캐러셀 */}
      {popular.length > 0 && (
        <section className="flex flex-col gap-3" aria-label="인기 자료">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base sm:text-lg font-semibold">인기 자료</h2>
            <Link href="/insights?sort=popular" className="text-xs text-[var(--accent)] hover:underline">
              더보기 →
            </Link>
          </div>
          <HorizontalScroll label="인기 자료 가로 스크롤">
            {popular.map((it) => (
              <div key={it.id} className="shrink-0 w-[220px] sm:w-[240px] snap-start">
                <ItemCard item={it} />
              </div>
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* 카테고리 인터랙티브 필터 */}
      <CategoryTabs items={allItems} categories={categories} />

      {/* 최신 등록 */}
      <section className="flex flex-col gap-3" aria-label="최신 등록">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base sm:text-lg font-semibold">최신 등록</h2>
          <Link href="/insights" className="text-xs text-[var(--accent)] hover:underline">
            더보기 →
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
          {recent.map((it) => <ItemCard key={it.id} item={it} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="flex flex-col sm:flex-row gap-2 py-4 border-t border-[var(--border)]">
        <Link
          href="/submit"
          className="px-4 py-2.5 rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition text-sm font-medium text-center"
        >
          + 자료 등록
        </Link>
        <Link
          href="/faq"
          className="px-4 py-2.5 rounded-md border border-[var(--border)] hover:bg-[var(--card)] transition text-sm font-medium text-center"
        >
          FAQ 보기
        </Link>
      </section>
    </div>
  );
}
