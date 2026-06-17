'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface ThemeCtx {
  isDark: boolean;
  setDark: (v: boolean) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Sync state with whatever the anti-FOUC script already applied
    const stored = localStorage.getItem('theme') === 'dark';
    setIsDark(stored);

    // Async: pull preference from DB if user is logged in
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    fetch('/api/configuracion', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.setting?.darkMode !== undefined) {
          applyDark(data.setting.darkMode);
        }
      })
      .catch(() => {});
  }, []);

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
