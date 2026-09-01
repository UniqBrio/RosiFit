import { useState } from 'react';
import { View } from 'react-native';
import { Screen, Card, H1, H2, Body, Muted, Label, Button, Pill, Row, Divider } from '../src/components/ui';
import { Field, Choice } from '../src/components/Field';
import { useTheme } from '../src/theme/ThemeProvider';
import { SPACE, RADIUS } from '../src/theme/tokens';
import { STAFF, ROLE_LABELS } from '../src/data/mock';

/**
 * Adding a person and giving them a login are TWO steps, on purpose. A record
 * exists first; access is granted deliberately afterwards.
 */
export default function Staff() {
  const { theme } = useTheme();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState(ROLE_LABELS[1]);
  const [issued, setIssued] = useState<{ who: string; pin: string } | null>(null);

  const phoneOk = phone.replace(/\D/g, '').length === 10;
  const ok = name.trim().length >= 2 && phoneOk;

  return (
    <Screen>
      <H1>Staff</H1>
      <Muted style={{ marginBottom: SPACE.lg }}>
        {STAFF.length} people · {STAFF.filter(s => !s.has_login).length} still need access
      </Muted>

      {issued && (
        <Card style={{ borderColor: theme.success, borderWidth: 2 }}>
          <H2>Temporary PIN for {issued.who}</H2>
          <Body style={{ fontSize: 34, fontWeight: '800', letterSpacing: 6,
            color: theme.fgStrong, marginTop: SPACE.sm }}>{issued.pin}</Body>
          {/* shown once, never stored in readable form, never in the audit log */}
          <Muted style={{ marginTop: SPACE.sm }}>
            Read it out now — it is shown once and cannot be retrieved. They choose their own PIN
            the first time they sign in.
          </Muted>
          <Button label="Done" variant="secondary" style={{ marginTop: SPACE.md }}
            onPress={() => setIssued(null)} />
        </Card>
      )}

      {STAFF.map(s => (
        <Card key={s.id}>
          <Row>
            <View style={{ flex: 1 }}>
              <H2>{s.name}</H2>
              <Muted>{s.role} · {s.phone}</Muted>
            </View>
            <Pill text={s.has_login ? 'Has access' : 'Not enabled'}
              tone={s.has_login ? 'success' : 'warning'} />
          </Row>
          {s.last_login ? <Muted style={{ marginTop: SPACE.sm }}>Last signed in {s.last_login}</Muted> : null}
          <Row style={{ marginTop: SPACE.md, gap: SPACE.sm }}>
            {s.has_login
              ? <Button label="Reset PIN" variant="secondary" style={{ flex: 1 }}
                  onPress={() => setIssued({ who: s.name, pin: '4827' })} />
              : <Button label="Generate login PIN" style={{ flex: 1 }}
                  onPress={() => setIssued({ who: s.name, pin: '4827' })} />}
            <Button label="Edit" variant="secondary" style={{ flex: 1 }} onPress={() => {}} />
          </Row>
        </Card>
      ))}

      {adding ? (
        <Card>
          <H2>Add a person</H2>
          <View style={{ marginTop: SPACE.md }}>
            <Field label="Name" value={name} onChange={setName} placeholder="Full name" />
            <Field label="Mobile number" value={phone} onChange={setPhone} prefix="+91"
              keyboardType="number-pad" placeholder="00000 00000"
              hint="This becomes their sign-in number."
              error={phone.length > 0 && !phoneOk ? 'Enter a 10-digit mobile number.' : undefined} />
            <Choice label="Role label" options={ROLE_LABELS} value={role} onChange={setRole} />
            <Muted>A label only — every staff member has the same access in this version.</Muted>
          </View>
          <Row style={{ marginTop: SPACE.md, gap: SPACE.sm }}>
            <Button label="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setAdding(false)} />
            <Button label="Add person" disabled={!ok} style={{ flex: 2 }}
              onPress={() => { setAdding(false); setName(''); setPhone(''); }} />
          </Row>
          <Muted style={{ marginTop: SPACE.sm }}>
            They are saved without app access. Generate a login PIN when you are ready.
          </Muted>
        </Card>
      ) : (
        <Button label="+ Add staff" onPress={() => setAdding(true)} />
      )}
    </Screen>
  );
}
