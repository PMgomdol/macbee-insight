'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

export function SearchBox({ initial }: { initial?: string }) {
  const [q, setQ] = useState(initial ?? '');
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => { setQ(sp.get('q') ?? ''); }, [sp]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
      className="flex items-center gap-2 w-full"
      role="search"
    >
      <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 rounded-md border border-[var(--border)] bg-[var(--card)] focus-within:border-[var(--accent)]">
        <Search size={16} className="text-[var(--muted)] shrink-0" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="자료·인사이트·FAQ 검색..."
          className="flex-1 min-w-0 bg-transparent outline-none text-sm"
          aria-label="검색어"
          autoFocus
        />
      </div>
      <button
        type="submit"
        className="px-4 py-2.5 rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] text-sm font-medium shrink-0"
      >
        검색
      </button>
    </form>
  );
}
