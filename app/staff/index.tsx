import { useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Muted, Button, Skeleton, ErrorState, EmptyState } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { Sheet } from '../../src/components/Sheet';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface, type StatusKey } from '../../src/theme/tokens';
import { STAFF_ACCESS, maskPhone, initials, AVATAR_TINTS, type Staff } from '../../src/data/mock';
import { useStaff } from '../../src/data/hooks';
import { isConfigured } from '../../src/lib/supabase';
import { pinIssue, pinReset, staffReenable } from '../../src/data/api';
import { setIssuedPin } from '../../src/data/pending';
import { ShellScreen } from '../../src/components/AppShell';

/**
 * Adding a person and giving them a login are TWO steps, on purpose. A record
 * exists first; access is granted deliberately afterwards. The list is sorted
 * by what still needs doing, so the two states that need the academy to act
 * are never below the ones that do not.
 */
const ACCESS_TONE: Record<string, StatusKey> = {
  notEnabled: 'absent', awaiting: 'awaiting', disabled: 'cancelled', active: 'present',
};

function StaffListBody() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { state: forced } = useLocalSearchParams<{ state?: string }>();
  const { state, data, error, retry } = useStaff(forced);
  const [target, setTarget] = useState<Staff | null>(null);
  const [signOutEverywhere, setSignOutEverywhere] = useState(true);
  const [busy, setBusy] = useState(false);

  const staff = useMemo(() => data ?? [], [data]);
  const people = useMemo(
    () => [...staff].sort((a, b) => STAFF_ACCESS[a.access].rank - STAFF_ACCESS[b.access].rank),
    [staff]);
  const needAccess = staff.filter(s => s.access !== 'active').length;

  const act = async (s: Staff) => {
    if (s.access === 'disabled') {
      // Re-enabling gives back access, not a PIN: she reappears as "needs a
      // PIN", and issuing one stays a second, deliberate act.
      if (!isConfigured) { flash(`${s.name.split(' ')[0]} re-enabled · still needs a PIN`); return; }
      try {
        await staffReenable(s.id);
        flash(`${s.name.split(' ')[0]} re-enabled · still needs a PIN`);
        retry();
      } catch (err) {
        flash(err instanceof Error ? err.message : 'That did not work.', 'warn');
      }
      return;
    }
    setSignOutEverywhere(true);
    setTarget(s);
  };

  const confirm = async () => {
    const s = target;
    if (!s || busy) return;
    setTarget(null);

    const goShowOnce = (pin: string) => {
      // The PIN is handed over in memory, never as a route parameter -- see
      // src/data/pending.ts. It is shown once and is never stored readable
      // or written to the audit log.
      setIssuedPin({ pin, name: s.name, phone: s.phone.replace('+91 ', ''), role: s.role });
      router.push('/staff/pin');
    };

    if (!isConfigured) {
      goShowOnce(String(Math.floor(1000 + Math.random() * 9000)));
      return;
    }

    setBusy(true);
    try {
      // Active means she has been using a PIN and forgot it (the C-98
      // admin-assisted path); anything else is her first or a replacement.
      const result = s.access === 'active'
        ? await pinReset(s.id, signOutEverywhere)
        : await pinIssue({ app_user_id: s.id });
      goShowOnce(result.pin);
      retry();
    } catch (err) {
      flash(err instanceof Error ? err.message : 'That did not work.', 'warn');
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading') return <Screen><Skeleton lines={4} /></Screen>;
  if (state === 'error') {
    return (
      <Screen>
        <ErrorState onRetry={retry}
          message={error ?? 'The staff list could not be loaded. Nothing has been changed.'} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Muted style={{ marginBottom: SPACE.lg }}>
        {`${staff.length} people · ${needAccess} still need access`}
      </Muted>

      {staff.length === 0 && (
        <EmptyState
          title="No staff yet"
          body="Add the people who will use RosiFit. A record comes first; access is granted deliberately afterwards."
          action="Add staff" onAction={() => router.push('/staff/add')} />
      )}

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
              onPress={() => void act(s)}
              style={{ marginTop: SPACE.md }} />
          </View>
        );
      })}

      <Button label="Add staff" onPress={() => router.push('/staff/add')} />

      {/* the canvas closes this list by saying why there is no "show PIN" */}
      <View style={{
        marginTop: SPACE.lg, padding: 15, borderRadius: RADIUS.md,
        flexDirection: 'row', gap: 11,
        backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
      }}>
        <Icon name="lock_reset" size={19} color={theme.isDark ? STATUS.holiday.fgDark : STATUS.holiday.fgLight} />
        <Muted style={{ flex: 1 }}>
          A PIN is shown once, on this device, when you create it. Nobody can read it back later —
          you reset it instead.
        </Muted>
      </View>

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
          <Button label={busy ? 'Generating…' : 'Generate PIN'} onPress={() => void confirm()}
            disabled={busy} style={{ flex: 1 }} />
        </View>
      </Sheet>
    </Screen>
  );
}

/**
 * Under the shell, not instead of it. This screen is pushed on the root
 * stack, so it is not one of the tab navigator's own and wore no academy
 * header and no Home · Reports · More pill until ShellScreen drew them.
 */
export default function StaffList() {
  const router = useRouter();
  return (
    <ShellScreen title="Staff & access" subtitle="Who can sign in, and what each of them may do" onBack={() => router.back()}>
      <StaffListBody />
    </ShellScreen>
  );
}
