import { useState } from 'react';
import { View, Pressable, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Card, H1, H2, Body, Muted, Label, Button, Pill, Row, Divider } from '../../src/components/ui';
import { Field, Choice } from '../../src/components/Field';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE, RADIUS, TAP_MIN } from '../../src/theme/tokens';
import { MEMBERS, COURSES, BRANCHES } from '../../src/data/mock';

/**
 * C-71/C-73. Aliases and emails are edited HERE, in the member form -- not
 * discovered one blocked import row at a time. Since the CSV carries only a
 * name, seeding display names up front is what keeps imports quiet.
 *
 * C-70: there is no phone field. A member's number was never a matching key.
 */
export default function EditMember() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = MEMBERS.find(x => x.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [course, setCourse] = useState(existing?.course ?? COURSES[1]);
  const [branch, setBranch] = useState(existing?.branch ?? BRANCHES[1]);
  const [aliases, setAliases] = useState<string[]>(existing?.aliases ?? []);
  const [newAlias, setNewAlias] = useState('');
  const [emails, setEmails] = useState(existing?.emails ?? []);
  const [newEmail, setNewEmail] = useState('');

  const nameOk = name.trim().length >= 2;
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail);
  const aliasDup = aliases.some(a => a.toLowerCase() === newAlias.trim().toLowerCase());

  const addAlias = () => {
    if (!newAlias.trim() || aliasDup) return;
    setAliases(a => [...a, newAlias.trim()]); setNewAlias('');
  };
  const addEmail = () => {
    if (!emailOk) return;
    setEmails(e => [...e, { address: newEmail.trim(), primary: e.length === 0 }]);
    setNewEmail('');
  };
  const makePrimary = (addr: string) =>
    setEmails(e => e.map(x => ({ ...x, primary: x.address === addr })));

  return (
    <Screen>
      <H1>{existing ? 'Edit member' : 'Add member'}</H1>
      <Muted style={{ marginBottom: SPACE.lg }}>
        {existing ? existing.code : 'A code is assigned when you save.'}
      </Muted>

      <Card>
        <Field label="Full name" value={name} onChange={setName}
          placeholder="As you would write it on the register"
          error={name.length > 0 && !nameOk ? 'Enter at least 2 characters.' : undefined} />
        <Choice label="Branch" options={BRANCHES.slice(1)} value={branch} onChange={setBranch} />
        <Choice label="Course" options={COURSES.slice(1)} value={course} onChange={setCourse} />
        <Muted>Course and branch together decide which sessions she is expected at.</Muted>
      </Card>

      <Card>
        <H2>Google Meet display names</H2>
        <Muted style={{ marginTop: 4, marginBottom: SPACE.md }}>
          The names that may appear in the attendance file. A display name can only ever
          belong to one member, so the import never has to guess.
        </Muted>
        {aliases.map(a => (
          <Row key={a} style={{ marginBottom: SPACE.sm }}>
            <Body style={{ flex: 1 }}>{a}</Body>
            <Pressable onPress={() => setAliases(x => x.filter(y => y !== a))}
              accessibilityRole="button" accessibilityLabel={`Remove display name ${a}`}
              style={{ minHeight: TAP_MIN, justifyContent: 'center', paddingHorizontal: SPACE.md }}>
              <Text style={{ color: theme.danger, fontWeight: '700' }}>Remove</Text>
            </Pressable>
          </Row>
        ))}
        <Field label="Add a display name" value={newAlias} onChange={setNewAlias}
          placeholder="e.g. Shazia F"
          error={newAlias.trim() && aliasDup ? 'She already has that display name.' : undefined} />
        <Button label="+ Add display name" variant="secondary"
          disabled={!newAlias.trim() || aliasDup} onPress={addAlias} />
      </Card>

      <Card>
        <H2>Email addresses</H2>
        <Muted style={{ marginTop: 4, marginBottom: SPACE.md }}>
          Follow-up emails go to the primary address only. A member with no email is still
          counted in every report — she is only skipped when sending.
        </Muted>
        {emails.map(e => (
          <Row key={e.address} style={{ marginBottom: SPACE.sm }}>
            <View style={{ flex: 1 }}>
              <Body numberOfLines={1}>{e.address}</Body>
              {e.primary ? <Pill text="Primary" tone="success" /> : null}
            </View>
            {!e.primary && (
              <Pressable onPress={() => makePrimary(e.address)} accessibilityRole="button"
                style={{ minHeight: TAP_MIN, justifyContent: 'center', paddingHorizontal: SPACE.sm }}>
                <Text style={{ color: theme.accentInk, fontWeight: '700' }}>Make primary</Text>
              </Pressable>
            )}
            <Pressable onPress={() => setEmails(x => x.filter(y => y.address !== e.address))}
              accessibilityRole="button" accessibilityLabel={`Remove ${e.address}`}
              style={{ minHeight: TAP_MIN, justifyContent: 'center', paddingHorizontal: SPACE.sm }}>
              <Text style={{ color: theme.danger, fontWeight: '700' }}>Remove</Text>
            </Pressable>
          </Row>
        ))}
        <Field label="Add an email" value={newEmail} onChange={setNewEmail}
          placeholder="name@example.com"
          error={newEmail.length > 0 && !emailOk ? 'That does not look like an email address.' : undefined} />
        <Button label="+ Add email" variant="secondary" disabled={!emailOk} onPress={addEmail} />
      </Card>

      <Card>
        <Divider />
        <Muted>No phone number is collected. It was never used to match attendance.</Muted>
      </Card>

      <Button label={existing ? 'Save changes' : 'Add member'} disabled={!nameOk}
        onPress={() => router.back()} />
    </Screen>
  );
}
