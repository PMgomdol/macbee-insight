import Link from 'next/link';
import { ItemCard } from './ItemCard';
import { getItemsByKind, getCategoryCounts } from '@/lib/queries';

type Props = {
  kind: 'files' | 'insights';
  title: string;
  desc: string;
  searchParams: { main?: string; sub?: string; format?: string; sort?: string; show?: string };
};

const FORMATS = ['아티클', '영상', '가이드', '템플릿', '기획서', '세미나'];
const STEP = 24;

export async function ListPage({ kind, title, desc, searchParams }: Props) {
  const show = parseInt(searchParams.show ?? String(STEP)) || STEP;
  const sort = (searchParams.sort as 'recent' | 'popular') || 'recent';
  const [{ items, total }, counts] = await Promise.all([
    getItemsByKind(kind, {
      page: 1,
      pageSize: show,
      main: searchParams.main,
      sub: searchParams.sub,
      format: searchParams.format,
      sort,
    }),
    getCategoryCounts(kind),
  ]);
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
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-[var(--muted)]">{desc} <span className="text-[var(--muted-2)]">· 총 {total.toLocaleString()}건</span></p>
      </section>

      {/* 카테고리 chips */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
        <Link
          href={buildHref({ main: undefined, show: undefined })}
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
            href={buildHref({ main: cat, show: undefined })}
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

      {/* 형식·정렬 */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
          <Link
            href={buildHref({ format: undefined, show: undefined })}
            className={`shrink-0 px-2.5 py-1 rounded-[var(--r-sm)] text-xs ${!searchParams.format ? 'bg-[var(--card)] text-[var(--fg)] font-medium' : 'text-[var(--muted)] hover:bg-[var(--card)]'}`}
          >
            모든 형식
          </Link>
          {FORMATS.map((f) => (
            <Link
              key={f}
              href={buildHref({ format: f, show: undefined })}
              className={`shrink-0 px-2.5 py-1 rounded-[var(--r-sm)] text-xs ${searchParams.format === f ? 'bg-[var(--card)] text-[var(--fg)] font-medium' : 'text-[var(--muted)] hover:bg-[var(--card)]'}`}
            >
              {f}
            </Link>
          ))}
        </div>
        <div className="flex gap-1 text-xs shrink-0">
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
      </div>

      {/* 리스트 */}
      {items.length === 0 ? (
        <div className="py-16 text-center text-sm text-[var(--muted)]">결과가 없습니다</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((it) => <ItemCard key={it.id} item={it} />)}
        </div>
      )}

      {/* 더 보기 */}
      {items.length < total && (
        <Link
          href={buildHref({ show: String(show + STEP) })}
          className="self-center mt-2 px-5 py-2.5 rounded-[var(--r-sm)] border border-[var(--border-strong)] hover:bg-[var(--card)] text-sm font-medium"
        >
          더 보기 ({(total - items.length).toLocaleString()}건)
        </Link>
      )}
    </div>
  );
}
