import { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Muted, Label, Button } from '../../src/components/ui';
import { Field } from '../../src/components/Field';
import { Icon } from '../../src/components/Icon';
import { SearchPicker } from '../../src/components/Sheet';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface } from '../../src/theme/tokens';
import { MEMBERS, COURSE_LIST, BRANCHES, DAY_NAMES, primaryEmail } from '../../src/data/mock';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * C-70/C-73: her name is the only required field. No phone number is held for
 * members -- it was never used to identify anyone. Aliases are what the Meet
 * CSV matches on; emails are several with exactly one primary.
 */
export default function MemberEdit() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = MEMBERS.find(m => m.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [course, setCourse] = useState(existing?.course ?? COURSE_LIST[0].name);
  const [branch, setBranch] = useState(existing?.branch ?? 'Coimbatore');
  const [joined, setJoined] = useState('');
  const [aliases, setAliases] = useState<string[]>(existing?.aliases ?? []);
  const [aliasDraft, setAliasDraft] = useState('');
  const [emails, setEmails] = useState(existing?.emails ?? []);
  const [emailDraft, setEmailDraft] = useState('');
  const [days, setDays] = useState<string[]>([]);
  const [picker, setPicker] = useState<null | 'course' | 'branch'>(null);

  const valid = name.trim().length > 0;
  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;

  // days she may pick are only days her course's offerings actually run
  const courseDays = useMemo(() => {
    const c = COURSE_LIST.find(x => x.name === course);
    const set = new Set<string>();
    c?.offerings.forEach(o => o.weekdays.forEach(d => set.add(DAY_NAMES[d])));
    return set;
  }, [course]);

  const addAlias = () => {
    const a = aliasDraft.trim();
    if (!a) return;
    if (aliases.some(x => x.toLowerCase() === a.toLowerCase())) {
      flash('That display name is already on her record', 'warn'); return;
    }
    setAliases(p => [...p, a]); setAliasDraft('');
  };

  const addEmail = () => {
    const e = emailDraft.trim().toLowerCase();
    if (!e) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) { flash('That does not look like an address', 'warn'); return; }
    // the FIRST address becomes primary; there is always exactly one
    setEmails(p => [...p, { address: e, primary: p.length === 0 }]);
    setEmailDraft('');
  };

  const save = () => {
    if (!valid) return;
    flash(`${name.trim().split(' ')[0]} ${existing ? 'updated' : 'added'} · ${course} · ${branch}`);
    router.back();
  };

  return (
    <Screen>
      <Muted style={{ marginBottom: SPACE.lg }}>She joins a course at one branch</Muted>

      <Field label="Her name" value={name} onChange={setName} placeholder="e.g. Anitha Rajesh" />

      <Label>Course</Label>
      <PickRow icon="school" value={course} onPress={() => setPicker('course')} />
      <Label style={{ marginTop: SPACE.md }}>Branch</Label>
      <PickRow icon="apartment" value={branch} onPress={() => setPicker('branch')} />

      <View style={{ marginTop: SPACE.md }}>
        <Field label="Joined on" value={joined} onChange={setJoined} placeholder="25-Aug-26" />
      </View>

      <View style={{ flexDirection: 'row', gap: SPACE.sm, alignItems: 'flex-start', marginTop: -4 }}>
        <Icon name="lock" size={15} color={ink('present')} />
        <Muted style={{ flex: 1 }}>
          No phone number is held for members. It was never used to identify anyone.
        </Muted>
      </View>

      {/* ------------------------------------------------ aliases (C-71) */}
      <Label style={{ marginTop: SPACE.xl }}>Google Meet display names</Label>
      <Muted style={{ marginTop: 4 }}>
        The names that may appear in the attendance file. Adding one here means the file matches it
        to her automatically.
      </Muted>
      <View style={{ gap: SPACE.sm, marginTop: SPACE.md }}>
        {aliases.map(a => (
          <View key={a} style={{
            flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
            padding: SPACE.md, borderRadius: RADIUS.md, backgroundColor: theme.surface,
            borderWidth: 1, borderColor: theme.line,
          }}>
            <Icon name="badge" size={17} color={theme.accentInk} />
            <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '700', color: theme.fgStrong }}>{a}</Text>
            <Pressable onPress={() => setAliases(p => p.filter(x => x !== a))}
              accessibilityRole="button" accessibilityLabel={`Remove display name ${a}`}
              style={{ minHeight: TAP_MIN / 2, justifyContent: 'center' }}>
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.muted }}>Remove</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <AddRow value={aliasDraft} onChange={setAliasDraft} placeholder="e.g. Anitha R" onAdd={addAlias} />

      {/* -------------------------------------------------- emails (C-73) */}
      <Label style={{ marginTop: SPACE.xl }}>Email addresses</Label>
      <View style={{ gap: SPACE.sm, marginTop: SPACE.md }}>
        {emails.map(e => (
          <View key={e.address} style={{
            flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
            padding: SPACE.md, borderRadius: RADIUS.md, backgroundColor: theme.surface,
            borderWidth: 1, borderColor: e.primary ? theme.accent : theme.line,
          }}>
            <Pressable
              onPress={() => setEmails(p => p.map(x => ({ ...x, primary: x.address === e.address })))}
              accessibilityRole="radio" accessibilityState={{ selected: e.primary }}
              accessibilityLabel={`Make ${e.address} the primary address`}
              style={{ minHeight: TAP_MIN / 2, justifyContent: 'center' }}>
              <Icon name={e.primary ? 'radio_button_checked' : 'radio_button_unchecked'}
                size={19} color={e.primary ? theme.accentInk : theme.dim} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: theme.fgStrong, fontVariant: ['tabular-nums'] }}>
                {e.address}
              </Text>
              <Text style={{ fontSize: 10.5, color: e.primary ? theme.accentInk : theme.muted, marginTop: 2 }}>
                {e.primary ? 'PRIMARY — sends go here' : 'kept on file'}
              </Text>
            </View>
            <Pressable
              onPress={() => setEmails(p => {
                const rest = p.filter(x => x.address !== e.address);
                // removing the primary promotes the next -- there is never
                // an address list with no primary
                return rest.length && !rest.some(x => x.primary)
                  ? rest.map((x, i) => ({ ...x, primary: i === 0 })) : rest;
              })}
              accessibilityRole="button" accessibilityLabel={`Remove ${e.address}`}
              style={{ minHeight: TAP_MIN / 2, justifyContent: 'center' }}>
              <Icon name="close" size={17} color={theme.muted} />
            </Pressable>
          </View>
        ))}
      </View>
      <AddRow value={emailDraft} onChange={setEmailDraft} placeholder="anitha@gmail.com" onAdd={addEmail} />
      <View style={{ flexDirection: 'row', gap: SPACE.sm, alignItems: 'flex-start', marginTop: SPACE.sm }}>
        <Icon name={emails.length ? 'mark_email_read' : 'mail_off'} size={15}
          color={emails.length ? ink('present') : ink('absent')} />
        <Muted style={{ flex: 1 }}>
          {emails.length
            ? 'Follow-up emails go to the primary address only.'
            : 'With no address she is listed and counted as excluded from every send — never quietly dropped.'}
        </Muted>
      </View>

      {/* ----------------------------------------------- her own days */}
      <Label style={{ marginTop: SPACE.xl }}>Her own days — optional</Label>
      <Muted style={{ marginTop: 4 }}>
        {courseDays.size
          ? `Leave blank and she follows the days ${course} offerings run — ${[...courseDays].join(', ')}. Only those days can be picked.`
          : `${course} has no offering running yet, so there are no days to pick.`}
      </Muted>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: SPACE.md }}>
        {ALL_DAYS.map(d => {
          const allowed = courseDays.has(d);
          const on = days.includes(d);
          return (
            <Pressable key={d}
              onPress={() => allowed
                ? setDays(p => on ? p.filter(x => x !== d) : [...p, d])
                : flash(`${course} does not run on ${d}`, 'warn')}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: !allowed }}
              accessibilityLabel={`${d}${allowed ? '' : ', not available'}`}
              style={{
                flex: 1, minHeight: TAP_MIN - 4, alignItems: 'center', justifyContent: 'center',
                borderRadius: RADIUS.sm,
                backgroundColor: !allowed ? theme.surface2 : on ? theme.accent : theme.surface,
                borderWidth: 1, borderColor: !allowed ? theme.line : on ? theme.accent : theme.lineStrong,
              }}>
              <Text style={{
                fontSize: 11.5, fontWeight: '700',
                color: !allowed ? theme.dim : on ? theme.onAccent : theme.fg,
              }}>{d}</Text>
            </Pressable>
          );
        })}
      </View>

      <Button label={existing ? 'Save Member' : 'Add Member'} onPress={save} disabled={!valid}
        style={{ marginTop: SPACE.xl }} />
      <Muted style={{ marginTop: 9, textAlign: 'center' }}>
        {valid
          ? `${course} · ${branch}${emails.length ? '' : ' · no email, she will be excluded from sends'}`
          : 'Her name is all that is required'}
      </Muted>

      <SearchPicker open={picker === 'course'} onClose={() => setPicker(null)}
        title="Choose a course" placeholder="Search courses"
        options={COURSE_LIST.map(c => ({ label: c.name }))} value={course}
        onSelect={l => { setCourse(l); setDays([]); setPicker(null); }} />
      <SearchPicker open={picker === 'branch'} onClose={() => setPicker(null)}
        title="Choose a branch" placeholder="Search branches"
        options={BRANCHES.filter(b => b !== 'All branches').map(label => ({ label }))} value={branch}
        onSelect={l => { setBranch(l); setPicker(null); }} />
    </Screen>
  );
}

function PickRow({ icon, value, onPress }: { icon: string; value: string; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={value}
      accessibilityHint="Opens a searchable list"
      style={{
        marginTop: 8, minHeight: TAP_MIN + 8, borderRadius: RADIUS.md,
        backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
        paddingHorizontal: SPACE.lg, flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
      }}>
      <Icon name={icon} size={20} color={theme.accentInk} />
      <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: theme.fgStrong }}>{value}</Text>
      <Icon name="arrow_drop_down" size={22} color={theme.muted} />
    </Pressable>
  );
}

function AddRow({ value, onChange, placeholder, onAdd }:
  { value: string; onChange: (v: string) => void; placeholder: string; onAdd: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.sm }}>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={theme.muted} accessibilityLabel={placeholder}
        onSubmitEditing={onAdd}
        style={{
          flex: 1, minHeight: TAP_MIN + 2, borderRadius: RADIUS.md, paddingHorizontal: SPACE.lg,
          backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
          color: theme.fgStrong, fontSize: 14, fontWeight: '600',
        }} />
      <Button label="+ Add" variant="secondary" onPress={onAdd} />
    </View>
  );
}
