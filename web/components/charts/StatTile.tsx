export function StatTile({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
}) {
  return (
    <div className="app-card p-4 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-[var(--muted)]">
        {Icon && <Icon size={14} aria-hidden />}
        <span className="text-xs">{label}</span>
      </div>
      <strong className="text-xl font-bold tracking-tight tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </strong>
      {sub && <span className="text-[11px] text-[var(--muted-2)]">{sub}</span>}
    </div>
  );
}
