import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { RADIUS, SPACE, TAP_MIN } from '../theme/tokens';

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  const { theme } = useTheme();
  const style = { flex: 1, backgroundColor: theme.bg };
  return scroll
    ? <ScrollView style={style} contentContainerStyle={{ padding: SPACE.lg, paddingBottom: 96 }}>{children}</ScrollView>
    : <View style={[style, { padding: SPACE.lg }]}>{children}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { theme } = useTheme();
  return (
    <View style={[{
      backgroundColor: theme.surface, borderRadius: RADIUS.lg,
      borderWidth: 1, borderColor: theme.line, padding: SPACE.lg, marginBottom: SPACE.md,
    }, style]}>{children}</View>
  );
}

type TxtProps = { children: React.ReactNode; style?: TextStyle; numberOfLines?: number };
export const H1 = ({ children, style }: TxtProps) => {
  const { theme } = useTheme();
  return <Text style={[{ fontSize: 26, fontWeight: '800', color: theme.fgStrong, letterSpacing: -0.5 }, style]}>{children}</Text>;
};
export const H2 = ({ children, style }: TxtProps) => {
  const { theme } = useTheme();
  return <Text style={[{ fontSize: 18, fontWeight: '700', color: theme.fgStrong }, style]}>{children}</Text>;
};
export const Body = ({ children, style, numberOfLines }: TxtProps) => {
  const { theme } = useTheme();
  return <Text numberOfLines={numberOfLines} style={[{ fontSize: 15, color: theme.fg, lineHeight: 22 }, style]}>{children}</Text>;
};
export const Muted = ({ children, style, numberOfLines }: TxtProps) => {
  const { theme } = useTheme();
  return <Text numberOfLines={numberOfLines} style={[{ fontSize: 13, color: theme.muted, lineHeight: 19 }, style]}>{children}</Text>;
};
export const Label = ({ children, style }: TxtProps) => {
  const { theme } = useTheme();
  return <Text style={[{ fontSize: 11, fontWeight: '700', letterSpacing: 0.8,
    textTransform: 'uppercase', color: theme.muted }, style]}>{children}</Text>;
};

export function Button({ label, onPress, variant = 'primary', disabled, style }:
  { label: string; onPress?: () => void; variant?: 'primary' | 'secondary'; disabled?: boolean; style?: ViewStyle }) {
  const { theme } = useTheme();
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [{
        minHeight: TAP_MIN + 6,
        borderRadius: RADIUS.md,
        alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: SPACE.lg,
        backgroundColor: primary ? theme.accent : theme.control,
        borderWidth: primary ? 0 : 1,
        borderColor: theme.lineStrong,
        opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
      }, style]}>
      <Text style={{ fontSize: 15, fontWeight: '800',
        color: primary ? theme.onAccent : theme.fgStrong }}>{label}</Text>
    </Pressable>
  );
}

/** Status pills. Colour is never the only signal -- each carries its own word. */
export type Tone = 'success' | 'warning' | 'danger' | 'possible' | 'neutral';
export function Pill({ text, tone = 'neutral' }: { text: string; tone?: Tone }) {
  const { theme } = useTheme();
  const fg = tone === 'neutral' ? theme.muted : theme[tone];
  return (
    <View style={{
      alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
      borderRadius: RADIUS.pill, borderWidth: 1, borderColor: fg,
    }}>
      <Text style={{ fontSize: 11, fontWeight: '800', color: fg, letterSpacing: 0.3 }}>{text}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }, style]}>{children}</View>;
}

export function Divider() {
  const { theme } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.line, marginVertical: SPACE.md }} />;
}

/** A metric that always states the period it covers (C-84). */
export function Stat({ value, label, period, tone }:
  { value: string | number; label: string; period?: string; tone?: Tone }) {
  const { theme } = useTheme();
  const color = tone && tone !== 'neutral' ? theme[tone] : theme.fgStrong;
  return (
    <View style={{ flex: 1, minWidth: 120 }}>
      <Text style={{ fontSize: 30, fontWeight: '800', color, fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text style={{ fontSize: 13, color: theme.fg, marginTop: 2 }}>{label}</Text>
      {period ? <Text style={{ fontSize: 11, color: theme.muted, marginTop: 2 }}>{period}</Text> : null}
    </View>
  );
}
