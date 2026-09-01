import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Muted, Label, Button } from '../../src/components/ui';
import { Field } from '../../src/components/Field';
import { Icon } from '../../src/components/Icon';
import { SearchPicker } from '../../src/components/Sheet';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface } from '../../src/theme/tokens';
import { ROLE_LABELS } from '../../src/data/mock';

export default function StaffAdd() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Coach');
  const [roles, setRoles] = useState<string[]>(
    [...ROLE_LABELS, 'Physiotherapist', 'Nutrition coach']);
  const [picking, setPicking] = useState(false);

  const digits = phone.replace(/\D/g, '');
  const valid = name.trim().length > 0 && digits.length >= 10;

  const save = () => {
    if (!valid) return;
    // Saving the record is deliberately NOT the same act as granting access;
    // the PIN is issued from the staff list as a separate, named step.
    flash(`${name.trim().split(' ')[0]} saved · no app access yet`);
    router.replace('/staff');
  };

  const warnInk = theme.isDark ? STATUS.awaiting.fgDark : STATUS.awaiting.fgLight;
  const warnBox = statusSurface(warnInk);

  return (
    <Screen>
      <Muted style={{ marginBottom: SPACE.lg }}>She signs in with her number and a PIN</Muted>

      <Field label="Full name" value={name} onChange={setName} placeholder="e.g. Revathi Anand" />

      <Field
        label="Mobile number" value={phone} onChange={setPhone}
        placeholder="98765 43210" keyboardType="phone-pad" prefix="+91"
        hint="This number becomes her sign-in ID and cannot be changed later."
        error={digits.length > 0 && digits.length < 10 ? 'A 10-digit mobile number is needed.' : undefined} />

      <Label style={{ marginTop: SPACE.sm }}>Role label</Label>
      <Pressable onPress={() => setPicking(true)}
        accessibilityRole="button"
        accessibilityLabel={`Role label, ${role}`}
        accessibilityHint="Opens a list of role labels"
        style={{
          marginTop: 8, minHeight: TAP_MIN + 8, borderRadius: RADIUS.md,
          backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
          paddingHorizontal: SPACE.lg, flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
        }}>
        <Icon name="badge" size={20} color={theme.accentInk} />
        <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: theme.fgStrong }}>{role}</Text>
        <Icon name="arrow_drop_down" size={22} color={theme.muted} />
      </Pressable>
      <Muted style={{ marginTop: SPACE.sm }}>A label only — every staff member sees the same screens.</Muted>

      <View style={{
        marginTop: SPACE.xl, padding: 15, borderRadius: RADIUS.lg,
        backgroundColor: warnBox.bg, borderWidth: 1, borderColor: warnBox.border,
        flexDirection: 'row', gap: SPACE.md,
      }}>
        <Icon name="lock_open" size={19} color={warnInk} />
        <Text style={{ flex: 1, fontSize: 12.5, color: theme.fg, lineHeight: 19 }}>
          Saving her record does not give her app access. She will appear as{' '}
          <Text style={{ fontWeight: '800', color: theme.fgStrong }}>Not enabled</Text> until you generate a
          login PIN for her — a separate, deliberate step.
        </Text>
      </View>

      <Button label="Save staff member" onPress={save} disabled={!valid} style={{ marginTop: SPACE.xl }} />
      <Muted style={{ marginTop: 9, textAlign: 'center' }}>
        {valid ? `Saved as ${role} · no app access yet` : 'Name and a 10-digit mobile number are needed'}
      </Muted>

      <SearchPicker
        open={picking}
        onClose={() => setPicking(false)}
        title="Choose a role label"
        placeholder="Search or type a new one"
        options={roles.map(label => ({ label }))}
        value={role}
        onSelect={l => { setRole(l); setPicking(false); }}
        onAdd={l => {
          setRoles(prev => [...prev, l]);
          setRole(l); setPicking(false);
          flash(`“${l}” added as a role label`);
        }}
        emptyNote="No label matches that. Type it in full and add it — labels are free text and grant no access." />
    </Screen>
  );
}
