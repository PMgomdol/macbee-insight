'use client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

/**
 * 페이지 내 검색 박스 — /files, /insights 페이지 안에서 현재 페이지 URL에 ?q= 추가.
 * 다른 필터(main, sub, sort)는 유지. show는 초기화.
 */
export function ListSearchBox({ basePath, placeholder }: { basePath: string; placeholder: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const [q, setQ] = useState(sp.get('q') ?? '');

  useEffect(() => { setQ(sp.get('q') ?? ''); }, [sp]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const u = new URLSearchParams(sp.toString());
    const k = q.trim();
    if (k) u.set('q', k); else u.delete('q');
    u.delete('show');
    router.push(`${pathname || basePath}${u.toString() ? `?${u.toString()}` : ''}`);
  }

  function clear() {
    setQ('');
    const u = new URLSearchParams(sp.toString());
    u.delete('q');
    u.delete('show');
    router.push(`${pathname || basePath}${u.toString() ? `?${u.toString()}` : ''}`);
  }

  return (
    <form onSubmit={submit} role="search" className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border-strong)] bg-[var(--bg)] focus-within:border-[var(--accent)]">
      <Search size={16} className="text-[var(--muted)] shrink-0" aria-hidden />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent outline-none text-base sm:text-sm"
        aria-label={placeholder}
      />
      {q && (
        <button type="button" onClick={clear} className="text-[var(--muted)] hover:text-[var(--fg)] shrink-0" aria-label="검색 지우기">
          <X size={14} />
        </button>
      )}
    </form>
  );
}
