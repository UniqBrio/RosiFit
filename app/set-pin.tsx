import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, H1, H2, Body, Muted, Button, Row } from '../src/components/ui';
import { useTheme } from '../src/theme/ThemeProvider';
import { RADIUS, SPACE, TAP_MIN } from '../src/theme/tokens';

/** First-time set, and change-PIN. Same screen; the copy differs. */
export default function SetPin() {
  const { theme } = useTheme();
  const router = useRouter();
  const [stage, setStage] = useState<'new' | 'confirm'>('new');
  const [pin, setPin] = useState('');
  const [first, setFirst] = useState('');
  const [error, setError] = useState('');

  const press = (k: string) => {
    setError('');
    if (k === 'del') return setPin(p => p.slice(0, -1));
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length < 4) return;
    if (stage === 'new') { setFirst(next); setPin(''); setStage('confirm'); return; }
    if (next === first) { setTimeout(() => router.replace('/(tabs)'), 250); }
    else { setError('Those two PINs are different. Start again.'); setPin(''); setFirst(''); setStage('new'); }
  };

  return (
    <Screen>
      <H1>{stage === 'new' ? 'Choose a PIN' : 'Confirm your PIN'}</H1>
      <Muted style={{ marginBottom: SPACE.lg }}>
        {stage === 'new'
          ? 'Four digits. Avoid 1234 or your year of birth.'
          : 'Enter the same four digits again.'}
      </Muted>

      <Card>
        <Row style={{ justifyContent: 'center', gap: SPACE.md, marginVertical: SPACE.md }}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={{
              width: 52, height: 62, borderRadius: RADIUS.md, borderWidth: 1.5,
              borderColor: i < pin.length ? theme.accent : theme.lineStrong,
              backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 28, color: theme.fgStrong }}>{i < pin.length ? '•' : ''}</Text>
            </View>
          ))}
        </Row>
        {error ? (
          <Body accessibilityLiveRegion="polite" style={{ color: theme.danger, textAlign: 'center' }}>{error}</Body>
        ) : null}
        <Row style={{ flexWrap: 'wrap', gap: SPACE.md, justifyContent: 'center', marginTop: SPACE.md }}>
          {['1','2','3','4','5','6','7','8','9','','0','del'].map((k, i) => k === '' ? (
            <View key={i} style={{ width: 92 }} />
          ) : (
            <Pressable key={i} onPress={() => press(k)} accessibilityRole="button"
              accessibilityLabel={k === 'del' ? 'Delete' : k}
              style={({ pressed }) => ({
                width: 92, minHeight: TAP_MIN + 10, borderRadius: RADIUS.md,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: pressed ? theme.control : theme.surface2,
                borderWidth: 1, borderColor: theme.line })}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: theme.fgStrong }}>
                {k === 'del' ? '⌫' : k}</Text>
            </Pressable>
          ))}
        </Row>
      </Card>

      <Card>
        <H2>Why this is safe to change</H2>
        <Body style={{ marginTop: SPACE.sm }}>
          Your PIN is derived from your account, not from your mobile number — so changing
          your number later leaves it working. It is never stored in readable form, never
          written to the audit log, and never shown back to you.
        </Body>
      </Card>
    </Screen>
  );
}
