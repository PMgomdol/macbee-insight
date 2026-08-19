import type { LabelValue } from '@/lib/metrics/types';

export function BarList({ items }: { items: LabelValue[] }) {
  if (items.length === 0) return <p className="text-xs text-[var(--muted-2)]">데이터 없음</p>;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-2 text-sm">
          <span className="w-28 shrink-0 truncate text-[var(--muted)]" title={it.label}>
            {it.label}
          </span>
          <span className="relative flex-1 h-5 rounded-[var(--r-sm)] bg-[var(--card)] overflow-hidden">
            <span
              className="absolute inset-y-0 left-0 rounded-[var(--r-sm)] bg-[var(--accent)]"
              style={{ width: `${(it.value / max) * 100}%` }}
            />
          </span>
          <span className="w-12 shrink-0 text-right tabular-nums text-[var(--fg)]">
            {it.value.toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  );
}
