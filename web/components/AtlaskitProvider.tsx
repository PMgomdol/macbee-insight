'use client';
import { useEffect } from 'react';

/**
 * @atlaskit/tokens 도 initial 번들에서 큰 비중을 차지 (~150KB) — dynamic import로
 * 지연시켜 필요한 시점(브라우저 유휴)에만 로드.
 * setGlobalTheme는 CSS var를 문서 root에 주입하므로 idempotent — 여러번 호출해도 안전.
 */
export function AtlaskitProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false;

    const idle = (window as any).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 200));
    const id = idle(async () => {
      if (cancelled) return;
      const mod = await import('@atlaskit/tokens');
      if (cancelled) return;
      // 라이트 단일 테마 (다크모드 제거, 2026-08-09)
      mod.setGlobalTheme({
        colorMode: 'light',
        light: 'light',
        spacing: 'spacing',
        typography: 'typography',
        shape: 'shape',
      });
      document.documentElement.setAttribute('data-color-mode', 'light');
    });

    return () => {
      cancelled = true;
      const cancel = (window as any).cancelIdleCallback;
      if (cancel && typeof id !== 'object') cancel(id);
    };
  }, []);

  return <>{children}</>;
}
