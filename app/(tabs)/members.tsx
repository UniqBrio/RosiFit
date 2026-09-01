import { View, TextInput } from 'react-native';
import { useState } from 'react';
import { Screen, Card, H1, H2, Body, Muted, Label, Row, Pill, Button, Divider } from '../../src/components/ui';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE, RADIUS, TAP_MIN } from '../../src/theme/tokens';
import { MEMBERS } from '../../src/data/mock';
import { useRouter } from 'expo-router';

export default function Members() {
  const { theme } = useTheme();
  const router = useRouter();
  const [q, setQ] = useState('');
  const list = MEMBERS.filter(m =>
    m.name.toLowerCase().includes(q.toLowerCase()) ||
    m.aliases.some(a => a.toLowerCase().includes(q.toLowerCase())));

  return (
    <Screen>
      <H1>Members</H1>
      <Muted style={{ marginBottom: SPACE.md }}>{MEMBERS.length} members</Muted>

      <TextInput
        value={q} onChangeText={setQ}
        placeholder="Search by name or display name"
        placeholderTextColor={theme.muted}
        accessibilityLabel="Search members"
        style={{
          minHeight: TAP_MIN + 6, borderRadius: RADIUS.md, borderWidth: 1,
          borderColor: theme.lineStrong, backgroundColor: theme.surface,
          paddingHorizontal: SPACE.lg, color: theme.fgStrong, fontSize: 15,
          marginBottom: SPACE.md,
        }} />

      {list.map(m => (
        <Card key={m.id}>
          <Row>
            <View style={{ flex: 1 }}>
              <H2>{m.name}</H2>
              <Muted>{m.code} · {m.course} · {m.branch}</Muted>
            </View>
            {m.emails.length === 0 ? <Pill text="No email" tone="warning" /> : null}
            <Button label="Open" variant="secondary"
              onPress={() => router.push({ pathname: '/member/[id]', params: { id: m.id } })} />
          </Row>

          <Divider />

          {/* C-71/C-72: display names live on the member, edited here, not
              discovered one blocked import row at a time */}
          <Label>Google Meet display names</Label>
          <Row style={{ flexWrap: 'wrap', marginTop: SPACE.sm }}>
            {m.aliases.length
              ? m.aliases.map(a => <Pill key={a} text={a} />)
              : <Muted>None yet. Add one and the attendance file will match it automatically.</Muted>}
          </Row>

          <Label style={{ marginTop: SPACE.md }}>Email addresses</Label>
          {m.emails.length ? m.emails.map(e => (
            <Row key={e.address} style={{ marginTop: SPACE.sm }}>
              <Body style={{ flex: 1 }} numberOfLines={1}>{e.address}</Body>
              {e.primary ? <Pill text="Primary" tone="success" /> : null}
            </Row>
          )) : (
            <Muted style={{ marginTop: SPACE.sm }}>
              None. She is counted in every report and excluded from sends.
            </Muted>
          )}

          <Row style={{ marginTop: SPACE.md, gap: SPACE.xl }}>
            <View><Muted>Expected</Muted><Body style={{ fontWeight: '800' }}>{m.expected}</Body></View>
            <View><Muted>Attended</Muted><Body style={{ fontWeight: '800' }}>{m.attended}</Body></View>
            <View><Muted>Missed</Muted><Body style={{ fontWeight: '800', color: theme.danger }}>{m.missed}</Body></View>
            <View><Muted>Streak</Muted><Body style={{ fontWeight: '800' }}>{m.streak}</Body></View>
          </Row>
        </Card>
      ))}

      {list.length === 0 && (
        <Card><Body>No member matches “{q}”.</Body></Card>
      )}

      <Button label="+ Add member" onPress={() => router.push('/member/edit')} />
    </Screen>
  );
}
