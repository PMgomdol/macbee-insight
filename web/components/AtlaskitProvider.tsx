'use client';
import { useEffect } from 'react';
import { setGlobalTheme } from '@atlaskit/tokens';

export function AtlaskitProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // ThemeToggle는 data-theme 속성으로 light/dark 강제 — atlaskit도 이 preference에 맞춤.
    // colorMode: 'auto' → @atlaskit이 data-color-mode 속성 감지 (동적 반영).
    setGlobalTheme({
      colorMode: 'auto',
      light: 'light',
      dark: 'dark',
      spacing: 'spacing',
      typography: 'typography',
      shape: 'shape',
    });

    // 기존 ThemeToggle이 :root[data-theme] 를 세팅하는 것을 @atlaskit이 감지하도록 미러링
    const syncColorMode = () => {
      const root = document.documentElement;
      const t = root.getAttribute('data-theme');
      if (t === 'light' || t === 'dark') {
        root.setAttribute('data-color-mode', t);
      } else {
        root.removeAttribute('data-color-mode');
      }
    };
    syncColorMode();
    const mo = new MutationObserver(syncColorMode);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);

  return <>{children}</>;
}
