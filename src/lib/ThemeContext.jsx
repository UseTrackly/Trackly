import React, { createContext, useContext, useEffect, useState } from 'react';
import { applyColorTheme } from './colorThemes';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('trackly-theme');
        if (saved) return saved;
        return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
      }
    } catch {
      // ignore — fall back to dark
    }
    return 'dark';
  });

  const [background, setBackground] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('trackly-background') || 'default';
    }
    return 'default';
  });

  const [customBackground, setCustomBackground] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('trackly-custom-bg') || null;
    }
    return null;
  });

  const [colorTheme, setColorTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('trackly-color-theme') || 'default';
    }
    return 'default';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('trackly-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('trackly-background', background);
    }
  }, [background]);

  useEffect(() => {
    if (typeof window !== 'undefined' && customBackground) {
      localStorage.setItem('trackly-custom-bg', customBackground);
    }
  }, [customBackground]);

  useEffect(() => {
    try { applyColorTheme(colorTheme); } catch { /* ignore */ }
    localStorage.setItem('trackly-color-theme', colorTheme);
  }, [colorTheme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const changeBackground = (bg) => {
    setBackground(bg);
  };

  const uploadCustomBackground = (url) => {
    setCustomBackground(url);
    setBackground('custom');
  };

  const changeColorTheme = (newTheme) => {
    setColorTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, background, changeBackground, customBackground, uploadCustomBackground, colorTheme, changeColorTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);