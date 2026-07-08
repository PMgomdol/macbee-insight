import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { ItemCard } from '@/components/ItemCard';
import { CollapsibleAnswer } from '@/components/FaqList';
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
  const kind = sp.kind === 'files' || sp.kind === 'insights' ? sp.kind : undefined;
  const sort = (sp.sort as SearchOpts['sort']) || 'relevance';

  // 검색은 필터 없이 한 번만 — 필터는 아래서 계단식으로 적용.
  // 분포(칩 카운트)를 "자기보다 상위 필터만 적용된 집합"에서 계산해야
  // 필터를 걸어도 다른 선택지·해제 버튼이 계속 보인다.
  const result = q ? await searchAll(q, { sort }) : { archives: [], faqs: [], expanded: [] as string[], synonymCanonical: undefined as string | undefined };

  const byKind = kind ? result.archives.filter((it) => it.kind === kind) : result.archives;
  const byMain = sp.main ? byKind.filter((it) => it.main_category === sp.main) : byKind;
  const archives = sp.sub ? byMain.filter((it) => it.sub_category === sp.sub) : byMain;

  // kind 칩 카운트 — 전체 결과 기준
  const kindCounts = { files: 0, insights: 0 };
  for (const it of result.archives) kindCounts[it.kind] += 1;

  // 대분류 분포 — kind만 적용된 집합 기준 (main 해제·전환 항상 가능)
  const mainCounts = new Map<string, number>();
  for (const it of byKind) {
    mainCounts.set(it.main_category, (mainCounts.get(it.main_category) ?? 0) + 1);
  }
  // 소분류 분포 — kind+main 적용, sub 미적용 집합 기준
  const subCounts = new Map<string, number>();
  if (sp.main) {
    for (const it of byMain) {
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
            <strong className="text-[var(--fg)]">{q}</strong> 결과 — 자료 {archives.length}
            {archives.length !== result.archives.length && (
              <span className="text-[var(--muted-2)]"> (전체 {result.archives.length})</span>
            )}
            {' '}· 실무 Q&A {result.faqs.length}
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

          {/* kind + 정렬 — kind 전환 시 하위 필터(소분류) 리셋 */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-1 text-xs flex-wrap">
              <FilterLink href={buildHref({ kind: undefined, sub: undefined })} active={!kind}>
                전체 ({result.archives.length})
              </FilterLink>
              <FilterLink href={buildHref({ kind: 'files', sub: undefined })} active={kind === 'files'}>
                양식·템플릿 ({kindCounts.files})
              </FilterLink>
              <FilterLink href={buildHref({ kind: 'insights', sub: undefined })} active={kind === 'insights'}>
                콘텐츠 ({kindCounts.insights})
              </FilterLink>
            </div>
            <div className="flex gap-1 text-xs">
              <FilterLink href={buildHref({ sort: 'relevance' })} active={sort === 'relevance'}>관련도</FilterLink>
              <FilterLink href={buildHref({ sort: 'popular' })} active={sort === 'popular'}>인기순</FilterLink>
              <FilterLink href={buildHref({ sort: 'recent' })} active={sort === 'recent'}>최신순</FilterLink>
            </div>
          </div>

          {/* 대분류 chips — 검색 결과 안 분포 */}
          {sortedMains.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
              <Link
                href={buildHref({ main: undefined, sub: undefined })}
                className={`shrink-0 px-3 py-1.5 rounded-[var(--r-sm)] text-xs border whitespace-nowrap transition ${
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
                  className={`shrink-0 px-3 py-1.5 rounded-[var(--r-sm)] text-xs border whitespace-nowrap transition ${
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

      {q && archives.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wide">자료</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {archives.map((it) => <ItemCard key={it.id} item={it} />)}
          </div>
        </section>
      )}

      {/* 필터 때문에 자료 0건 — 검색 자체는 결과 있음 */}
      {q && archives.length === 0 && result.archives.length > 0 && (
        <div className="py-6 text-center text-sm text-[var(--muted)]">
          이 필터 조합에는 자료가 없어요.{' '}
          <Link href={buildHref({ kind: undefined, main: undefined, sub: undefined })} className="text-[var(--accent)] hover:underline">
            필터 초기화
          </Link>
        </div>
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
                <CollapsibleAnswer answer={f.answer} />
              </details>
            ))}
          </div>
        </section>
      )}

      {q && result.archives.length === 0 && result.faqs.length === 0 && (
        <div className="flex flex-col gap-3 py-8 text-center">
          <p className="text-sm text-[var(--muted)]">못 찾았어요. 이런 키워드는 어때요?</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {TRENDING.map((t) => (
              <Link
                key={t}
                href={`/search?q=${encodeURIComponent(t)}`}
                className="px-3 py-1.5 rounded-[var(--r-sm)] text-xs border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                {t}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 검색어 없이 진입 — 추천 키워드로 시작 유도 */}
      {!q && (
        <div className="flex flex-col gap-3 py-4">
          <p className="text-xs text-[var(--muted-2)]">추천 키워드</p>
          <div className="flex flex-wrap gap-1.5">
            {TRENDING.map((t) => (
              <Link
                key={t}
                href={`/search?q=${encodeURIComponent(t)}`}
                className="px-3 py-1.5 rounded-[var(--r-sm)] text-xs border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
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
