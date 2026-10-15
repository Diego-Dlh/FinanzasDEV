'use client';
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useAuth } from './useAuth';

interface ThemeCtx {
  isDark: boolean;
  setDark: (v: boolean) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  const { user } = useAuth();
  const userId = user?.id ?? null;
  const hadUser = useRef(false);

  // Anti-FOUC script already applied the stored theme; keep the state in step with it
  useEffect(() => {
    setIsDark(localStorage.getItem('theme') === 'dark');
  }, []);

  // Each time the signed-in user changes, take that person's saved preference (and reset it on logout)
  useEffect(() => {
    if (!userId) {
      if (hadUser.current) applyDark(false);
      hadUser.current = false;
      return;
    }
    hadUser.current = true;
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    let cancelled = false;
    fetch('/api/configuracion', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && typeof data.setting?.darkMode === 'boolean') applyDark(data.setting.darkMode);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [userId]);

  function applyDark(value: boolean) {
    setIsDark(value);
    localStorage.setItem('theme', value ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', value);
  }

  return (
    <ThemeContext.Provider value={{ isDark, setDark: applyDark, toggle: () => applyDark(!isDark) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme requiere ThemeProvider');
  return ctx;
}
