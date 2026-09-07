import { useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, H1, Body, Muted, Label } from '../src/components/ui';
import { Icon } from '../src/components/Icon';
import { useTheme } from '../src/theme/ThemeProvider';
import { useToast } from '../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS } from '../src/theme/tokens';
import { isConfigured } from '../src/lib/supabase';
import { authBootstrap, adoptSession, recoveryApply, changeOwnPin } from '../src/data/api';
import { useAutoFocus } from '../src/components/openingFocus';
import { takeRegistrationDraft, peekRegistrationDraft, takeRecoveryToken, peekRecoveryToken } from '../src/data/pending';
import { keypadRow, keypadCell } from '../src/components/keypadGrid';
import { afterPinChange } from '../src/data/nav';
import { useIdentity } from '../src/data/session';

/** '1'..'9', clear-entry, '0', backspace -- the same twelve keys as sign-in.
 *  The tenth was a dead blank, so the only way out of a mistyped PIN was four
 *  presses of the backspace. */
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'ce', '0', 'del'] as const;

/** the obviously guessable PINs the canvas refuses */
const weak = (v: string) => /^(\d)\1{3}$/.test(v) || v === '1234' || v === '4321' || v === '0123';

/**
 * One screen, two lives: a staff member picking her first PIN after the
 * temporary one, and anyone changing their own from Profile (?for=self).
 */
