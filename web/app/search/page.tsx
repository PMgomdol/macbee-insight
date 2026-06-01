import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { ItemCard } from '@/components/ItemCard';
import { SearchAutocomplete } from '@/components/SearchAutocomplete';
import { searchAll, type SearchOpts } from '@/lib/search';
import { TRENDING } from '@/lib/synonyms';

const FORMATS = ['아티클', '영상', '가이드', '템플릿', '기획서', '세미나'];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string; format?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const opts: SearchOpts = {
    kind: sp.kind === 'files' || sp.kind === 'insights' ? sp.kind : undefined,
    format: sp.format,
    sort: (sp.sort as SearchOpts['sort']) || 'relevance',
  };

  const result = q ? await searchAll(q, opts) : { archives: [], faqs: [], expanded: [] as string[], synonymCanonical: undefined as string | undefined };

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
            <strong className="text-[var(--fg)]">{q}</strong> 결과 — 자료 {result.archives.length} · FAQ {result.faqs.length}
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

          {/* 필터: kind + 형식 + 정렬 */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-1 text-xs flex-wrap">
              <FilterLink href={buildHref({ kind: undefined })} active={!opts.kind}>전체</FilterLink>
              <FilterLink href={buildHref({ kind: 'files' })} active={opts.kind === 'files'}>자료실</FilterLink>
              <FilterLink href={buildHref({ kind: 'insights' })} active={opts.kind === 'insights'}>인사이트</FilterLink>
              <span className="w-px bg-[var(--border)] mx-1" />
              <FilterLink href={buildHref({ format: undefined })} active={!opts.format}>모든 형식</FilterLink>
              {FORMATS.map((f) => (
                <FilterLink key={f} href={buildHref({ format: f })} active={opts.format === f}>{f}</FilterLink>
              ))}
            </div>
            <div className="flex gap-1 text-xs">
              <FilterLink href={buildHref({ sort: 'relevance' })} active={opts.sort === 'relevance'}>관련도</FilterLink>
              <FilterLink href={buildHref({ sort: 'popular' })} active={opts.sort === 'popular'}>인기순</FilterLink>
              <FilterLink href={buildHref({ sort: 'recent' })} active={opts.sort === 'recent'}>최신순</FilterLink>
            </div>
          </div>
        </div>
      )}

      {q && result.archives.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide">자료·인사이트</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {result.archives.map((it) => <ItemCard key={it.id} item={it} />)}
          </div>
        </section>
      )}

      {q && result.faqs.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide">FAQ</h2>
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
