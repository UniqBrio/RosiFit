import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACCENTS, DARK, LIGHT, customAccent, DEFAULT_HUE, type Accent } from './tokens';

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
  /** hue of the custom accent, 0..359. Live even when a preset is selected,
   *  so the appearance screen can preview it without switching to it. */
  hue: number;
  /** white-on-accent ratio of the current custom hue, e.g. "4.6:1" */
  customRatio: string;
  isCustom: boolean;
  setMode: (m: ThemeMode) => void;
  setAccentKey: (k: string) => void;
  setHue: (h: number) => void;
};

const ThemeContext = createContext<Ctx | null>(null);
const KEY_MODE = 'rosifit.theme.mode';
const KEY_ACCENT = 'rosifit.theme.accent';
const KEY_HUE = 'rosifit.theme.hue';

/** the one key that is not in ACCENTS — it is generated, not pre-measured */
export const CUSTOM_KEY = 'custom';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  // C-81: the preference is the user's own and is persisted. It is NOT
  // system-only -- 'system' is one of three choices, not the only behaviour.
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [accentKey, setAccentKeyState] = useState<string>('rosifit');
  const [hue, setHueState] = useState<number>(DEFAULT_HUE);

  useEffect(() => {
    (async () => {
      try {
        const [m, a, h] = await Promise.all([
          AsyncStorage.getItem(KEY_MODE),
          AsyncStorage.getItem(KEY_ACCENT),
          AsyncStorage.getItem(KEY_HUE),
        ]);
        if (m === 'light' || m === 'dark' || m === 'system') setModeState(m);
        if (a && (a === CUSTOM_KEY || ACCENTS.some(x => x.key === a))) setAccentKeyState(a);
        const n = h === null ? NaN : parseInt(h, 10);
        if (Number.isFinite(n) && n >= 0 && n <= 359) setHueState(n);
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
    // C-82: the approved set, plus 'custom' -- which is not free input either.
    // customAccent() darkens until it measures, so no hue can fail contrast.
    if (k !== CUSTOM_KEY && !ACCENTS.some(x => x.key === k)) return;
    setAccentKeyState(k);
    AsyncStorage.setItem(KEY_ACCENT, k).catch(() => {});
  }, []);

  const setHue = useCallback((h: number) => {
    const n = Math.max(0, Math.min(359, Math.round(h)));
    setHueState(n);
    AsyncStorage.setItem(KEY_HUE, String(n)).catch(() => {});
  }, []);

  const value = useMemo<Ctx>(() => {
    const isDark = mode === 'system' ? system !== 'light' : mode === 'dark';
    const base = isDark ? DARK : LIGHT;
    const isCustom = accentKey === CUSTOM_KEY;
    const custom = customAccent(hue);
    const a = isCustom ? custom : (ACCENTS.find(x => x.key === accentKey) ?? ACCENTS[0]);
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
      mode, accentKey, accents: ACCENTS, hue, isCustom,
      customRatio: custom.ratio,
      setMode, setAccentKey, setHue,
    };
  }, [mode, accentKey, hue, system, setMode, setAccentKey, setHue]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const c = useContext(ThemeContext);
  if (!c) throw new Error('useTheme must be used inside ThemeProvider');
  return c;
}
