'use client';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type Mode = 'light' | 'dark' | 'system';

function apply(mode: Mode) {
  const root = document.documentElement;
  if (mode === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>('system');

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as Mode | null) ?? 'system';
    setMode(saved);
    apply(saved);
  }, []);

  function cycle() {
    const next: Mode = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
    setMode(next);
    apply(next);
    try { localStorage.setItem('theme', next); } catch {}
  }

  const label = mode === 'system' ? '시스템' : mode === 'light' ? '라이트' : '다크';
  const Icon = mode === 'system' ? Monitor : mode === 'light' ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={cycle}
      className="hidden sm:inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-[var(--r-sm)] border border-[var(--border)] hover:bg-[var(--card)] text-[var(--muted)] hover:text-[var(--fg)]"
      title={`테마: ${label} (클릭으로 전환)`}
      aria-label={`테마 전환 — 현재 ${label}`}
    >
      <Icon size={14} aria-hidden />
      <span className="sr-only">{label}</span>
    </button>
  );
}
