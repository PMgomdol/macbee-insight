'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

export function HeaderSearch() {
  const [q, setQ] = useState('');
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  useEffect(() => { setQ(sp.get('q') ?? ''); }, [sp]);

  // 홈에서는 Hero 검색이 있어 헤더 검색 숨김
  if (pathname === '/') return null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
      className="hidden sm:flex fc-input w-56 lg:w-72"
      role="search"
    >
      <Search size={14} className="text-[var(--muted)] shrink-0" aria-hidden />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="자료·FAQ 검색..."
        className="text-sm"
        aria-label="검색어"
      />
    </form>
  );
}
