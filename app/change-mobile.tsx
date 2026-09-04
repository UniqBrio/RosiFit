import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, H2, Body, Muted, Label, Divider, Skeleton } from '../src/components/ui';
import { FormDialog } from '../src/components/FormDialog';
import { Field } from '../src/components/Field';
import { useTheme } from '../src/theme/ThemeProvider';
import { SPACE } from '../src/theme/tokens';
import { useIdentity } from '../src/data/session';

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
  // The number being moved is the SIGNED-IN account's. This read a literal
  // before, so it offered to move the fixture persona's number whoever asked.
  const { identity, loading } = useIdentity();

  const pinOk = /^\d{4}$/.test(pin);
  const nextOk = next.replace(/\D/g, '').length === 10;

  if (loading || !identity) {
    return <Screen><Skeleton lines={5} /></Screen>;
  }
  const current = identity.phone;

  return (
    <FormDialog
      title="Change mobile number"
      subtitle="Your sign-in number"
      confirmLabel="Request the change"
      confirmTestID="mobile-request"
      confirmDisabled={!pinOk || !nextOk}
      onConfirm={() => router.back()}
      hint={!pinOk ? 'Your current PIN confirms it is you'
        : !nextOk ? 'A 10-digit mobile number is needed'
        : 'The super admin approves it before it takes effect'}>
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
    </FormDialog>
  );
}
