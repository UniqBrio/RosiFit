import { useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, H1, Body, Muted, Label } from '../src/components/ui';
import { Icon } from '../src/components/Icon';
import { useTheme } from '../src/theme/ThemeProvider';
import { useToast } from '../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS } from '../src/theme/tokens';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

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
  const self = who === 'self';

  const [stage, setStage] = useState<'new' | 'confirm'>('new');
  const [pinNew, setPinNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shown = stage === 'new' ? pinNew : confirm;
  const set = stage === 'new' ? setPinNew : setConfirm;
  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;

  const press = (k: string) => {
    if (k === '') return;
    if (k === 'del') return set(p => p.slice(0, -1));
    if (shown.length >= 4) return;
    const v = shown + k;
    set(v);
    if (v.length < 4) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (stage === 'new') {
        if (weak(v)) { setPinNew(''); flash('Too easy to guess — try another four digits', 'warn'); }
        else { setStage('confirm'); setConfirm(''); }
      } else if (v === pinNew) {
        // the PIN goes to auth and nowhere else; nothing here stores it
        if (self) { router.back(); flash('PIN updated'); }
        else { router.replace('/(tabs)'); flash('PIN set · welcome to RosiFit'); }
      } else {
        setStage('new'); setPinNew(''); setConfirm('');
        flash('Those did not match — start again', 'warn');
      }
    }, 200);
  };

  return (
    <Screen deep scroll={false}>
      <View style={{ flex: 1 }}>
        {!self && <Muted style={{ color: theme.accentInk }}>Welcome, Sowmya.</Muted>}
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

        <Text style={{
          marginTop: SPACE.xl, textAlign: 'center', fontSize: 11.5, fontWeight: '700',
          letterSpacing: 1, textTransform: 'uppercase', color: theme.accentInk,
        }}>
          {stage === 'new' ? 'Your new PIN' : 'Type it once more'}
        </Text>

        <View accessible accessibilityLabel={`PIN, ${shown.length} of 4 digits entered`}
          style={{ flexDirection: 'row', gap: 14, justifyContent: 'center', marginTop: SPACE.lg }}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={{
              width: 52, height: 60, borderRadius: RADIUS.lg,
              backgroundColor: 'rgba(12,4,9,0.45)',
              borderWidth: 1.5,
              borderColor: i === shown.length ? theme.accent : theme.lineStrong,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#FFFFFF' }}>
                {shown[i] ? '•' : ''}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: SPACE.md }}>
        {KEYS.map((k, i) => (
          <Pressable key={`${k}${i}`} onPress={() => press(k)} disabled={k === ''}
            accessibilityRole={k === '' ? 'none' : 'button'}
            accessibilityLabel={k === 'del' ? 'Delete last digit' : k || undefined}
            style={({ pressed }) => ({
              width: '31.5%', flexGrow: 1, height: 54, borderRadius: RADIUS.lg,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: k === '' ? 'transparent' : pressed ? 'rgba(12,4,9,0.8)' : 'rgba(12,4,9,0.55)',
              borderWidth: k === '' ? 0 : 1, borderColor: theme.lineStrong,
            })}>
            <Text style={{ fontSize: k === 'del' ? 19 : 21, fontWeight: '700', color: '#FFFFFF', fontVariant: ['tabular-nums'] }}>
              {k === 'del' ? '⌫' : k}
            </Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
