import { View, Text, TextInput, Pressable, type KeyboardTypeOptions } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { RADIUS, SPACE, TAP_MIN } from '../theme/tokens';

export function Field({ label, value, onChange, placeholder, hint, error, keyboardType, secure, multiline, prefix }:
  { label: string; value: string; onChange: (v: string) => void; placeholder?: string;
    hint?: string; error?: string; keyboardType?: KeyboardTypeOptions;
    secure?: boolean; multiline?: boolean; prefix?: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ marginBottom: SPACE.md }}>
      <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase',
        color: theme.muted, marginBottom: 6 }}>{label}</Text>
      <View style={{
        flexDirection: 'row', alignItems: multiline ? 'flex-start' : 'center', gap: SPACE.sm,
        borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACE.lg,
        borderColor: error ? theme.danger : theme.lineStrong,
        backgroundColor: theme.surface,
        minHeight: multiline ? 110 : TAP_MIN + 8, paddingVertical: multiline ? SPACE.md : 0,
      }}>
        {prefix ? <Text style={{ color: theme.muted, fontWeight: '700' }}>{prefix}</Text> : null}
        <TextInput
          value={value} onChangeText={onChange} placeholder={placeholder}
          placeholderTextColor={theme.muted} keyboardType={keyboardType}
          secureTextEntry={secure} multiline={multiline}
          accessibilityLabel={label}
          style={{ flex: 1, color: theme.fgStrong, fontSize: 15, fontWeight: '400',
            minHeight: multiline ? 86 : undefined, textAlignVertical: multiline ? 'top' : 'center' }} />
      </View>
      {/* the error replaces the hint rather than stacking, so the row height
          does not jump while somebody is typing */}
      {error
        ? <Text accessibilityLiveRegion="polite" style={{ fontSize: 12, color: theme.danger, marginTop: 5 }}>{error}</Text>
        : hint ? <Text style={{ fontSize: 12, color: theme.muted, marginTop: 5, lineHeight: 17 }}>{hint}</Text> : null}
    </View>
  );
}

export function Choice({ options, value, onChange, label }:
  { options: string[]; value: string; onChange: (v: string) => void; label?: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ marginBottom: SPACE.md }}>
      {label ? <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.8,
        textTransform: 'uppercase', color: theme.muted, marginBottom: 6 }}>{label}</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
        {options.map(o => {
          const on = o === value;
          return (
            <Pressable key={o} onPress={() => onChange(o)}
              accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={{ minHeight: TAP_MIN, justifyContent: 'center', paddingHorizontal: SPACE.lg,
                borderRadius: RADIUS.pill, borderWidth: 1.5,
                borderColor: on ? theme.accent : theme.lineStrong,
                backgroundColor: on ? theme.accent : 'transparent' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: on ? theme.onAccent : theme.fg }}>{o}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Toggle({ label, value, onChange, hint }:
  { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={() => onChange(!value)} accessibilityRole="switch"
      accessibilityState={{ checked: value }} accessibilityLabel={label}
      style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
        minHeight: TAP_MIN + 4, marginBottom: SPACE.sm }}>
      <View style={{ width: 26, height: 26, borderRadius: 7, borderWidth: 2,
        alignItems: 'center', justifyContent: 'center',
        borderColor: value ? theme.accent : theme.lineStrong,
        backgroundColor: value ? theme.accent : 'transparent' }}>
        {value ? <Text style={{ color: theme.onAccent, fontWeight: '900', fontSize: 15 }}>✓</Text> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, color: theme.fgStrong, fontWeight: '600' }}>{label}</Text>
        {hint ? <Text style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
}

export function Stepper({ label, value, onChange, min = 1, max = 12, hint }:
  { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; hint?: string }) {
  const { theme } = useTheme();
  const btn = (t: string, on: () => void, enabled: boolean) => (
    <Pressable onPress={enabled ? on : undefined} disabled={!enabled}
      accessibilityRole="button" accessibilityLabel={`${t === '−' ? 'Decrease' : 'Increase'} ${label}`}
      style={{ width: TAP_MIN, height: TAP_MIN, borderRadius: RADIUS.md, borderWidth: 1,
        borderColor: theme.lineStrong, alignItems: 'center', justifyContent: 'center',
        opacity: enabled ? 1 : 0.35, backgroundColor: theme.surface }}>
      <Text style={{ fontSize: 20, fontWeight: '800', color: theme.fgStrong }}>{t}</Text>
    </Pressable>
  );
  return (
    <View style={{ marginBottom: SPACE.md }}>
      <Text style={{ fontSize: 13, color: theme.fg, marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
        {btn('−', () => onChange(Math.max(min, value - 1)), value > min)}
        <Text accessibilityLiveRegion="polite" style={{ minWidth: 44, textAlign: 'center', fontSize: 22,
          fontWeight: '800', color: theme.fgStrong, fontVariant: ['tabular-nums'] }}>{value}</Text>
        {btn('+', () => onChange(Math.min(max, value + 1)), value < max)}
      </View>
      {hint ? <Text style={{ fontSize: 12, color: theme.muted, marginTop: 5 }}>{hint}</Text> : null}
    </View>
  );
}
