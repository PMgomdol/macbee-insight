import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { ItemCard } from '@/components/ItemCard';
import { SearchAutocomplete } from '@/components/SearchAutocomplete';
import { searchAll, type SearchOpts } from '@/lib/search';
import { TRENDING } from '@/lib/synonyms';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string; main?: string; sub?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const opts: SearchOpts = {
    kind: sp.kind === 'files' || sp.kind === 'insights' ? sp.kind : undefined,
    main: sp.main,
    sub: sp.sub,
    sort: (sp.sort as SearchOpts['sort']) || 'relevance',
  };

  const result = q ? await searchAll(q, opts) : { archives: [], faqs: [], expanded: [] as string[], synonymCanonical: undefined as string | undefined };

  // 검색 결과 안에서 대분류·소분류 분포 (필터 없이 한 번 더 검색해야 정확하지만 비용 큼 — 현재 결과 기준)
  const mainCounts = new Map<string, number>();
  for (const it of result.archives) {
    mainCounts.set(it.main_category, (mainCounts.get(it.main_category) ?? 0) + 1);
  }
  const subCounts = new Map<string, number>();
  if (sp.main) {
    for (const it of result.archives) {
      if (it.main_category !== sp.main) continue;
      const s = it.sub_category;
      if (!s) continue;
      subCounts.set(s, (subCounts.get(s) ?? 0) + 1);
    }
  }
  const sortedMains = [...mainCounts.entries()].sort((a, b) => b[1] - a[1]);
  const sortedSubs = [...subCounts.entries()].sort((a, b) => b[1] - a[1]);

  const buildHref = (overrides: Partial<typeof sp>) => {
    const u = new URLSearchParams();
    const all = { ...sp, ...overrides };
    Object.entries(all).forEach(([k, v]) => { if (v) u.set(k, v); });
    return `/search${u.toString() ? `?${u.toString()}` : ''}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">검색</h1>
        <SearchAutocomplete variant="page" initial={q} autoFocus={!q} placeholder="제목·태그·카테고리 검색... (예: 화면설계서, 피그마, 면접)" />
      </section>

      {q && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-[var(--muted)]">
            <strong className="text-[var(--fg)]">{q}</strong> 결과 — 자료 {result.archives.length} · 실무 Q&A {result.faqs.length}
          </p>

          {result.synonymCanonical && result.expanded.length > 1 && (
            <div className="flex items-start gap-2 p-3 rounded-[var(--r-sm)] border border-[var(--accent)]/30 bg-[var(--accent-bg)] text-xs">
              <Sparkles size={14} className="text-[var(--accent)] shrink-0 mt-0.5" aria-hidden />
              <span className="flex-1">
                <strong className="text-[var(--fg)]">{result.synonymCanonical}</strong> 관련 키워드를 함께 검색:&nbsp;
                {result.expanded.slice(1).map((t, i) => (
                  <Link key={t} href={`/search?q=${encodeURIComponent(t)}`} className="text-[var(--accent)] hover:underline">
                    {t}{i < result.expanded.length - 2 ? ', ' : ''}
                  </Link>
                ))}
              </span>
            </div>
          )}

          {/* kind + 정렬 */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-1 text-xs flex-wrap">
              <FilterLink href={buildHref({ kind: undefined })} active={!opts.kind}>전체</FilterLink>
              <FilterLink href={buildHref({ kind: 'files' })} active={opts.kind === 'files'}>양식·템플릿</FilterLink>
              <FilterLink href={buildHref({ kind: 'insights' })} active={opts.kind === 'insights'}>아티클·영상</FilterLink>
            </div>
            <div className="flex gap-1 text-xs">
              <FilterLink href={buildHref({ sort: 'relevance' })} active={opts.sort === 'relevance'}>관련도</FilterLink>
              <FilterLink href={buildHref({ sort: 'popular' })} active={opts.sort === 'popular'}>인기순</FilterLink>
              <FilterLink href={buildHref({ sort: 'recent' })} active={opts.sort === 'recent'}>최신순</FilterLink>
            </div>
          </div>

          {/* 대분류 chips — 검색 결과 안 분포 */}
          {sortedMains.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
              <Link
                href={buildHref({ main: undefined, sub: undefined })}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs border whitespace-nowrap transition ${
                  !sp.main
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]'
                }`}
              >
                전체 카테고리
              </Link>
              {sortedMains.map(([cat, n]) => (
                <Link
                  key={cat}
                  href={buildHref({ main: cat, sub: undefined })}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs border whitespace-nowrap transition ${
                    sp.main === cat
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                      : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]'
                  }`}
                >
                  {cat} <span className="opacity-70">({n})</span>
                </Link>
              ))}
            </div>
          )}

          {/* 소분류 chips */}
          {sp.main && sortedSubs.length > 0 && (
            <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap items-center">
              <span className="text-[11px] text-[var(--muted-2)] mr-1 shrink-0">소분류</span>
              <Link
                href={buildHref({ sub: undefined })}
                className={`shrink-0 px-2.5 py-1 rounded-[var(--r-sm)] text-xs ${
                  !sp.sub ? 'bg-[var(--card)] text-[var(--fg)] font-medium' : 'text-[var(--muted)] hover:bg-[var(--card)]'
                }`}
              >
                전체
              </Link>
              {sortedSubs.map(([s, n]) => (
                <Link
                  key={s}
                  href={buildHref({ sub: s })}
                  className={`shrink-0 px-2.5 py-1 rounded-[var(--r-sm)] text-xs ${
                    sp.sub === s ? 'bg-[var(--card)] text-[var(--fg)] font-medium' : 'text-[var(--muted)] hover:bg-[var(--card)]'
                  }`}
                >
                  {s} <span className="opacity-60">({n})</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {q && result.archives.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide">자료</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {result.archives.map((it) => <ItemCard key={it.id} item={it} />)}
          </div>
        </section>
      )}

      {q && result.faqs.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide">실무 Q&A</h2>
          <div className="flex flex-col">
            {result.faqs.map((f) => (
              <details key={f.id} className="border-b border-[var(--border)]">
                <summary className="cursor-pointer py-3 text-sm font-medium select-none flex items-start justify-between gap-3 hover:text-[var(--accent)] list-none">
                  <span className="flex-1 min-w-0">{f.question}</span>
                  <span className="text-xs text-[var(--muted-2)] shrink-0">{f.main_category}</span>
                </summary>
                <div className="pb-4 text-sm text-[var(--muted)] whitespace-pre-wrap">{f.answer}</div>
              </details>
            ))}
          </div>
        </section>
      )}

      {q && result.archives.length === 0 && result.faqs.length === 0 && (
        <div className="flex flex-col gap-3 py-8 text-center">
          <p className="text-sm text-[var(--muted)]">결과 없음. 다른 키워드 시도:</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {TRENDING.map((t) => (
              <Link
                key={t}
                href={`/search?q=${encodeURIComponent(t)}`}
                className="px-3 py-1.5 rounded-full text-xs border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {t}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-2.5 py-1 rounded-[var(--r-sm)] ${active ? 'bg-[var(--card)] text-[var(--fg)] font-medium' : 'text-[var(--muted)] hover:bg-[var(--card)]'}`}
    >
      {children}
    </Link>
  );
}
