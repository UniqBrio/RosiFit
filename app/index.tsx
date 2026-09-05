import { useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/theme/ThemeProvider';
import { Button, Muted, DeepBackground } from '../src/components/ui';
import { Icon } from '../src/components/Icon';
import { RADIUS, SPACE, TAP_MIN, STATUS } from '../src/theme/tokens';
import { isConfigured } from '../src/lib/supabase';
import { authLogin, adoptSession } from '../src/data/api';
import { groupPhone, phoneDigits, isCompletePhone, needsRegistration, continueDestination } from '../src/data/signin';
import { isRegisteredNumber } from '../src/data/repository';

/** '1'..'9', clear-entry, '0', backspace -- the canvas' 3-column layout */
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'ce', '0', 'del'] as const;

export default function SignIn() {
  const { theme } = useTheme();
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'pin'>('phone');
  const [phone, setPhone] = useState(isConfigured ? '' : '80563 29742');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [onNumber, setOnNumber] = useState(false);
  const pinRef = useRef<TextInput>(null);

  const digits = phoneDigits(phone);
  const phoneOk = isCompletePhone(phone);

  /** Grouped as it is typed, so the number on the PIN screen reads back the
   *  way she would say it. Non-digits never enter state at all. */
  const onPhone = (raw: string) => {
    // A refusal from the last Continue is about the number that was typed
    // then. Editing the number retracts it, the way the PIN step already
    // clears its own error on every key.
    setError(null);
    setPhone(groupPhone(raw));
  };

  /** Continue validates the number BEFORE the PIN step: a number with an
   *  account goes on to the PIN, one without goes to registration. It never
   *  signs anybody in -- the PIN is still required either way.
   *
   *  This asks a public endpoint whether a number is registered, which is an
   *  enumeration oracle and is accepted as one (DECISION_LOG 016). What
   *  it must not do is GUESS: a lookup that fails leaves her on this screen
   *  with a sentence, because answering "not registered" on a dropped
   *  connection walks a staff member into registering a second academy. */
  const toPin = async () => {
    if (!phoneOk || busy) return;
    setError(null);
    setBusy(true);
    let registered: boolean | null = null;
    try {
      registered = await isRegisteredNumber(digits);
    } catch (err) {
      // null, deliberately -- not false. continueDestination stays put.
      setError(err instanceof Error && err.message
        ? err.message
        : 'That number could not be checked. Try again.');
    } finally {
      setBusy(false);
    }

    const next = continueDestination(registered);
    if (next === 'stay') return;
    if (next === 'register') {
      // Carried over rather than retyped -- the number she just entered is
      // the one that becomes the super admin's sign-in ID.
      router.push({ pathname: '/register', params: { phone: digits } });
      return;
    }
    setPin('');
    setStep('pin');
    // The keyboard follows the step, so four digits can be typed straight
    // through without reaching for the screen.
    setTimeout(() => pinRef.current?.focus(), 60);
  };

  /** The PIN goes to auth-login and is never kept: not stored, not logged,
   *  not echoed back. The entry is cleared whichever way the call ends. */
  const submit = async (entered: string) => {
    if (!isConfigured) {
      // Fixtures mode has no project to authenticate against, so the
      // prototype behaviour stands in for it.
      setTimeout(() => router.replace('/(tabs)'), 220);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await authLogin(digits, entered);
      await adoptSession(result);
      setPin('');
      // A first PIN (or one an admin reset) must be changed before she goes
      // anywhere else -- must_change_pin is the server's word, not a guess.
      router.replace(result.user?.must_change_pin ? '/set-pin?for=self' : '/(tabs)');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'That did not work. Try again.';
      setPin('');
      if (needsRegistration(message)) {
        // Carried over rather than retyped -- the number she just entered is
        // the one that becomes the super admin's sign-in ID.
        router.replace({ pathname: '/register', params: { phone: digits } });
        return;
      }
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  /** Typed on a hardware keyboard. Same state as the keypad, so the two can
   *  never show different things. */
  const type = (raw: string) => {
    if (busy) return;
    const d = raw.replace(/\D/g, '').slice(0, 4);
    setError(null);
    setPin(d);
    if (d.length === 4) void submit(d);
  };

  const press = (k: string) => {
    if (busy) return;
    // CE clears the whole entry; only the backspace removes one digit. These
    // were previously wired to the same action, so there was no way to start
    // over without pressing delete four times.
    if (k === 'ce') { setError(null); return setPin(''); }
    if (k === 'del') { setError(null); return setPin(p => p.slice(0, -1)); }
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    if (next.length === 4) void submit(next);
  };

  const badInk = theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight;

  /* One status line for both steps. It used to live inside the PIN branch
     only, so a Continue that failed had nowhere to say so -- and Continue can
     now fail, because it calls the server. The word and the icon carry the
     state; the colour only reinforces it (never the only signal). */
  const statusBox = (busy || error) ? (
    <View
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
        marginTop: SPACE.lg, paddingVertical: 10, paddingHorizontal: 12,
        borderRadius: RADIUS.md, borderWidth: 1,
        borderColor: error ? badInk : theme.line, backgroundColor: theme.surface,
      }}>
      <Icon name={busy ? 'hourglass_top' : 'error'} size={17}
        color={error ? badInk : theme.muted} />
      <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '600', color: error ? badInk : theme.fg }}>
        {busy ? (step === 'phone' ? 'Checking that number…' : 'Checking your PIN…') : error}
      </Text>
    </View>
  ) : null;

  return (
    <DeepBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 32 }}>
            <Image
              source={require('../assets/rosifit-logo.png')}
              style={{ width: 126, height: 126, resizeMode: 'contain' }}
              accessibilityLabel="RosiFit" />
            <View style={{ alignItems: 'center' }}>
              <Text style={{
                fontSize: 15, fontWeight: '600', color: '#FFFFFF',
                letterSpacing: 2, textTransform: 'uppercase',
              }}>Preparing, Thriving</Text>
              <Text style={{
                fontSize: 15, fontWeight: '600', color: theme.accentInk,
                letterSpacing: 2, textTransform: 'uppercase',
              }}>and Beyond</Text>
            </View>
          </View>

          <View style={{
            backgroundColor: theme.shell, borderTopLeftRadius: 30, borderTopRightRadius: 30,
            borderTopWidth: 1, borderColor: theme.line,
            paddingHorizontal: SPACE.xl, paddingTop: 26, paddingBottom: 34,
          }}>
            {step === 'phone' ? (
              <>
                <Text style={{ fontSize: 26, fontWeight: '800', color: theme.fgStrong, letterSpacing: -0.5 }}>
                  Welcome back
                </Text>
                <Muted style={{ marginTop: 6, marginBottom: 22, fontSize: 14 }}>
                  Your number, then your 4-digit PIN.
                </Muted>
                {/* Focus is shown on the BOX, not by the browser's own ring
                    around the inner field -- that drew a second rectangle
                    inside this one. Moved, never removed: a field with no
                    visible focus is unusable on a keyboard. */}
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
                  borderWidth: 1, borderColor: onNumber ? theme.accent : theme.lineStrong,
                  borderRadius: RADIUS.md,
                  backgroundColor: theme.surface, paddingHorizontal: SPACE.lg, height: 56,
                }}>
                  <Text style={{ color: theme.muted, fontWeight: '600', fontSize: 15 }}>+91</Text>
                  <View style={{ width: 1, height: 22, backgroundColor: theme.line }} />
                  <TextInput
                    testID="signin-phone"
                    value={phone} onChangeText={onPhone} keyboardType="number-pad"
                    accessibilityLabel="Mobile number"
                    autoFocus
                    // Frozen while the lookup is in flight, so the answer can
                    // never belong to a different number than the one shown.
                    editable={!busy}
                    // Enter advances rather than doing nothing, so the whole
                    // sign-in can be typed without leaving the keyboard.
                    returnKeyType="next" onSubmitEditing={toPin} submitBehavior="submit"
                    selectionColor={theme.accent}
                    onFocus={() => setOnNumber(true)} onBlur={() => setOnNumber(false)}
                    placeholder="98765 43210" placeholderTextColor={theme.muted}
                    style={{
                      flex: 1, color: theme.fgStrong, fontSize: 17, fontWeight: '600', letterSpacing: 1,
                      outlineWidth: 0,
                    }} />
                </View>
                {/* ONE button. The account list and the "only RosiFit staff
                    numbers" line are gone: the first told anybody looking at
                    the screen three real staff numbers, and the second
                    described a rule the server enforces anyway. */}
                <Button testID="signin-continue" label="Continue" disabled={!phoneOk || busy} onPress={toPin}
                  style={{ marginTop: SPACE.xl }} />
                {statusBox}
              </>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 24, fontWeight: '800', color: theme.fgStrong, letterSpacing: -0.5 }}>
                      Enter your PIN
                    </Text>
                    <Text style={{ fontSize: 13, color: theme.muted, marginTop: 5, fontVariant: ['tabular-nums'] }}>
                      +91 {phone}
                    </Text>
                  </View>
                  <Pressable testID="signin-change-number"
                    onPress={() => { setPin(''); setError(null); setStep('phone'); }}
                    accessibilityRole="button" accessibilityLabel="Change mobile number"
                    style={({ pressed }) => ({
                      minHeight: TAP_MIN, justifyContent: 'center', paddingHorizontal: 11,
                      borderRadius: RADIUS.sm, borderWidth: 1, borderColor: theme.lineStrong,
                      opacity: pressed ? 0.7 : 1,
                    })}>
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: theme.fg, textAlign: 'center', lineHeight: 15 }}>
                      Change mobile{'\n'}number
                    </Text>
                  </Pressable>
                </View>

                {/* one control, not four: a screen reader hears how many
                    digits are entered rather than four unlabelled boxes.
                    The field itself sits invisibly over the dots so the PIN
                    can be TYPED as well as tapped -- the dots are a display,
                    and a display cannot take a caret. */}
                <View style={{ marginTop: 22, marginBottom: 18 }}>
                  <TextInput
                    ref={pinRef} testID="signin-pin"
                    value={pin} onChangeText={type}
                    keyboardType="number-pad" maxLength={4}
                    accessibilityLabel={`PIN, ${pin.length} of 4 digits entered`}
                    onFocus={() => setTyping(true)} onBlur={() => setTyping(false)}
                    style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 60,
                      // Not `opacity: 0` and not `display: none`: a field with
                      // no box cannot be focused by a tap or reached by a
                      // screen reader on the web.
                      opacity: 0.001, color: 'transparent', fontSize: 16,
                    }} />
                  <View pointerEvents="none" style={{ flexDirection: 'row', gap: 14, justifyContent: 'center' }}>
                    {[0, 1, 2, 3].map(i => (
                      <View key={i} style={{
                        width: 52, height: 60, borderRadius: RADIUS.lg,
                        borderWidth: 1.5, borderColor: i < pin.length ? theme.accent : theme.lineStrong,
                        backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 24, fontWeight: '800', color: theme.fgStrong }}>
                          {i < pin.length ? '•' : ''}
                        </Text>
                        {/* the caret sits under the box she is filling, so a
                            typed PIN shows where the next digit lands */}
                        <View style={{
                          position: 'absolute', bottom: 12, width: 14, height: 2, borderRadius: 2,
                          backgroundColor: typing && i === pin.length ? theme.accent : 'transparent',
                        }} />
                      </View>
                    ))}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {KEYS.map(k => (
                    <Pressable key={k} testID={`signin-key-${k}`} onPress={() => press(k)}
                      accessibilityRole="button"
                      accessibilityLabel={k === 'del' ? 'Delete last digit' : k === 'ce' ? 'Clear entry' : k}
                      style={({ pressed }) => ({
                        // three to a row, gaps included
                        width: '31.5%', flexGrow: 1, height: 56, borderRadius: RADIUS.lg,
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: pressed ? theme.control : theme.surface,
                        borderWidth: 1, borderColor: theme.line,
                      })}>
                      <Text style={{
                        fontSize: k === 'ce' ? 15 : 21, fontWeight: '700',
                        color: k === 'ce' || k === 'del' ? theme.muted : theme.fgStrong,
                        fontVariant: ['tabular-nums'],
                      }}>
                        {k === 'del' ? '⌫' : k === 'ce' ? 'CE' : k}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {statusBox}

                <Pressable testID="signin-forgot-pin"
                  onPress={() => router.push({ pathname: '/forgot-pin', params: { phone: digits } })}
                  accessibilityRole="button" accessibilityLabel="Forgot PIN"
                  style={({ pressed }) => ({
                    marginTop: SPACE.lg, minHeight: TAP_MIN, borderRadius: RADIUS.md,
                    borderWidth: 1, borderColor: theme.line, opacity: pressed ? 0.7 : 1,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm,
                  })}>
                  <Icon name="help" size={18} color={theme.accentInk} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.fg }}>Forgot PIN?</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </SafeAreaView>
    </DeepBackground>
  );
}
