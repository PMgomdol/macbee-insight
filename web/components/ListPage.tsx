import Link from 'next/link';
import { ItemCard } from './ItemCard';
import { getItemsByKind, getCategoryCounts } from '@/lib/queries';

type Props = {
  kind: 'files' | 'insights';
  title: string;
  desc: string;
  searchParams: { main?: string; sub?: string; format?: string; sort?: string; page?: string };
};

const FORMATS = ['아티클', '영상', '가이드', '템플릿', '기획서', '세미나'];

export async function ListPage({ kind, title, desc, searchParams }: Props) {
  const page = parseInt(searchParams.page ?? '1') || 1;
  const sort = (searchParams.sort as 'recent' | 'popular') || 'recent';
  const [{ items, total }, counts] = await Promise.all([
    getItemsByKind(kind, {
      page,
      pageSize: 24,
      main: searchParams.main,
      sub: searchParams.sub,
      format: searchParams.format,
      sort,
    }),
    getCategoryCounts(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / 24));
  const sortedCats = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  const buildHref = (params: Partial<typeof searchParams>) => {
    const u = new URLSearchParams();
    const all = { ...searchParams, ...params };
    Object.entries(all).forEach(([k, v]) => { if (v) u.set(k, v); });
    return `/${kind === 'files' ? 'files' : 'insights'}${u.toString() ? `?${u.toString()}` : ''}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold">{title}</h1>
        <p className="text-sm text-[var(--muted)]">{desc} <span className="text-[var(--muted-2)]">· 총 {total.toLocaleString()}건</span></p>
      </section>

      {/* 카테고리 chips */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
        <Link
          href={buildHref({ main: undefined, page: undefined })}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm border whitespace-nowrap ${
            !searchParams.main
              ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
              : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]'
          }`}
        >
          전체
        </Link>
        {sortedCats.map(([cat, n]) => (
          <Link
            key={cat}
            href={buildHref({ main: cat, page: undefined })}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm border whitespace-nowrap ${
              searchParams.main === cat
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]'
            }`}
          >
            {cat} <span className="opacity-70">({n})</span>
          </Link>
        ))}
      </div>

      {/* 형식·정렬 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
          <Link
            href={buildHref({ format: undefined, page: undefined })}
            className={`shrink-0 px-2.5 py-1 rounded text-xs ${!searchParams.format ? 'bg-[var(--card)] text-[var(--fg)]' : 'text-[var(--muted)] hover:bg-[var(--card)]'}`}
          >
            모든 형식
          </Link>
          {FORMATS.map((f) => (
            <Link
              key={f}
              href={buildHref({ format: f, page: undefined })}
              className={`shrink-0 px-2.5 py-1 rounded text-xs ${searchParams.format === f ? 'bg-[var(--card)] text-[var(--fg)] font-medium' : 'text-[var(--muted)] hover:bg-[var(--card)]'}`}
            >
              {f}
            </Link>
          ))}
        </div>
        <div className="flex gap-1 text-xs shrink-0">
          <Link
            href={buildHref({ sort: 'recent', page: undefined })}
            className={`px-2.5 py-1 rounded ${sort === 'recent' ? 'bg-[var(--card)] text-[var(--fg)] font-medium' : 'text-[var(--muted)] hover:bg-[var(--card)]'}`}
          >
            최신순
          </Link>
          <Link
            href={buildHref({ sort: 'popular', page: undefined })}
            className={`px-2.5 py-1 rounded ${sort === 'popular' ? 'bg-[var(--card)] text-[var(--fg)] font-medium' : 'text-[var(--muted)] hover:bg-[var(--card)]'}`}
          >
            인기순
          </Link>
        </div>
      </div>

      {/* 리스트 */}
      {items.length === 0 ? (
        <div className="py-16 text-center text-sm text-[var(--muted)]">결과가 없습니다</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
          {items.map((it) => <ItemCard key={it.id} item={it} />)}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <nav className="flex justify-center gap-1 mt-2" aria-label="페이지">
          {page > 1 && (
            <Link href={buildHref({ page: String(page - 1) })} className="px-3 py-1.5 rounded border border-[var(--border)] text-xs hover:border-[var(--accent)]">
              ‹ 이전
            </Link>
          )}
          <span className="px-3 py-1.5 text-xs text-[var(--muted)]">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={buildHref({ page: String(page + 1) })} className="px-3 py-1.5 rounded border border-[var(--border)] text-xs hover:border-[var(--accent)]">
              다음 ›
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
