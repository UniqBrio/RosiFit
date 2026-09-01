import { useState } from 'react';
import { View } from 'react-native';
import { Screen, Card, H1, H2, Body, Muted, Button, Pill, Row, Divider } from '../src/components/ui';
import { Field } from '../src/components/Field';
import { useTheme } from '../src/theme/ThemeProvider';
import { SPACE } from '../src/theme/tokens';
import { SECURITY_QUESTIONS, SUPPORT_PHONE } from '../src/data/mock';

/**
 * C-98. Two different recovery models, deliberately not merged:
 *   super admin -> security questions
 *   staff       -> ask an admin. There is NO staff security-question system.
 */
export default function ForgotPin() {
  const { theme } = useTheme();
  const [who, setWho] = useState<'unknown' | 'super' | 'staff'>('unknown');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const asked = [0, 1, 2];
  const ready = asked.every(i => (answers[i] ?? '').trim().length >= 2);

  return (
    <Screen>
      <H1>Forgot your PIN</H1>
      <Muted style={{ marginBottom: SPACE.lg }}>Recovery depends on the kind of account.</Muted>

      {who === 'unknown' && (
        <Card>
          <H2>Which describes you?</H2>
          <View style={{ gap: SPACE.md, marginTop: SPACE.md }}>
            <Button label="I am the super admin" onPress={() => setWho('super')} />
            <Button label="I am a staff member" variant="secondary" onPress={() => setWho('staff')} />
          </View>
        </Card>
      )}

      {who === 'super' && (
        <>
          <Card>
            <H2>Answer your security questions</H2>
            <Muted style={{ marginTop: SPACE.sm }}>
              All three must match. Answers are compared against a stored hash — nothing is displayed.
            </Muted>
          </Card>
          {asked.map((qi, n) => (
            <Card key={qi}>
              <Row><Pill text={`Question ${n + 1}`} /></Row>
              <Body style={{ marginTop: SPACE.sm, fontWeight: '700' }}>{SECURITY_QUESTIONS[qi]}</Body>
              <View style={{ marginTop: SPACE.md }}>
                <Field label="Your answer" value={answers[qi] ?? ''} secure
                  onChange={v => setAnswers(a => ({ ...a, [qi]: v }))} />
              </View>
            </Card>
          ))}
          <Button label="Verify and set a new PIN" disabled={!ready} onPress={() => {}} />
          <Muted style={{ textAlign: 'center', marginTop: SPACE.sm }}>
            An unknown number and a wrong answer give the same response, so this screen
            cannot be used to discover whether an account exists.
          </Muted>
        </>
      )}

      {who === 'staff' && (
        <Card>
          <H2>Ask an admin to reset it</H2>
          <Body style={{ marginTop: SPACE.sm }}>
            Staff accounts do not have security questions. An admin issues you a temporary PIN
            from the Staff screen, and you choose your own the first time you sign in.
          </Body>
          <Divider />
          <Muted>If you cannot reach an admin:</Muted>
          <Body style={{ fontSize: 22, fontWeight: '800', color: theme.accentInk, marginTop: 4 }}>
            {SUPPORT_PHONE}
          </Body>
        </Card>
      )}
    </Screen>
  );
}
