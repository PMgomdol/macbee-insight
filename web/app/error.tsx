'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center px-4">
      <svg viewBox="0 0 64 64" className="w-10 h-10 opacity-20" aria-hidden fill="currentColor">
        <path d="M10 44V10h13l9 17 9-17h13v34H42V28l-7 13h-6l-7-13v16z" />
        <rect x="10" y="50" width="44" height="6" rx="2" />
      </svg>
      <h1 className="text-2xl font-bold tracking-tight">일시적인 문제가 생겼어요</h1>
      <p className="text-sm text-[var(--muted)] max-w-sm">
        잠시 후 다시 시도해 주세요. 계속 반복되면 하단 의견 보내기로 알려주시면 빠르게 고칠게요.
      </p>
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 rounded-[var(--r-md)] bg-[var(--accent)] text-white hover:text-white text-sm font-medium hover:bg-[var(--accent-hover)]"
        >
          다시 시도
        </button>
        <a
          href="/"
          className="px-4 py-2 rounded-[var(--r-md)] border border-[var(--border)] text-sm hover:bg-[var(--card)]"
        >
          홈으로
        </a>
      </div>
    </div>
  );
}
