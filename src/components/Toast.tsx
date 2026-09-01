import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Animated, Easing, AccessibilityInfo, Platform } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { RADIUS, SPACE } from '../theme/tokens';
import { Icon } from './Icon';

export type ToastKind = 'ok' | 'warn';

type Ctx = { flash: (message: string, kind?: ToastKind) => void };
const ToastContext = createContext<Ctx | null>(null);

/** the canvas holds a toast for 2.6s */
const DWELL = 2600;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; kind: ToastKind } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((message: string, kind: ToastKind = 'ok') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, kind });
    // A toast is transient and easy to miss. Announcing it means the outcome
    // reaches somebody who cannot see the bottom of the screen -- for a
    // 'warn' it is the only place the refusal is stated.
    AccessibilityInfo.announceForAccessibility?.(message);
    timer.current = setTimeout(() => setToast(null), DWELL);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const value = useMemo(() => ({ flash }), [flash]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? <ToastBar message={toast.message} kind={toast.kind} /> : null}
    </ToastContext.Provider>
  );
}

function ToastBar({ message, kind }: { message: string; kind: ToastKind }) {
  const { theme } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true,
    }).start();
  }, [anim, message]);

  const tone = kind === 'warn' ? theme.warning : theme.success;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute', left: SPACE.lg, right: SPACE.lg, bottom: 96,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
        flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
        backgroundColor: theme.surface, borderRadius: RADIUS.lg,
        borderWidth: 1, borderColor: tone,
        paddingVertical: SPACE.md, paddingHorizontal: SPACE.lg,
        ...Platform.select({
          web: { boxShadow: '0 12px 30px rgba(0,0,0,0.35)' },
          default: { elevation: 6, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
        }),
      }}>
      {/* the icon repeats the tone the border carries, so the two are never
          the only difference between "done" and "refused" */}
      <Icon name={kind === 'warn' ? 'error' : 'check_circle'} size={20} color={tone} />
      <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '700', color: theme.fgStrong, lineHeight: 19 }}>
        {message}
      </Text>
    </Animated.View>
  );
}

export function useToast() {
  const c = useContext(ToastContext);
  if (!c) throw new Error('useToast must be used inside ToastProvider');
  return c;
}
