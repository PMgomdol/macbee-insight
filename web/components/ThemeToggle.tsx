'use client';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type Mode = 'light' | 'dark' | 'system';

const MODES: { v: Mode; label: string; Icon: typeof Sun }[] = [
  { v: 'light', label: '라이트', Icon: Sun },
  { v: 'dark', label: '다크', Icon: Moon },
  { v: 'system', label: '시스템', Icon: Monitor },
];

function apply(mode: Mode) {
  const root = document.documentElement;
  if (mode === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as Mode | null) ?? 'system';
    setMode(saved);
    apply(saved);
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
            title={`${label}${v === 'system' ? ' (OS 설정 따라감)' : ''}`}
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
