import Link from 'next/link';
import { ItemCard } from './ItemCard';
import { getItemsByKind } from '@/lib/queries';

type Props = {
  kind: 'files' | 'insights';
  title: string;
  desc: string;
  searchParams: { main?: string; sub?: string; format?: string; sort?: string; page?: string };
};

const FORMATS = ['아티클', '영상', '가이드', '템플릿', '기획서', '세미나'];
const SORTS = [
  { v: 'recent', l: '최신순' },
  { v: 'popular', l: '인기순' },
];

export async function ListPage({ kind, title, desc, searchParams }: Props) {
  const page = parseInt(searchParams.page ?? '1') || 1;
  const sort = (searchParams.sort as 'recent' | 'popular') || 'recent';
  const { items, total } = await getItemsByKind(kind, {
    page,
    pageSize: 24,
    main: searchParams.main,
    sub: searchParams.sub,
    format: searchParams.format,
    sort,
  });
  const totalPages = Math.max(1, Math.ceil(total / 24));

  const buildHref = (params: Partial<typeof searchParams>) => {
    const u = new URLSearchParams();
    const all = { ...searchParams, ...params };
    Object.entries(all).forEach(([k, v]) => { if (v) u.set(k, v); });
    return `/${kind === 'files' ? 'files' : 'insights'}${u.toString() ? `?${u.toString()}` : ''}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
        <p className="text-sm text-[var(--muted)]">{desc}</p>
        <p className="text-xs text-[var(--muted)]">총 {total.toLocaleString()}건</p>
      </section>

      {/* 필터 바 */}
      <section className="flex flex-wrap items-center gap-2 text-sm">
        {(searchParams.main || searchParams.sub || searchParams.format) && (
          <Link href={`/${kind}`} className="px-2 py-1 rounded border border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)]">
            ✕ 필터 초기화
          </Link>
        )}
        {searchParams.main && (
          <span className="px-2 py-1 rounded bg-[var(--card)] border border-[var(--border)]">
            대분류: {searchParams.main}
          </span>
        )}
        {searchParams.sub && (
          <span className="px-2 py-1 rounded bg-[var(--card)] border border-[var(--border)]">
            소분류: {searchParams.sub}
          </span>
        )}
        {searchParams.format && (
          <span className="px-2 py-1 rounded bg-[var(--card)] border border-[var(--border)]">
            형식: {searchParams.format}
          </span>
        )}
        <div className="ml-auto flex gap-1">
          {SORTS.map((s) => (
            <Link
              key={s.v}
              href={buildHref({ sort: s.v as 'recent' | 'popular', page: undefined })}
              className={`px-2 py-1 rounded border ${sort === s.v ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--muted)]'}`}
            >
              {s.l}
            </Link>
          ))}
        </div>
      </section>

      {/* 형식 필터 */}
      <section className="flex flex-wrap gap-1.5 text-xs">
        <Link
          href={buildHref({ format: undefined, page: undefined })}
          className={`px-2 py-1 rounded border ${!searchParams.format ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--muted)]'}`}
        >
          전체
        </Link>
        {FORMATS.map((f) => (
          <Link
            key={f}
            href={buildHref({ format: f, page: undefined })}
            className={`px-2 py-1 rounded border ${searchParams.format === f ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]'}`}
          >
            {f}
          </Link>
        ))}
      </section>

      {/* 리스트 */}
      {items.length === 0 ? (
        <div className="py-16 text-center text-[var(--muted)]">결과가 없습니다</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((it) => <ItemCard key={it.id} item={it} />)}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <nav className="flex justify-center gap-1 mt-4">
          {page > 1 && (
            <Link href={buildHref({ page: String(page - 1) })} className="px-3 py-1.5 rounded border border-[var(--border)] text-sm hover:border-[var(--accent)]">
              ‹ 이전
            </Link>
          )}
          <span className="px-3 py-1.5 text-sm text-[var(--muted)]">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link href={buildHref({ page: String(page + 1) })} className="px-3 py-1.5 rounded border border-[var(--border)] text-sm hover:border-[var(--accent)]">
              다음 ›
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
