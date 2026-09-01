import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Card, H1, H2, Body, Muted, Label, Button, Pill, Row, Stat, Divider } from '../../src/components/ui';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE } from '../../src/theme/tokens';
import { MEMBERS, WEEK } from '../../src/data/mock';
import { Donut } from '../../src/components/Donut';

export default function MemberDetail() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const m = MEMBERS.find(x => x.id === id) ?? MEMBERS[0];
  const pct = m.expected ? Math.round((m.attended / m.expected) * 1000) / 10 : null;

  return (
    <Screen>
      <H1>{m.name}</H1>
      <Muted style={{ marginBottom: SPACE.lg }}>{m.code} · {m.course} · {m.branch}</Muted>

      <Card>
        <H2>Attendance</H2>
        <Muted style={{ marginBottom: SPACE.md }}>{WEEK.label}</Muted>
        <Donut attended={m.attended} missed={m.missed} notExpected={0} />
        <Row style={{ marginTop: SPACE.lg, gap: SPACE.lg, flexWrap: 'wrap' }}>
          <Stat value={m.expected} label="Expected" period={WEEK.label} />
          <Stat value={m.attended} label="Attended" tone="success" />
          <Stat value={m.missed} label="Missed" tone="danger" />
          <Stat value={pct === null ? '—' : `${pct}%`} label="Attendance" />
          <Stat value={m.streak} label="Consecutive missed" tone={m.streak >= 3 ? 'danger' : 'neutral'} />
        </Row>
      </Card>

      <Card>
        <H2>Google Meet display names</H2>
        <Muted style={{ marginTop: 4 }}>
          These are the names that may appear in the attendance file. Adding one here means
          the file matches it to this member automatically.
        </Muted>
        <Row style={{ flexWrap: 'wrap', marginTop: SPACE.md }}>
          {m.aliases.length
            ? m.aliases.map(a => <Pill key={a} text={a} />)
            : <Muted>None yet.</Muted>}
          <Pill text={`${m.name} · canonical`} tone="success" />
        </Row>
      </Card>

      <Card>
        <H2>Email addresses</H2>
        {m.emails.length ? m.emails.map(e => (
          <Row key={e.address} style={{ marginTop: SPACE.sm }}>
            <Body style={{ flex: 1 }} numberOfLines={1}>{e.address}</Body>
            {e.primary ? <Pill text="Primary" tone="success" /> : <Pill text="Additional" />}
          </Row>
        )) : (
          <>
            <Muted style={{ marginTop: SPACE.sm }}>
              None on file. She is counted in every attendance figure and excluded from sends
              until an address is added.
            </Muted>
          </>
        )}
        <Muted style={{ marginTop: SPACE.md }}>Follow-up emails go to the primary address only.</Muted>
      </Card>

      <Button label="Edit member" onPress={() => router.push({ pathname: '/member/edit', params: { id: m.id } })} />
    </Screen>
  );
}
