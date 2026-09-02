'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Search } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { visibleNav } from '@/lib/nav';

// 모바일 GNB 드로어 — Radix Dialog(shadcn이 쓰는 검증된 프리미티브) + 원티드/토스식 "헤더 고정" 패턴.
// 사이트 헤더(로고)는 고정, 햄버거만 X로 토글, 메뉴는 헤더 아래로 "제자리 페이드 인"(토스식).
// 실서비스 프레임 분석: 헤더 고정형 메뉴는 옆 슬라이드가 아니라 제자리 등장(토스=페이드, tailwind/linear=즉시)이 표준.
// modal={false} → Radix가 body를 잠그지 않아(=헤더가 살아있어) 햄버거→X 닫기·로고 홈이동이 그대로 동작.
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
    <Dialog.Root open={open} onOpenChange={setOpen} modal={false}>
      {/* 햄버거 = 사이트 헤더 안 고정. 수동 토글(Radix Trigger는 열기만 하므로 X로 닫으려면 직접 토글).
          pointer-events-auto: 혹시 body가 잠겨도 이 버튼은 항상 눌리게. */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="sm:hidden p-2 rounded-[var(--r-sm)] hover:bg-[var(--card)] text-[var(--fg)] pointer-events-auto"
        aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      <Dialog.Portal>
        {/* 딤 오버레이 없음(헤더 고정형·불투명 패널). */}
        <Dialog.Content
          // 헤더(h-14=56px) 아래에서 화면 하단까지. 제자리 페이드 인(globals.css .mobile-menu-panel).
          // onOpenAutoFocus 차단 — 열자마자 검색 인풋에 포커스가 가 iOS 키보드가 튀는 것 방지.
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="mobile-menu-panel sm:hidden fixed inset-x-0 top-14 bottom-0 z-40 bg-[var(--bg)] flex flex-col outline-none border-t border-[var(--border)]"
        >
          {/* a11y — 다이얼로그 라벨(시각적으로 숨김). 시각적 제목은 고정 헤더의 로고가 담당. */}
          <Dialog.Title className="sr-only">메뉴</Dialog.Title>
          <Dialog.Description className="sr-only">사이트 검색과 메뉴</Dialog.Description>

          {/* 검색창 — 헤더 바로 아래. 아래 디바이더 없이 여백으로 메뉴와 구분. */}
          <form onSubmit={onSearch} className="px-4 pt-4 pb-1">
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
                className={`px-3 py-3 rounded-[var(--r-sm)] text-[15px] ${pathname === n.href ? 'bg-[var(--accent-bg)] text-[var(--accent)] font-medium' : 'hover:bg-[var(--card)]'}`}
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
