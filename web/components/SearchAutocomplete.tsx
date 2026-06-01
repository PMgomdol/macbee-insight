'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Sparkles, Tag, Folder, Clock, TrendingUp } from 'lucide-react';

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
}: {
  initial?: string;
  variant?: Variant;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [resp, setResp] = useState<Resp | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 최초 마운트 — 최근 검색 로드
  useEffect(() => { setRecent(loadRecent()); }, []);

  // 외부 클릭 닫기
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
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
    router.push(`/search?q=${encodeURIComponent(k)}`);
  }

  function pickSuggestion(s: Suggestion) {
    if (s.type === 'title') {
      saveRecent(q.trim() || s.text);
      window.open(s.url, '_blank');
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

  // 키보드 nav
  const flat = buildFlatList(resp, recent, q);
  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); }
    else if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1); inputRef.current?.blur(); }
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
      ? 'hidden sm:flex relative w-56 lg:w-72'
      : variant === 'page'
      ? 'flex relative w-full'
      : 'flex relative w-full';

  const inputCls =
    variant === 'header'
      ? 'fc-input w-full'
      : 'flex-1 min-w-0 flex items-center gap-2 px-4 py-3 rounded-[var(--r-md)] border border-[var(--border-strong)] bg-[var(--bg)] focus-within:border-[var(--accent)] focus-within:border-b-2';

  return (
    <div ref={wrapRef} className={wrapCls}>
      <form
        onSubmit={(e) => { e.preventDefault(); go(q); }}
        className={variant === 'header' ? 'w-full' : 'flex flex-col sm:flex-row gap-2 w-full'}
        role="search"
      >
        <div className={inputCls}>
          <Search size={variant === 'header' ? 14 : 18} className="text-[var(--muted)] shrink-0" aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setActiveIdx(-1); }}
            onFocus={() => { setOpen(true); fetchSuggest(q); }}
            onKeyDown={onKey}
            placeholder={placeholder ?? '제목·태그·카테고리 검색...'}
            className={`flex-1 min-w-0 bg-transparent outline-none ${variant === 'header' ? 'text-sm' : 'text-sm sm:text-base'}`}
            aria-label="검색어"
            aria-autocomplete="list"
            aria-expanded={open}
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
        {variant !== 'header' && (
          <button type="submit" className="fc-btn fc-btn-primary px-5 py-3 text-sm shrink-0">검색</button>
        )}
      </form>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 fc-card overflow-hidden shadow-[var(--shadow-16)] max-h-[70vh] overflow-y-auto"
        >
          {/* 동의어 안내 */}
          {resp?.synonyms && q && (
            <div className="px-3 py-2 text-[11px] text-[var(--muted)] bg-[var(--accent-bg)] border-b border-[var(--border)] flex items-center gap-1.5">
              <Sparkles size={12} className="text-[var(--accent)]" aria-hidden />
              <strong className="text-[var(--fg)]">{resp.synonyms.from}</strong> 관련 키워드:&nbsp;
              <span className="text-[var(--muted)]">{resp.synonyms.expanded.slice(0, 5).join(' · ')}</span>
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

            {q && (resp?.suggestions ?? []).length === 0 && (
              <div className="px-3 py-4 text-xs text-[var(--muted)]">제안 없음 — Enter로 전체 검색</div>
            )}

            {q && (resp?.suggestions ?? []).map((s, i) => {
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
