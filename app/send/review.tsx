import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, Card, H1, H2, Body, Muted, Label, Button, Pill, Row, Divider } from '../../src/components/ui';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE, RADIUS } from '../../src/theme/tokens';
import { TEMPLATES, CANDIDATES, WEEK, renderTemplate } from '../../src/data/mock';

/** Step 2 of 3: review the GENERATED message. Nothing here is editable. */
export default function ReviewSend() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tpl = TEMPLATES.find(t => t.id === id) ?? TEMPLATES[0];
  const sendable = CANDIDATES.filter(c => c.has_email);
  const excluded = CANDIDATES.filter(c => !c.has_email);
  const [who, setWho] = useState(0);
  const person = sendable[who];

  return (
    <Screen>
      <H1>Review &amp; send</H1>
      <Muted style={{ marginBottom: SPACE.lg }}>{tpl.name} · {WEEK.label}</Muted>

      <Card>
        <Row style={{ flexWrap: 'wrap' }}>
          {sendable.map((c, i) => (
            <Pill key={c.member_id} text={c.full_name.split(' ')[0]} tone={i === who ? 'success' : 'neutral'} />
          ))}
        </Row>
        <Row style={{ marginTop: SPACE.md, gap: SPACE.md }}>
          <Button label="Previous" variant="secondary" disabled={who === 0}
            onPress={() => setWho(w => w - 1)} style={{ flex: 1 }} />
          <Button label="Next" variant="secondary" disabled={who >= sendable.length - 1}
            onPress={() => setWho(w => w + 1)} style={{ flex: 1 }} />
        </Row>
        <Muted style={{ marginTop: SPACE.sm, textAlign: 'center' }}>
          Showing {who + 1} of {sendable.length}
        </Muted>
      </Card>

      <Card>
        <Label>To</Label>
        <Body style={{ fontWeight: '800' }}>{person.full_name}</Body>
        <Muted>{person.course_name} · {person.branch_name}</Muted>

        <Divider />
        <Label>Subject</Label>
        {/* read-only on purpose -- this is the C-68 line in the sand */}
        <Body style={{ fontWeight: '700', marginTop: 4 }}>{renderTemplate(tpl.subject, person)}</Body>

        <Divider />
        <Label>Message</Label>
        <View style={{ backgroundColor: theme.surface2, borderRadius: RADIUS.md,
          borderWidth: 1, borderColor: theme.line, padding: SPACE.md, marginTop: SPACE.sm }}>
          <Body>{renderTemplate(tpl.body, person)}</Body>
        </View>

        <Muted style={{ marginTop: SPACE.md }}>
          The wording is fixed. Only her own figures change, and they come from the attendance
          engine — never a placeholder. To change the wording, edit the template in Settings.
        </Muted>
      </Card>

      {excluded.length > 0 && (
        <Card>
          <H2>Not included</H2>
          {excluded.map(c => (
            <Row key={c.member_id} style={{ marginTop: SPACE.sm }}>
              <Body style={{ flex: 1 }}>{c.full_name}</Body>
              <Pill text="No email on file" tone="warning" />
            </Row>
          ))}
          <Muted style={{ marginTop: SPACE.sm }}>
            They stay in every attendance figure. Only the send skips them.
          </Muted>
        </Card>
      )}

      <Button label={`Send to ${sendable.length} members`}
        onPress={() => router.push('/send/result')} />
    </Screen>
  );
}
