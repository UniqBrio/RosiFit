import { useState } from 'react';
import { View } from 'react-native';
import { Screen, Card, H1, H2, Body, Muted, Label, Button, Pill, Row, Divider } from '../src/components/ui';
import { Field } from '../src/components/Field';
import { useTheme } from '../src/theme/ThemeProvider';
import { SPACE, RADIUS } from '../src/theme/tokens';
import { TEMPLATES, TOKENS, CANDIDATES, renderTemplate } from '../src/data/mock';

/** C-68/C-37. Templates are managed here, deliberately -- editing wording is a
 *  considered act, not something done in passing while sending. */
export default function Templates() {
  const { theme } = useTheme();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [subject, setSubject] = useState('');
  const sample = CANDIDATES[0];

  const unknown = (s: string) =>
    (s.match(/\{\{(\w+)\}\}/g) ?? []).filter(t => !TOKENS.includes(t));
  const bad = [...unknown(subject), ...unknown(draft)];

  const open = (id: string) => {
    const t = TEMPLATES.find(x => x.id === id)!;
    setEditing(id); setSubject(t.subject); setDraft(t.body);
  };

  return (
    <Screen>
      <H1>Message templates</H1>
      <Muted style={{ marginBottom: SPACE.lg }}>
        Every message the app can send comes from one of these. There is no free-form composing.
      </Muted>

      {TEMPLATES.map(t => (
        <Card key={t.id}>
          <Row>
            <View style={{ flex: 1 }}>
              <H2>{t.name}</H2>
              <Muted numberOfLines={1} style={{ marginTop: 4 }}>{t.subject}</Muted>
            </View>
            <Pill text={t.active ? 'Active' : 'Off'} tone={t.active ? 'success' : 'neutral'} />
          </Row>
          <Row style={{ marginTop: SPACE.md, gap: SPACE.sm }}>
            <Button label={editing === t.id ? 'Close' : 'Edit'} variant="secondary"
              onPress={() => (editing === t.id ? setEditing(null) : open(t.id))} style={{ flex: 1 }} />
            <Button label={t.active ? 'Switch off' : 'Switch on'} variant="secondary"
              onPress={() => {}} style={{ flex: 1 }} />
          </Row>

          {editing === t.id && (
            <View style={{ marginTop: SPACE.md }}>
              <Divider />
              <Field label="Subject" value={subject} onChange={setSubject} />
              <Field label="Message" value={draft} onChange={setDraft} multiline />

              <Label>Values you may use</Label>
              <Row style={{ flexWrap: 'wrap', marginTop: SPACE.sm }}>
                {TOKENS.map(tok => <Pill key={tok} text={tok} />)}
              </Row>

              {bad.length > 0 && (
                <Body accessibilityLiveRegion="polite" style={{ color: theme.danger, marginTop: SPACE.md }}>
                  {bad.join(', ')} {bad.length === 1 ? 'is not a value' : 'are not values'} this app can fill.
                  Remove it, or use one from the list above.
                </Body>
              )}

              <Label style={{ marginTop: SPACE.md }}>Preview · {sample.full_name}'s real figures</Label>
              <View style={{ backgroundColor: theme.surface2, borderRadius: RADIUS.md, borderWidth: 1,
                borderColor: theme.line, padding: SPACE.md, marginTop: SPACE.sm }}>
                <Body style={{ fontWeight: '700' }}>{renderTemplate(subject, sample)}</Body>
                <Divider />
                <Body>{renderTemplate(draft, sample)}</Body>
              </View>

              <Button label="Save template" disabled={bad.length > 0}
                style={{ marginTop: SPACE.md }} onPress={() => setEditing(null)} />
              <Muted style={{ marginTop: SPACE.sm }}>Editing a template is recorded in the audit log.</Muted>
            </View>
          )}
        </Card>
      ))}

      <Button label="+ Add template" onPress={() => {}} />
    </Screen>
  );
}
