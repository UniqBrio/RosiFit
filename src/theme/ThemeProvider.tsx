import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ACCENTS, DARK, LIGHT, customAccent, DEFAULT_HUE, type Accent } from './tokens';
import { currentAppUser } from '../data/session';
import { fetchPreferences, savePreferences } from '../data/repository';

export type ThemeMode = 'light' | 'dark' | 'system';

export type Theme = typeof DARK & {
  accent: string; accentInk: string; accentAvatar: string;
  /** the three stops of the header gradient, dark to darker */
  accentDeep: string; accentDeep2: string; accentDeep3: string;
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

  // The app_user whose user_preferences row this is. Null in fixtures mode
  // and before sign-in, when AsyncStorage alone carries the preference.
  const appUserId = useRef<string | null>(null);

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

      // C-81/C-82: the preference is per USER, so it follows her to another
      // device — AsyncStorage alone would leave it on the one she set it on.
      // The stored row wins where it exists; a device with no row keeps
      // whatever this device had, and the next change writes it up.
      try {
        const user = await currentAppUser();
        if (!user) return;
        appUserId.current = user.id;
        const prefs = await fetchPreferences(user.id);
        if (!prefs) return;
        setModeState(prefs.theme_mode);
        if (prefs.accent_key === CUSTOM_KEY || ACCENTS.some(x => x.key === prefs.accent_key)) {
          setAccentKeyState(prefs.accent_key);
        }
        if (prefs.accent_hue >= 0 && prefs.accent_hue <= 359) setHueState(prefs.accent_hue);
      } catch {
        // An unreachable project must not cost her the local preference.
      }
    })();
  }, []);

  /** Both stores, always: AsyncStorage so the next launch is instant even
   *  offline, user_preferences so the choice is hers rather than this
   *  device's. Neither write is allowed to throw into a tap handler. */
  const persist = useCallback((patch: Partial<{ theme_mode: ThemeMode; accent_key: string; accent_hue: number }>) => {
    if (patch.theme_mode !== undefined) AsyncStorage.setItem(KEY_MODE, patch.theme_mode).catch(() => {});
    if (patch.accent_key !== undefined) AsyncStorage.setItem(KEY_ACCENT, patch.accent_key).catch(() => {});
    if (patch.accent_hue !== undefined) AsyncStorage.setItem(KEY_HUE, String(patch.accent_hue)).catch(() => {});
    const id = appUserId.current;
    if (id) savePreferences(id, patch).catch(() => {});
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    persist({ theme_mode: m });
  }, [persist]);

  const setAccentKey = useCallback((k: string) => {
    // C-82: the approved set, plus 'custom' -- which is not free input either.
    // customAccent() darkens until it measures, so no hue can fail contrast.
    if (k !== CUSTOM_KEY && !ACCENTS.some(x => x.key === k)) return;
    setAccentKeyState(k);
    persist({ accent_key: k });
  }, [persist]);

  const setHue = useCallback((h: number) => {
    const n = Math.max(0, Math.min(359, Math.round(h)));
    setHueState(n);
    persist({ accent_hue: n });
  }, [persist]);

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
        accentDeep2: a.deep2,
        accentDeep3: a.deep3,
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
