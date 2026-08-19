'use client';
import { useState } from 'react';
import { BarChart3, MousePointerClick, TrendingUp } from 'lucide-react';

const TABS = [
  { key: 'content', label: '콘텐츠 성과', icon: TrendingUp },
  { key: 'traffic', label: '유입', icon: BarChart3 },
  { key: 'behavior', label: '행동·전환', icon: MousePointerClick },
] as const;

type Key = (typeof TABS)[number]['key'];

export function DashboardTabs({
  content,
  traffic,
  behavior,
}: {
  content: React.ReactNode;
  traffic: React.ReactNode;
  behavior: React.ReactNode;
}) {
  const [sel, setSel] = useState<Key>('content');
  const panels: Record<Key, React.ReactNode> = { content, traffic, behavior };
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="flex gap-1 border-b border-[var(--border)] overflow-x-auto no-scrollbar">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = sel === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setSel(t.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm -mb-px border-b-2 whitespace-nowrap transition ${
                active
                  ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--fg)]'
              }`}
            >
              <Icon size={14} aria-hidden />
              {t.label}
            </button>
          );
        })}
      </div>
      {(['content', 'traffic', 'behavior'] as const).map((k) => (
        <div key={k} hidden={sel !== k}>
          {panels[k]}
        </div>
      ))}
    </div>
  );
}
