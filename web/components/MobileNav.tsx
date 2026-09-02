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
  // 슬라이드 인/아웃: 닫는 애니메이션이 보이도록 DOM을 잠깐 유지(render)하고,
  // 마운트 다음 프레임에 entered=true로 열림 위치(translate-x-0)로 민다.
  const [render, setRender] = useState(false);
  const [entered, setEntered] = useState(false);
  const [q, setQ] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const items = visibleNav(isReviewer);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setOpen(false); }, [pathname]);

  // open ↔ render/entered 조율: 열면 즉시 마운트 후 다음 프레임에 슬라이드 인,
  // 닫으면 슬라이드 아웃(0.3s) 뒤 언마운트.
  useEffect(() => {
    if (open) {
      setRender(true);
      const r = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(r);
    }
    setEntered(false);
    const t = setTimeout(() => setRender(false), 300);
    return () => clearTimeout(t);
  }, [open]);

  // 열림 상태: 패널 포커스 + Esc 닫기 + Tab 포커스 트랩. (패널이 마운트된 뒤 실행)
  useEffect(() => {
    if (!render || !open) return;
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
  }, [render, open]);

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

      {render && (
        // 뷰포트 고정 클리핑 래퍼 — 화면 밖으로 밀린 패널이 가로 스크롤을 만들지 않게 overflow-hidden.
        // pointer-events는 안쪽 패널에서만 활성.
        <div className="sm:hidden fixed inset-0 z-[60] overflow-hidden pointer-events-none">
          <div
            ref={panelRef}
            tabIndex={-1}
            className={`absolute inset-0 bg-[var(--bg)] flex flex-col outline-none pointer-events-auto transition-transform duration-300 ease-out motion-reduce:transition-none ${entered ? 'translate-x-0' : 'translate-x-full'}`}
            role="dialog"
            aria-modal="true"
            aria-hidden={!open}
            aria-label="모바일 메뉴"
          >
            {/* 자체 상단바 — 오버레이가 사이트 헤더까지 덮으므로 닫기 버튼을 내부에 둔다 */}
            <div className="flex items-center justify-between h-14 px-3 border-b border-[var(--border)] shrink-0">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="font-bold tracking-tight rounded-[var(--r-sm)] -mx-1 px-1 hover:text-[var(--accent)] transition-colors"
              >
                맥비 자료실
              </Link>
              <button
                onClick={() => { setOpen(false); toggleRef.current?.focus(); }}
                className="p-2 rounded-[var(--r-sm)] hover:bg-[var(--card)] text-[var(--fg)]"
                aria-label="메뉴 닫기"
              >
                <X size={20} />
              </button>
            </div>
            {/* 검색창 — 아래 디바이더 없이 여백으로 메뉴와 구분 (위 헤더 구분선만 유지) */}
            <form onSubmit={onSearch} className="px-4 pt-3 pb-1">
              {/* py-*는 금지 — .app-input이 모바일 min-height:44px라 상하 패딩이 얹혀 pill이 커진다. 높이는 min-height가 담당. */}
              <div className="app-input !rounded-full px-4">
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
        </div>
      )}
    </>
  );
}
