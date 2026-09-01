import { View, Pressable, Text, Linking } from 'react-native';
import { Screen, Card, H1, H2, Body, Muted, Label, Row, Divider } from '../../src/components/ui';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE, RADIUS, TAP_MIN } from '../../src/theme/tokens';
import { SUPPORT_PHONE } from '../../src/data/mock';
import type { ThemeMode } from '../../src/theme/ThemeProvider';

export default function More() {
  const { theme, mode, setMode, accentKey, setAccentKey, accents } = useTheme();
  const modes: { key: ThemeMode; label: string }[] = [
    { key: 'light', label: 'Light' }, { key: 'dark', label: 'Dark' }, { key: 'system', label: 'System' },
  ];

  return (
    <Screen>
      <H1>More</H1>
      <Muted style={{ marginBottom: SPACE.lg }}>Priya Menon · Academy admin</Muted>

      <Card>
        <H2>Appearance</H2>
        {/* C-81: three explicit choices, persisted per user. Not system-only. */}
        <Label style={{ marginTop: SPACE.md }}>Theme</Label>
        <Row style={{ marginTop: SPACE.sm }}>
          {modes.map(m => {
            const on = mode === m.key;
            return (
              <Pressable key={m.key} onPress={() => setMode(m.key)}
                accessibilityRole="radio" accessibilityState={{ selected: on }}
                style={{
                  flex: 1, minHeight: TAP_MIN, alignItems: 'center', justifyContent: 'center',
                  borderRadius: RADIUS.md, borderWidth: 1.5,
                  borderColor: on ? theme.accent : theme.lineStrong,
                  backgroundColor: on ? theme.accent : 'transparent',
                }}>
                <Text style={{ fontWeight: '700', color: on ? theme.onAccent : theme.fg }}>{m.label}</Text>
              </Pressable>
            );
          })}
        </Row>

        {/* C-82: a controlled set. There is no free colour picker, because a
            custom hue cannot be measured against every surface ahead of time. */}
        <Label style={{ marginTop: SPACE.lg }}>Accent colour</Label>
        <Row style={{ marginTop: SPACE.sm, flexWrap: 'wrap' }}>
          {accents.map(a => {
            const on = accentKey === a.key;
            return (
              <Pressable key={a.key} onPress={() => setAccentKey(a.key)}
                accessibilityRole="radio" accessibilityState={{ selected: on }}
                accessibilityLabel={a.label}
                style={{
                  minHeight: TAP_MIN, minWidth: TAP_MIN, paddingHorizontal: SPACE.md,
                  flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
                  borderRadius: RADIUS.pill, borderWidth: 2,
                  borderColor: on ? theme.fgStrong : theme.lineStrong,
                }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: a.value }} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.fg }}>{a.label}</Text>
              </Pressable>
            );
          })}
        </Row>
        <Muted style={{ marginTop: SPACE.md }}>
          Your choice applies to your account only. Every colour here is measured for
          contrast in both themes before it ships.
        </Muted>
      </Card>

      <Card>
        <H2>Help &amp; support</H2>
        {/* C-83: this number, and nothing invented alongside it */}
        <Pressable onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`)}
          accessibilityRole="link" accessibilityLabel={`Call support on ${SUPPORT_PHONE}`}
          style={{ minHeight: TAP_MIN + 8, justifyContent: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: theme.accentInk,
            fontVariant: ['tabular-nums'] }}>{SUPPORT_PHONE}</Text>
        </Pressable>
        <Muted>Tap to call.</Muted>
      </Card>

      <Card>
        <H2>Account</H2>
        <Divider />
        <Label>Mobile number</Label>
        <Body style={{ fontWeight: '800', marginTop: 2 }}>+91 80563 29742</Body>
        {/* C-99: changeable. The PIN is derived from the immutable account id,
            not the number, so changing it does not invalidate the PIN. */}
        <Muted style={{ marginTop: 4 }}>
          Your sign-in number. It can be changed, with verification — your PIN keeps working.
        </Muted>
      </Card>
    </Screen>
  );
}
