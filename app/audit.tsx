import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Card, H1, H2, Body, Muted, Label, Pill, Row, Divider, Skeleton, EmptyState, ErrorState } from '../src/components/ui';
import { useTheme } from '../src/theme/ThemeProvider';
import { SPACE, RADIUS } from '../src/theme/tokens';
import { useAudit } from '../src/data/hooks';

/** C-94/C-96. WHO · WHAT · WHEN · PREVIOUS · CURRENT, and nothing is editable. */
export default function Audit() {
  const { theme } = useTheme();
  const { state: forced } = useLocalSearchParams<{ state?: string }>();
  const { state, data, error, retry } = useAudit(forced);
  const entries = data ?? [];

  return (
    <Screen>
      <H1>Audit log</H1>
      <Muted style={{ marginBottom: SPACE.lg }}>
        Every change to a member, course, rule, schedule, holiday or account. Append-only —
        entries cannot be edited or deleted by anyone, including the system.
      </Muted>

      {state === 'loading' && <Skeleton lines={4} />}

      {state === 'error' && (
        <ErrorState onRetry={retry}
          message={error ?? 'The audit log could not be loaded. Nothing has been changed.'} />
      )}

      {state === 'ready' && entries.length === 0 && (
        <EmptyState
          title="Nothing recorded yet"
          body="Every change writes an entry here as soon as it happens. An empty log means nothing has changed yet, not that anything is missing." />
      )}

      {state === 'ready' && entries.map(a => (
        <Card key={a.id}>
          <Row>
            <Pill text={a.action} />
            <View style={{ flex: 1 }} />
            <Muted>{a.when}</Muted>
          </Row>

          <View style={{ marginTop: SPACE.md }}>
            <Label>Changed by</Label>
            <Body style={{ fontWeight: '700' }}>{a.who}</Body>
          </View>

          <View style={{ marginTop: SPACE.md }}>
            <Label>{a.entity}</Label>
            <Body style={{ fontWeight: '700' }}>{a.subject}</Body>
          </View>

          <Divider />

          {a.changes.map(c => (
            <View key={c.field} style={{ marginBottom: SPACE.md }}>
              <Label>{c.field}</Label>
              <Row style={{ marginTop: 4, alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Muted>Previous</Muted>
                  <Body style={{ color: theme.muted, textDecorationLine: c.old ? 'line-through' : 'none' }}>
                    {c.old ?? '—'}
                  </Body>
                </View>
                <View style={{ flex: 1 }}>
                  <Muted>Current</Muted>
                  <Body style={{ fontWeight: '700' }}>{c.new ?? '—'}</Body>
                </View>
              </Row>
            </View>
          ))}
        </Card>
      ))}

      <Card>
        <H2>What is never recorded</H2>
        <Body style={{ marginTop: SPACE.sm }}>
          PINs, security answers, passwords and provider keys never reach this log — not in
          readable form and not hashed. That is enforced when the entry is written, not by
          remembering to leave them out.
        </Body>
      </Card>
    </Screen>
  );
}
