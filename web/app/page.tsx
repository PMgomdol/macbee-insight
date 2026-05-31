import Link from 'next/link';
import { ItemCard } from '@/components/ItemCard';
import { getPopularItems, getRecentItems, getCategoryCounts } from '@/lib/queries';

export default async function Home() {
  const [popular, recent, counts] = await Promise.all([
    getPopularItems(8),
    getRecentItems(8),
    getCategoryCounts(),
  ]);

  const totalItems = Array.from(counts.values()).reduce((a, b) => a + b, 0);
  const sortedCats = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-12">
      {/* Hero */}
      <section className="flex flex-col gap-3 py-4 sm:py-8">
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight leading-tight">
          기획자·PM·디자이너를 위한<br />
          <span className="text-[var(--accent)]">맥비기획 자료실</span>
        </h1>
        <p className="text-sm sm:text-base text-[var(--muted)] max-w-xl">
          정비된 자료 {totalItems}건과 FAQ를 한 곳에서 검색. 멤버 누구나 등록·제안 가능, 운영진 2인 승인 후 노출.
        </p>
        <div className="flex gap-2 mt-2">
          <Link
            href="/files"
            className="px-4 py-2 rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition text-sm font-medium"
          >
            자료실 보기
          </Link>
          <Link
            href="/insights"
            className="px-4 py-2 rounded-md border border-[var(--border)] hover:bg-[var(--card)] transition text-sm font-medium"
          >
            인사이트 보기
          </Link>
          <Link
            href="/submit"
            className="px-4 py-2 rounded-md border border-[var(--border)] hover:bg-[var(--card)] transition text-sm font-medium"
          >
            + 자료 등록
          </Link>
        </div>
      </section>

      {/* 카테고리 nav */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[var(--muted)]">카테고리</h2>
        <div className="flex flex-wrap gap-2">
          {sortedCats.map(([cat, n]) => (
            <Link
              key={cat}
              href={`/insights?main=${encodeURIComponent(cat)}`}
              className="text-sm px-3 py-1.5 rounded-md bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)] transition"
            >
              {cat} <span className="text-[var(--muted)]">({n})</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 인기 */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">인기 자료 TOP 8</h2>
        </div>
        {popular.length === 0 ? (
          <div className="text-sm text-[var(--muted)] py-8 text-center">아직 인기 자료가 없습니다</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {popular.map((it) => <ItemCard key={it.id} item={it} />)}
          </div>
        )}
      </section>

      {/* 최신 */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">최신 등록</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {recent.map((it) => <ItemCard key={it.id} item={it} />)}
        </div>
      </section>
    </div>
  );
}
