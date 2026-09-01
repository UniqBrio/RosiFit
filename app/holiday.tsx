import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, H1, H2, Body, Muted, Button, Pill, Row, Divider } from '../src/components/ui';
import { Field, Choice } from '../src/components/Field';
import { useTheme } from '../src/theme/ThemeProvider';
import { SPACE } from '../src/theme/tokens';
import { BRANCHES } from '../src/data/mock';

/** C-90/C-91/C-92. A range with a scope, and the impact shown BEFORE saving. */
export default function Holiday() {
  const { theme } = useTheme();
  const router = useRouter();
  const [name, setName] = useState('');
  const [from, setFrom] = useState('2026-10-20');
  const [to, setTo] = useState('2026-10-22');
  const [scope, setScope] = useState('All branches');

  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const fromBad = from.length > 0 && !dateRe.test(from);
  const toBad = to.length > 0 && !dateRe.test(to);
  const orderBad = !fromBad && !toBad && from && to && to < from;
  const ok = name.trim().length >= 2 && dateRe.test(from) && dateRe.test(to) && !orderBad;

  // the same query the apply runs, so the preview cannot disagree with it
  const affected = ok
    ? [{ course: 'Prenatal Fitness', branch: 'Coimbatore', n: 6 },
       { course: 'Prenatal Yoga', branch: 'Salem', n: 4 },
       { course: 'Postnatal Recovery', branch: 'Erode', n: 2 }]
      .filter(r => scope === 'All branches' || r.branch === scope)
    : [];
  const total = affected.reduce((n, r) => n + r.n, 0);

  return (
    <Screen>
      <H1>Add holiday</H1>
      <Muted style={{ marginBottom: SPACE.lg }}>
        A festival is often decided at short notice, so this is one tap from Home.
      </Muted>

      <Card>
        <Field label="Name or reason" value={name} onChange={setName} placeholder="e.g. Diwali"
          error={name.length > 0 && name.trim().length < 2 ? 'Enter at least 2 characters.' : undefined} />
        <Field label="Start date" value={from} onChange={setFrom} placeholder="YYYY-MM-DD"
          error={fromBad ? 'Use YYYY-MM-DD.' : undefined} />
        <Field label="End date" value={to} onChange={setTo} placeholder="YYYY-MM-DD"
          error={toBad ? 'Use YYYY-MM-DD.' : orderBad ? 'The end date must be on or after the start date.' : undefined} />
        <Choice label="Scope" options={BRANCHES} value={scope} onChange={setScope} />
      </Card>

      {ok && (
        <Card style={{ borderColor: theme.warning, borderWidth: 2 }}>
          <H2>Before you apply</H2>
          <Body style={{ marginTop: SPACE.sm, fontWeight: '700' }}>
            {total} scheduled sessions will be marked as Holiday.
          </Body>
          {affected.map(r => (
            <Row key={r.course + r.branch} style={{ marginTop: SPACE.sm }}>
              <Body style={{ flex: 1 }}>{r.course} · {r.branch}</Body>
              <Body style={{ fontWeight: '800' }}>{r.n}</Body>
            </Row>
          ))}
          <Divider />
          <Muted>✓ No completed session is affected.</Muted>
          <Muted>✓ No member's schedule is changed. This applies to these dates only.</Muted>
          <Muted>✓ Nothing counts as expected or missed, and no streak moves.</Muted>
        </Card>
      )}

      <Row style={{ gap: SPACE.md }}>
        <Button label="Cancel" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} />
        <Button label="Apply holiday" disabled={!ok} onPress={() => router.back()} style={{ flex: 2 }} />
      </Row>
    </Screen>
  );
}
