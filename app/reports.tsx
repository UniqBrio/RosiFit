import { useState } from 'react';
import { View } from 'react-native';
import { Screen, Card, H1, H2, Body, Muted, Label, Button, Pill, Row, Stat, Divider } from '../src/components/ui';
import { useTheme } from '../src/theme/ThemeProvider';
import { SPACE } from '../src/theme/tokens';
import { MEMBERS, WEEK_ROWS, BRANCHES, COURSES, WEEK } from '../src/data/mock';
import { FilterBar } from '../src/components/FilterBar';
import { Donut } from '../src/components/Donut';

export default function Reports() {
  const { theme } = useTheme();
  const [branch, setBranch] = useState(BRANCHES[0]);
  const [course, setCourse] = useState(COURSES[0]);
  const [tab, setTab] = useState<'member' | 'week'>('member');

  const rows = MEMBERS.filter(m =>
    (branch === 'All branches' || m.branch === branch) &&
    (course === 'All courses' || m.course === course));

  const expected = rows.reduce((n, m) => n + m.expected, 0);
  const attended = rows.reduce((n, m) => n + m.attended, 0);
  const missed = rows.reduce((n, m) => n + m.missed, 0);

  return (
    <Screen>
      <H1>Reports</H1>
      <Muted style={{ marginBottom: SPACE.lg }}>
        {branch === 'All branches' ? 'Academy-wide' : `${branch} branch`} · {WEEK.label}
      </Muted>

      <FilterBar branch={branch} onBranch={setBranch} course={course} onCourse={setCourse} period={WEEK.label} />

      <Row style={{ gap: SPACE.sm, marginBottom: SPACE.md }}>
        <Button label="Member-wise" variant={tab === 'member' ? 'primary' : 'secondary'}
          onPress={() => setTab('member')} style={{ flex: 1 }} />
        <Button label="Week-wise" variant={tab === 'week' ? 'primary' : 'secondary'}
          onPress={() => setTab('week')} style={{ flex: 1 }} />
      </Row>

      <Card>
        {/* the donut and the rows below read the same numbers -- there is no
            second calculation anywhere, so they cannot disagree */}
        <Donut attended={attended} missed={missed} notExpected={0} />
        <Row style={{ marginTop: SPACE.lg, gap: SPACE.lg }}>
          <Stat value={expected} label="Expected" period={WEEK.label} />
          <Stat value={attended} label="Attended" tone="success" />
          <Stat value={missed} label="Missed" tone="danger" />
        </Row>
      </Card>

      {tab === 'member' ? (
        rows.length ? rows.map(m => {
          const pct = m.expected ? Math.round((m.attended / m.expected) * 1000) / 10 : null;
          return (
            <Card key={m.id}>
              <Row>
                <View style={{ flex: 1 }}>
                  <H2>{m.name}</H2>
                  <Muted>{m.course} · {m.branch}</Muted>
                </View>
                <Pill text={pct === null ? 'No sessions' : `${pct}%`}
                  tone={pct === null ? 'neutral' : pct >= 70 ? 'success' : pct >= 40 ? 'warning' : 'danger'} />
              </Row>
              <Row style={{ marginTop: SPACE.md, gap: SPACE.xl, flexWrap: 'wrap' }}>
                <View><Muted>Expected</Muted><Body style={{ fontWeight: '800' }}>{m.expected}</Body></View>
                <View><Muted>Attended</Muted><Body style={{ fontWeight: '800' }}>{m.attended}</Body></View>
                <View><Muted>Missed</Muted><Body style={{ fontWeight: '800', color: theme.danger }}>{m.missed}</Body></View>
                <View><Muted>Streak</Muted><Body style={{ fontWeight: '800' }}>{m.streak}</Body></View>
              </Row>
            </Card>
          );
        }) : <Card><Body>No member matches these filters.</Body></Card>
      ) : (
        <Card>
          <H2>Week by week</H2>
          <Muted style={{ marginTop: 4, marginBottom: SPACE.md }}>
            Weeks run Monday to Sunday. Partial weeks at either end of a range are shown separately.
          </Muted>
          {WEEK_ROWS.map(w => {
            const pct = Math.round((w.attended / w.expected) * 1000) / 10;
            return (
              <View key={w.week} style={{ marginBottom: SPACE.md }}>
                <Row>
                  <Body style={{ flex: 1, fontWeight: '700' }}>{w.week}</Body>
                  <Body style={{ fontWeight: '800' }}>{pct}%</Body>
                </Row>
                {/* the bar is a second encoding of the number beside it, never
                    the only one */}
                <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.control,
                  marginTop: 6, overflow: 'hidden' }}>
                  <View style={{ width: `${pct}%`, height: 8,
                    backgroundColor: pct >= 70 ? theme.success : pct >= 40 ? theme.warning : theme.danger }} />
                </View>
                <Muted style={{ marginTop: 4 }}>
                  {w.expected} expected · {w.attended} attended · {w.missed} missed
                </Muted>
              </View>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}
