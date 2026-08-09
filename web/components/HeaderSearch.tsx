'use client';
import { usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { SearchAutocomplete } from './SearchAutocomplete';

/**
 * 헤더 전역 검색 — 접이식.
 * 홈·프리뷰 랜딩에는 큰 검색창이 있어 숨긴다. 그 외 페이지에서는
 * 기본적으로 돋보기 아이콘만 두고, 클릭 시 검색창을 펼친다.
 * 목록/상세 페이지의 "목록 내 검색"과 헤더 전역 검색이 같은 화면에서
 * 나란히 보이며 헷갈리던 문제를 없앤다(전역은 필요할 때만 펼침).
 */
export function HeaderSearch() {
  const sp = useSearchParams();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname === '/' || pathname === '/preview') return null;

  if (!open) {
    return (
      <>
        {/* 모바일: 검색 페이지로 이동 (인라인 펼침은 56px 헤더에서 너무 좁음) */}
        <Link
          href="/search"
          aria-label="검색"
          className="inline-flex sm:hidden items-center justify-center w-9 h-9 rounded-full text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--card)] transition-colors"
        >
          <Search size={18} aria-hidden />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="검색 열기"
          aria-expanded={false}
          className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--card)] transition-colors"
        >
          <Search size={18} aria-hidden />
        </button>
      </>
    );
  }

  return (
    <SearchAutocomplete
      variant="header"
      initial={sp.get('q') ?? ''}
      autoFocus
      onCollapse={() => setOpen(false)}
      placeholder="자료·Q&A 찾기"
    />
  );
}
