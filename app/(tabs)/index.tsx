import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Screen, Card, H1, H2, Body, Muted, Label, Button, Row, Pill, Stat, Divider } from '../../src/components/ui';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE } from '../../src/theme/tokens';
import { CANDIDATES, MATCH_ROWS, WEEK, BRANCHES, COURSES, OUTCOME_META } from '../../src/data/mock';
import { FilterBar } from '../../src/components/FilterBar';
import { Donut } from '../../src/components/Donut';

export default function Home() {
  const { theme } = useTheme();
  const router = useRouter();
  const [branch, setBranch] = useState(BRANCHES[0]);
  const [course, setCourse] = useState(COURSES[0]);

  const blocked = MATCH_ROWS.filter(r => OUTCOME_META[r.kind].blocks).length;
  const noEmail = CANDIDATES.filter(c => !c.has_email).length;

  // one period, stated once and repeated on every tile that depends on it
  const period = WEEK.label;
  const expected = CANDIDATES.reduce((n, c) => n + c.expected, 0);
  const attended = CANDIDATES.reduce((n, c) => n + c.attended, 0);
  const missed   = CANDIDATES.reduce((n, c) => n + c.missed, 0);

  return (
    <Screen>
      <H1>Good morning</H1>
      {/* C-86: the scope is named, so an academy-wide number can never be read
          as a branch number */}
      <Muted style={{ marginBottom: SPACE.lg }}>
        {branch === 'All branches' ? 'Academy-wide attendance' : `${branch} branch attendance`} · {period}
      </Muted>

      <FilterBar
        branch={branch} onBranch={setBranch}
        course={course} onCourse={setCourse}
        period={period}
      />

      <Card>
        <H2>Needs attention</H2>
        <View style={{ gap: SPACE.md, marginTop: SPACE.md }}>
          {blocked > 0 && (
            <Row>
              <Pill text="Blocked" tone="warning" />
              <Body style={{ flex: 1 }}>
                {blocked} rows in the last upload need a decision before it can import.
              </Body>
            </Row>
          )}
          <Row>
            <Pill text={`${CANDIDATES.length}`} tone="danger" />
            <Body style={{ flex: 1 }}>members are due follow-up this week.</Body>
          </Row>
          {noEmail > 0 && (
            <Row>
              <Pill text={`${noEmail}`} tone="warning" />
              <Body style={{ flex: 1 }}>
                have no email on file — counted in reports, excluded from sends.
              </Body>
            </Row>
          )}
        </View>
        <Divider />
        <Row style={{ gap: SPACE.md }}>
          <Button label="Review the week" onPress={() => router.push('/(tabs)/weekly')} style={{ flex: 1 }} />
          <Button label="Add holiday" variant="secondary" onPress={() => router.push('/holiday')} style={{ flex: 1 }} />
        </Row>
      </Card>

      <Card>
        <H2>Attendance</H2>
        <Muted style={{ marginBottom: SPACE.md }}>{period}</Muted>
        {/* the donut reads the same numbers as the report -- there is no
            separate calculation anywhere (C-87) */}
        <Donut attended={attended} missed={missed} notExpected={0} />
        <Row style={{ marginTop: SPACE.lg, gap: SPACE.lg }}>
          <Stat value={expected} label="Expected" period={period} />
          <Stat value={attended} label="Attended" period={period} tone="success" />
          <Stat value={missed}   label="Missed"   period={period} tone="danger" />
        </Row>
      </Card>

      <Card>
        <H2>Recent upload</H2>
        <Muted style={{ marginTop: 4 }}>Fri 22 Aug · Prenatal Flow · 5 rows</Muted>
        <Body style={{ marginTop: SPACE.md }}>
          Nothing has been imported yet. {blocked} rows need a decision — one possible
          existing member, one ambiguous name, and one not found at all.
        </Body>
        <Button label="Review the file" variant="secondary"
          onPress={() => router.push('/(tabs)/upload')} style={{ marginTop: SPACE.md }} />
      </Card>

      <Card>
        <H2>Go to</H2>
        <Row style={{ marginTop: SPACE.md, gap: SPACE.sm, flexWrap: 'wrap' }}>
          <Button label="Reports" variant="secondary" onPress={() => router.push('/reports')} style={{ flex: 1 }} />
          <Button label="Courses" variant="secondary" onPress={() => router.push('/courses')} style={{ flex: 1 }} />
        </Row>
        <Row style={{ marginTop: SPACE.sm, gap: SPACE.sm, flexWrap: 'wrap' }}>
          <Button label="Sessions" variant="secondary" onPress={() => router.push('/sessions')} style={{ flex: 1 }} />
          <Button label="Staff" variant="secondary" onPress={() => router.push('/staff')} style={{ flex: 1 }} />
        </Row>
      </Card>
    </Screen>
  );
}
