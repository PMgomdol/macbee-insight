'use client';
import { useMemo, useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Search, X, ChevronDown } from 'lucide-react';
import type { FAQItem } from '@/types/db';
import { track } from '@/lib/track';

// 답변 접기 — 대략 10줄(15em) 넘으면 잘라서 '더 보기'
const COLLAPSE_EM = 15;

export function CollapsibleAnswer({ answer }: { answer: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const measure = () => {
      // 닫힌 <details> 안에서는 scrollHeight=0 — 펼쳐진 뒤에만 유효한 값
      if (el.scrollHeight === 0) return;
      const emPx = parseFloat(getComputedStyle(el).fontSize) || 14;
      setOverflows(el.scrollHeight > COLLAPSE_EM * emPx + 8);
    };
    measure();
    // 부모 아코디언이 펼쳐질 때 + 뷰포트 리사이즈 시 재측정
    const details = el.closest('details');
    details?.addEventListener('toggle', measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      details?.removeEventListener('toggle', measure);
      ro.disconnect();
    };
  }, [answer]);

  return (
    <div className="px-1 pb-4 pt-1 text-sm text-[var(--muted)] leading-relaxed">
      <div
        ref={innerRef}
        className="faq-answer relative overflow-hidden"
        style={
          !expanded && overflows
            ? {
                maxHeight: `${COLLAPSE_EM}em`,
                maskImage: 'linear-gradient(to bottom, black 75%, transparent)',
                WebkitMaskImage: 'linear-gradient(to bottom, black 75%, transparent)',
              }
            : undefined
        }
      >
        <Markdown remarkPlugins={[remarkGfm]}>{answer}</Markdown>
      </div>
      {overflows && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-xs font-medium text-[var(--accent)] hover:underline inline-flex items-center gap-1"
        >
          {expanded ? '접기' : '더 보기'}
          <ChevronDown size={12} className={expanded ? 'rotate-180 transition' : 'transition'} aria-hidden />
        </button>
      )}
    </div>
  );
}

function slugify(s: string) {
  return 'cat-' + encodeURIComponent(s.replace(/\s+/g, '-').toLowerCase());
}

