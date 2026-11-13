'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export const THEME_KEY = 'archer_admin_theme';

/** Runs before first paint (inlined in <head>) so the wrong theme never flashes. */
export const NO_FLASH_SCRIPT = `(function(){try{var m=localStorage.getItem('${THEME_KEY}')||'dark';var d=m==='dark'||(m==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){document.documentElement.dataset.theme='dark';}})();`;

const Ctx = createContext<{ mode: ThemeMode; setMode: (m: ThemeMode) => void }>({ mode: 'dark', setMode: () => {} });
export const useTheme = () => useContext(Ctx);

function apply(mode: ThemeMode) {
  const dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch { /* storage unavailable */ }
    if (saved === 'light' || saved === 'dark' || saved === 'system') setModeState(saved);
  }, []);

  useEffect(() => {
    apply(mode);
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => apply('system');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [mode]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    try { localStorage.setItem(THEME_KEY, m); } catch { /* ignore */ }
  }, []);

  return <Ctx.Provider value={{ mode, setMode }}>{children}</Ctx.Provider>;
}
