import { createContext, useContext, ReactNode, useState, useEffect } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/* ?theme=dark|light — the Figma board capture pipeline drives this (see
   main.tsx, which applies it before first paint). Read once: it seeds the
   initial mode and suppresses persistence, so a capture run never rewrites
   the user's saved preference. */
function urlThemeParam(): ThemeMode | null {
  try {
    const p = new URLSearchParams(window.location.search).get('theme');
    return p === 'dark' || p === 'light' ? p : null;
  } catch {
    return null;
  }
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
}

export function ThemeProvider({ children, defaultMode = 'light' }: ThemeProviderProps) {
  const [urlMode] = useState<ThemeMode | null>(urlThemeParam);
  /* True until the user touches the toggle. A ?theme= seed must not be
     persisted, but any EXPLICIT choice must — including re-picking the same
     mode the param seeded (`mode !== urlMode` alone missed that). */
  const [seededByUrl, setSeededByUrl] = useState<boolean>(urlMode !== null);
  const [mode, rawSetMode] = useState<ThemeMode>(() => {
    if (urlMode) return urlMode;
    try {
      const savedMode = localStorage.getItem('theme-mode');
      if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') return savedMode;
    } catch {
      /* storage unavailable — fall through */
    }
    return defaultMode;
  });

  const [isDark, setIsDark] = useState<boolean>(() => document.documentElement.classList.contains('dark'));

  // Effect to handle system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      if (mode === 'system') {
        setIsDark(mediaQuery.matches);
        document.documentElement.classList.toggle('dark', mediaQuery.matches);
        window.dispatchEvent(new CustomEvent('themechange', { detail: { isDark: mediaQuery.matches } }));
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [mode]);

  const setMode = (next: ThemeMode) => {
    setSeededByUrl(false);
    rawSetMode(next);
  };

  // Effect to update theme when mode changes
  useEffect(() => {
    // Persist the user's choice — but never the mode a ?theme= param seeded.
    if (!seededByUrl) {
      try {
        localStorage.setItem('theme-mode', mode);
      } catch {
        /* storage unavailable */
      }
    }

    const shouldApplyDark =
      mode === 'dark' ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    setIsDark(shouldApplyDark);
    document.documentElement.classList.toggle('dark', shouldApplyDark);

    // Dispatch event for other components to react to theme change
    window.dispatchEvent(new CustomEvent('themechange', { detail: { isDark: shouldApplyDark } }));
  }, [mode, seededByUrl]);

  const value = {
    mode,
    setMode,
    isDark
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/* No-provider fallback: drives the html.dark class directly. Reached only
   when a component (ThemeToggle in MainNav) renders outside ThemeProvider —
   in the app it never does, but navigation test suites mount MainNav bare,
   and a theme control should degrade, not throw. */
const standaloneTheme: ThemeContextType = {
  mode: 'light',
  setMode: (mode) => {
    const dark =
      mode === 'dark' ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('theme-mode', mode);
    } catch {
      /* storage unavailable */
    }
    window.dispatchEvent(new CustomEvent('themechange', { detail: { isDark: dark } }));
  },
  isDark: false,
};

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext) ?? standaloneTheme;
}
