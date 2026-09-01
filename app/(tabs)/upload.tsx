import { View } from 'react-native';
import { useState } from 'react';
import { Screen, Card, H1, H2, Body, Muted, Label, Button, Row, Pill, Divider } from '../../src/components/ui';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE, RADIUS } from '../../src/theme/tokens';
import { MATCH_ROWS, OUTCOME_META, CSV_COLUMNS, type MatchKind } from '../../src/data/mock';

const TONE: Record<MatchKind, 'success' | 'warning' | 'possible' | 'danger'> = {
  matched: 'success', noEmail: 'warning', possible: 'possible',
  ambiguous: 'danger', unmatched: 'danger',
};

/** The actions each outcome offers. Nothing is ever applied automatically. */
const ACTIONS: Record<MatchKind, string[]> = {
  matched:   ['Change the match'],
  noEmail:   ['Add email to existing member', 'Continue without email'],
  possible:  ['Use existing member', 'Add as new member', 'Keep unmatched'],
  ambiguous: ['Pick a member'],
  unmatched: ['Add as new member', 'Link to existing member', 'Skip this row'],
};

export default function Upload() {
  const { theme } = useTheme();
  const [decided, setDecided] = useState<Record<number, string>>({});

  const blocking = MATCH_ROWS.filter(r => OUTCOME_META[r.kind].blocks);
  const outstanding = blocking.filter(r => !decided[r.row]);
  // C-79: the import is blocked STRUCTURALLY until every blocking row is
  // resolved -- a disabled button, not a warning the operator can walk past.
  const canImport = outstanding.length === 0;

  return (
    <Screen>
      <H1>Review the file</H1>
      <Muted style={{ marginBottom: SPACE.lg }}>
        Fri 22 Aug 2026 · Prenatal Flow · Coimbatore · {MATCH_ROWS.length} rows
      </Muted>

      <Card>
        <Label>Columns read from the file</Label>
        <Row style={{ marginTop: SPACE.sm, flexWrap: 'wrap' }}>
          {CSV_COLUMNS.map(c => <Pill key={c} text={c} />)}
        </Row>
        {/* C-74/C-75: there is no email column in a Google Meet export, so
            every address comes from the matched member record instead */}
        <Muted style={{ marginTop: SPACE.md }}>
          A Google Meet export carries no email, course or branch. Addresses come from
          the matched member; course and branch come from the session you are importing.
        </Muted>
      </Card>

      {MATCH_ROWS.map(r => {
        const meta = OUTCOME_META[r.kind];
        const choice = decided[r.row];
        return (
          <Card key={r.row}>
            <Row>
              <Pill text={meta.tag} tone={TONE[r.kind]} />
              <View style={{ flex: 1 }} />
              <Muted>Row {r.row}</Muted>
            </Row>

            <H2 style={{ marginTop: SPACE.md }}>“{r.raw}”</H2>
            <Muted>{r.first_seen} · {r.minutes} min in call</Muted>

            {r.candidates.length > 0 && (
              <View style={{
                marginTop: SPACE.md, padding: SPACE.md, borderRadius: RADIUS.md,
                backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line, gap: SPACE.sm,
              }}>
                {r.candidates.map(c => (
                  <View key={c.member_id}>
                    <Body style={{ fontWeight: '800' }}>{c.name} · {c.code}</Body>
                    <Muted>{c.course} · {c.branch}{c.last_attended ? ` · last attended ${c.last_attended}` : ''}</Muted>
                    {c.aliases ? <Muted>Known display names: {c.aliases}</Muted> : null}
                  </View>
                ))}
              </View>
            )}

            <Body style={{ marginTop: SPACE.md }}>{meta.note}</Body>

            <Divider />
            <View style={{ gap: SPACE.sm }}>
              {ACTIONS[r.kind].map(a => (
                <Button key={a} label={a}
                  variant={choice === a ? 'primary' : 'secondary'}
                  onPress={() => setDecided(d => ({ ...d, [r.row]: a }))} />
              ))}
            </View>
            {choice ? <Muted style={{ marginTop: SPACE.sm }}>Chosen: {choice}. Applied when you import.</Muted> : null}
          </Card>
        );
      })}

      <Card>
        <H2>Import</H2>
        <Body style={{ marginTop: SPACE.sm }}>
          {canImport
            ? 'Every row has a decision. The whole file imports together.'
            : `${outstanding.length} of ${blocking.length} rows still need a decision. Nothing has been imported yet.`}
        </Body>
        <Button label={`Import ${MATCH_ROWS.length} rows`} disabled={!canImport}
          style={{ marginTop: SPACE.md }} onPress={() => {}} />
      </Card>
    </Screen>
  );
}
