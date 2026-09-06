import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, H2, Body, Muted, Label, Button } from '../src/components/ui';
import { Field } from '../src/components/Field';
import { Icon } from '../src/components/Icon';
import { useTheme } from '../src/theme/ThemeProvider';
import { useToast } from '../src/components/Toast';
import { SPACE, RADIUS, STATUS, statusSurface } from '../src/theme/tokens';
import { SECURITY_QUESTIONS, SUPPORT_PHONE } from '../src/data/mock';
import { isConfigured } from '../src/lib/supabase';
import { recoveryQuestions, recoveryVerify, pinResetRequest, type SecurityQuestion } from '../src/data/api';
import { setRecoveryToken } from '../src/data/pending';

/**
 * C-97/C-98: recovery is two security questions, three attempts, then a
 * 30-minute lockout. Every terminal state says plainly what has and has NOT
 * happened -- a lockout that leaves someone wondering if their PIN changed
 * is worse than the lockout itself.
 *
 * Both answers go to recovery-check together, on the second submit. The
 * attempt counter and the lockout live there, server-side, keyed on the
 * account -- a counter in this component would reset with the screen.
 */
// fixture answers; the real check happens server-side against a hash
const ANSWERS = ['kavitha', 'coimbatore'];

const normalise = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

export default function ForgotPin() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone?: string }>();

  const [questions, setQuestions] = useState<SecurityQuestion[]>(
    SECURITY_QUESTIONS.slice(0, 2).map((text, i) => ({ id: i + 1, text }))
  );
  const [ix, setIx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [held, setHeld] = useState('');            // the first answer, until the pair is submitted
  const [tries, setTries] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // 'staff' is the whole of this screen for a staff member: the security
  // questions are the SUPER ADMIN's recovery and hers alone -- only she
  // answered any at registration, and only super_admin_recovery has rows. A
  // staff PIN is reset by the academy admin, so that is what she is told.
  const [stage, setStage] = useState<'asking' | 'locked' | 'passed' | 'staff' | 'requested'>('asking');
  const [sending, setSending] = useState(false);

  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;

  useEffect(() => {
    if (!isConfigured || !phone) return;
    recoveryQuestions(phone)
      .then(({ questions: list }) => { if (list.length >= 2) setQuestions(list.slice(0, 2)); })
      .catch((err: unknown) => {
        const text = err instanceof Error ? err.message : '';
        // recovery-check answers this for any number that is not the academy
        // admin's. Until 06-Sep-2026 it was shown as a message UNDER two
        // security questions that were still on screen -- the seeded fixture
        // ones, because the real list only replaces them on success. So a
        // staff member was invited to answer questions she had never been
        // asked and could never pass. She gets her own screen instead.
        if (/not registered as the academy admin/i.test(text)) { setStage('staff'); return; }
        setMessage(text || null);
      });
  }, [phone]);

  const submit = async () => {
    const raw = normalise(answer);
    if (!raw || busy) return;

    if (ix === 0) {                                  // hold it; nothing is checked yet
      setHeld(answer);
      setIx(1); setAnswer(''); setWrong(false); setMessage(null);
      return;
    }

    if (!isConfigured) {
      const bothMatch = normalise(held) === ANSWERS[0] && raw === ANSWERS[1];
      if (!bothMatch) {
        const t = tries + 1;
        if (t >= 3) { setStage('locked'); return; }
        setTries(t); setWrong(true);
        setIx(0); setAnswer(''); setHeld('');
        flash('Answer did not match', 'warn');
        return;
      }
      setStage('passed'); setWrong(false);
      return;
    }

    setBusy(true);
    try {
      const result = await recoveryVerify(phone ?? '', [
        { question_id: questions[0].id, answer: held },
        { question_id: questions[1].id, answer },
      ]);
      // The token is the ONLY thing that survives this screen, and it is
      // handed over in memory rather than as a route parameter.
      setRecoveryToken(result.recovery_token);
      setStage('passed'); setWrong(false); setMessage(null);
    } catch (err) {
      const text = err instanceof Error ? err.message : 'That did not work.';
      // The function says "locked for 30 minutes ... Your PIN has not
      // changed" itself, so the screen shows its words rather than guessing.
      if (/locked/i.test(text)) { setMessage(text); setStage('locked'); return; }
      setTries(t => t + 1);
      setWrong(true);
      setMessage(text);
      setIx(0); setAnswer(''); setHeld('');
    } finally {
      setBusy(false);
    }
  };

  /** She asks; the academy admin is told. The PIN does not change here and
   *  the screen says so -- the same rule the locked and passed states follow. */
  const askAdmin = async () => {
    if (sending) return;
    setSending(true);
    try {
      if (!isConfigured) { setStage('requested'); return; }
      await pinResetRequest(phone ?? '');
      setStage('requested');
    } catch (err) {
      // A refusal here is HERS to read -- it is about her own request, not
      // about anyone else's account, so the function's sentence is shown.
      flash(err instanceof Error ? err.message : 'That request could not be sent. Try again.', 'warn');
    } finally {
      setSending(false);
    }
  };

  if (stage === 'requested') {
    const okInk = ink('present');
    return (
      <Screen>
        <View style={{ alignItems: 'center', paddingTop: SPACE.xxl }}>
          <View style={{
            width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center',
            backgroundColor: statusSurface(okInk).bg, borderWidth: 1, borderColor: statusSurface(okInk).border,
          }}>
            <Icon name="check" size={34} color={okInk} />
          </View>
          <H2 style={{ marginTop: SPACE.lg }}>Request sent to your academy admin</H2>
          <Body style={{ marginTop: SPACE.sm, textAlign: 'center' }}>
            They will see it on their dashboard, reset your PIN and give you the new one. Sign in
            with that PIN and you will be asked to choose your own straight away.
          </Body>
          {/* What has NOT happened, said as plainly as what has. */}
          <Muted style={{ marginTop: SPACE.md, textAlign: 'center' }}>
            Nothing has changed yet — your old PIN still works if you remember it.
          </Muted>
          <Button testID="forgot-pin-requested-back" label="Back to sign in"
            style={{ marginTop: SPACE.xl, alignSelf: 'stretch' }}
            onPress={() => router.replace('/')} />
        </View>
      </Screen>
    );
  }

  if (stage === 'staff') {
    const ink = theme.isDark ? STATUS.awaiting.fgDark : STATUS.awaiting.fgLight;
    return (
      <Screen>
        <View style={{ alignItems: 'center', paddingTop: SPACE.xxl }}>
          <View style={{
            width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center',
            backgroundColor: statusSurface(ink).bg, borderWidth: 1, borderColor: statusSurface(ink).border,
          }}>
            <Icon name="lock_reset" size={34} color={ink} />
          </View>
          <H2 style={{ marginTop: SPACE.lg }}>Your academy admin resets your PIN</H2>
          {/* What has NOT happened, stated as plainly as what has -- the rule
              the rest of this screen already follows. */}
          <Body style={{ marginTop: SPACE.sm, textAlign: 'center' }}>
            Security questions are only for the academy admin's own account. Send them a
            request and they will reset your PIN — you choose your own the first time you sign
            in with the new one.
          </Body>
          <Button testID="forgot-pin-staff-ask"
            label={sending ? 'Sending…' : 'Ask my academy admin to reset it'}
            disabled={sending}
            style={{ marginTop: SPACE.xl, alignSelf: 'stretch' }}
            onPress={() => void askAdmin()} />
          <Button testID="forgot-pin-staff-call" label="Call the academy instead" variant="secondary"
            style={{ marginTop: SPACE.sm, alignSelf: 'stretch' }}
            onPress={() => flash(`Calling ${SUPPORT_PHONE}`)} />
          <Button testID="forgot-pin-staff-back" label="Back to sign in" variant="secondary"
            style={{ marginTop: SPACE.sm, alignSelf: 'stretch' }}
            onPress={() => router.replace('/')} />
        </View>
      </Screen>
    );
  }

  if (stage === 'locked') {
    const badInk = ink('absent');
    return (
      <Screen>
        <View style={{ alignItems: 'center', paddingTop: SPACE.xxl }}>
          <View style={{
            width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center',
            backgroundColor: statusSurface(badInk).bg, borderWidth: 1, borderColor: statusSurface(badInk).border,
          }}>
            <Icon name="lock_clock" size={34} color={badInk} />
          </View>
          <H2 style={{ marginTop: SPACE.lg }}>Too many wrong answers</H2>
          {/* what has NOT happened, stated as plainly as what has */}
          <Body style={{ marginTop: SPACE.sm, textAlign: 'center' }}>
            {message ?? 'Recovery is closed for 30 minutes. Your PIN has not changed and nobody has been signed in.'}
          </Body>
          <Button label="Call the academy instead" style={{ marginTop: SPACE.xl, alignSelf: 'stretch' }}
            onPress={() => flash(`Calling ${SUPPORT_PHONE}`)} />
        </View>
      </Screen>
    );
  }

  if (stage === 'passed') {
    const okInk = ink('present');
    return (
      <Screen>
        <View style={{ alignItems: 'center', paddingTop: SPACE.xxl }}>
          <View style={{
            width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center',
            backgroundColor: statusSurface(okInk).bg, borderWidth: 1, borderColor: statusSurface(okInk).border,
          }}>
            <Icon name="check" size={34} color={okInk} />
          </View>
          <H2 style={{ marginTop: SPACE.lg }}>Both answers matched</H2>
          <Body style={{ marginTop: SPACE.sm, textAlign: 'center' }}>
            Set a new PIN now. Your old one stopped working the moment you passed this check.
          </Body>
          <Button label="Choose a new PIN" style={{ marginTop: SPACE.xl, alignSelf: 'stretch' }}
            onPress={() => router.replace('/set-pin?for=self')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Muted>Two questions, answered when you registered</Muted>

      <View style={{ flexDirection: 'row', gap: 6, marginTop: SPACE.md }}>
        {[0, 1].map(i => (
          <View key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            backgroundColor: i < ix ? ink('present') : i === ix ? theme.accent : theme.line,
          }} />
        ))}
      </View>

      <Muted style={{ marginTop: SPACE.md, fontVariant: ['tabular-nums'] }}>
        {phone ? `Registered to +91 ${phone}` : 'Registered to your academy admin number'}
      </Muted>

      <View style={{
        marginTop: SPACE.lg, padding: SPACE.lg, borderRadius: RADIUS.lg,
        backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
      }}>
        <Label>{`Security question ${ix + 1} of 2`}</Label>
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.fgStrong, marginTop: SPACE.sm, lineHeight: 23 }}>
          {questions[ix].text}
        </Text>
        <View style={{ marginTop: SPACE.md }}>
          <Field label="Your answer" required value={answer} onChange={v => { setAnswer(v); setWrong(false); }}
            placeholder="Your answer"
            error={wrong
              ? (message ?? `That does not match. ${2 - tries} attempt${2 - tries === 1 ? '' : 's'} left before recovery closes.`)
              : undefined}
            hint="Spelling and capitals do not matter. Spaces are ignored." />
        </View>
      </View>

      <Button label={busy ? 'Checking…' : ix === 1 ? 'Check and continue' : 'Next question'} onPress={() => void submit()}
        disabled={!answer.trim() || busy} style={{ marginTop: SPACE.lg }} />
      <Button label="Can't remember — call the academy" variant="secondary"
        onPress={() => flash(`Calling ${SUPPORT_PHONE}`)} style={{ marginTop: SPACE.sm }} />

      <Muted style={{ marginTop: SPACE.lg, textAlign: 'center' }}>
        Your answers were recorded when your account was created. Nobody at RosiFit can read them back —
        they are only ever checked against what you type.
      </Muted>
    </Screen>
  );
}
