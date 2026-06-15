import Link from 'next/link';
import { Suspense } from 'react';
import { ItemCard } from './ItemCard';
import { ListSearchBox } from './ListSearchBox';
import { getItemsByKind, getCategoryCounts, getSubCategoryCounts } from '@/lib/queries';

type Props = {
  kind: 'files' | 'insights';
  title: string;
  desc: string;
  searchParams: { main?: string; sub?: string; sort?: string; show?: string; q?: string };
};

const STEP = 24;

export async function ListPage({ kind, title, desc, searchParams }: Props) {
  const show = parseInt(searchParams.show ?? String(STEP)) || STEP;
  const sort = (searchParams.sort as 'recent' | 'popular') || 'recent';
  const q = (searchParams.q ?? '').trim();
  const [{ items, total }, counts, subCounts] = await Promise.all([
    getItemsByKind(kind, {
      page: 1,
      pageSize: show,
      main: searchParams.main,
      sub: searchParams.sub,
      sort,
      q: q || undefined,
    }),
    getCategoryCounts(kind),
    searchParams.main ? getSubCategoryCounts(searchParams.main, kind) : Promise.resolve({} as Record<string, number>),
  ]);
  const sortedCats = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const sortedSubs = (Object.entries(subCounts) as [string, number][]).sort((a, b) => b[1] - a[1]);

  const basePath = kind === 'files' ? '/files' : '/insights';
  const buildHref = (params: Partial<typeof searchParams>) => {
    const u = new URLSearchParams();
    const all = { ...searchParams, ...params };
    Object.entries(all).forEach(([k, v]) => { if (v) u.set(k, v); });
    return `${basePath}${u.toString() ? `?${u.toString()}` : ''}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-[var(--muted)]">{desc} <span className="text-[var(--muted-2)]">· 총 {total.toLocaleString()}건</span></p>
      </section>

      {/* 페이지 내 검색 */}
      <Suspense fallback={null}>
        <ListSearchBox basePath={basePath} placeholder={`${title}에서 제목·설명으로 찾아보세요`} />
      </Suspense>

      {q && (
        <p className="text-xs text-[var(--muted)]">
          <strong className="text-[var(--fg)]">{q}</strong> 결과 {total.toLocaleString()}건
          <Link href={buildHref({ q: undefined, show: undefined })} className="ml-2 text-[var(--accent)] hover:underline">검색 지울게요</Link>
        </p>
      )}

      {/* 대분류 chips */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
        <Link
          href={buildHref({ main: undefined, sub: undefined, show: undefined })}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm border whitespace-nowrap transition ${
            !searchParams.main
              ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
              : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]'
          }`}
        >
          전체
        </Link>
        {sortedCats.map(([cat, n]) => (
          <Link
            key={cat}
            href={buildHref({ main: cat, sub: undefined, show: undefined })}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm border whitespace-nowrap transition ${
              searchParams.main === cat
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]'
            }`}
          >
            {cat} <span className="opacity-70">({n})</span>
          </Link>
        ))}
      </div>

      {/* 소분류 chips */}
      {searchParams.main && sortedSubs.length > 0 && (
        <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap items-center">
          <span className="text-[11px] text-[var(--muted-2)] mr-1 shrink-0">소분류</span>
          <Link
            href={buildHref({ sub: undefined, show: undefined })}
            className={`shrink-0 px-2.5 py-1 rounded-[var(--r-sm)] text-xs ${
              !searchParams.sub ? 'bg-[var(--card)] text-[var(--fg)] font-medium' : 'text-[var(--muted)] hover:bg-[var(--card)]'
            }`}
          >
            전체
          </Link>
          {sortedSubs.map(([s, n]) => (
            <Link
              key={s}
              href={buildHref({ sub: s, show: undefined })}
              className={`shrink-0 px-2.5 py-1 rounded-[var(--r-sm)] text-xs ${
                searchParams.sub === s ? 'bg-[var(--card)] text-[var(--fg)] font-medium' : 'text-[var(--muted)] hover:bg-[var(--card)]'
              }`}
            >
              {s} <span className="opacity-60">({n})</span>
            </Link>
          ))}
        </div>
      )}

      {/* 정렬 */}
      <div className="flex items-center justify-end gap-1 text-xs">
        <Link
          href={buildHref({ sort: 'recent', show: undefined })}
          className={`px-2.5 py-1 rounded-[var(--r-sm)] ${sort === 'recent' ? 'bg-[var(--card)] text-[var(--fg)] font-medium' : 'text-[var(--muted)] hover:bg-[var(--card)]'}`}
        >
          최신순
        </Link>
        <Link
          href={buildHref({ sort: 'popular', show: undefined })}
          className={`px-2.5 py-1 rounded-[var(--r-sm)] ${sort === 'popular' ? 'bg-[var(--card)] text-[var(--fg)] font-medium' : 'text-[var(--muted)] hover:bg-[var(--card)]'}`}
        >
          인기순
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center text-sm text-[var(--muted)]">조건에 맞는 자료를 못 찾았어요</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((it) => <ItemCard key={it.id} item={it} />)}
        </div>
      )}

      {items.length < total && (
        <Link
          href={buildHref({ show: String(show + STEP) })}
          scroll={false}
          className="self-center mt-2 px-5 py-2.5 rounded-[var(--r-sm)] border border-[var(--border-strong)] hover:bg-[var(--card)] text-sm font-medium"
        >
          더 보기 ({(total - items.length).toLocaleString()}건)
        </Link>
      )}
    </div>
  );
}
