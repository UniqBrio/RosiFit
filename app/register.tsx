import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Muted, Label, Button } from '../src/components/ui';
import { Field } from '../src/components/Field';
import { Icon } from '../src/components/Icon';
import { SearchPicker } from '../src/components/Sheet';
import { useTheme } from '../src/theme/ThemeProvider';
import { useToast } from '../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN } from '../src/theme/tokens';
import { SECURITY_QUESTIONS } from '../src/data/mock';
import { isConfigured } from '../src/lib/supabase';
import { fetchSecurityQuestions, type SecurityQuestion } from '../src/data/api';
import { setRegistrationDraft } from '../src/data/pending';

const STEPS = ['Your details', 'Security questions'];

/**
 * Registration collects the recovery answers UP FRONT (C-97): they are the
 * only way a PIN reset works later without a call, so they are part of
 * creating the account, not an optional afterthought.
 */
export default function Register() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [academy, setAcademy] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  // Live, the question list and its ids come from auth-bootstrap; on
  // fixtures the mock texts stand in, numbered the way the seed numbers them.
  const [bank, setBank] = useState<SecurityQuestion[]>(
    SECURITY_QUESTIONS.map((text, i) => ({ id: i + 1, text }))
  );
  const [questions, setQuestions] = useState([SECURITY_QUESTIONS[0], SECURITY_QUESTIONS[1]]);
  const [answers, setAnswers] = useState(['', '']);
  const [picking, setPicking] = useState<number | null>(null);

  useEffect(() => {
    if (!isConfigured) return;
    fetchSecurityQuestions()
      .then(({ questions: list }) => {
        if (list.length < 2) return;
        setBank(list);
        setQuestions([list[0].text, list[1].text]);
      })
      .catch(() => {
        // The seeded list is the same list; falling back to it lets her
        // register rather than blocking on a fetch she cannot retry.
      });
  }, []);

  const ok1 = !!(name.trim() && academy.trim() && phone.replace(/\D/g, '').length >= 10);
  const ok2 = answers.every(a => a.trim().length >= 3);
  const valid = step === 1 ? ok1 : ok2;

  const next = () => {
    if (!valid) {
      flash(step === 1 ? 'Name, academy and a 10-digit number are needed' : 'Both answers are needed', 'warn');
      return;
    }
    if (step === 1) { setStep(2); return; }

    // The answers never travel as route params -- see src/data/pending.ts.
    // The account is created on the next screen, where the PIN exists:
    // auth-bootstrap takes the details, the answers and the PIN in one call
    // so a half-registered account cannot exist.
    setRegistrationDraft({
      name: name.trim(),
      phone,
      answers: questions.map((text, i) => ({
        question_id: bank.find(q => q.text === text)?.id ?? i + 1,
        answer: answers[i],
      })),
    });
    router.replace('/set-pin?for=register');
  };

  return (
    <Screen>
      <Muted>{`Step ${step} of 2 · recovery answers on record`}</Muted>

      <View style={{ flexDirection: 'row', gap: 6, marginTop: SPACE.md, marginBottom: SPACE.lg }}>
        {STEPS.map((label, i) => {
          const done = step >= i + 1;
          return (
            <View key={label} style={{ flex: 1, gap: 6 }}>
              <View style={{ height: 4, borderRadius: 2, backgroundColor: done ? theme.accent : theme.line }} />
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: done ? theme.accentInk : theme.dim }}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      {step === 1 ? (
        <>
          <Field label="Full name" value={name} onChange={setName} placeholder="e.g. Priya Menon" />
          <Field label="Academy you administer" value={academy} onChange={setAcademy} placeholder="e.g. RosiFit" />
          <Field label="Mobile number" value={phone} onChange={setPhone} prefix="+91"
            keyboardType="phone-pad" placeholder="98765 43210"
            hint="This becomes your sign-in ID and cannot be changed later."
            error={phone.length > 0 && phone.replace(/\D/g, '').length < 10 ? 'A 10-digit mobile number is needed.' : undefined} />
          <Field label="Email" value={email} onChange={setEmail} placeholder="owner@academy.in"
            keyboardType="email-address" />
        </>
      ) : (
        <>
          <View style={{
            padding: SPACE.lg, borderRadius: RADIUS.lg, flexDirection: 'row', gap: SPACE.md,
            backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
          }}>
            <Icon name="shield_lock" size={19} color={theme.accentInk} />
            <Muted style={{ flex: 1 }}>
              Two questions, answered now. These are the only way your PIN can be reset later without a
              call, so pick answers you will still know in a year.
            </Muted>
          </View>

          {[0, 1].map(i => {
            const short = answers[i].trim().length > 0 && answers[i].trim().length < 3;
            return (
              <View key={i} style={{ marginTop: SPACE.lg }}>
                <Label>{`Question ${i + 1}`}</Label>
                <Pressable onPress={() => setPicking(i)}
                  accessibilityRole="button" accessibilityLabel={questions[i]}
                  accessibilityHint="Opens the question list"
                  style={{
                    marginTop: 8, minHeight: TAP_MIN + 6, borderRadius: RADIUS.md,
                    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
                    paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm,
                    flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
                  }}>
                  <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '600', color: theme.fgStrong, lineHeight: 19 }}>
                    {questions[i]}
                  </Text>
                  <Icon name="arrow_drop_down" size={22} color={theme.muted} />
                </Pressable>
                <View style={{ marginTop: SPACE.sm }}>
                  <Field label="Your answer" value={answers[i]}
                    onChange={v => setAnswers(p => p.map((x, j) => j === i ? v : x))}
                    placeholder="Your answer"
                    error={short ? 'A little longer, so it cannot be guessed.' : undefined}
                    hint="Stored hashed · case and spaces ignored" />
                </View>
              </View>
            );
          })}

          <Muted style={{ marginTop: SPACE.sm }}>
            Answers are stored hashed and case-insensitive, trimmed of spaces. They are never shown
            again — not to you, not to anyone at RosiFit. If both are forgotten, a call is the only
            way back in.
          </Muted>
        </>
      )}

      <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.xl }}>
        {step === 2 && (
          <Button label="Back" variant="secondary" onPress={() => setStep(1)} style={{ flex: 1 }} />
        )}
        <Button label={step === 1 ? 'Next — security questions' : 'Register & issue PIN'}
          onPress={next} disabled={!valid} style={{ flex: 2 }} />
      </View>

      <SearchPicker
        open={picking !== null} onClose={() => setPicking(null)}
        title="Choose a question" placeholder="Search questions"
        options={bank
          .map(q => q.text)
          // the OTHER slot's question is not offered: two answers to one
          // question would halve the recovery check
          .filter(q => q !== questions[picking === 0 ? 1 : 0])
          .map(label => ({ label }))}
        value={picking !== null ? questions[picking] : undefined}
        onSelect={l => {
          if (picking !== null) setQuestions(p => p.map((x, j) => j === picking ? l : x));
          setPicking(null);
        }} />
    </Screen>
  );
}
