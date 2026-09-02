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
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setOpen(false); }, [pathname]);

  // 열림 상태: 패널 포커스 + Esc 닫기 + Tab 포커스 트랩.
  // 드로어는 항상 DOM에 있고(off-screen) 클래스만 토글 → 마운트 레이스가 없어
  // iOS Safari 깜빡임·되돌아옴이 원천적으로 안 생긴다(표준 드로어 방식).
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    // 컨테이너 대신 닫기 버튼에 포커스 — 패널 전체를 감싸는 큰 파란 outline(포커스 링) 방지 + a11y 유지
    closeRef.current?.focus();
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

  function close() {
    setOpen(false);
    toggleRef.current?.focus();
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

      {/* 뷰포트 고정 클리핑 래퍼 — 항상 마운트. 화면 밖 패널이 가로 스크롤을 만들지 않게 overflow-hidden.
          닫힘 상태에선 pointer-events-none로 페이지 클릭을 막지 않는다. */}
      <div
        className={`sm:hidden fixed inset-0 z-[60] overflow-hidden ${open ? '' : 'pointer-events-none'}`}
        aria-hidden={!open}
      >
        {/* 검정 딤 배경 — 탭하면 닫힘. 패널과 동일 타이밍(Vaul 방식). */}
        <div
          onClick={close}
          style={{ transition: 'opacity 0.5s cubic-bezier(0.32, 0.72, 0, 1)' }}
          className={`absolute inset-0 bg-black motion-reduce:transition-none ${open ? 'opacity-40' : 'opacity-0 pointer-events-none'}`}
        />
        {/* 오른쪽 드로어 패널 — 항상 DOM에 있고 translate로 토글(마운트 레이스 없음). */}
        <div
          ref={panelRef}
          tabIndex={-1}
          inert={!open}
          style={{ transition: 'translate 0.5s cubic-bezier(0.32, 0.72, 0, 1)' }}
          className={`absolute inset-y-0 right-0 w-[85%] max-w-[360px] bg-[var(--bg)] flex flex-col outline-none shadow-2xl motion-reduce:transition-none ${open ? 'translate-x-0' : 'translate-x-full'}`}
          role="dialog"
          aria-modal="true"
          aria-label="모바일 메뉴"
        >
          {/* 자체 상단바 — 오버레이가 사이트 헤더까지 덮으므로 닫기 버튼을 내부에 둔다 */}
          <div className="flex items-center justify-between h-14 px-3 border-b border-[var(--border)] shrink-0">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1 font-bold tracking-tight rounded-[var(--r-sm)] -mx-1 px-1 hover:text-[var(--accent)] transition-colors"
            >
              {/* 데스크톱 헤더와 동일한 선반 M 심볼 — currentColor로 테마 자동 대응 */}
              <svg viewBox="0 0 64 64" className="w-[22px] h-[22px] shrink-0" aria-hidden fill="currentColor">
                <path d="M10 44V10h13l9 17 9-17h13v34H42V28l-7 13h-6l-7-13v16z" />
                <rect x="10" y="50" width="44" height="6" rx="2" />
              </svg>
              맥비 자료실
            </Link>
            <button
              ref={closeRef}
              onClick={close}
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
    </>
  );
}
