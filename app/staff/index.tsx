import { useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Muted, Button } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { Sheet } from '../../src/components/Sheet';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface, type StatusKey } from '../../src/theme/tokens';
import { STAFF, STAFF_ACCESS, maskPhone, initials, AVATAR_TINTS, type Staff } from '../../src/data/mock';

/**
 * Adding a person and giving them a login are TWO steps, on purpose. A record
 * exists first; access is granted deliberately afterwards. The list is sorted
 * by what still needs doing, so the two states that need the academy to act
 * are never below the ones that do not.
 */
const ACCESS_TONE: Record<string, StatusKey> = {
  notEnabled: 'absent', awaiting: 'awaiting', disabled: 'cancelled', active: 'present',
};

export default function StaffList() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const [target, setTarget] = useState<Staff | null>(null);
  const [signOutEverywhere, setSignOutEverywhere] = useState(true);

  const people = useMemo(
    () => [...STAFF].sort((a, b) => STAFF_ACCESS[a.access].rank - STAFF_ACCESS[b.access].rank),
    []);
  const needAccess = STAFF.filter(s => s.access !== 'active').length;

  const act = (s: Staff) => {
    if (s.access === 'disabled') {
      flash(`${s.name.split(' ')[0]} re-enabled · still needs a PIN`);
      return;
    }
    setSignOutEverywhere(true);
    setTarget(s);
  };

  const confirm = () => {
    const s = target;
    if (!s) return;
    setTarget(null);
    // Generated here and shown once on the next screen. It is never stored in
    // readable form and never written to the audit log.
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    router.push({
      pathname: '/staff/pin',
      params: { pin, name: s.name, phone: s.phone.replace('+91 ', ''), role: s.role },
    });
  };

  return (
    <Screen>
      <Muted style={{ marginBottom: SPACE.lg }}>
        {`${STAFF.length} people · ${needAccess} still need access`}
      </Muted>

      {people.map(s => {
        const meta = STAFF_ACCESS[s.access];
        const tone = STATUS[ACCESS_TONE[s.access]];
        const ink = theme.isDark ? tone.fgDark : tone.fgLight;
        const box = statusSurface(ink);
        return (
          <View key={s.id} style={{
            backgroundColor: theme.surface, borderRadius: RADIUS.lg, borderWidth: 1,
            borderColor: theme.line, padding: SPACE.lg, marginBottom: SPACE.md,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md }}>
              <View style={{
                width: 44, height: 44, borderRadius: 22,
                backgroundColor: AVATAR_TINTS[people.indexOf(s) % AVATAR_TINTS.length],
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF' }}>{initials(s.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: theme.fgStrong }}>{s.name}</Text>
                <Text style={{ fontSize: 12.5, color: theme.muted, marginTop: 2, fontVariant: ['tabular-nums'] }}>
                  {`${s.role} · ${maskPhone(s.phone)}`}
                </Text>
              </View>
            </View>

            {/* the state carries its own word AND its own icon, so neither the
                colour nor the glyph is doing the work alone */}
            <View style={{
              alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
              marginTop: SPACE.md, paddingHorizontal: 10, paddingVertical: 5,
              borderRadius: RADIUS.pill, backgroundColor: box.bg, borderWidth: 1, borderColor: box.border,
            }}>
              <Icon name={meta.icon} size={14} color={ink} />
              <Text style={{ fontSize: 11, fontWeight: '800', color: ink, letterSpacing: 0.3 }}>{meta.word}</Text>
            </View>

            <Muted style={{ marginTop: SPACE.sm }}>{s.meta}</Muted>

            <Button
              label={meta.action}
              variant={meta.primary ? 'primary' : 'secondary'}
              onPress={() => act(s)}
              style={{ marginTop: SPACE.md }} />
          </View>
        );
      })}

      <Button label="Add staff" onPress={() => router.push('/staff/add')} />

      <Sheet open={!!target} onClose={() => setTarget(null)}
        title={target
          ? (target.access === 'active' ? `Reset ${target.name}’s PIN?` : `Generate a PIN for ${target.name}?`)
          : ''}>
        <Muted style={{ marginTop: 9 }}>
          Her current PIN stops working straight away. The new one is shown once, on the next screen.
        </Muted>

        <Pressable onPress={() => setSignOutEverywhere(v => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: signOutEverywhere }}
          accessibilityLabel="Also sign her out everywhere"
          style={{
            flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginTop: SPACE.lg,
            padding: 14, borderRadius: RADIUS.lg, backgroundColor: theme.surface2,
            borderWidth: 1, borderColor: theme.line, minHeight: TAP_MIN,
          }}>
          <View style={{
            width: 22, height: 22, borderRadius: 7,
            backgroundColor: signOutEverywhere ? theme.accent : 'transparent',
            borderWidth: 1.5, borderColor: signOutEverywhere ? theme.accent : theme.lineStrong,
            alignItems: 'center', justifyContent: 'center',
          }}>
            {signOutEverywhere ? <Icon name="check" size={14} color={theme.onAccent} /> : null}
          </View>
          <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: theme.fg }}>
            Also sign her out everywhere
          </Text>
        </Pressable>

        <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.lg }}>
          <Button label="Cancel" variant="secondary" onPress={() => setTarget(null)} style={{ flex: 1 }} />
          <Button label="Generate PIN" onPress={confirm} style={{ flex: 1 }} />
        </View>
      </Sheet>
    </Screen>
  );
}
