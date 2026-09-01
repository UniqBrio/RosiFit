import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, H1, H2, Body, Muted, Label, Button, Pill, Row, Divider } from '../src/components/ui';
import { useTheme } from '../src/theme/ThemeProvider';
import { SPACE } from '../src/theme/tokens';
import { COURSE_LIST, DAY_NAMES, COURSE_RULES, GLOBAL_RULE, ruleSentence } from '../src/data/mock';

export default function Courses() {
  const { theme } = useTheme();
  const router = useRouter();
  return (
    <Screen>
      <H1>Courses</H1>
      <Muted style={{ marginBottom: SPACE.lg }}>{COURSE_LIST.length} courses</Muted>

      {COURSE_LIST.map(c => {
        const rule = COURSE_RULES[c.id] ?? GLOBAL_RULE;
        return (
          <Card key={c.id}>
            <Row>
              <View style={{ flex: 1 }}>
                <H2>{c.name}</H2>
                <Muted>
                  {c.start_time && c.end_time ? `${c.start_time}–${c.end_time} · ` : ''}
                  states {c.frequency ?? '—'} sessions a week
                </Muted>
              </View>
              <Button label="Edit" variant="secondary"
                onPress={() => router.push({ pathname: '/course/edit', params: { id: c.id } })} />
            </Row>

            <Divider />
            <Label>Where it runs</Label>
            {c.offerings.map(o => {
              // CR-07: the schedule is what counts. When it disagrees with the
              // course's stated frequency we show BOTH and never reconcile.
              const mismatch = c.frequency !== null && o.weekdays.length !== c.frequency;
              return (
                <View key={o.branch} style={{ marginTop: SPACE.sm }}>
                  <Row>
                    <Body style={{ flex: 1, fontWeight: '700' }}>{o.branch}</Body>
                    <Muted>{o.weekdays.map(d => DAY_NAMES[d]).join(' ')}</Muted>
                  </Row>
                  {mismatch && (
                    <Body style={{ color: theme.warning, fontSize: 13, marginTop: 4 }}>
                      This course is set up for {c.frequency} sessions a week. This offering runs{' '}
                      {o.weekdays.length} days. Attendance is counted from the {o.weekdays.length} days.
                    </Body>
                  )}
                </View>
              );
            })}

            <Divider />
            <Row>
              <View style={{ flex: 1 }}>
                <Label>Follow-up rule</Label>
                <Muted style={{ marginTop: 4 }}>
                  {rule.source === 'course' ? 'Set for this course' : 'Using the academy default'}
                </Muted>
              </View>
              <Button label="Rules" variant="secondary"
                onPress={() => router.push({ pathname: '/course/rules', params: { id: c.id } })} />
            </Row>
            <Body style={{ marginTop: SPACE.sm, fontSize: 13 }}>{ruleSentence(rule, c.name)}</Body>
          </Card>
        );
      })}

      <Button label="+ Add course" onPress={() => router.push('/course/edit')} />
    </Screen>
  );
}
