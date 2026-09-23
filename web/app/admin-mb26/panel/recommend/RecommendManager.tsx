'use client';

import { useMemo, useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';
import { addFeatured, removeFeatured } from '../actions';

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
const STEP = 24;

/** 배지 라벨 — file_ext 우선, 없으면 영상/사이트/아티클. (홈 카드와 대략 맞춤, 관리용이라 단순화) */
function badge(it: FeaturedRow): string {
  if (it.file_ext) return it.file_ext;
  const u = (it.external_url || it.file_url || '').toLowerCase();
  if (it.format === '영상' || /youtube|youtu\.be|vimeo|tv\.naver/.test(u)) return '영상';
  if (/drive\.google|docs\.google/.test(u)) return '문서';
  return '아티클';
}

export function RecommendManager({ initial, pool }: { initial: FeaturedRow[]; pool: FeaturedRow[] }) {
  const [list, setList] = useState<FeaturedRow[]>(initial);
  const [available, setAvailable] = useState<FeaturedRow[]>(pool);
  const [q, setQ] = useState('');
  const [showCount, setShowCount] = useState(STEP);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // 전체 목록을 클라에서 즉시 필터 (자료 관리와 동일 방식) — 제목·분류 부분일치
  const filtered = useMemo(() => {
    const kws = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!kws.length) return available;
    return available.filter((it) => {
      const hay = (it.title + ' ' + it.main_category).toLowerCase();
      return kws.every((k) => hay.includes(k));
    });
  }, [available, q]);
  const visible = filtered.slice(0, showCount);

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
        setAvailable((prev) => prev.filter((x) => x.id !== it.id));
      } catch (e) {
        setErr(e instanceof Error ? e.message : '추가에 실패했어요');
      }
    });
  }

  function remove(it: FeaturedRow) {
    setErr(null);
    startTransition(async () => {
      try {
        await removeFeatured(it.id);
        setList((prev) => prev.filter((x) => x.id !== it.id));
        // 뺀 자료는 다시 고를 수 있게 목록 맨 앞으로
        setAvailable((prev) => (prev.some((x) => x.id === it.id) ? prev : [it, ...prev]));
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
            아직 추천 자료가 없어요. 아래 목록에서 추가하면 홈에 나타나요.
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
                  onClick={() => remove(it)}
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

      {/* 자료 추가 — 전체 목록 상시 노출, 타이핑하면 즉시 필터 */}
      <section className="flex flex-col gap-2 border-t border-dashed border-[var(--border)] pt-5">
        <div className="text-sm font-medium text-[var(--muted)]">자료 추가</div>
        <div className="flex items-center gap-2 border-2 border-[var(--border)] focus-within:border-[var(--accent)] rounded-[var(--r-sm)] px-3 py-2 bg-[var(--bg)] transition">
          <Search size={16} className="text-[var(--muted-2)] shrink-0" aria-hidden />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setShowCount(STEP);
            }}
            placeholder="제목·분류로 걸러보기 (안 쳐도 전체 목록이 아래에 있어요)"
            aria-label="자료 검색"
            className="flex-1 bg-transparent outline-none text-sm text-[var(--fg)] placeholder:text-[var(--muted-2)]"
          />
        </div>

        <p className="text-[11.5px] text-[var(--muted-2)]">
          {q.trim() ? `검색 결과 ${filtered.length}건` : `전체 ${available.length}건`}
        </p>

        {visible.length === 0 ? (
          <div className="border border-[var(--border)] rounded-[var(--r-sm)] px-3 py-6 text-center text-sm text-[var(--muted-2)]">
            조건에 맞는 공개 자료가 없어요.
          </div>
        ) : (
          <div className="border border-[var(--border)] rounded-[var(--r-sm)] overflow-hidden divide-y divide-[var(--border)]">
            {visible.map((it) => (
              <div key={it.id} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-[var(--card)] transition">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[var(--r-sm)] bg-[var(--accent-bg)] text-[var(--accent)] shrink-0">
                    {badge(it)}
                  </span>
                  <span className="text-sm truncate">{it.title}</span>
                  <span className="text-[11px] text-[var(--muted-2)] shrink-0 hidden sm:inline">{it.main_category}</span>
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
            ))}
          </div>
        )}

        {filtered.length > showCount && (
          <button
            type="button"
            onClick={() => setShowCount((c) => c + STEP)}
            className="self-center mt-1 px-5 py-2.5 rounded-[var(--r-sm)] border border-[var(--border-strong)] hover:bg-[var(--card)] text-sm font-medium"
          >
            더 보기 ({filtered.length - showCount}건)
          </button>
        )}
      </section>
    </div>
  );
}
