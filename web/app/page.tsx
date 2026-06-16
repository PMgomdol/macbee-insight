import { ItemCard } from '@/components/ItemCard';
import { HeroSearch } from '@/components/HeroSearch';
import { HorizontalScroll } from '@/components/HorizontalScroll';
import { AllItemsSection } from '@/components/AllItemsSection';
import { getPopularItems, getCategoryCounts, getItemsByKind } from '@/lib/queries';

export default async function Home() {
  // 전체 자료를 한 번에 받아 client-side 필터 — 카테고리/소분류 클릭 시 서버 round-trip 제거
  const [popular, counts, allInsights, allFiles] = await Promise.all([
    getPopularItems(10),
    getCategoryCounts(),
    getItemsByKind('insights', { pageSize: 1500 }),
    getItemsByKind('files', { pageSize: 500 }),
  ]);

  const categories = Object.entries(counts).map(([name, count]) => ({ name, count }));
  const allItems = [...allInsights.items, ...allFiles.items];

  return (
    <div className="flex flex-col gap-9 sm:gap-12">
      <HeroSearch />

      {/* 인기 10건 — 가로 캐러셀 */}
      {popular.length > 0 && (
        <section className="flex flex-col gap-3" aria-label="인기 자료">
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight">요즘 많이 보는 자료 TOP {popular.length}</h2>
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
