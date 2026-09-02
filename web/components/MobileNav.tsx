'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Search } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Drawer } from 'vaul';
import { visibleNav } from '@/lib/nav';

// 모바일 GNB 드로어 — Vaul(shadcn Drawer 기반) + 원티드/토스/깃헙/버셀식 "헤더 고정" 패턴.
// 사이트 헤더(로고)는 그 자리에 고정하고, 햄버거만 X로 토글, 메뉴는 헤더 아래로만 슬라이드.
// → 로고가 안 움직이고 중복도 없음(헤더가 하나뿐). 드로어 내부에 로고/상단바를 따로 두지 않는다.
// 손수 만든 translate 전환이 iOS Safari에서 깨져서, iOS 트랜스폼/스크롤락/포커스트랩을
// 내부 처리하는 검증된 라이브러리로 교체(cubic-bezier(.32,.72,0,1) iOS Sheet 이징).
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
    // modal={false} — 사이트 헤더를 살려둔다. modal=true면 Radix가 드로어 밖 전체를
    // pointer-events:none로 죽여서 헤더의 햄버거→X·로고가 안 눌린다(원티드식 "헤더 고정"이 깨짐).
    <Drawer.Root direction="right" open={open} onOpenChange={setOpen} modal={false}>
      {/* 햄버거 = 사이트 헤더 안에 고정. 열려도 헤더(z-50)가 패널(z-40) 위에 있어 계속 보이고 눌린다.
          Trigger 대신 수동 토글 — 열린 상태에서 다시 눌러 닫을 수 있어야 하므로(Radix Trigger는 열기만). */}
      <button
        onClick={() => setOpen((v) => !v)}
        // pointer-events-auto — Vaul이 열릴 때 body에 pointer-events:none를 걸어 헤더가 죽는다.
        // 이 버튼(과 헤더)만 subtree로 auto 복원해 열린 상태에서도 X로 닫을 수 있게 한다.
        className="sm:hidden p-2 rounded-[var(--r-sm)] hover:bg-[var(--card)] text-[var(--fg)] pointer-events-auto"
        aria-label={open ? '메뉴 닫기' : '메뉴 열기'}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      <Drawer.Portal>
        {/* 딤 오버레이 없음(non-modal, 원티드식) — 헤더가 살아있어야 하므로 헤더를 덮는 레이어를 두지 않는다. */}
        {/* 메뉴 패널 — 헤더(h-14=56px) 아래에서 시작해 화면 하단까지 full. 헤더가 위에 있어 로고가 그대로 보인다. */}
        <Drawer.Content
          // --initial-transform:100% → 화면 밖 오른쪽에서 flush 슬라이드인
          style={{ '--initial-transform': '100%' } as React.CSSProperties}
          className="sm:hidden fixed inset-x-0 top-14 bottom-0 z-40 bg-[var(--bg)] flex flex-col outline-none border-t border-[var(--border)]"
        >
          {/* a11y — 다이얼로그 접근성 라벨(시각적으로 숨김). 시각적 제목은 헤더 로고가 담당. */}
          <Drawer.Title className="sr-only">메뉴</Drawer.Title>
          <Drawer.Description className="sr-only">사이트 검색과 메뉴</Drawer.Description>

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
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