export default function SetPin() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { for: who } = useLocalSearchParams<{ for?: string }>();
  /**
   * WHO ASKED, and -- separately -- WHETHER THERE IS ANYWHERE TO GO BACK TO.
   * These are not the same question, and answering the second with the first
   * is what left the first-time PIN change sitting on this screen.
   *
   *   'self'      she chose Change My PIN from Profile, which PUSHED. There
   *               is a Profile behind this screen and going back to it is
   *               right -- she was already inside the app.
   *   'first'     sign-in sent her here because must_change_pin was set, by
   *               REPLACE. Nothing is behind this screen, so `router.back()`
   *               did nothing at all and she was stuck -- staff and super
   *               admin alike, on every first login. She has no Profile to
   *               return to yet; she belongs on her dashboard.
   *   'register'  the account does not exist until this PIN is chosen.
   *
   * `self` still decides the COPY, and 'first' correctly falls to the other
   * branch: a temporary PIN being replaced is "Pick your own PIN", not
   * "Change your PIN".
   */
  const self = who === 'self';
  const { identity } = useIdentity();

  const [stage, setStage] = useState<'new' | 'confirm'>('new');
  const [pinNew, setPinNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The PIN field sits invisibly over the dots, so nothing on this screen
  // LOOKS like a field to tap -- the caret starting in it is what makes the
  // dots typeable on arrival rather than after a tap in the right place.
  const field = useAutoFocus<TextInput>(true);
  const [typing, setTyping] = useState(false);

  const shown = stage === 'new' ? pinNew : confirm;
  const set = stage === 'new' ? setPinNew : setConfirm;
  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;

  /**
   * Leaving this screen, decided in ONE place -- src/data/nav.ts -- so the
   * three success paths below cannot answer it differently. `back` is only
   * ever for the arrival that genuinely pushed; see afterPinChange.
   *
   * The role is read from the adopted session rather than guessed. If
   * identity has not resolved yet the admin home is the safe answer: the tab
   * group's own guard moves a staff account off Overview, so an unknown role
   * costs one hop, while guessing 'staff' for an admin would strand her on a
   * workspace that is not hers.
   */
  const leave = (isSuperAdmin = identity?.isSuperAdmin !== false) => {
    const to = afterPinChange(who, isSuperAdmin);
    if (to === 'back') router.back(); else router.replace(to);
  };

  /**
   * Three ways to arrive here, and the PIN is only ever sent, never kept:
   *   ?for=register  the account does not exist yet -- auth-bootstrap takes
   *                  the draft AND this PIN in one call, so a half-registered
   *                  super admin cannot exist.
   *   after recovery a recovery token is waiting -- recovery-check spends it.
   *   otherwise      she is signed in and choosing her own -- pin-reset's
   *                  self path, which clears must_change_pin.
   */
  const apply = async (chosen: string) => {
    if (!isConfigured) {
      leave();
      flash(self ? 'PIN updated' : 'PIN set · welcome to RosiFit');
      return;
    }
    setBusy(true);
    try {
      const draft = peekRegistrationDraft();
      const token = peekRecoveryToken();
      if (who === 'register' || draft) {
        if (!draft) throw new Error('That registration was not finished. Start again.');
        takeRegistrationDraft();
        const result = await authBootstrap({ ...draft, pin: chosen });
        await adoptSession(result);
        // `kind` is the server's word for the role, not a guess -- the same
        // source sign-in lands on.
        leave(result.user?.kind !== 'staff');
        flash('Registered · welcome to RosiFit');
      } else if (token) {
        takeRecoveryToken();
        const result = await recoveryApply(token, chosen);
        await adoptSession(result);
        leave(result.user?.kind !== 'staff');
        flash('PIN set · you are signed in');
      } else {
        await changeOwnPin(chosen);
        leave();
        flash(self ? 'PIN updated' : 'PIN set · welcome to RosiFit');
      }
    } catch (err) {
      setStage('new'); setPinNew(''); setConfirm('');
      flash(err instanceof Error ? err.message : 'That did not work. Try again.', 'warn');
    } finally {
      setBusy(false);
    }
  };

  /**
   * What a completed four digits means. Held apart from the keypad because
   * the field below can complete a PIN too, and the two MUST decide the same
   * thing -- a typed 1234 that skipped the weak check would be a real hole.
   */
  const settle = (v: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (stage === 'new') {
        if (weak(v)) { setPinNew(''); flash('Too easy to guess — try another four digits', 'warn'); }
        else { setStage('confirm'); setConfirm(''); }
      } else if (v === pinNew) {
        void apply(v);
      } else {
        setStage('new'); setPinNew(''); setConfirm('');
        flash('Those did not match — start again', 'warn');
      }
    }, 200);
  };

  /** Typed on a hardware keyboard, into the same state the keypad writes. */
  const type = (raw: string) => {
    if (busy) return;
    const v = raw.replace(/\D/g, '').slice(0, 4);
    set(v);
    if (v.length === 4) settle(v);
  };

  const press = (k: string) => {
    if (busy) return;
    if (k === 'ce') return set('');
    if (k === 'del') return set(p => p.slice(0, -1));
    if (shown.length >= 4) return;
    const v = shown + k;
    set(v);
    if (v.length === 4) settle(v);
  };

  return (
    <Screen deep scroll={false}>
      {/* Scrolls, so the pad below can never be overlapped. The keypad is a
          fixed 4 rows and this region is everything else; when the two do not
          both fit -- a short phone, or large text -- a plain `flex: 1` View
          is squeezed below its own content and the content spills OVER the
          keys rather than being clipped. That is what the overlapping PIN
          boxes were. A scroll view shrinks honestly instead. */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {!self && (
          <Muted style={{ color: theme.accentInk }}>
            {`Welcome${peekRegistrationDraft() ? `, ${peekRegistrationDraft()!.name.split(' ')[0]}` : ''}.`}
          </Muted>
        )}
        <H1 style={{ color: '#FFFFFF', marginTop: 4 }}>
          {self ? 'Change your PIN' : 'Pick your own PIN'}
        </H1>
        <Body style={{ color: theme.onDeep, marginTop: SPACE.sm }}>
          {self
            ? 'Pick four digits only you know. Your old PIN stops working as soon as this one is set.'
            : 'The PIN you were given was temporary. Choose one only you know — you will use it every time you open RosiFit.'}
        </Body>

        <View style={{
          marginTop: SPACE.lg, padding: SPACE.lg, borderRadius: RADIUS.lg,
          borderWidth: 1, borderColor: theme.lineStrong,
        }}>
          <Label style={{ color: theme.onDeep }}>Two small rules</Label>
          <View style={{ gap: 8, marginTop: SPACE.md }}>
            <View style={{ flexDirection: 'row', gap: SPACE.sm, alignItems: 'center' }}>
              <Icon name="block" size={16} color={ink('absent')} />
              <Text style={{ flex: 1, fontSize: 12.5, color: '#EDE3EA' }}>
                Not 1234, and not four of the same digit.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: SPACE.sm, alignItems: 'center' }}>
              <Icon name="visibility_off" size={16} color={ink('present')} />
              <Text style={{ flex: 1, fontSize: 12.5, color: '#EDE3EA' }}>
                Only you will ever see it — we cannot read it back.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* The label, the four boxes and the pad stay OUT of the scroll region.
          They are the live feedback and the control -- on a 320x568 phone the
          rules card alone fills the scrollable part, and dots she has to
          scroll to find are no better than dots hidden under the keys. What
          scrolls is the prose; what she is using never moves. */}
      <Text style={{
        marginTop: SPACE.lg, textAlign: 'center', fontSize: 11.5, fontWeight: '700',
        letterSpacing: 1, textTransform: 'uppercase', color: theme.accentInk,
      }}>
        {busy ? 'Saving…' : stage === 'new' ? 'Your new PIN' : 'Type it once more'}
      </Text>

      {/* The field sits invisibly over the dots so the PIN can be TYPED as
          well as tapped -- four boxes are a display, and a display takes no
          caret. Not `opacity: 0`: a field with no box cannot be focused by
          a tap or reached by a screen reader on the web. */}
      <View style={{ marginTop: SPACE.md, marginBottom: SPACE.lg }}>
        <TextInput
          ref={field} testID="setpin-field"
          value={shown} onChangeText={type}
          keyboardType="number-pad" maxLength={4}
          accessibilityLabel={`PIN, ${shown.length} of 4 digits entered`}
          onFocus={() => setTyping(true)} onBlur={() => setTyping(false)}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 60,
            opacity: 0.001, color: 'transparent', fontSize: 16,
          }} />
        <View pointerEvents="none" style={{ flexDirection: 'row', gap: 14, justifyContent: 'center' }}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={{
              width: 52, height: 60, borderRadius: RADIUS.lg,
              backgroundColor: theme.deepControl,
              borderWidth: 1.5,
              borderColor: i === shown.length ? theme.accent : theme.lineStrong,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#FFFFFF' }}>
                {shown[i] ? '•' : ''}
              </Text>
              <View style={{
                position: 'absolute', bottom: 12, width: 14, height: 2, borderRadius: 2,
                backgroundColor: typing && i === shown.length ? theme.accent : 'transparent',
              }} />
            </View>
          ))}
        </View>
      </View>

      {/* Three to a row at EVERY width -- the gutter is padding inside each
          cell, never a gap between them, because a gap joins the
          line-breaking sum. Two-up made this pad six rows instead of four and
          the extra height is what pushed the PIN boxes over the keys.
          src/components/keypadGrid.ts. */}
      <View testID="setpin-keypad" style={{ ...keypadRow, paddingBottom: SPACE.md }}>
        {KEYS.map(k => (
          <View key={k} style={keypadCell}>
            <Pressable testID={`setpin-key-${k}`} onPress={() => press(k)}
              accessibilityRole="button"
              accessibilityLabel={k === 'del' ? 'Delete last digit' : k === 'ce' ? 'Clear entry' : k}
              style={({ pressed }) => ({
                height: 54, borderRadius: RADIUS.lg,
                alignItems: 'center', justifyContent: 'center',
                // The measured scrim token, dimmed on press the way every other
                // control in the app answers a touch. Two hand-mixed rgba
                // literals stood here; they were invisible to the colour audit
                // only because the same line also said 'transparent'.
                backgroundColor: theme.deepControl, opacity: pressed ? 0.72 : 1,
                borderWidth: 1, borderColor: theme.lineStrong,
              })}>
              <Text style={{
                fontSize: k === 'ce' ? 15 : k === 'del' ? 19 : 21, fontWeight: '700',
                color: '#FFFFFF', fontVariant: ['tabular-nums'],
              }}>
                {k === 'del' ? '⌫' : k === 'ce' ? 'CE' : k}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </Screen>
  );
}
