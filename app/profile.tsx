import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Button } from '../src/components/ui';
import { Icon } from '../src/components/Icon';
import { useTheme } from '../src/theme/ThemeProvider';
import { useToast } from '../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS } from '../src/theme/tokens';

type Row = { label: string; value: string; note: string; editable?: boolean; to?: '/change-mobile' };

/**
 * The canvas locks the mobile number ("it cannot be changed") and offers the
 * only change-number button on the PRE-authentication PIN screen. C-99
 * reversed that, and §26.2 F-1 of the plan calls the canvas' version blocking
 * -- so the plan wins here and the row is editable, behind the authenticated,
 * PIN-gated flow on /change-mobile rather than a pre-auth affordance.
 */
const ROWS: Row[] = [
  { label: 'Full name',     value: 'Priya Menon',        note: 'Shown to your staff and on emails you send', editable: true },
  { label: 'Mobile number', value: '+91 80563 29742',
    note: 'Your sign-in ID — changing it asks for your PIN first', editable: true, to: '/change-mobile' },
  { label: 'Role label',    value: 'Academy admin',      note: 'A label only — access is the same for everyone', editable: true },
  { label: 'Academy',       value: 'RosiFit · 3 branches', note: 'Coimbatore, Madurai, Chennai' },
];

export default function Profile() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.lg }}>
        <View style={{
          width: 84, height: 84, borderRadius: 42, backgroundColor: theme.accentAvatar,
          borderWidth: 2, borderColor: theme.lineStrong, alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 30, fontWeight: '700', color: theme.onAccent }}>PM</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: theme.fgStrong, letterSpacing: -0.5 }}>Priya Menon</Text>
          <Text style={{ fontSize: 13, color: theme.accentInk, marginTop: 4 }}>Academy admin · RosiFit</Text>
        </View>
      </View>

      <View style={{
        borderRadius: RADIUS.lg, backgroundColor: theme.surface,
        borderWidth: 1, borderColor: theme.line, overflow: 'hidden', marginTop: SPACE.sm,
      }}>
        {ROWS.map((r, i) => (
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
              borderBottomWidth: i === ROWS.length - 1 ? 0 : 1, borderBottomColor: theme.line,
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

      <Button label="Change My PIN" onPress={() => router.push('/set-pin')} style={{ marginTop: SPACE.lg }} />

      <Pressable onPress={() => router.replace('/')}
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
