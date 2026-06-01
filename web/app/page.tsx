import { ItemCard } from '@/components/ItemCard';
import { HeroSearch } from '@/components/HeroSearch';
import { HorizontalScroll } from '@/components/HorizontalScroll';
import { AllItemsSection } from '@/components/AllItemsSection';
import { getPopularItems, getCategoryCounts, getItemsByKind, getFAQs } from '@/lib/queries';

export default async function Home() {
  const [popular, counts, allInsights, allFiles, faqs] = await Promise.all([
    getPopularItems(10),
    getCategoryCounts(),
    getItemsByKind('insights', { pageSize: 200 }),
    getItemsByKind('files', { pageSize: 50 }),
    getFAQs(),
  ]);

  const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);
  const categories = Object.entries(counts).map(([name, count]) => ({ name, count }));
  const allItems = [...allInsights.items, ...allFiles.items];

  return (
    <div className="flex flex-col gap-9 sm:gap-12">
      <HeroSearch total={totalItems} faqCount={faqs.length} />

      {/* 인기 10건 — 가로 캐러셀 */}
      {popular.length > 0 && (
        <section className="flex flex-col gap-3" aria-label="인기 자료">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight">인기 자료 TOP {popular.length}</h2>
            <span className="text-xs text-[var(--muted-2)] hidden sm:inline">← 드래그·스와이프</span>
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

      {/* 전체 자료 — 카테고리·형식·정렬 필터 */}
      <AllItemsSection items={allItems} categories={categories} />
    </div>
  );
}
