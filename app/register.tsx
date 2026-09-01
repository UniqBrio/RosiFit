import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, H1, H2, Body, Muted, Button, Pill, Row, Divider } from '../src/components/ui';
import { Field, Choice } from '../src/components/Field';
import { useTheme } from '../src/theme/ThemeProvider';
import { SPACE } from '../src/theme/tokens';
import { SECURITY_QUESTIONS } from '../src/data/mock';

export default function Register() {
  const { theme } = useTheme();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [academy, setAcademy] = useState('RosiFit Academy');
  const [phone, setPhone] = useState('');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [picked, setPicked] = useState<number[]>([0, 1, 2]);

  const phoneOk = phone.replace(/\D/g, '').length === 10;
  const step1Ok = name.trim().length >= 2 && academy.trim().length >= 2 && phoneOk;
  const step2Ok = picked.every(i => (answers[i] ?? '').trim().length >= 2);

  return (
    <Screen>
      <H1>Super admin registration</H1>
      <Muted style={{ marginBottom: SPACE.lg }}>
        Step {step} of 2 · this happens once, for the account that owns the academy
      </Muted>

      {step === 1 ? (
        <Card>
          <H2>Who owns this academy?</H2>
          <View style={{ marginTop: SPACE.md }}>
            <Field label="Your name" value={name} onChange={setName} placeholder="Full name"
              error={name.length > 0 && name.trim().length < 2 ? 'Enter at least 2 characters.' : undefined} />
            <Field label="Academy name" value={academy} onChange={setAcademy} />
            <Field label="Mobile number" value={phone} onChange={setPhone} prefix="+91"
              keyboardType="number-pad" placeholder="00000 00000"
              hint="This becomes your sign-in number. It can be changed later, with verification."
              error={phone.length > 0 && !phoneOk ? 'Enter a 10-digit mobile number.' : undefined} />
          </View>
          <Button label="Continue" disabled={!step1Ok} onPress={() => setStep(2)} />
        </Card>
      ) : (
        <>
          <Card>
            <H2>Security questions</H2>
            {/* C-97: recovery for the SUPER ADMIN only. Staff never see these,
                and an answer is never displayed again once it is set. */}
            <Body style={{ marginTop: SPACE.sm }}>
              These recover your account if you forget your PIN. Only the super admin has them —
              staff request a reset from an admin instead.
            </Body>
            <Muted style={{ marginTop: SPACE.sm }}>
              Answers are stored hashed. They are never shown again — they can only be replaced.
            </Muted>
          </Card>

          {picked.map((qi, n) => (
            <Card key={qi}>
              <Row><Pill text={`Question ${n + 1}`} /></Row>
              <Body style={{ marginTop: SPACE.sm, fontWeight: '700' }}>{SECURITY_QUESTIONS[qi]}</Body>
              <View style={{ marginTop: SPACE.md }}>
                <Field label="Your answer" value={answers[qi] ?? ''} secure
                  onChange={v => setAnswers(a => ({ ...a, [qi]: v }))}
                  placeholder="Answer" />
              </View>
              <Choice label="Use a different question"
                options={SECURITY_QUESTIONS.map((_, i) => `Q${i + 1}`)}
                value={`Q${qi + 1}`}
                onChange={v => {
                  const i = Number(v.slice(1)) - 1;
                  if (picked.includes(i)) return;             // no duplicates
                  setPicked(p => p.map((x, j) => (j === n ? i : x)));
                }} />
            </Card>
          ))}

          <Card>
            <Divider />
            <Body>
              Next you will set a 4-digit PIN. It is derived from your account, not your
              phone number, so changing your number later will not invalidate it.
            </Body>
          </Card>

          <Row style={{ gap: SPACE.md }}>
            <Button label="Back" variant="secondary" onPress={() => setStep(1)} style={{ flex: 1 }} />
            <Button label="Set my PIN" disabled={!step2Ok}
              onPress={() => router.push('/set-pin')} style={{ flex: 2 }} />
          </Row>
        </>
      )}
    </Screen>
  );
}
