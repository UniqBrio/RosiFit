import { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../src/theme/ThemeProvider';
import { Button, Body, Muted, Label } from '../src/components/ui';
import { RADIUS, SPACE, TAP_MIN } from '../src/theme/tokens';

export default function SignIn() {
  const { theme } = useTheme();
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'pin'>('phone');
  const [phone, setPhone] = useState('80563 29742');
  const [pin, setPin] = useState('');

  const digits = phone.replace(/\D/g, '');
  const phoneOk = digits.length === 10;

  const press = (d: string) => {
    if (d === 'del') return setPin(p => p.slice(0, -1));
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    // A real sign-in posts to auth-login. The UI never sees a PIN again after
    // this: it is not stored, not logged, and not echoed back.
    if (next.length === 4) setTimeout(() => router.replace('/(tabs)'), 220);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.accentDeep }}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <View style={{ alignItems: 'center', paddingVertical: SPACE.xxl * 2 }}>
          <Text style={{ fontSize: 34, fontWeight: '800', color: theme.onDeep, letterSpacing: -1 }}>RosiFit</Text>
          <Text style={{ fontSize: 13, color: theme.onDeep, marginTop: 6, letterSpacing: 2, textTransform: 'uppercase' }}>
            Fit moms to be
          </Text>
        </View>

        <View style={{
          backgroundColor: theme.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
          padding: SPACE.xl, paddingBottom: SPACE.xxl, gap: SPACE.md,
        }}>
          {step === 'phone' ? (
            <>
              <Text style={{ fontSize: 24, fontWeight: '800', color: theme.fgStrong }}>Welcome back</Text>
              <Muted>Your number, then your 4-digit PIN.</Muted>
              <Label>Mobile number</Label>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
                borderWidth: 1, borderColor: theme.lineStrong, borderRadius: RADIUS.md,
                backgroundColor: theme.surface, paddingHorizontal: SPACE.lg, minHeight: TAP_MIN + 8,
              }}>
                <Text style={{ color: theme.muted, fontWeight: '700' }}>+91</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="number-pad"
                  accessibilityLabel="Mobile number"
                  placeholder="00000 00000"
                  placeholderTextColor={theme.muted}
                  style={{ flex: 1, color: theme.fgStrong, fontSize: 17, fontWeight: '700' }}
                />
              </View>
              <Muted>Only RosiFit staff numbers can sign in.</Muted>
              <Button label="Continue" disabled={!phoneOk} onPress={() => setStep('pin')} />
            </>
          ) : (
            <>
              <Text style={{ fontSize: 24, fontWeight: '800', color: theme.fgStrong }}>Enter your PIN</Text>
              <Muted>+91 {phone}</Muted>
              <View style={{ flexDirection: 'row', gap: SPACE.md, justifyContent: 'center', marginVertical: SPACE.lg }}>
                {[0, 1, 2, 3].map(i => (
                  <View key={i} accessibilityElementsHidden style={{
                    width: 52, height: 60, borderRadius: RADIUS.md,
                    borderWidth: 1.5, borderColor: i < pin.length ? theme.accent : theme.lineStrong,
                    backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 28, color: theme.fgStrong }}>{i < pin.length ? '•' : ''}</Text>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, justifyContent: 'center' }}>
                {['1','2','3','4','5','6','7','8','9','CE','0','del'].map(k => (
                  <Pressable key={k} onPress={() => press(k === 'CE' ? 'del' : k)}
                    accessibilityRole="button" accessibilityLabel={k === 'del' ? 'Delete' : k}
                    style={({ pressed }) => ({
                      width: 92, minHeight: TAP_MIN + 10, borderRadius: RADIUS.md,
                      alignItems: 'center', justifyContent: 'center',
                      backgroundColor: pressed ? theme.control : theme.surface,
                      borderWidth: 1, borderColor: theme.line,
                    })}>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: theme.fgStrong }}>
                      {k === 'del' ? '⌫' : k}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Body style={{ textAlign: 'center', color: theme.accentInk, marginTop: SPACE.md }}>Forgot PIN</Body>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
