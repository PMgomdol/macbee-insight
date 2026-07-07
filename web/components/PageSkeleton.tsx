type ListSkeletonProps = { rows?: number };

function CardSkeleton() {
  return (
    <div
      className="h-[148px] rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--card)] animate-pulse"
      aria-hidden
    />
  );
}

export function ListPageSkeleton({ rows = 6 }: ListSkeletonProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-40 rounded bg-[var(--card)] animate-pulse" />
        <div className="h-4 w-72 rounded bg-[var(--card)] animate-pulse" />
      </div>
      <div className="h-10 rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--card)] animate-pulse" />
      <div className="flex gap-1.5 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-7 w-20 rounded-[var(--r-sm)] bg-[var(--card)] animate-pulse shrink-0" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function FaqSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-32 rounded bg-[var(--card)] animate-pulse" />
        <div className="h-4 w-80 rounded bg-[var(--card)] animate-pulse" />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--card)] animate-pulse"
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}

export function SearchSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="h-11 rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--card)] animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="h-7 w-40 rounded bg-[var(--card)] animate-pulse" />
      <div className="h-4 w-80 rounded bg-[var(--card)] animate-pulse" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <div className="h-3 w-16 rounded bg-[var(--card)] animate-pulse" />
          <div className="h-10 rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--card)] animate-pulse" />
        </div>
      ))}
    </div>
  );
}
