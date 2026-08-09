'use client';
import { useEffect, useRef, useState, useCallback, useId } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Sparkles, Tag, Folder, Clock, TrendingUp } from 'lucide-react';
import { track } from '@/lib/track';

type Suggestion =
  | { type: 'title'; text: string; url: string; meta?: string }
  | { type: 'tag'; text: string; count: number }
  | { type: 'category'; text: string; count: number }
  | { type: 'synonym'; text: string; from: string };

type Resp = {
  query: string;
  trending: string[];
  synonyms: { from: string; expanded: string[] } | null;
  suggestions: Suggestion[];
};

type Variant = 'hero' | 'header' | 'page';

const RECENT_KEY = 'macbe.recent_searches';
const MAX_RECENT = 6;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]).slice(0, MAX_RECENT) : [];
  } catch { return []; }
}

function saveRecent(q: string) {
  try {
    const cur = loadRecent().filter((x) => x !== q);
    cur.unshift(q);
    localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, MAX_RECENT)));
  } catch {}
}

function clearRecent() {
  try { localStorage.removeItem(RECENT_KEY); } catch {}
}

export function SearchAutocomplete({
  initial = '',
  variant = 'hero',
  autoFocus = false,
  placeholder,
  placeholders,
  placeholderIntervalMs = 2600,
  onCollapse,
}: {
  initial?: string;
  variant?: Variant;
  autoFocus?: boolean;
  placeholder?: string;
  placeholders?: string[];
  placeholderIntervalMs?: number;
  /** 헤더 접이식 모드 — Esc 또는 빈 상태에서 외부 클릭 시 호출 (아이콘으로 되접기) */
  onCollapse?: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [resp, setResp] = useState<Resp | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [rotIdx, setRotIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const debouncer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 최초 마운트 — 최근 검색 로드
  useEffect(() => { setRecent(loadRecent()); }, []);

  // 외부 클릭 핸들러(deps [])에서 최신 값 참조 — stale closure 방지
  const qRef = useRef(q);
  qRef.current = q;
  const onCollapseRef = useRef(onCollapse);
  onCollapseRef.current = onCollapse;

  // placeholder 순환 — placeholders 배열이 있고 입력 비었을 때만
  useEffect(() => {
    if (!placeholders || placeholders.length < 2) return;
    if (q) return;
    const id = setInterval(() => {
      setRotIdx((i) => (i + 1) % placeholders.length);
    }, placeholderIntervalMs);
    return () => clearInterval(id);
  }, [placeholders, placeholderIntervalMs, q]);

  const activePlaceholder =
    placeholders && placeholders.length > 0
      ? placeholders[rotIdx % placeholders.length]
      : (placeholder ?? '제목·태그·카테고리로 찾아보세요');

  // 외부 클릭 닫기 — 접이식(header)에서 입력이 비어 있으면 아이콘으로 되접기
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        if (!qRef.current.trim()) onCollapseRef.current?.();
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const fetchSuggest = useCallback((query: string) => {
    fetch(`/api/suggest?q=${encodeURIComponent(query)}&limit=10`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setResp(d); })
      .catch(() => {});
  }, []);

  // debounce 입력
  useEffect(() => {
    if (debouncer.current) clearTimeout(debouncer.current);
    if (!open) return;
    debouncer.current = setTimeout(() => fetchSuggest(q), 180);
    return () => { if (debouncer.current) clearTimeout(debouncer.current); };
  }, [q, open, fetchSuggest]);

  function go(query: string) {
    const k = query.trim();
    if (!k) return;
    saveRecent(k);
    setRecent(loadRecent());
    setOpen(false);
    track('search_submit', { query: k, source: variant });
    router.push(`/search?q=${encodeURIComponent(k)}`);
  }

  function pickSuggestion(s: Suggestion) {
    if (s.type === 'title') {
      saveRecent(q.trim() || s.text);
      // 내부 경로(초성 제안 등)는 현재 탭, 외부 자료 링크는 새 탭
      if (s.url.startsWith('/')) router.push(s.url);
      else window.open(s.url, '_blank');
      setOpen(false);
      return;
    }
    if (s.type === 'category') {
      router.push(`/files?main=${encodeURIComponent(s.text)}`);
      setOpen(false);
      return;
    }
    go(s.text);
  }

  // 타이핑 중에는 빈 질의 응답(포커스 시 미리 받은 인기 태그)을 쓰지 않는다 —
  // 새 응답 도착 전까지 인기 태그가 검색 제안인 것처럼 잘못 노출되던 문제.
  // 직전 타이핑 질의의 제안은 유지 (교체 시 깜빡임 방지, 표준 자동완성 동작)
  const fresh = resp && (!q || resp.query !== '') ? resp : null;

  // 키보드 nav
  const flat = buildFlatList(q ? fresh : resp, recent, q);
  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); }
    else if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1); inputRef.current?.blur(); onCollapse?.(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0 && flat[activeIdx]) {
        const item = flat[activeIdx];
        if (item.kind === 'recent' || item.kind === 'trending') go(item.text);
        else pickSuggestion(item.s!);
      } else { go(q); }
    }
  }

  const wrapCls =
    variant === 'header'
      ? 'hidden sm:flex relative w-40 md:w-52 lg:w-64'
      : variant === 'page'
      ? 'flex relative w-full'
      : 'flex relative w-full';

  // hero: 큰 검색창 (h-12 sm:h-14), page: iOS tap 권장 44px, header: app-input
  const inputCls =
    variant === 'header'
      ? 'app-input w-full !rounded-full'
      : variant === 'hero'
      ? 'flex-1 min-w-0 flex items-center gap-2.5 px-5 sm:px-6 h-12 sm:h-14 rounded-full border border-[var(--border-strong)] bg-[var(--bg)] focus-within:border-[var(--focus-ring)]'
      : 'flex-1 min-w-0 flex items-center gap-2 px-4 h-11 rounded-full border border-[var(--border-strong)] bg-[var(--bg)] focus-within:border-[var(--focus-ring)]';

  return (
    <div ref={wrapRef} className={wrapCls}>
      <form
        onSubmit={(e) => { e.preventDefault(); go(q); }}
        className={variant === 'page' ? 'flex flex-col sm:flex-row gap-2 w-full' : 'w-full'}
        role="search"
      >
        <div className={inputCls}>
          <Search
            size={variant === 'header' ? 14 : variant === 'hero' ? 20 : 18}
            className="text-[var(--muted)] shrink-0"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setActiveIdx(-1); }}
            onFocus={() => { setOpen(true); fetchSuggest(q); }}
            onKeyDown={onKey}
            placeholder={activePlaceholder}
            className={`flex-1 min-w-0 bg-transparent outline-none ${
              variant === 'header'
                ? 'text-[16px]'
                : variant === 'hero'
                ? 'text-base sm:text-lg'
                : 'text-base'
            }`}
            aria-label="검색어"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listboxId}
            autoComplete="off"
            autoFocus={autoFocus}
          />
          {q && (
            <button
              type="button"
              onClick={() => { setQ(''); setActiveIdx(-1); inputRef.current?.focus(); }}
              className="text-[var(--muted)] hover:text-[var(--fg)] shrink-0"
              aria-label="입력 지우기"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {/* hero·header: 검색 버튼 없음 (Enter로 submit, type="search" 키보드) */}
        {variant === 'page' && (
          <button
            type="submit"
            className="slds-button slds-button_brand shrink-0 h-11 px-5"
            style={{ minHeight: 44 }}
          >
            검색
          </button>
        )}
      </form>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 app-card overflow-hidden shadow-[var(--shadow-16)] max-h-[70vh] overflow-y-auto"
        >
          {/* 동의어 안내 */}
          {fresh?.synonyms && q && (
            <div className="px-3 py-2 text-[11px] text-[var(--muted)] bg-[var(--accent-bg)] border-b border-[var(--border)] flex items-center gap-1.5">
              <Sparkles size={12} className="text-[var(--accent)]" aria-hidden />
              <strong className="text-[var(--fg)]">{fresh!.synonyms!.from}</strong> 관련 키워드:&nbsp;
              <span className="text-[var(--muted)]">{fresh!.synonyms!.expanded.slice(0, 5).join(' · ')}</span>
            </div>
          )}

          <Group>
            {!q && recent.length > 0 && (
              <Section title="최근 검색" icon={<Clock size={12} />} right={
                <button onClick={() => { clearRecent(); setRecent([]); }} className="text-[11px] text-[var(--muted-2)] hover:text-[var(--fg)]">지우기</button>
              }>
                {recent.map((r, i) => {
                  const idx = flat.findIndex((x) => x.kind === 'recent' && x.text === r);
                  return (
                    <Row key={r} active={activeIdx === idx} onClick={() => go(r)}>
                      <Search size={13} className="text-[var(--muted-2)]" aria-hidden />
                      <span>{r}</span>
                    </Row>
                  );
                })}
              </Section>
            )}

            {!q && (resp?.trending?.length ?? 0) > 0 && (
              <Section title="추천 키워드" icon={<TrendingUp size={12} />}>
                <div className="flex flex-wrap gap-1.5 px-3 py-2">
                  {resp!.trending.map((t) => {
                    const idx = flat.findIndex((x) => x.kind === 'trending' && x.text === t);
                    return (
                      <button
                        key={t}
                        onClick={() => go(t)}
                        className={`px-2.5 py-1 rounded-full text-xs border transition ${
                          activeIdx === idx
                            ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                            : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </Section>
            )}

            {q && (fresh?.suggestions ?? []).length === 0 && (
              <div className="px-3 py-4 text-xs text-[var(--muted)]">Enter를 누르면 전체 검색해드려요</div>
            )}

            {q && (fresh?.suggestions ?? []).map((s, i) => {
              const idx = flat.findIndex((x) => x.kind === 'sug' && x.s === s);
              const active = activeIdx === idx;
              if (s.type === 'title') {
                return (
                  <Row key={`t${i}`} active={active} onClick={() => pickSuggestion(s)}>
                    <Search size={13} className="text-[var(--muted-2)]" aria-hidden />
                    <span className="flex-1 truncate">{s.text}</span>
                    {s.meta && <span className="text-[10px] text-[var(--muted-2)] shrink-0">{s.meta}</span>}
                  </Row>
                );
              }
              if (s.type === 'tag') {
                return (
                  <Row key={`g${i}`} active={active} onClick={() => pickSuggestion(s)}>
                    <Tag size={13} className="text-[var(--muted-2)]" aria-hidden />
                    <span className="flex-1">{s.text}</span>
                    <span className="text-[10px] text-[var(--muted-2)] shrink-0">{s.count}건</span>
                  </Row>
                );
              }
              if (s.type === 'category') {
                return (
                  <Row key={`c${i}`} active={active} onClick={() => pickSuggestion(s)}>
                    <Folder size={13} className="text-[var(--muted-2)]" aria-hidden />
                    <span className="flex-1">{s.text}</span>
                    <span className="text-[10px] text-[var(--muted-2)] shrink-0">{s.count}건 · 카테고리</span>
                  </Row>
                );
              }
              return (
                <Row key={`s${i}`} active={active} onClick={() => pickSuggestion(s)}>
                  <Sparkles size={13} className="text-[var(--accent)]" aria-hidden />
                  <span className="flex-1">{s.text}</span>
                  <span className="text-[10px] text-[var(--muted-2)] shrink-0">관련어</span>
                </Row>
              );
            })}
          </Group>
        </div>
      )}
    </div>
  );
}

function buildFlatList(
  resp: Resp | null,
  recent: string[],
  q: string
): Array<{ kind: 'recent' | 'trending' | 'sug'; text: string; s?: Suggestion }> {
  if (!q) {
    return [
      ...recent.map((t) => ({ kind: 'recent' as const, text: t })),
      ...(resp?.trending ?? []).map((t) => ({ kind: 'trending' as const, text: t })),
    ];
  }
  return (resp?.suggestions ?? []).map((s) => ({ kind: 'sug' as const, text: s.text, s }));
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col py-1">{children}</div>;
}

function Section({ title, icon, right, children }: { title: string; icon?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide text-[var(--muted-2)]">
        <span className="flex items-center gap-1">{icon}{title}</span>
        {right}
      </div>
      {children}
    </div>
  );
}

function Row({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      role="option"
      aria-selected={active}
      className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left ${active ? 'bg-[var(--accent-bg)]' : 'hover:bg-[var(--card)]'}`}
    >
      {children}
    </button>
  );
}
