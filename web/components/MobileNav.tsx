'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Menu, X, Search } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { visibleNav } from '@/lib/nav';

export function MobileNavClient({
  isReviewer = false,
  loggedIn = false,
  accountLabel = null,
}: {
  isReviewer?: boolean;
  loggedIn?: boolean;
  accountLabel?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const items = visibleNav(isReviewer);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setOpen(false); }, [pathname]);

  // 열림 상태: Esc 닫기 + Tab 포커스 트랩. 닫히면 햄버거 버튼으로 포커스 복귀
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    panel?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // 배경 스크롤 락 — iOS/인앱 브라우저는 body{overflow:hidden}을 무시해서
  // 메뉴 뒤 페이지가 스크롤되며 sticky 헤더가 밀려나고 콘텐츠가 비쳤다.
  // body를 position:fixed로 고정(현재 스크롤 위치 보존)해야 확실히 잠긴다.
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const body = document.body;
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.insetInline = '0';
    body.style.width = '100%';
    return () => {
      body.style.position = '';
      body.style.top = '';
      body.style.insetInline = '';
      body.style.width = '';
      window.scrollTo(0, scrollY);
    };
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
        ref={toggleRef}
        onClick={() => setOpen((v) => !v)}
        className="sm:hidden p-2 rounded-[var(--r-sm)] hover:bg-[var(--card)] text-[var(--fg)]"
        aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
        aria-expanded={open}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div
          ref={panelRef}
          tabIndex={-1}
          className="sm:hidden fixed inset-0 z-[60] bg-[var(--bg)] flex flex-col outline-none"
          role="dialog"
          aria-modal="true"
          aria-label="모바일 메뉴"
        >
          {/* 자체 상단바 — 오버레이가 사이트 헤더까지 덮으므로 닫기 버튼을 내부에 둔다 */}
          <div className="flex items-center justify-between h-14 px-3 border-b border-[var(--border)] shrink-0">
            <span className="font-bold tracking-tight">맥비 자료실</span>
            <button
              onClick={() => { setOpen(false); toggleRef.current?.focus(); }}
              className="p-2 rounded-[var(--r-sm)] hover:bg-[var(--card)] text-[var(--fg)]"
              aria-label="메뉴 닫기"
            >
              <X size={20} />
            </button>
          </div>
          <form onSubmit={onSearch} className="px-4 py-3 border-b border-[var(--border)]">
            <div className="app-input !rounded-full px-4 py-2.5">
              <Search size={16} className="text-[var(--muted)]" aria-hidden />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="자료·Q&A 검색..."
                className="text-base"
                aria-label="검색어"
              />
            </div>
          </form>
          <nav className="flex flex-col px-2 py-2 gap-0.5 overflow-y-auto">
            {items.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`px-3 py-3 rounded-[var(--r-sm)] text-sm ${pathname === n.href ? 'bg-[var(--accent-bg)] text-[var(--accent)] font-medium' : 'hover:bg-[var(--card)]'}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          {loggedIn && (
            <div className="mt-auto border-t border-[var(--border)] px-4 py-3 flex items-center justify-between gap-3">
              {accountLabel && <span className="text-xs text-[var(--muted-2)] truncate">{accountLabel}</span>}
              <form action="/auth/signout" method="post" className="shrink-0">
                <button type="submit" className="px-3 py-2 rounded-[var(--r-sm)] border border-[var(--border-strong)] text-sm hover:bg-[var(--card)]">
                  로그아웃
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </>
  );
}
