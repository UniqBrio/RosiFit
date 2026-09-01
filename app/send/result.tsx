import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, H1, H2, Body, Muted, Button, Pill, Row, Stat } from '../../src/components/ui';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE } from '../../src/theme/tokens';
import { CANDIDATES, WEEK } from '../../src/data/mock';

/** Step 3 of 3. Partial failure is a first-class outcome, not an error page. */
export default function SendResult() {
  const { theme } = useTheme();
  const router = useRouter();
  const sendable = CANDIDATES.filter(c => c.has_email);
  const failed = sendable.slice(-1);          // one bounce, to show the state
  const sent = sendable.slice(0, -1);

  return (
    <Screen>
      <H1>Send result</H1>
      <Muted style={{ marginBottom: SPACE.lg }}>{WEEK.label} · just now</Muted>

      <Card>
        <Row style={{ gap: SPACE.lg }}>
          <Stat value={sent.length} label="Sent" tone="success" />
          <Stat value={failed.length} label="Failed" tone="danger" />
          <Stat value={CANDIDATES.length - sendable.length} label="Excluded" tone="warning" />
        </Row>
      </Card>

      {sent.map(c => (
        <Card key={c.member_id}>
          <Row>
            <Body style={{ flex: 1, fontWeight: '700' }}>{c.full_name}</Body>
            <Pill text="Sent" tone="success" />
          </Row>
        </Card>
      ))}

      {failed.map(c => (
        <Card key={c.member_id}>
          <Row>
            <Body style={{ flex: 1, fontWeight: '700' }}>{c.full_name}</Body>
            <Pill text="Failed" tone="danger" />
          </Row>
          <Muted style={{ marginTop: SPACE.sm }}>
            The address was rejected by the mail provider. Nothing else in this batch was affected.
          </Muted>
          {/* retry-only-failed: re-sending the whole batch would double-mail
              everyone who already received it */}
          <Button label="Retry only the failed one" variant="secondary"
            style={{ marginTop: SPACE.md }} onPress={() => {}} />
        </Card>
      ))}

      <Button label="Back to home" onPress={() => router.replace('/(tabs)')} />
    </Screen>
  );
}
