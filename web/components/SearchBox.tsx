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
      className="flex items-center gap-2 w-full max-w-xl"
    >
      <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md border border-[var(--border)] bg-[var(--card)] focus-within:border-[var(--accent)]">
        <Search size={16} className="text-[var(--muted)]" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="자료·인사이트·FAQ 통합 검색..."
          className="flex-1 bg-transparent outline-none text-sm"
        />
      </div>
      <button
        type="submit"
        className="px-3 py-2 rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] text-sm font-medium"
      >
        검색
      </button>
    </form>
  );
}