export function FaqList({ faqs }: { faqs: FAQItem[] }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string | null>(null);

  // 전체 카테고리 (검색과 무관 — 필터 칩은 항상 노출)
  const allCats = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of faqs) m.set(f.main_category, (m.get(f.main_category) ?? 0) + 1);
    return [...m.entries()];
  }, [faqs]);

  // 딥링크 복원: ?cat= 쿼리 + 구버전 #cat- 앵커(공유된 링크 호환) → 필터 선택으로 변환
  useEffect(() => {
    const url = new URL(window.location.href);
    let target = url.searchParams.get('cat');
    if (!target && url.hash.startsWith('#cat-')) {
      target = allCats.map(([c]) => c).find((c) => `#${slugify(c)}` === url.hash) ?? null;
      if (target) {
        url.hash = '';
        url.searchParams.set('cat', target);
        history.replaceState(null, '', url);
      }
    }
    if (target && allCats.some(([c]) => c === target)) setCat(target);
  }, [allCats]);

  function selectCat(next: string | null) {
    setCat(next);
    const url = new URL(window.location.href);
    if (next) url.searchParams.set('cat', next);
    else url.searchParams.delete('cat');
    history.replaceState(null, '', url);
    track('filter_change', { type: 'category', value: next ?? 'all', page: 'faq' });
  }

  const k = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!k) return faqs;
    return faqs.filter(
      (f) =>
        f.question.toLowerCase().includes(k) ||
        f.answer.toLowerCase().includes(k) ||
        (f.main_category ?? '').toLowerCase().includes(k)
    );
  }, [k, faqs]);

  const byCat = useMemo(() => {
    const m = new Map<string, FAQItem[]>();
    for (const f of filtered) {
      if (!m.has(f.main_category)) m.set(f.main_category, []);
      m.get(f.main_category)!.push(f);
    }
    return m;
  }, [filtered]);

  // 검색 중에도 카테고리 점프 메뉴 유지: 매칭 카운트 표시
  function matchCount(cat: string) {
    return byCat.get(cat)?.length ?? 0;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 검색 박스 — 검색 페이지(page variant)와 동일 스타일 (focus 시 색만 변경, 두께·높이 고정) */}
      <div className="flex items-center gap-2 px-4 h-11 rounded-full border border-[var(--border-strong)] bg-[var(--bg)] focus-within:border-[var(--focus-ring)]">
        <Search size={18} className="text-[var(--muted)] shrink-0" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="질문·답변·카테고리로 찾아보세요 (예: 면접, 피그마, 휴가)"
          className="flex-1 min-w-0 bg-transparent outline-none text-base"
          aria-label="실무 Q&A 검색"
        />
        {q && (
          <button
            onClick={() => setQ('')}
            className="text-[var(--muted)] hover:text-[var(--fg)] shrink-0"
            aria-label="검색 지우기"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* 카테고리 필터 칩 — ListFilterClient 대분류 칩과 동일 스타일·동작 (같은 모양 = 같은 역할) */}
      {allCats.length > 1 && (
        <div className="sticky top-14 z-30 bg-[var(--bg)] py-2 -mt-2 flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap border-b border-[var(--border)]">
          <button
            type="button"
            onClick={() => selectCat(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm border whitespace-nowrap transition ${
              !cat
                ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]'
            }`}
          >
            전체
          </button>
          {allCats.map(([c, total]) => {
            const hits = matchCount(c);
            const disabled = !!k && hits === 0 && cat !== c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => selectCat(cat === c ? null : c)}
                disabled={disabled}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs sm:text-sm border whitespace-nowrap transition ${
                  cat === c
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                    : disabled
                      ? 'border-[var(--border)] text-[var(--muted-2)] opacity-50'
                      : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]'
                }`}
              >
                {c} <span className="opacity-70">({k ? hits : total})</span>
              </button>
            );
          })}
        </div>
      )}

      {q && (
        <p className="text-xs text-[var(--muted)]">
          <strong className="text-[var(--fg)]">{q}</strong> 결과 {filtered.length}건
        </p>
      )}

      {filtered.length === 0 || (cat && matchCount(cat) === 0) ? (
        <div className="py-12 text-center text-sm text-[var(--muted)]">결과가 없어요. 다른 키워드로 찾아보세요.</div>
      ) : (
        // 카테고리 순서는 allCats 기준 (검색해도 그룹 순서 유지) — 필터 선택 시 해당 카테고리만
        allCats.map(([c]) => {
          if (cat && c !== cat) return null;
          const items = byCat.get(c);
          if (!items || items.length === 0) return null;
          return (
            <section key={c} id={slugify(c)} className="flex flex-col gap-1.5 scroll-mt-32">
              <h2 className="text-sm font-semibold text-[var(--fg)] tracking-tight pt-2 sticky top-[7.5rem] bg-[var(--bg)] py-1.5 z-20 border-b border-[var(--border)]">
                {c} <span className="text-[var(--muted-2)] font-normal">({items.length})</span>
              </h2>
              <div className="flex flex-col">
                {items.map((f) => (
                  <details key={f.id} className="group border-b border-[var(--border)]">
                    <summary className="cursor-pointer py-3 px-1 text-sm font-medium select-none flex items-start justify-between gap-3 hover:text-[var(--accent)] list-none">
                      <span className="flex-1 min-w-0">{f.question}</span>
                      <ChevronDown size={16} className="text-[var(--muted-2)] group-open:rotate-180 transition shrink-0 mt-0.5" aria-hidden />
                    </summary>
                    <CollapsibleAnswer answer={f.answer} />
                  </details>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
