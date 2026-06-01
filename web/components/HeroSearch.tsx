'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';

export function HeroSearch({ total }: { total: number }) {
  const [q, setQ] = useState('');
  const router = useRouter();

  return (
    <section className="flex flex-col gap-3 pt-2 sm:pt-4">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
        원하는 자료를 찾아보세요
      </h1>
      <p className="text-sm text-[var(--muted)]">
        기획자·PM·디자이너를 위한 자료 {total.toLocaleString()}건 + FAQ
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
        }}
        className="flex flex-col sm:flex-row gap-2 mt-2"
        role="search"
      >
        <div className="flex-1 min-w-0 flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-[var(--border)] bg-[var(--card)] focus-within:border-[var(--accent)]">
          <Search size={18} className="text-[var(--muted)] shrink-0" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="제목·태그·설명으로 검색..."
            className="flex-1 min-w-0 bg-transparent outline-none text-sm sm:text-base"
            aria-label="검색어"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-3 rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] text-sm font-semibold shrink-0"
        >
          검색
        </button>
      </form>
    </section>
  );
}
