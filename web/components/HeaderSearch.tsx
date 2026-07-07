'use client';
import { usePathname, useSearchParams } from 'next/navigation';
import { SearchAutocomplete } from './SearchAutocomplete';

export function HeaderSearch() {
  const sp = useSearchParams();
  const pathname = usePathname();

  // 홈·프리뷰 랜딩에서는 큰 검색창이 있어 헤더 검색 숨김
  if (pathname === '/' || pathname === '/preview') return null;

  return <SearchAutocomplete variant="header" initial={sp.get('q') ?? ''} placeholder="자료·Q&A 찾기" />;
}
