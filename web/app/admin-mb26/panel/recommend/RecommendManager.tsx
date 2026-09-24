'use client';

import { useMemo, useState, useTransition } from 'react';
import { Search, X, GripVertical, ExternalLink } from 'lucide-react';
import type { ArchiveItem } from '@/types/db';
import { ItemCard } from '@/components/ItemCard';
import { HorizontalScroll } from '@/components/HorizontalScroll';
import { addFeatured, removeFeatured, reorderFeatured } from '../actions';

export type PoolRow = {
  id: number;
  title: string;
  summary: string | null;
  main_category: string;
  kind: 'files' | 'insights';
  format: string | null;
  file_ext: string | null;
  external_url: string | null;
  file_url: string | null;
  views: number;
  registered_at: string;
};

const MAX = 6;
const STEP = 24;

function badge(it: { file_ext: string | null; format: string | null; external_url: string | null; file_url: string | null }): string {
  if (it.file_ext) return it.file_ext;
  const u = (it.external_url || it.file_url || '').toLowerCase();
  if (it.format === '영상' || /youtube|youtu\.be|vimeo|tv\.naver/.test(u)) return '영상';
  if (/drive\.google|docs\.google/.test(u)) return '문서';
  return '아티클';
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/** 새로 추가한 자료를 홈 미리보기(ItemCard)용으로 최소 변환 — 요약·태그는 다음 로드 때 채워짐. */
function toCard(it: PoolRow): ArchiveItem {
  return {
    ...it,
    sub_category: null,
    published_at: null,
    tags: [],
    featured_at: new Date().toISOString(),
  } as unknown as ArchiveItem;
}

function toPool(it: ArchiveItem): PoolRow {
  return {
    id: it.id,
    title: it.title,
    summary: it.summary,
    main_category: it.main_category,
    kind: it.kind,
    format: it.format,
    file_ext: it.file_ext,
    external_url: it.external_url,
    file_url: it.file_url,
    views: it.views,
    registered_at: it.registered_at,
  };
}

const chipCls = (active: boolean) =>
  `shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm border whitespace-nowrap transition ${
    active
      ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
      : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]'
  }`;

export function RecommendManager({ initial, pool }: { initial: ArchiveItem[]; pool: PoolRow[] }) {
  const [featured, setFeatured] = useState<ArchiveItem[]>(initial);
  const [available, setAvailable] = useState<PoolRow[]>(pool);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<'' | 'files' | 'insights'>('');
  const [cat, setCat] = useState<string | null>(null);
  const [sort, setSort] = useState<'recent' | 'views'>('recent');
  const [showCount, setShowCount] = useState(STEP);
  const [err, setErr] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  // 카테고리 칩 목록 (건수 포함) — 원본 pool 기준으로 안정적
  const catCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of pool) m.set(it.main_category, (m.get(it.main_category) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [pool]);

  const filtered = useMemo(() => {
    let arr = available;
    if (kind) arr = arr.filter((it) => it.kind === kind);
    if (cat) arr = arr.filter((it) => it.main_category === cat);
    const kws = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (kws.length) {
      arr = arr.filter((it) => {
        const hay = (it.title + ' ' + it.main_category + ' ' + (it.summary || '')).toLowerCase();
        return kws.every((k) => hay.includes(k));
      });
    }
    const s = [...arr];
    if (sort === 'views') s.sort((a, b) => (b.views || 0) - (a.views || 0));
    else s.sort((a, b) => (b.registered_at || '').localeCompare(a.registered_at || ''));
    return s;
  }, [available, kind, cat, q, sort]);
  const visible = filtered.slice(0, showCount);
  const resetShow = () => setShowCount(STEP);

  function add(it: PoolRow) {
    setErr(null);
    if (featured.length >= MAX) {
      setErr(`추천은 최대 ${MAX}개까지예요 — 하나 빼고 추가해주세요`);
      return;
    }
    startTransition(async () => {
      try {
        await addFeatured(it.id);
        setFeatured((prev) => [toCard(it), ...prev.filter((x) => x.id !== it.id)]);
        setAvailable((prev) => prev.filter((x) => x.id !== it.id));
      } catch (e) {
        setErr(e instanceof Error ? e.message : '추가에 실패했어요');
      }
    });
  }

  function remove(it: ArchiveItem) {
    setErr(null);
    startTransition(async () => {
      try {
        await removeFeatured(it.id);
        setFeatured((prev) => prev.filter((x) => x.id !== it.id));
        setAvailable((prev) => (prev.some((x) => x.id === it.id) ? prev : [toPool(it), ...prev]));
      } catch (e) {
        setErr(e instanceof Error ? e.message : '빼기에 실패했어요');
      }
    });
  }

  function onDrop(toIdx: number) {
    if (dragIdx === null || dragIdx === toIdx) {
      setDragIdx(null);
      return;
    }
    const next = [...featured];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(toIdx, 0, moved);
    setDragIdx(null);
    setFeatured(next);
    startTransition(async () => {
      try {
        await reorderFeatured(next.map((f) => f.id));
      } catch (e) {
        setErr(e instanceof Error ? e.message : '순서 변경에 실패했어요');
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

      {/* 현재 추천 목록 — 드래그로 순서 조정 */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-[var(--muted)]">
          현재 추천 중
          <span className="text-[11px] font-normal text-[var(--muted-2)] bg-[var(--card)] border border-[var(--border)] rounded-full px-2 py-0.5">
            {featured.length} / {MAX}
          </span>
        </div>
        {featured.length === 0 ? (
          <p className="text-sm text-[var(--muted-2)] py-3">아직 추천 자료가 없어요. 아래 목록에서 추가하면 홈에 나타나요.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {featured.map((it, i) => (
              <li
                key={it.id}
                draggable
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(i)}
                className={`flex items-center gap-2 px-3 py-2.5 bg-[var(--bg)] border rounded-[var(--r-sm)] transition ${
                  dragIdx === i ? 'border-[var(--accent)] opacity-60' : 'border-[var(--border)]'
                }`}
              >
                <span className="text-[var(--muted-2)] cursor-grab active:cursor-grabbing shrink-0" title="드래그로 순서 변경" aria-hidden>
                  <GripVertical size={16} />
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[var(--r-sm)] bg-[var(--accent-bg)] text-[var(--accent)] shrink-0">
                  {badge(it)}
                </span>
                <div className="min-w-0 flex-1">
                  {it.external_url || it.file_url ? (
                    <a
                      href={it.external_url || it.file_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-1 text-sm font-medium text-[var(--fg)] hover:text-[var(--accent)] transition"
                      title="새 탭에서 원문 열기"
                    >
                      <span className="truncate">{it.title}</span>
                      <ExternalLink size={12} className="shrink-0 opacity-0 group-hover:opacity-70" aria-hidden />
                    </a>
                  ) : (
                    <div className="text-sm font-medium truncate">{it.title}</div>
                  )}
                  {it.summary && <p className="text-[12px] text-[var(--muted)] line-clamp-1 mt-0.5">{it.summary}</p>}
                  <div className="text-[11px] text-[var(--muted-2)] mt-0.5">
                    {it.main_category} · 조회 {(it.views || 0).toLocaleString()}
                  </div>
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
          최대 {MAX}개까지. 왼쪽 손잡이를 드래그해 순서를 바꾸면 홈에도 그 순서로 나옵니다.
        </p>
      </section>

      {/* 홈 미리보기 */}
      {featured.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="text-sm font-medium text-[var(--muted)]">홈 미리보기</div>
          <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-alt)] p-3">
            <h2 className="text-sm font-semibold tracking-tight text-[var(--muted)] mb-2">운영진이 추천하는 자료에요</h2>
            <HorizontalScroll label="추천 미리보기">
              {featured.map((it) => (
                <div key={it.id} className="shrink-0 w-[220px]">
                  <ItemCard item={it} />
                </div>
              ))}
            </HorizontalScroll>
          </div>
        </section>
      )}

      {/* 자료 추가 — 전체 목록 상시 노출 + 필터·정렬 */}
      <section className="flex flex-col gap-3 border-t border-dashed border-[var(--border)] pt-5">
        <div className="text-sm font-medium text-[var(--muted)]">자료 추가</div>

        {/* 검색 */}
        <div className="flex items-center gap-2 border-2 border-[var(--border)] focus-within:border-[var(--accent)] rounded-[var(--r-sm)] px-3 py-2 bg-[var(--bg)] transition">
          <Search size={16} className="text-[var(--muted-2)] shrink-0" aria-hidden />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              resetShow();
            }}
            placeholder="제목·분류로 걸러보기 (안 쳐도 전체 목록이 아래에 있어요)"
            aria-label="자료 검색"
            className="flex-1 bg-transparent outline-none text-sm text-[var(--fg)] placeholder:text-[var(--muted-2)]"
          />
        </div>

        {/* 메뉴 필터 chips */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0 sm:flex-wrap">
          {([['', '전체'], ['files', '양식·템플릿'], ['insights', '콘텐츠']] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => { setKind(k); resetShow(); }} className={chipCls(kind === k)}>
              {label}
            </button>
          ))}
        </div>

        {/* 카테고리 필터 chips */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 sm:mx-0 sm:px-0 sm:flex-wrap">
          <button type="button" onClick={() => { setCat(null); resetShow(); }} className={chipCls(!cat)}>전체</button>
          {catCounts.map(([c, n]) => (
            <button key={c} type="button" onClick={() => { setCat(c); resetShow(); }} className={chipCls(cat === c)}>
              {c} <span className="opacity-70">({n})</span>
            </button>
          ))}
        </div>

        {/* 정렬 + 건수 */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11.5px] text-[var(--muted-2)]">{q.trim() || kind || cat ? `${filtered.length}건` : `전체 ${available.length}건`}</p>
          <div className="inline-flex items-center gap-1 text-xs">
            {([['recent', '최신순'], ['views', '인기순']] as const).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => { setSort(k); resetShow(); }}
                className={`px-2.5 py-1 rounded-full font-medium transition ${sort === k ? 'bg-[var(--card)] text-[var(--fg)]' : 'text-[var(--muted)] hover:bg-[var(--card)]'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="border border-[var(--border)] rounded-[var(--r-sm)] px-3 py-6 text-center text-sm text-[var(--muted-2)]">
            조건에 맞는 공개 자료가 없어요.
          </div>
        ) : (
          <div className="border border-[var(--border)] rounded-[var(--r-sm)] overflow-hidden divide-y divide-[var(--border)]">
            {visible.map((it) => {
              const url = it.external_url || it.file_url || '';
              return (
                <div key={it.id} className="flex items-start justify-between gap-3 px-3 py-3 hover:bg-[var(--card)] transition">
                  <div className="min-w-0 flex items-start gap-2">
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[var(--r-sm)] bg-[var(--accent-bg)] text-[var(--accent)] shrink-0 mt-0.5">
                      {badge(it)}
                    </span>
                    <div className="min-w-0">
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex items-center gap-1 text-sm font-medium text-[var(--fg)] hover:text-[var(--accent)] transition"
                          title="새 탭에서 원문 열기"
                        >
                          <span className="truncate">{it.title}</span>
                          <ExternalLink size={12} className="shrink-0 opacity-0 group-hover:opacity-70" aria-hidden />
                        </a>
                      ) : (
                        <div className="text-sm font-medium truncate">{it.title}</div>
                      )}
                      {it.summary && (
                        <p className="text-[12px] text-[var(--muted)] line-clamp-1 mt-0.5">{it.summary}</p>
                      )}
                      <div className="text-[11px] text-[var(--muted-2)] mt-0.5">
                        {it.main_category} · 조회 {(it.views || 0).toLocaleString()} · {fmtDate(it.registered_at)}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => add(it)}
                    disabled={pending || featured.length >= MAX}
                    className="shrink-0 mt-0.5 text-xs font-semibold text-[var(--accent)] bg-[var(--accent-bg)] rounded-[var(--r-sm)] px-2.5 py-1 hover:brightness-95 transition disabled:opacity-50"
                  >
                    + 추가
                  </button>
                </div>
              );
            })}
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
