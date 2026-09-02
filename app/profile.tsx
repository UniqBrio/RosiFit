import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Button, Skeleton, EmptyState } from '../src/components/ui';
import { Icon } from '../src/components/Icon';
import { useTheme } from '../src/theme/ThemeProvider';
import { useToast } from '../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS } from '../src/theme/tokens';
import { useIdentity, signOut, type Identity } from '../src/data/session';
import { useAcademyDetails } from '../src/data/hooks';

type Row = { label: string; value: string; note: string; editable?: boolean; to?: '/change-mobile' };

/**
 * The canvas locks the mobile number ("it cannot be changed") and offers the
 * only change-number button on the PRE-authentication PIN screen. C-99
 * reversed that, and §26.2 F-1 of the plan calls the canvas' version blocking
 * -- so the plan wins here and the row is editable, behind the authenticated,
 * PIN-gated flow on /change-mobile rather than a pre-auth affordance.
 *
 * Every value below comes from the signed-in account. This screen used to
 * render a literal ROWS array -- 'Priya Menon', '+91 80563 29742', 'Academy
 * admin' -- so it showed the fixture persona to whoever was actually signed
 * in, including a staff member.
 */
function rowsFor(me: Identity, academy: string): Row[] {
  return [
    { label: 'Full name', value: me.name,
      note: 'Shown to your staff and on emails you send', editable: true },
    { label: 'Mobile number', value: me.phone,
      note: 'Your sign-in ID — changing it asks for your PIN first', editable: true, to: '/change-mobile' },
    { label: 'Role label', value: me.roleLabel,
      note: me.isSuperAdmin
        ? 'A label only — you are the super admin'
        : 'A label only — your access is set by the super admin',
      editable: true },
    { label: 'Academy', value: academy, note: 'The academy this account belongs to' },
  ];
}

export default function Profile() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { state: forced } = useLocalSearchParams<{ state?: string }>();

  const { identity, loading, signedOut } = useIdentity();
  const academy = useAcademyDetails(forced);

  const leave = async () => {
    // The session has to actually END. Replacing the route on its own left a
    // live session behind, so re-opening the app walked straight back in.
    await signOut();
    router.replace('/');
  };

  if (loading) {
    return <Screen><Skeleton lines={6} /></Screen>;
  }

  if (signedOut || !identity) {
    return (
      <Screen>
        {/* Being signed out is not a failure, so it does not get the error
            card's "Something went wrong / Try again" words. */}
        <EmptyState
          title="You are signed out"
          body="Your session has ended. Sign in with your mobile number and PIN to see your profile."
          action="Sign in"
          onAction={() => router.replace('/')} />
      </Screen>
    );
  }

  // The academy line is secondary: if it fails to load the profile still
  // shows who you are rather than collapsing into an error screen.
  const academyValue =
    academy.state === 'ready' && academy.data
      ? [academy.data.name, academy.data.branches.length === 1
          ? '1 branch'
          : `${academy.data.branches.length} branches`].join(' · ')
      : academy.state === 'error' ? 'Could not be loaded' : 'Loading…';

  const rows = rowsFor(identity, academyValue);

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.lg }}>
        <View style={{
          width: 84, height: 84, borderRadius: 42, backgroundColor: theme.accentAvatar,
          borderWidth: 2, borderColor: theme.lineStrong, alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 30, fontWeight: '700', color: theme.onAccent }}>{identity.initials}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: theme.fgStrong, letterSpacing: -0.5 }}>
            {identity.name}
          </Text>
          <Text style={{ fontSize: 13, color: theme.accentInk, marginTop: 4 }}>
            {identity.roleLabel}
            {academy.state === 'ready' && academy.data ? ` · ${academy.data.name}` : ''}
          </Text>
        </View>
      </View>

      <View style={{
        borderRadius: RADIUS.lg, backgroundColor: theme.surface,
        borderWidth: 1, borderColor: theme.line, overflow: 'hidden', marginTop: SPACE.sm,
      }}>
        {rows.map((r, i) => (
          <Pressable key={r.label}
            onPress={() => (r.to
              ? router.push(r.to)
              : flash(
                  r.editable ? `Editing ${r.label.toLowerCase()}` : `${r.label} cannot be changed`,
                  r.editable ? 'ok' : 'warn'))}
            accessibilityRole="button"
            // the lock is not left to the icon: a screen reader is told which
            // rows are fixed before the row is activated
            accessibilityLabel={`${r.label}, ${r.value}. ${r.editable ? 'Editable' : 'Cannot be changed'}`}
            accessibilityHint={r.note}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
              minHeight: TAP_MIN + 22, padding: 15, opacity: pressed ? 0.7 : 1,
              borderBottomWidth: i === rows.length - 1 ? 0 : 1, borderBottomColor: theme.line,
            })}>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 11, fontWeight: '700', letterSpacing: 0.8,
                textTransform: 'uppercase', color: theme.muted,
              }}>{r.label}</Text>
              <Text style={{ fontSize: 14.5, fontWeight: '700', color: theme.fgStrong, marginTop: 4 }}>{r.value}</Text>
              <Text style={{ fontSize: 11.5, color: theme.muted, marginTop: 3, lineHeight: 17 }}>{r.note}</Text>
            </View>
            <Icon name={r.editable ? 'edit' : 'lock'} size={20}
              color={r.editable ? theme.accentInk : theme.dim} />
          </Pressable>
        ))}
      </View>

      <Button label="Change My PIN" onPress={() => router.push('/set-pin?for=self')} style={{ marginTop: SPACE.lg }} />

      <Pressable onPress={leave}
        accessibilityRole="button"
        style={({ pressed }) => ({
          marginTop: SPACE.md, minHeight: TAP_MIN + 8, borderRadius: RADIUS.lg,
          borderWidth: 1, borderColor: theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight,
          alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1,
        })}>
        <Text style={{
          fontSize: 14, fontWeight: '800',
          color: theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight,
        }}>Sign Out</Text>
      </Pressable>
    </Screen>
  );
}
