'use client';
import { usePathname, useSearchParams } from 'next/navigation';
import { SearchAutocomplete } from './SearchAutocomplete';

export function HeaderSearch() {
  const sp = useSearchParams();
  const pathname = usePathname();

  // 홈에서는 Hero 검색이 있어 헤더 검색 숨김
  if (pathname === '/') return null;

  return <SearchAutocomplete variant="header" initial={sp.get('q') ?? ''} placeholder="자료·FAQ 검색..." />;
}
