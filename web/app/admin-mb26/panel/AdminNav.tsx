'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart3, Inbox, MessageSquare, UserPlus, KanbanSquare } from 'lucide-react';

type NavItem = { href: string; label: string; icon: typeof Home; exact?: boolean };

const ITEMS: NavItem[] = [
  { href: '/admin-mb26/panel', label: '홈', icon: Home, exact: true },
  { href: '/admin-mb26/panel/dashboard', label: '대시보드', icon: BarChart3 },
  { href: '/admin-mb26/panel/requests', label: '자료등록요청', icon: Inbox },
  { href: '/admin-mb26/panel/feedback', label: 'VOC', icon: MessageSquare },
  { href: '/admin-mb26/panel/backlog', label: '백로그', icon: KanbanSquare },
  { href: '/admin-mb26/panel/invite', label: '운영진 초대', icon: UserPlus },
];

export function AdminNav({ badges = {} }: { badges?: Record<string, number> }) {
  const path = usePathname();
  return (
    <nav
      aria-label="운영/관리"
      className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible md:w-44 md:shrink-0 border-b md:border-b-0 md:border-r border-[var(--border)] pb-2 md:pb-0 md:pr-3"
    >
      {ITEMS.map((it) => {
        const active = it.exact ? path === it.href : path === it.href || path.startsWith(it.href + '/');
        const Icon = it.icon;
        const badge = badges[it.href];
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-[var(--r-sm)] text-sm whitespace-nowrap transition ${
              active
                ? 'bg-[var(--accent-bg)] text-[var(--accent)] font-medium'
                : 'text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--fg)]'
            }`}
          >
            <Icon size={16} aria-hidden />
            <span className="flex-1">{it.label}</span>
            {badge ? (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold bg-[var(--danger)] text-white">
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
