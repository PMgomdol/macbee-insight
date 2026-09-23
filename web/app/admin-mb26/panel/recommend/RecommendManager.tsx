'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';
import { addFeatured, removeFeatured, searchArchiveForFeatured } from '../actions';

export type FeaturedRow = {
  id: number;
  title: string;
  main_category: string;
  format: string | null;
  file_ext: string | null;
  external_url: string | null;
  file_url: string | null;
};

const MAX = 6;

/** 배지 라벨 — file_ext 우선, 없으면 영상/사이트/아티클. (홈 카드와 대략 맞춤, 관리용이라 단순화) */
function badge(it: FeaturedRow): string {
  if (it.file_ext) return it.file_ext;
  const u = (it.external_url || it.file_url || '').toLowerCase();
  if (it.format === '영상' || /youtube|youtu\.be|vimeo|tv\.naver/.test(u)) return '영상';
  if (/drive\.google|docs\.google/.test(u)) return '문서';
  return '아티클';
}

export function RecommendManager({ initial }: { initial: FeaturedRow[] }) {
  const [list, setList] = useState<FeaturedRow[]>(initial);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<FeaturedRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 검색 — 300ms 디바운스
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const term = q.trim();
    if (!term) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const r = await searchArchiveForFeatured(term);
        setResults(r);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  function add(it: FeaturedRow) {
    setErr(null);
    if (list.length >= MAX) {
      setErr(`추천은 최대 ${MAX}개까지예요 — 하나 빼고 추가해주세요`);
      return;
    }
    startTransition(async () => {
      try {
        await addFeatured(it.id);
        setList((prev) => [it, ...prev.filter((x) => x.id !== it.id)]);
        setResults((prev) => prev.filter((x) => x.id !== it.id));
      } catch (e) {
        setErr(e instanceof Error ? e.message : '추가에 실패했어요');
      }
    });
  }

  function remove(id: number) {
    setErr(null);
    startTransition(async () => {
      try {
        await removeFeatured(id);
        setList((prev) => prev.filter((x) => x.id !== id));
      } catch (e) {
        setErr(e instanceof Error ? e.message : '빼기에 실패했어요');
      }
    });
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl py-2">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">추천 자료 관리</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          홈 상단에 노출할 자료를 골라주세요. 시기성·이슈 자료를 여기서 갈아끼웁니다.
        </p>
      </div>

      {err && (
        <p className="text-sm text-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_10%,var(--bg))] border border-[var(--danger)] rounded-[var(--r-sm)] px-3 py-2">
          {err}
        </p>
      )}

      {/* 현재 추천 목록 */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--muted)]">
          현재 추천 중
          <span className="text-[11px] font-normal text-[var(--muted-2)] bg-[var(--card)] border border-[var(--border)] rounded-full px-2 py-0.5">
            {list.length} / {MAX}
          </span>
        </div>
        {list.length === 0 ? (
          <p className="text-sm text-[var(--muted-2)] py-3">
            아직 추천 자료가 없어요. 아래에서 검색해 추가하면 홈에 나타나요.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((it) => (
              <li
                key={it.id}
                className="flex items-center gap-3 px-3 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--r-sm)]"
              >
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[var(--r-sm)] bg-[var(--accent-bg)] text-[var(--accent)] shrink-0">
                  {badge(it)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{it.title}</div>
                  <div className="text-[11px] text-[var(--muted-2)] mt-0.5">{it.main_category}</div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(it.id)}
                  disabled={pending}
                  aria-label="추천에서 빼기"
                  title="추천에서 빼기"
                  className="shrink-0 w-7 h-7 grid place-items-center border border-[var(--border)] rounded-[var(--r-sm)] text-[var(--muted-2)] hover:border-[var(--danger)] hover:text-[var(--danger)] transition disabled:opacity-50"
                >
                  <X size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11.5px] text-[var(--muted-2)] leading-relaxed">
          최대 {MAX}개까지. 최근 추가한 자료가 홈 왼쪽에 먼저 나옵니다.
        </p>
      </section>

      {/* 자료 추가 */}
      <section className="flex flex-col gap-2 border-t border-dashed border-[var(--border)] pt-5">
        <div className="text-sm font-medium text-[var(--muted)]">자료 추가</div>
        <div className="flex items-center gap-2 border-2 border-[var(--border)] focus-within:border-[var(--accent)] rounded-[var(--r-sm)] px-3 py-2 bg-[var(--bg)] transition">
          <Search size={16} className="text-[var(--muted-2)] shrink-0" aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="추천할 자료를 제목·내용으로 검색"
            aria-label="자료 검색"
            className="flex-1 bg-transparent outline-none text-sm text-[var(--fg)] placeholder:text-[var(--muted-2)]"
          />
        </div>
        {q.trim() && (
          <div className="border border-[var(--border)] rounded-[var(--r-sm)] overflow-hidden divide-y divide-[var(--border)]">
            {searching ? (
              <div className="px-3 py-3 text-sm text-[var(--muted-2)]">검색 중…</div>
            ) : results.length === 0 ? (
              <div className="px-3 py-3 text-sm text-[var(--muted-2)]">일치하는 공개 자료가 없어요 (이미 추천된 자료는 제외).</div>
            ) : (
              results.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-[var(--card)] transition">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[var(--r-sm)] bg-[var(--accent-bg)] text-[var(--accent)] shrink-0">
                      {badge(it)}
                    </span>
                    <span className="text-sm truncate">{it.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => add(it)}
                    disabled={pending || list.length >= MAX}
                    className="shrink-0 text-xs font-semibold text-[var(--accent)] bg-[var(--accent-bg)] rounded-[var(--r-sm)] px-2.5 py-1 hover:brightness-95 transition disabled:opacity-50"
                  >
                    + 추가
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}
