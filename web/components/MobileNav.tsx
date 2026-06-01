'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Search } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

const NAV = [
  { href: '/', label: '홈' },
  { href: '/files', label: '자료실' },
  { href: '/insights', label: '인사이트' },
  { href: '/faq', label: 'FAQ' },
  { href: '/submit', label: '자료 등록' },
  { href: '/admin', label: '운영진 검토' },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) {
      router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      setOpen(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="sm:hidden p-2 rounded hover:bg-[var(--card)] text-[var(--muted)] hover:text-[var(--fg)]"
        aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
        aria-expanded={open}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div
          className="sm:hidden fixed inset-0 top-14 z-40 bg-[var(--bg)] flex flex-col"
          role="dialog"
          aria-label="모바일 메뉴"
        >
          <form onSubmit={onSearch} className="px-4 py-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-md border border-[var(--border)] bg-[var(--card)] focus-within:border-[var(--accent)]">
              <Search size={16} className="text-[var(--muted)]" aria-hidden />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="자료·FAQ 검색..."
                className="flex-1 bg-transparent outline-none text-sm"
                aria-label="검색어"
              />
            </div>
          </form>
          <nav className="flex flex-col px-2 py-2 gap-0.5 overflow-y-auto">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`px-3 py-3 rounded text-sm ${pathname === n.href ? 'bg-[var(--accent-bg)] text-[var(--accent)] font-medium' : 'hover:bg-[var(--card)]'}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
