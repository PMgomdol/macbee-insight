'use client';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

type Mode = 'light' | 'dark';

const MODES: { v: Mode; label: string; Icon: typeof Sun }[] = [
  { v: 'light', label: '라이트', Icon: Sun },
  { v: 'dark', label: '다크', Icon: Moon },
];

function apply(mode: Mode) {
  document.documentElement.setAttribute('data-theme', mode);
}

function detectInitial(): Mode {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {}
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = detectInitial();
    setMode(initial);
    apply(initial);
    setMounted(true);
  }, []);

  function pick(next: Mode) {
    setMode(next);
    apply(next);
    try { localStorage.setItem('theme', next); } catch {}
  }

  return (
    <div
      role="radiogroup"
      aria-label="테마"
      className="hidden sm:inline-flex p-0.5 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg)]"
    >
      {MODES.map(({ v, label, Icon }) => {
        const active = mounted && mode === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => pick(v)}
            title={label}
            className={`inline-flex items-center justify-center w-7 h-7 rounded-[3px] transition ${
              active
                ? 'bg-[var(--accent-bg)] text-[var(--accent)]'
                : 'text-[var(--muted)] hover:text-[var(--fg)] hover:bg-[var(--card)]'
            }`}
          >
            <Icon size={14} aria-hidden />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
