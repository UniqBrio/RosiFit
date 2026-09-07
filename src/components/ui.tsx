import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';
import { RADIUS, SPACE, TAP_MIN } from '../theme/tokens';
import { RequiredMark } from './RequiredMark';

export function Screen({ children, scroll = true, deep = false, header }:
  { children: React.ReactNode; scroll?: boolean; deep?: boolean;
    /** The screen's own title block, PINNED above the scroll rather than
     *  scrolled with it -- so mid-scroll the screen still says which screen
     *  it is (requests/2026-09-07-pin-screen-header-on-scroll.md). Same
     *  sibling-above pattern ShellScreen uses for the academy header; never
     *  a child of the ScrollView, never `position: sticky`. */
    header?: React.ReactNode }) {
  const { theme } = useTheme();
  // `deep` puts the screen on the header gradient instead of the app
  // background -- sign-in, help and the PIN screen in the canvas.
  const bg = deep ? 'transparent' : theme.bg;
  const body = scroll
    ? <ScrollView style={{ flex: 1, backgroundColor: bg }}
        // With a pinned header the block's own bottom margin and the hairline
        // already separate it from the body, so the body opens on the smaller
        // gap rather than a second full one.
        contentContainerStyle={{ padding: SPACE.lg, paddingTop: header ? SPACE.md : SPACE.lg, paddingBottom: 96 }}>
        {children}</ScrollView>
    : <View style={{ flex: 1, backgroundColor: bg, padding: SPACE.lg }}>{children}</View>;
  const framed = header
    ? <View style={{ flex: 1, backgroundColor: bg }}>
        {/* The hairline is the one thing added: content has to visibly pass
            UNDER the header, and on the same ground with no rule between them
            a scrolling card runs straight into the title. `theme.line`, the
            same rule the tab row draws beneath itself. */}
        {/* The header owns the stacking context. Every View here is
            `position: relative` with a z-index of its own, so a header whose
            z-index were left to default would be painted UNDER the body that
            follows it -- and a filter panel opened from a pinned header would
            disappear behind the first card it overlapped. Lifting the header
            is also what "content passes under it" means literally. */}
        <View style={{ paddingHorizontal: SPACE.lg, paddingTop: SPACE.lg, zIndex: 40,
                       borderBottomWidth: 1, borderBottomColor: theme.line }}>
          {header}
        </View>
        {body}
      </View>
    : body;
  return deep ? <DeepBackground>{framed}</DeepBackground> : framed;
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

type TxtProps = {
  children: React.ReactNode; style?: TextStyle; numberOfLines?: number;
  /** 'polite' announces validation errors to a screen reader as they appear. */
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
};
export const H1 = ({ children, style }: TxtProps) => {
  const { theme } = useTheme();
  return <Text style={[{ fontSize: 26, fontWeight: '800', color: theme.fgStrong, letterSpacing: -0.5 }, style]}>{children}</Text>;
};
export const H2 = ({ children, style }: TxtProps) => {
  const { theme } = useTheme();
  return <Text style={[{ fontSize: 18, fontWeight: '700', color: theme.fgStrong }, style]}>{children}</Text>;
};
export const Body = ({ children, style, numberOfLines, accessibilityLiveRegion }: TxtProps) => {
  const { theme } = useTheme();
  return <Text numberOfLines={numberOfLines} accessibilityLiveRegion={accessibilityLiveRegion} style={[{ fontSize: 15, color: theme.fg, lineHeight: 22 }, style]}>{children}</Text>;
};
export const Muted = ({ children, style, numberOfLines, accessibilityLiveRegion }: TxtProps) => {
  const { theme } = useTheme();
  return <Text numberOfLines={numberOfLines} accessibilityLiveRegion={accessibilityLiveRegion} style={[{ fontSize: 13, color: theme.muted, lineHeight: 19 }, style]}>{children}</Text>;
};
export const Label = ({ children, style, required }: TxtProps & {
  /** Marks the control BELOW this label mandatory. Optional, so the ~40
   *  existing Labels -- most of which head a section, not a field -- keep
   *  rendering exactly as they did. */
  required?: boolean }) => {
  const { theme } = useTheme();
  return <Text style={[{ fontSize: 11, fontWeight: '700', letterSpacing: 0.8,
    textTransform: 'uppercase', color: theme.muted }, style]}>
    {children}{required ? <RequiredMark /> : null}
  </Text>;
};

export function Button({ label, onPress, variant = 'primary', disabled, style, testID }:
  { label: string; onPress?: () => void; variant?: 'primary' | 'secondary'; disabled?: boolean;
    style?: ViewStyle;
    /** Optional so the ~40 existing Buttons keep compiling, but pass it on
     *  anything a runner needs to press: a label is not an address, and it
     *  changes the moment the copy does. */
    testID?: string }) {
  const { theme } = useTheme();
  const primary = variant === 'primary';
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [{
        minHeight: TAP_MIN + 6,
        borderRadius: RADIUS.md,
        alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: SPACE.lg,
        // A disabled button changes FILL rather than fading the whole control.
        // Dimming with opacity washed the white label into the accent at
        // ~1.14:1 -- WCAG exempts inactive controls, but a label nobody can
        // read still hides what the button would do once it is enabled.
        backgroundColor: disabled ? theme.control : primary ? theme.accent : theme.control,
        borderWidth: disabled || !primary ? 1 : 0,
        borderColor: theme.lineStrong,
        opacity: pressed && !disabled ? 0.85 : 1,
      }, style]}>
      <Text style={{ fontSize: 15, fontWeight: '800',
        color: disabled ? theme.muted : primary ? theme.onAccent : theme.fgStrong }}>{label}</Text>
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

/* ------------------------------------------------------------------ states
 * D1.1 §41. Every list screen has to answer four questions honestly:
 * still loading · nothing here yet · nothing matches your filters · it broke.
 * Collapsing "no data" into "no results" is the common failure -- it tells a
 * new academy its import is broken when it simply has not imported yet.
 */

export function Skeleton({ lines = 3 }: { lines?: number }) {
  const { theme } = useTheme();
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <View key={i} style={{
          backgroundColor: theme.surface, borderRadius: RADIUS.lg, borderWidth: 1,
          borderColor: theme.line, padding: SPACE.lg, marginBottom: SPACE.md, gap: SPACE.sm,
        }}>
          <View style={{ height: 16, width: '55%', borderRadius: 6, backgroundColor: theme.control }} />
          <View style={{ height: 12, width: '80%', borderRadius: 6, backgroundColor: theme.control }} />
          <View style={{ height: 12, width: '35%', borderRadius: 6, backgroundColor: theme.control }} />
        </View>
      ))}
    </View>
  );
}

