import { Sparkles, ExternalLink, TriangleAlert } from 'lucide-react';
import { searchAll } from '@/lib/search';
import { aiAnswer } from '@/lib/ai-answer';
import { getAuthState } from '@/lib/auth';
import { UILinkButton } from '@/components/ui/Button';

// 실검색(/search) 안 건드리는 격리 실험 페이지. 검색 고도화 기록용으로 보존.
// 쿼리마다 유료 AI(Gemini+웹검색)를 호출하므로 운영진 전용으로 잠금 + noindex (무단·봇 호출 차단).
export const metadata = { title: '검색 고도화 실험 · 자료실', robots: { index: false, follow: false } };

const DEFAULT_CUT = 8; // 관련도 하한 (원질의10 / 토큰7 / 동의어5 / +제목5 스케일)
const DEFAULT_MIN = 3; // 통과 결과가 이 수 미만이면 AI 보강

function itemUrl(it: { kind?: string; file_url?: string | null; external_url?: string | null }) {
  return it.file_url || it.external_url || (it.kind === 'files' ? '/files' : '/insights');
}

export default async function SearchTestPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cut?: string; min?: string }>;
}) {
  const { user, isReviewer } = await getAuthState();
  if (!user || !isReviewer) {
    return (
      <div className="flex flex-col gap-3 max-w-md py-8">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">검색 고도화 실험</h1>
        <p className="text-sm text-[var(--muted)]">운영진 전용 실험 페이지예요.</p>
        <UILinkButton href="/admin-mb26" className="w-fit">로그인</UILinkButton>
      </div>
    );
  }

  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const cut = Number.isFinite(+(sp.cut ?? '')) && sp.cut ? Math.max(0, +sp.cut) : DEFAULT_CUT;
  const min = sp.min ? Math.max(1, +sp.min) : DEFAULT_MIN;

  const result = q ? await searchAll(q, { sort: 'relevance' }) : null;
  const scored = result?.archivesScored ?? [];
  const passing = scored.filter((s) => s.score >= cut);
  const below = scored.filter((s) => s.score < cut);

  // 통과분이 기준 미만일 때만 AI 보강 — 근거는 '통과한 관련 자료'만 전달(무관 인용 방지)
  const needAi = q && passing.length < min;
  const ai = needAi ? await aiAnswer(q, passing.map((s) => s.item)) : null;

  const cutLinks = [5, 8, 10, 12, 15];

  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <section className="flex flex-col gap-2">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">검색 고도화 실험</h1>
        <p className="text-xs text-[var(--muted)]">
          관련도 점수로 무관 결과를 걸러내고(컷오프), 관련 자료가 부족하면 내부 자료 + 웹을 근거로 AI가 답변을 보강한다.
        </p>
        <form action="/search-test" className="flex gap-2 mt-1">
          <input type="hidden" name="cut" value={cut} />
          <input type="hidden" name="min" value={min} />
          <input
            name="q"
            defaultValue={q}
            placeholder="질의 (예: 카드뉴스, 이미지생성 툴 추천, OKR, 화면설계서)"
            className="flex-1 h-11 px-4 rounded-full bg-[var(--card)] border border-[var(--border-strong)] text-sm outline-none focus:border-[var(--accent)]"
          />
          <button type="submit" className="h-11 px-5 rounded-full bg-[var(--accent)] text-white text-sm font-medium">
            검색
          </button>
        </form>
        {q && (
          <div className="flex items-center gap-2 text-xs text-[var(--muted)] flex-wrap">
            <span>관련도 컷오프 ≥ <strong className="text-[var(--fg)]">{cut}</strong></span>
            <span className="text-[var(--muted-2)]">·</span>
            <span>조절:</span>
            {cutLinks.map((c) => (
              <a
                key={c}
                href={`/search-test?q=${encodeURIComponent(q)}&cut=${c}&min=${min}`}
                className={`px-2 py-0.5 rounded-full border ${
                  c === cut ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'border-[var(--border)] hover:border-[var(--border-strong)]'
                }`}
              >
                {c}
              </a>
            ))}
          </div>
        )}
      </section>

      {q && (
        <>
          {/* 통과 결과 */}
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">
              관련 자료 {passing.length}건{' '}
              <span className="font-normal text-[var(--muted)]">
                (전체 {scored.length}건 중 컷오프 통과)
              </span>
            </h2>
            {passing.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {passing.slice(0, 12).map(({ item, score }) => (
                  <li key={item.id} className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded-[var(--r-sm)] bg-[var(--accent-bg)] text-[var(--accent)] text-[11px] font-semibold tabular-nums">
                      {score}
                    </span>
                    <span>
                      <a href={itemUrl(item)} target="_blank" rel="noreferrer" className="text-sm text-[var(--fg)] hover:text-[var(--accent)] underline underline-offset-2">
                        {item.title}
                      </a>
                      {item.summary && <span className="text-xs text-[var(--muted)] ml-1">— {item.summary}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[var(--muted)]">컷오프를 넘는 관련 자료 없음 — 아래 AI 답변으로 보강.</p>
            )}
          </section>

          {/* 컷오프에 걸러진 결과 (접힘) */}
          {below.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-xs text-[var(--muted)] hover:text-[var(--fg)]">
                관련도 낮아 제외된 {below.length}건 보기 (점수 &lt; {cut})
              </summary>
              <ul className="flex flex-col gap-1 mt-2 opacity-60">
                {below.slice(0, 20).map(({ item, score }) => (
                  <li key={item.id} className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded-[var(--r-sm)] bg-[var(--card)] text-[var(--muted)] text-[11px] tabular-nums">
                      {score}
                    </span>
                    <span className="text-xs text-[var(--muted)]">{item.title}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* AI 답변 — 통과분 < 기준일 때만 */}
          {needAi && (
            <section className="flex flex-col gap-3 p-4 rounded-[var(--r-lg)] bg-[var(--accent-bg)]">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[var(--accent)]" aria-hidden />
                <h2 className="text-sm font-semibold text-[var(--fg)]">AI 답변</h2>
                <span className="text-[11px] text-[var(--muted)]">
                  · 관련 자료 {passing.length}건 &lt; 기준 {min} → 보강
                </span>
              </div>

              {ai?.error ? (
                <p className="text-sm text-red-600">생성 실패: {ai.error}</p>
              ) : ai ? (
                <>
                  <p className="text-sm leading-relaxed text-[var(--fg)] whitespace-pre-wrap">{ai.answer}</p>

                  {ai.internalUsed.length > 0 && (
                    <div className="text-xs text-[var(--muted)]">
                      <span className="font-medium">참고한 내부 자료:</span> {ai.internalUsed.map((d) => d.title).join(' · ')}
                    </div>
                  )}

                  {ai.webSources.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-[var(--muted)]">웹 출처</span>
                      <ul className="flex flex-col gap-1">
                        {ai.webSources.map((s, i) => (
                          <li key={i}>
                            <a href={s.uri} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline">
                              <ExternalLink size={11} aria-hidden />
                              {s.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="flex items-center gap-1 text-[11px] text-[var(--muted)] pt-1 border-t border-[var(--border)]">
                    <TriangleAlert size={11} aria-hidden />
                    AI가 생성한 답변입니다. 정확하지 않을 수 있으니 참고용으로만 사용하세요.
                  </p>
                </>
              ) : null}
            </section>
          )}

          {!needAi && (
            <p className="text-xs text-[var(--muted-2)]">
              관련 자료 {passing.length}건 ≥ 기준 {min} → AI 보강 안 함 (내부 자료로 충분).
            </p>
          )}
        </>
      )}
    </div>
  );
}
