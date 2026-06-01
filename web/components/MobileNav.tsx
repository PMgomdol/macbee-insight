'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: '홈' },
  { href: '/files', label: '자료실' },
  { href: '/insights', label: '인사이트' },
  { href: '/faq', label: 'FAQ' },
  { href: '/search', label: '검색' },
  { href: '/submit', label: '자료 등록' },
  { href: '/admin', label: '운영진 검토' },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="sm:hidden p-2 rounded hover:bg-[var(--card)] text-[var(--muted)] hover:text-[var(--fg)]"
        aria-label="메뉴"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open && (
        <div
          className="sm:hidden fixed inset-0 top-14 z-40 bg-[var(--bg)]/95 backdrop-blur"
          onClick={() => setOpen(false)}
        >
          <nav className="flex flex-col px-4 py-3 gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`px-3 py-2.5 rounded text-sm ${pathname === n.href ? 'bg-[var(--card)] text-[var(--accent)]' : 'hover:bg-[var(--card)]'}`}
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