export function EmptyState({ title, body, action, onAction }:
  { title: string; body: string; action?: string; onAction?: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={{
      backgroundColor: theme.surface, borderRadius: RADIUS.lg, borderWidth: 1,
      borderColor: theme.line, padding: SPACE.xl, marginBottom: SPACE.md, alignItems: 'flex-start',
    }}>
      <Text style={{ fontSize: 17, fontWeight: '800', color: theme.fgStrong }}>{title}</Text>
      <Text style={{ fontSize: 14, color: theme.fg, lineHeight: 21, marginTop: SPACE.sm }}>{body}</Text>
      {action && onAction ? (
        <Button label={action} onPress={onAction} style={{ marginTop: SPACE.lg, alignSelf: 'stretch' }} />
      ) : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { theme } = useTheme();
  return (
    <View accessibilityLiveRegion="polite" style={{
      backgroundColor: theme.surface, borderRadius: RADIUS.lg, borderWidth: 2,
      borderColor: theme.danger, padding: SPACE.xl, marginBottom: SPACE.md,
    }}>
      <Text style={{ fontSize: 17, fontWeight: '800', color: theme.danger }}>Something went wrong</Text>
      {/* say what failed and what it means, never just "error" */}
      <Text style={{ fontSize: 14, color: theme.fg, lineHeight: 21, marginTop: SPACE.sm }}>{message}</Text>
      <Text style={{ fontSize: 13, color: theme.muted, marginTop: SPACE.sm }}>
        Nothing was changed. You can try again safely.
      </Text>
      {onRetry ? <Button label="Try again" onPress={onRetry} style={{ marginTop: SPACE.lg }} /> : null}
    </View>
  );
}

/* ---------------------------------------------------------- deep surfaces
 * Sign-in, Help, Profile and the PIN screen sit on the canvas' deep header
 * gradient rather than the app background. The canvas paints a radial
 * gradient; a vertical one through the same three stops reads the same at
 * phone width and needs no platform-specific shim.
 */
/**
 * `fill` is the difference between the gradient being a SCREEN and being a
 * BAR, and it defaults to the screen because that is what three of the four
 * callers are. The fourth is the course header, which is a sibling ABOVE a
 * roster's ScrollView -- and `flex: 1` on both siblings split the viewport
 * down the middle, so a 56pt header painted 417pt of empty purple and shoved
 * the roster onto the bottom half of the screen. That is not something a
 * caller can fix from the outside: overriding the shorthand leaves
 * `flexBasis: 0%` behind, and the bar collapses to nothing instead. So the
 * choice is named here rather than patched at the call site.
 */
export function DeepBackground(
  { children, style, fill = true }:
  { children: React.ReactNode; style?: ViewStyle; fill?: boolean },
) {
  const { theme } = useTheme();
  return (
    <LinearGradient
      colors={[theme.accentDeep, theme.accentDeep2, theme.accentDeep3]}
      locations={[0, 0.55, 1]}
      style={[fill ? { flex: 1 } : null, style]}>
      {children}
    </LinearGradient>
  );
}
