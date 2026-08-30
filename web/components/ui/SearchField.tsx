'use client';
import { Search, X } from 'lucide-react';

/**
 * 페이지 내 검색 필 — /design "인풋" 레시피의 단일 구현.
 * h-11 · px-4 · rounded-full · border-strong · focus 시 focus-ring 색만 변경 · 돋보기 18 · 지우기 14 · text-base(모바일 확대 방지).
 * 목록(콘텐츠·양식)·실무 Q&A가 공유. 자동완성이 붙는 검색창(SearchAutocomplete)은 같은 치수를 따로 유지.
 */
export function SearchField({
  value, onChange, placeholder, ariaLabel,
}: { value: string; onChange: (v: string) => void; placeholder: string; ariaLabel: string }) {
  return (
    <div className="flex items-center gap-2 px-4 h-11 rounded-full border border-[var(--border-strong)] bg-[var(--bg)] focus-within:border-[var(--focus-ring)]">
      <Search size={18} className="text-[var(--muted)] shrink-0" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent outline-none text-base"
        aria-label={ariaLabel}
      />
      {value && (
        <button type="button" onClick={() => onChange('')} className="text-[var(--muted)] hover:text-[var(--fg)] shrink-0 p-2 -m-2" aria-label="입력 지우기">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
