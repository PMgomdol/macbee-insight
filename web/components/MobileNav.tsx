'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Search } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Drawer } from 'vaul';
import { visibleNav } from '@/lib/nav';

// 모바일 오른쪽 슬라이드 드로어 — Vaul(shadcn Drawer 기반)로 구현.
// 손수 만든 translate 전환이 iOS Safari에서 왼쪽 팝인·페이지 비침으로 깨져서,
// iOS Safari 트랜스폼/스크롤락/포커스트랩을 내부에서 처리하는 검증된 라이브러리로 교체.
// direction="right" + --initial-transform:100% = 화면 밖 오른쪽에서 flush 슬라이드인.
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

  // 페이지 이동 시 닫기
  useEffect(() => { setOpen(false); }, [pathname]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) {
      router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      setOpen(false);
    }
  }

  return (
    <Drawer.Root direction="right" open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <button
          className="sm:hidden p-2 rounded-[var(--r-sm)] hover:bg-[var(--card)] text-[var(--fg)]"
          aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </Drawer.Trigger>

      <Drawer.Portal>
        {/* 검정 딤 배경 — Vaul이 탭 닫기·페이드를 처리 */}
        <Drawer.Overlay className="sm:hidden fixed inset-0 z-[60] bg-black/40" />
        {/* 오른쪽 패널 — Vaul이 슬라이드·스크롤락·포커스트랩·Esc를 처리 */}
        <Drawer.Content
          // --initial-transform:100% → 여백 없이 화면 밖 오른쪽에서 flush 슬라이드
          style={{ '--initial-transform': '100%' } as React.CSSProperties}
          className="sm:hidden fixed inset-y-0 right-0 z-[60] w-[85%] max-w-[360px] bg-[var(--bg)] flex flex-col outline-none shadow-2xl"
        >
          {/* a11y — 라디오스 다이얼로그 접근성 라벨(시각적으로 숨김) */}
          <Drawer.Title className="sr-only">모바일 메뉴</Drawer.Title>
          <Drawer.Description className="sr-only">사이트 검색과 메뉴</Drawer.Description>

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
            <Drawer.Close asChild>
              <button
                className="p-2 rounded-[var(--r-sm)] hover:bg-[var(--card)] text-[var(--fg)]"
                aria-label="메뉴 닫기"
              >
                <X size={20} />
              </button>
            </Drawer.Close>
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
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
