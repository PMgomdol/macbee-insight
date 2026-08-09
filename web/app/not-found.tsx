import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center px-4">
      <svg viewBox="0 0 64 64" className="w-10 h-10 opacity-20" aria-hidden fill="currentColor">
        <path d="M10 44V10h13l9 17 9-17h13v34H42V28l-7 13h-6l-7-13v16z" />
        <rect x="10" y="50" width="44" height="6" rx="2" />
      </svg>
      <h1 className="text-2xl font-bold tracking-tight">페이지를 찾지 못했어요</h1>
      <p className="text-sm text-[var(--muted)] max-w-sm">
        주소가 바뀌었거나 삭제된 페이지예요. 찾으시는 자료가 있다면 검색해 보세요.
      </p>
      <div className="flex gap-2 mt-2">
        <Link
          href="/"
          className="px-4 py-2 rounded-[var(--r-md)] bg-[var(--accent)] text-white hover:text-white text-sm font-medium hover:bg-[var(--accent-hover)]"
        >
          홈으로
        </Link>
        <Link
          href="/search"
          className="px-4 py-2 rounded-[var(--r-md)] border border-[var(--border)] text-sm hover:bg-[var(--card)]"
        >
          자료 검색
        </Link>
      </div>
    </div>
  );
}
