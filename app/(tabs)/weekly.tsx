import { View } from 'react-native';
import { useState } from 'react';
import { Screen, Card, H1, H2, Body, Muted, Button, Row, Pill, Divider } from '../../src/components/ui';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE } from '../../src/theme/tokens';
import { CANDIDATES, WEEK } from '../../src/data/mock';

export default function Weekly() {
  const { theme } = useTheme();
  const [picked, setPicked] = useState<string[]>(CANDIDATES.filter(c => c.has_email).map(c => c.member_id));
  const sendable = CANDIDATES.filter(c => c.has_email);
  const excluded = CANDIDATES.filter(c => !c.has_email);
  const toggle = (id: string) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  return (
    <Screen>
      <H1>Follow-up</H1>
      <Muted style={{ marginBottom: SPACE.lg }}>{WEEK.label} · {CANDIDATES.length} members listed</Muted>

      {CANDIDATES.map(c => {
        const on = picked.includes(c.member_id);
        return (
          <Card key={c.member_id}>
            <Row>
              <View style={{ flex: 1 }}>
                <H2>{c.full_name}</H2>
                <Muted>{c.course_name} · {c.branch_name}</Muted>
              </View>
              {c.has_email
                ? <Button label={on ? 'Selected' : 'Select'} variant={on ? 'primary' : 'secondary'}
                    onPress={() => toggle(c.member_id)} />
                : <Pill text="No email" tone="warning" />}
            </Row>

            <Divider />

            {/* the reason names the condition that fired, with this member's
                real figures -- not the rule in the abstract */}
            <Row>
              <Pill text={c.reason} tone="danger" />
            </Row>
            <Muted style={{ marginTop: SPACE.sm }}>
              Rule: {c.config_source === 'course'
                ? `set for ${c.course_name}`
                : 'the academy default'}
            </Muted>

            <Row style={{ marginTop: SPACE.md, gap: SPACE.xl }}>
              <View><Muted>Expected</Muted><Body style={{ fontWeight: '800' }}>{c.expected}</Body></View>
              <View><Muted>Attended</Muted><Body style={{ fontWeight: '800' }}>{c.attended}</Body></View>
              <View><Muted>Missed</Muted><Body style={{ fontWeight: '800', color: theme.danger }}>{c.missed}</Body></View>
              <View><Muted>Streak</Muted><Body style={{ fontWeight: '800' }}>{c.current_streak}</Body></View>
            </Row>

            {!c.has_email && (
              <Body style={{ marginTop: SPACE.md, color: theme.warning }}>
                Counted in every report. Excluded from sending until an address is added.
              </Body>
            )}
          </Card>
        );
      })}

      {excluded.length > 0 && (
        <Card>
          <H2>Excluded from this send</H2>
          <Muted style={{ marginTop: 4 }}>
            {excluded.length} of {CANDIDATES.length} listed members have no email on file.
            They stay in the attendance figures above.
          </Muted>
        </Card>
      )}

      <Button
        label={`Choose a template · ${picked.length} selected`}
        disabled={picked.length === 0}
        onPress={() => {}}
      />
      <Muted style={{ marginTop: SPACE.sm, textAlign: 'center' }}>
        Messages come from a stored template. There is no free-form composing.
      </Muted>
    </Screen>
  );
}
