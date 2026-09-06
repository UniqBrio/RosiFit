import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
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

/**
 * Registration collects the recovery answers UP FRONT (C-97): they are the
 * only way a PIN reset works later without a call, so they are part of
 * creating the account, not an optional afterthought.
 *
 * ONE FORM, not a two-step wizard. The details and the recovery answers were
 * split across two tabs with a progress row; the split bought nothing -- both
 * halves are needed before anything is sent, and neither can be saved on its
 * own -- while costing a screen on which the remaining fields were invisible.
 * The section labels are the two tab labels, kept word for word.
 */
export default function Register() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  // Carried from the sign-in screen when the number turned out to have no
  // account, so she never types it twice -- and so the number she is
  // registering is provably the one she tried to sign in with.
  const { phone: fromSignIn } = useLocalSearchParams<{ phone?: string }>();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState(() => {
    const d = String(fromSignIn ?? '').replace(/\D/g, '').slice(0, 10);
    return d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
  });
  const [email, setEmail] = useState('');
  // Live, the question list and its ids come from auth-bootstrap; on
  // fixtures the mock texts stand in, numbered the way the seed numbers them.
  const [bank, setBank] = useState<SecurityQuestion[]>(
    SECURITY_QUESTIONS.map((text, i) => ({ id: i + 1, text }))
  );
  const [questions, setQuestions] = useState([SECURITY_QUESTIONS[0], SECURITY_QUESTIONS[1]]);
  const [answers, setAnswers] = useState(['', '']);
  const [picking, setPicking] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!isConfigured) return;
    fetchSecurityQuestions()
      .then(({ questions: list }) => {
        // "This academy is already registered" used to be set here and was
        // removed on 06-Sep-2026 at the owner's request: it appeared on a form
        // the owner wants every unrecognised number to be able to COMPLETE, so
        // it read as a refusal of the thing the screen is for. The condition it
        // guarded is real and has not gone anywhere -- auth-bootstrap still
        // answers 409 once the academy exists -- but the answer to that is to
        // let the form succeed, not to warn about it here. bootstrap_completed
        // is deliberately no longer read.
        if (list.length < 2) return;
        setBank(list);
        setQuestions([list[0].text, list[1].text]);
      })
      .catch((err: unknown) => {
        // The seeded list is the same list, so falling back to it lets her
        // register rather than blocking on a fetch she cannot retry -- but a
        // silent fallback also hides a real outage, so it says so.
        setNotice(
          `${err instanceof Error ? err.message : 'The question list could not be loaded.'} ` +
          'Showing the standard questions — registration will still work.'
        );
      });
  }, []);

  // ONE predicate, because there is one form. The academy is no longer asked
  // for: it is RosiFit, and the answer was never sent anywhere -- the draft
  // below has never carried it, and the academy's real name lives in
  // app_settings. Email stays, and stays optional: it is not in here.
  const valid = !!(
    name.trim() &&
    phone.replace(/\D/g, '').length >= 10 &&
    answers.every(a => a.trim().length >= 3)
  );

  const submit = () => {
    if (!valid) {
      flash('Name, a 10-digit number and both answers are needed', 'warn');
      return;
    }

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
      <Muted>Recovery answers on record</Muted>

      {notice && (
        <View
          accessibilityRole="alert"
          style={{
            marginTop: SPACE.md, padding: SPACE.lg, borderRadius: RADIUS.md,
            flexDirection: 'row', gap: SPACE.md, alignItems: 'flex-start',
            backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.lineStrong,
          }}>
          <Icon name="error" size={18} color={theme.accentInk} />
          <Muted style={{ flex: 1 }}>{notice}</Muted>
        </View>
      )}

      {/* The two tab labels, kept as section labels: the split is gone, the
          words that named the two halves are not. */}
      <View style={{ marginTop: SPACE.lg }}>
        <Label>Your details</Label>
      </View>
      <View style={{ marginTop: SPACE.md }}>
        <Field label="Full name" required value={name} onChange={setName} placeholder="e.g. Priya Menon" />
        {/* "Academy you administer" was removed: the academy is RosiFit by
            default, and the field's value was never sent anywhere. */}
        <Field label="Mobile number" required value={phone} onChange={setPhone} prefix="+91"
          keyboardType="phone-pad" placeholder="98765 43210"
          hint="This becomes your sign-in ID and cannot be changed later."
          error={phone.length > 0 && phone.replace(/\D/g, '').length < 10 ? 'A 10-digit mobile number is needed.' : undefined} />
        {/* No asterisk, and the hint says so in words rather than leaving the
            absence of a mark to carry the meaning on its own. */}
        <Field label="Email" value={email} onChange={setEmail} placeholder="owner@academy.in"
          keyboardType="email-address" hint="Optional." />
      </View>

      <View style={{ marginTop: SPACE.lg, marginBottom: SPACE.md }}>
        <Label>Security questions</Label>
      </View>
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
              <Field label="Your answer" required value={answers[i]}
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

      <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.xl }}>
        {/* Back leaves the screen entirely, because Continue on sign-in
            sends every unrecognised number here -- a mistyped digit lands on
            this form, and until this button existed the only way out of it
            was the browser's own back. With one form there is no step to go
            back to, so this is the only Back there is. */}
        <Button label="Back" variant="secondary"
          testID="register-back-to-signin"
          onPress={() => router.replace('/')}
          style={{ flex: 1 }} />
        <Button label="Register & issue PIN"
          onPress={submit} disabled={!valid} style={{ flex: 2 }} />
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
