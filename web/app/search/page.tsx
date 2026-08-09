import Link from 'next/link';
import { Sparkles, SearchX, Send } from 'lucide-react';
import { SearchAutocomplete } from '@/components/SearchAutocomplete';
import { SearchResultsClient } from '@/components/SearchResultsClient';
import { SearchResultsTracker } from '@/components/SearchResultsTracker';
import { searchAll } from '@/lib/search';
import { TRENDING } from '@/lib/synonyms';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string; main?: string; sub?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();

  // 검색은 필터 없이 1회 (관련도 정렬) — 필터·정렬은 SearchResultsClient가
  // 클라이언트 상태로 처리 (필터 클릭마다 서버 왕복·스켈레톤 깜빡임 제거)
  const result = q
    ? await searchAll(q, { sort: 'relevance' })
    : {
        archives: [],
        faqs: [],
        expanded: [] as string[],
        synonymCanonical: undefined as string | undefined,
        fallback: undefined as 'chosung' | 'fuzzy' | undefined,
      };

  return (
    <div className="flex flex-col gap-5">
      {q && <SearchResultsTracker query={q} count={result.archives.length + result.faqs.length} fallback={result.fallback} />}
      <section className="flex flex-col gap-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">검색</h1>
        <SearchAutocomplete variant="page" initial={q} placeholder="제목·태그·카테고리 검색... (예: 화면설계서, 피그마, 면접)" />
      </section>

      {q && result.synonymCanonical && result.expanded.length > 1 && (
        <div className="flex items-start gap-2 p-3 rounded-[var(--r-md)] bg-[var(--accent-bg)] text-xs">
          <Sparkles size={14} className="text-[var(--accent)] shrink-0 mt-0.5" aria-hidden />
          {/* 정보성 표시만 — 링크로 만들면 원 질의를 잃고 결과가 오히려 줄어듦 (이미 함께 검색된 키워드) */}
          <span className="flex-1">
            <strong className="text-[var(--fg)]">{result.synonymCanonical}</strong> 관련 키워드를 함께 검색했어요:&nbsp;
            {result.expanded.slice(1).map((t, i) => (
              <span key={t} className="text-[var(--fg)]">
                {t}{i < result.expanded.length - 2 ? ', ' : ''}
              </span>
            ))}
          </span>
        </div>
      )}

      {/* 오타/초성 폴백 안내 — 정확 매칭이 없어서 비슷한 자료를 보여줄 때 */}
      {q && result.fallback && result.archives.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-[var(--r-sm)] bg-[var(--card)] text-xs">
          <SearchX size={14} className="text-[var(--muted)] shrink-0 mt-0.5" aria-hidden />
          <span className="flex-1 text-[var(--muted)]">
            <strong className="text-[var(--fg)]">{q}</strong>
            {result.fallback === 'chosung'
              ? ' 초성에 맞는 자료를 보여드려요.'
              : '와 정확히 일치하는 자료가 없어 비슷한 자료를 보여드려요.'}
          </span>
        </div>
      )}

      {q && (result.archives.length > 0 || result.faqs.length > 0) && (
        <SearchResultsClient
          q={q}
          archives={result.archives}
          faqs={result.faqs}
          initialKind={sp.kind === 'files' || sp.kind === 'insights' ? sp.kind : undefined}
          initialMain={sp.main}
          initialSub={sp.sub}
          initialSort={sp.sort === 'popular' ? 'popular' : 'relevance'}
        />
      )}

      {q && result.archives.length === 0 && result.faqs.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <p className="text-sm text-[var(--muted)]">
            <strong className="text-[var(--fg)]">{q}</strong>에 맞는 자료를 못 찾았어요. 이런 키워드는 어때요?
          </p>
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
          {/* 못 찾은 사람 → 자료 제보자로. 검색어가 곧 수요 데이터 */}
          <div className="flex flex-col items-center gap-1.5 mt-2">
            <p className="text-xs text-[var(--muted-2)]">찾는 자료가 커뮤니티에 아직 없나 봐요.</p>
            <Link
              href="/submit"
              className="slds-button slds-button_brand inline-flex items-center gap-1.5 px-4"
              style={{ minHeight: 40 }}
            >
              <Send size={13} aria-hidden />
              이 주제 자료 제안하기
            </Link>
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
