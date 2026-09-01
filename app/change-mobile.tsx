import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, H1, H2, Body, Muted, Label, Button, Row, Divider } from '../src/components/ui';
import { Field } from '../src/components/Field';
import { useTheme } from '../src/theme/ThemeProvider';
import { SPACE } from '../src/theme/tokens';

/**
 * C-99. Authenticated, verified, audited.
 *
 * This is only cheap because the PIN is derived from the immutable account id
 * rather than the phone number -- so moving the number leaves the PIN working.
 */
export default function ChangeMobile() {
  const { theme } = useTheme();
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [next, setNext] = useState('');
  const current = '+91 80563 29742';

  const pinOk = /^\d{4}$/.test(pin);
  const nextOk = next.replace(/\D/g, '').length === 10;

  return (
    <Screen>
      <H1>Change mobile number</H1>
      <Muted style={{ marginBottom: SPACE.lg }}>Your sign-in number.</Muted>

      <Card>
        <Label>Current number</Label>
        <Body style={{ fontWeight: '800', marginTop: 4 }}>{current}</Body>
      </Card>

      <Card>
        <H2>Confirm it is you</H2>
        <View style={{ marginTop: SPACE.md }}>
          <Field label="Your current PIN" value={pin} onChange={setPin} secure
            keyboardType="number-pad" placeholder="••••"
            error={pin.length > 0 && !pinOk ? 'Your PIN is 4 digits.' : undefined} />
          <Field label="New mobile number" value={next} onChange={setNext} prefix="+91"
            keyboardType="number-pad" placeholder="00000 00000"
            error={next.length > 0 && !nextOk ? 'Enter a 10-digit mobile number.' : undefined} />
        </View>
      </Card>

      <Card>
        <H2>What happens</H2>
        <Body style={{ marginTop: SPACE.sm }}>
          The change is approved by the super admin before it takes effect. The old number, the
          new one, who asked, who approved and the time are all recorded.
        </Body>
        <Divider />
        <Muted>Your PIN keeps working — it is not tied to your number.</Muted>
      </Card>

      <Row style={{ gap: SPACE.md }}>
        <Button label="Cancel" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} />
        <Button label="Request the change" disabled={!pinOk || !nextOk}
          onPress={() => router.back()} style={{ flex: 2 }} />
      </Row>
    </Screen>
  );
}
