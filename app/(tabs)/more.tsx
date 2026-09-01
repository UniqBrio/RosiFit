import { View, Pressable, Text, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, H1, H2, Body, Muted, Label, Row, Button, Divider } from '../../src/components/ui';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE, RADIUS, TAP_MIN } from '../../src/theme/tokens';
import { SUPPORT_PHONE } from '../../src/data/mock';
import type { ThemeMode } from '../../src/theme/ThemeProvider';

export default function More() {
  const { theme, mode, setMode, accentKey, setAccentKey, accents } = useTheme();
  const router = useRouter();
  const modes: { key: ThemeMode; label: string }[] = [
    { key: 'light', label: 'Light' }, { key: 'dark', label: 'Dark' }, { key: 'system', label: 'System' },
  ];

  return (
    <Screen>
      <H1>More</H1>
      <Muted style={{ marginBottom: SPACE.lg }}>Priya Menon · Academy admin</Muted>

      <Card>
        <H2>Manage</H2>
        <View style={{ marginTop: SPACE.sm }}>
          {[
            { label: 'Courses',           sub: 'Times, frequency, follow-up rules', to: '/courses' },
            { label: 'Sessions',          sub: 'Month view, cancel a session',      to: '/sessions' },
            { label: 'Add holiday',       sub: 'A date range, with impact shown',   to: '/holiday' },
            { label: 'Message templates', sub: 'The only way anything is sent',     to: '/templates' },
            { label: 'Reports',           sub: 'Member-wise and week-wise',         to: '/reports' },
            { label: 'Staff',             sub: 'People and their login PINs',       to: '/staff' },
            { label: 'Audit log',         sub: 'Who changed what, and when',        to: '/audit' },
          ].map(item => (
            <Pressable key={item.to} onPress={() => router.push(item.to as never)}
              accessibilityRole="button" accessibilityLabel={item.label}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', minHeight: TAP_MIN + 12,
                paddingVertical: SPACE.sm, opacity: pressed ? 0.6 : 1,
                borderBottomWidth: 1, borderBottomColor: theme.line })}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: theme.fgStrong }}>{item.label}</Text>
                <Text style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>{item.sub}</Text>
              </View>
              <Text style={{ color: theme.accentInk, fontSize: 18, fontWeight: '800' }}>›</Text>
            </Pressable>
          ))}
        </View>
      </Card>

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
        <View style={{ gap: SPACE.sm, marginTop: SPACE.md }}>
          <Button label="Change mobile number" variant="secondary"
            onPress={() => router.push('/change-mobile')} />
          <Button label="Change my PIN" variant="secondary"
            onPress={() => router.push('/set-pin')} />
        </View>
      </Card>
    </Screen>
  );
}
