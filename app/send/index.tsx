import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, H1, H2, Body, Muted, Button, Pill, Row } from '../../src/components/ui';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE } from '../../src/theme/tokens';
import { TEMPLATES, CANDIDATES, WEEK } from '../../src/data/mock';

/**
 * C-68/C-69, step 1 of 3: CHOOSE A TEMPLATE.
 *
 * There is no free-form composing anywhere in this flow. A staff member picks
 * a stored template; the wording is fixed and only the member's own figures
 * change. That is the whole reason arbitrary text cannot reach a member.
 */
export default function ChooseTemplate() {
  const { theme } = useTheme();
  const router = useRouter();
  const [chosen, setChosen] = useState<string | null>(null);
  const sendable = CANDIDATES.filter(c => c.has_email);
  const active = TEMPLATES.filter(t => t.active);
  const inactive = TEMPLATES.filter(t => !t.active);

  return (
    <Screen>
      <H1>Choose a template</H1>
      <Muted style={{ marginBottom: SPACE.lg }}>
        {sendable.length} members selected · {WEEK.label}
      </Muted>

      {active.map(t => {
        const on = chosen === t.id;
        return (
          <Card key={t.id} style={on ? { borderColor: theme.accent, borderWidth: 2 } : undefined}>
            <Row>
              <View style={{ flex: 1 }}>
                <H2>{t.name}</H2>
                <Muted numberOfLines={2} style={{ marginTop: 4 }}>{t.subject}</Muted>
              </View>
              <Button label={on ? 'Chosen' : 'Choose'} variant={on ? 'primary' : 'secondary'}
                onPress={() => setChosen(t.id)} />
            </Row>
          </Card>
        );
      })}

      {inactive.length > 0 && (
        <Card>
          <H2>Switched off</H2>
          <Muted style={{ marginTop: 4 }}>
            Not offered here while inactive. Turn one back on in Settings → Message templates.
          </Muted>
          <Row style={{ marginTop: SPACE.sm, flexWrap: 'wrap' }}>
            {inactive.map(t => <Pill key={t.id} text={t.name} />)}
          </Row>
        </Card>
      )}

      <Button label="Review the message" disabled={!chosen}
        onPress={() => router.push({ pathname: '/send/review', params: { id: chosen! } })} />
      <Muted style={{ textAlign: 'center', marginTop: SPACE.sm }}>
        You will see the finished message, with each member's real figures, before anything sends.
      </Muted>
    </Screen>
  );
}
