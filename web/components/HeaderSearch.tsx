'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

export function HeaderSearch() {
  const [q, setQ] = useState('');
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => { setQ(sp.get('q') ?? ''); }, [sp]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
      className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--card)] focus-within:border-[var(--accent)] w-56 lg:w-72"
      role="search"
    >
      <Search size={14} className="text-[var(--muted)] shrink-0" aria-hidden />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="자료·FAQ 검색..."
        className="flex-1 min-w-0 bg-transparent outline-none text-sm"
        aria-label="검색어"
      />
    </form>
  );
}
