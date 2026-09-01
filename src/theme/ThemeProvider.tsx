import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACCENTS, DARK, LIGHT, type Accent } from './tokens';

export type ThemeMode = 'light' | 'dark' | 'system';

export type Theme = typeof DARK & {
  accent: string; accentInk: string; accentDeep: string; accentAvatar: string;
  isDark: boolean;
};

type Ctx = {
  theme: Theme;
  mode: ThemeMode;
  accentKey: string;
  accents: Accent[];
  setMode: (m: ThemeMode) => void;
  setAccentKey: (k: string) => void;
};

const ThemeContext = createContext<Ctx | null>(null);
const KEY_MODE = 'rosifit.theme.mode';
const KEY_ACCENT = 'rosifit.theme.accent';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  // C-81: the preference is the user's own and is persisted. It is NOT
  // system-only -- 'system' is one of three choices, not the only behaviour.
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [accentKey, setAccentKeyState] = useState<string>('rosifit');

  useEffect(() => {
    (async () => {
      try {
        const [m, a] = await Promise.all([
          AsyncStorage.getItem(KEY_MODE), AsyncStorage.getItem(KEY_ACCENT),
        ]);
        if (m === 'light' || m === 'dark' || m === 'system') setModeState(m);
        if (a && ACCENTS.some(x => x.key === a)) setAccentKeyState(a);
      } catch {
        // storage can be unavailable (private mode, cleared data). The
        // defaults above are a correct app, so this is not an error path.
      }
    })();
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(KEY_MODE, m).catch(() => {});
  }, []);

  const setAccentKey = useCallback((k: string) => {
    if (!ACCENTS.some(x => x.key === k)) return;   // C-82: only the approved set
    setAccentKeyState(k);
    AsyncStorage.setItem(KEY_ACCENT, k).catch(() => {});
  }, []);

  const value = useMemo<Ctx>(() => {
    const isDark = mode === 'system' ? system !== 'light' : mode === 'dark';
    const base = isDark ? DARK : LIGHT;
    const a = ACCENTS.find(x => x.key === accentKey) ?? ACCENTS[0];
    return {
      theme: {
        ...base,
        isDark,
        accent: a.value,
        // the whole point of the split: accent-coloured TEXT needs a different
        // ink per theme, or light mode renders it at ~1.5:1
        accentInk: isDark ? a.tintDark : a.tintLight,
        accentDeep: a.deep,
        accentAvatar: a.avatar,
      },
      mode, accentKey, accents: ACCENTS, setMode, setAccentKey,
    };
  }, [mode, accentKey, system, setMode, setAccentKey]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const c = useContext(ThemeContext);
  if (!c) throw new Error('useTheme must be used inside ThemeProvider');
  return c;
}
