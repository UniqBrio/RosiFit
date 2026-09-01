import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { Screen, H2, Muted, Label } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { SearchPicker } from '../../src/components/Sheet';
import { Donut } from '../../src/components/Donut';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface, type StatusKey } from '../../src/theme/tokens';
import {
  CANDIDATES, MATCH_ROWS, OUTCOME_META, BRANCHES, COURSES, STAFF,
  WEEK_ROWS, WEEK_STRIP, PERIODS, GLOBAL_RULE, ruleSentence,
} from '../../src/data/mock';

type Scope = 'academy' | 'branch';
type PickerKind = null | 'branch' | 'course' | 'period';

export default function Home() {
  const { theme } = useTheme();
  const router = useRouter();

  const [scope, setScope] = useState<Scope>('academy');
  const [branch, setBranch] = useState(BRANCHES[1]);
  const [course, setCourse] = useState(COURSES[0]);
  const [period, setPeriod] = useState('This week');
  const [picker, setPicker] = useState<PickerKind>(null);

  const blocked = MATCH_ROWS.filter(r => OUTCOME_META[r.kind].blocks).length;
  const noEmail = CANDIDATES.filter(c => !c.has_email).length;
  const needAccess = STAFF.filter(s => s.access !== 'active').length;
  const awaiting = WEEK_STRIP.filter(d => d.status === 'awaiting').length;

  // ONE source of truth for the period, repeated on every tile that depends
  // on it -- a tile that quietly covers a different range is the failure this
  // prevents (C-84).
  const periodLabel = PERIODS[period] ?? period;

  // C-86: the scope is named, so an academy-wide number can never be read as
  // a branch number.
  const scopeLabel =
    scope === 'academy'
      ? (course === COURSES[0] ? 'Academy-wide attendance' : `${course} · whole academy`)
      : (course === COURSES[0] ? `${branch} branch attendance` : `${course} · ${branch}`);

  const week = WEEK_ROWS.find(w => w.current) ?? WEEK_ROWS[0];
  const attended = week.attended;
  const missed = week.expected - week.attended;
  const notExpected = CANDIDATES.reduce((n, c) => n + Math.max(6 - c.expected, 0), 0);

  const rows = period === 'This week' ? WEEK_ROWS.slice(0, 1)
    : period === 'Last week' ? WEEK_ROWS.slice(1, 2) : WEEK_ROWS;

  const filters: { label: string; value: string; kind: Exclude<PickerKind, null> }[] = [
    ...(scope === 'branch' ? [{ label: 'Branch', value: branch, kind: 'branch' as const }] : []),
    { label: 'Course', value: course, kind: 'course' },
    { label: 'Period', value: period, kind: 'period' },
  ];

  const needs: {
    icon: string; tone: StatusKey; title: string; sub: string; to: Href; accent?: boolean;
  }[] = [
    { icon: 'cloud_upload', tone: 'awaiting', to: '/(tabs)/upload',
      title: `${awaiting} sessions awaiting upload`, sub: 'Counts for nobody until the file is in' },
    { icon: 'favorite', tone: 'absent', to: '/(tabs)/weekly', accent: true,
      title: `${CANDIDATES.length} members to reach out to`, sub: 'Longest gap: Meenakshi, 6 sessions' },
    { icon: 'mail_off', tone: 'absent', to: '/send',
      title: `${noEmail} members have no email`, sub: 'They stay listed, counted as excluded' },
    { icon: 'lock_open', tone: 'holiday', to: '/staff',
      title: `${needAccess} staff cannot sign in yet`, sub: 'Saved, but no PIN generated' },
  ];

  const holidayInk = theme.isDark ? STATUS.holiday.fgDark : STATUS.holiday.fgLight;
  const holidayBox = statusSurface(holidayInk);

  return (
    <Screen>
      {/* ------------------------------------------------- scope + filters */}
      <View style={{
        flexDirection: 'row', gap: 5, padding: 4, borderRadius: RADIUS.md,
        backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
      }}>
        {([['academy', 'Academy wise', 'apartment'], ['branch', 'Branch wise', 'store']] as const).map(([k, label, icon]) => {
          const on = scope === k;
          return (
            <Pressable key={k} onPress={() => setScope(k)}
              accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={{
                flex: 1, height: 38, borderRadius: 11, flexDirection: 'row',
                alignItems: 'center', justifyContent: 'center', gap: 7,
                backgroundColor: on ? theme.accent : 'transparent',
              }}>
              <Icon name={icon} size={17} color={on ? theme.onAccent : theme.muted} />
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: on ? theme.onAccent : theme.muted }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.sm }}>
        {filters.map(f => {
          const narrowed = f.kind !== 'period' && !f.value.startsWith('All');
          return (
            <Pressable key={f.label} onPress={() => setPicker(f.kind)}
              accessibilityRole="button" accessibilityLabel={`${f.label}, ${f.value}`}
              style={{
                flex: 1, minHeight: TAP_MIN, justifyContent: 'center', gap: 2,
                paddingVertical: 9, paddingHorizontal: 11, borderRadius: 13,
                backgroundColor: narrowed ? theme.control : theme.surface,
                borderWidth: 1, borderColor: narrowed ? theme.accent : theme.line,
              }}>
              <Text style={{
                fontSize: 9.5, fontWeight: '700', letterSpacing: 0.6,
                textTransform: 'uppercase', color: theme.muted,
              }}>{f.label}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: theme.fgStrong }}>
                  {f.value}
                </Text>
                <Icon name="arrow_drop_down" size={16} color={theme.muted} />
              </View>
            </Pressable>
          );
        })}
      </View>

      <Pressable onPress={() => router.push('/holiday')}
        accessibilityRole="button"
        style={{
          marginTop: 9, height: TAP_MIN, borderRadius: 13, flexDirection: 'row',
          alignItems: 'center', justifyContent: 'center', gap: SPACE.sm,
          backgroundColor: holidayBox.bg, borderWidth: 1, borderColor: holidayBox.border,
        }}>
        <Icon name="event_busy" size={19} color={holidayInk} />
        <Text style={{ fontSize: 13.5, fontWeight: '800', color: theme.fg }}>Add holiday</Text>
      </Pressable>

      {/* ------------------------------------------------------- the donut */}
      <View style={{
        marginTop: SPACE.lg, padding: 18, borderRadius: RADIUS.lg,
        backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
      }}>
        <H2>Attendance distribution</H2>
        <Muted style={{ marginTop: 4 }}>{`${scopeLabel} · ${periodLabel}`}</Muted>
        <View style={{ marginTop: SPACE.lg }}>
          <Donut attended={attended} missed={missed} notExpected={notExpected} />
        </View>
        {/* the chart reads the same numbers as the report -- there is no
            separate calculation anywhere (C-87) */}
        <Muted style={{ marginTop: SPACE.md, paddingTop: SPACE.md, borderTopWidth: 1, borderTopColor: theme.line }}>
          Same figures as the member report — one source, so the chart and the report cannot disagree.
          Holidays, cancellations and sessions awaiting upload are excluded.
        </Muted>
      </View>

      {/* --------------------------------------------------------- the ask */}
      <LinearGradient
        colors={[theme.accentDeep, theme.accentDeep2, theme.accentDeep3]}
        locations={[0, 0.62, 1]}
        start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
        style={{
          marginTop: SPACE.md, padding: 22, borderRadius: 24,
          borderWidth: 1, borderColor: theme.lineStrong,
        }}>
        <Text style={{
          fontSize: 12, fontWeight: '700', letterSpacing: 1.2,
          textTransform: 'uppercase', color: theme.accentInk,
        }}>{scopeLabel}</Text>
        <Text style={{ fontSize: 11.5, color: theme.onDeep, marginTop: 4 }}>{periodLabel}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: SPACE.md }}>
          <Text style={{
            fontSize: 60, fontWeight: '800', color: '#FFFFFF',
            letterSpacing: -2, fontVariant: ['tabular-nums'],
          }}>{CANDIDATES.length}</Text>
          <Text style={{ fontSize: 21, fontWeight: '600', color: '#FFFFFF' }}>members{'\n'}need you</Text>
        </View>
        {/* the rule is stated where the number is, so nobody has to guess
            what "needs you" was measured against */}
        <View style={{
          alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7,
          marginTop: SPACE.lg, paddingVertical: 7, paddingHorizontal: 12,
          borderRadius: RADIUS.pill, borderWidth: 1, borderColor: theme.lineStrong,
        }}>
          <Icon name="rule" size={15} color={theme.accentInk} />
          <Text style={{ flex: 1, fontSize: 12, color: theme.onDeep }}>
            {ruleSentence(GLOBAL_RULE, 'every course')}
          </Text>
        </View>
      </LinearGradient>

      {/* -------------------------------------------------- what needs you */}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: SPACE.xxl, marginBottom: SPACE.md }}>
        <H2>What needs you</H2>
        <Muted>{`${needs.length} things`}</Muted>
      </View>

      <View style={{ gap: SPACE.md }}>
        {needs.map(n => {
          const tone = STATUS[n.tone];
          const ink = n.accent ? theme.accentInk : (theme.isDark ? tone.fgDark : tone.fgLight);
          const box = statusSurface(ink);
          return (
            <Pressable key={n.title} onPress={() => router.push(n.to)}
              accessibilityRole="button" accessibilityLabel={`${n.title}. ${n.sub}`}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 14, padding: SPACE.lg,
                borderRadius: RADIUS.lg, backgroundColor: theme.surface,
                borderWidth: 1, borderColor: n.accent ? theme.accent : theme.line,
                opacity: pressed ? 0.75 : 1,
              })}>
              <View style={{
                width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
                backgroundColor: box.bg, borderWidth: 1, borderColor: box.border,
              }}>
                <Icon name={n.icon} size={23} color={ink} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: theme.fgStrong }}>{n.title}</Text>
                <Text style={{ fontSize: 12.5, color: theme.muted, lineHeight: 18 }}>{n.sub}</Text>
              </View>
              <Icon name="chevron_right" size={22} color={theme.muted} />
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.md }}>
        {([['Members', 'group', '/(tabs)/members'], ['Courses', 'school', '/courses']] as const).map(([label, icon, to]) => (
          <Pressable key={label} onPress={() => router.push(to)}
            accessibilityRole="button"
            style={{
              flex: 1, minHeight: TAP_MIN + 6, flexDirection: 'row', alignItems: 'center', gap: 9,
              padding: 14, borderRadius: RADIUS.lg, backgroundColor: theme.surface2,
              borderWidth: 1, borderColor: theme.line,
            }}>
            <Icon name={icon} size={19} color={theme.accentInk} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.fg }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {/* ------------------------------------------------------ week table */}
      <View style={{
        marginTop: SPACE.md, padding: 18, borderRadius: RADIUS.lg,
        backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <H2 style={{ flex: 1 }}>Week by week</H2>
          <Pressable onPress={() => router.push('/reports')} accessibilityRole="button">
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.accentInk }}>Member report</Text>
          </Pressable>
        </View>

        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.md,
          paddingBottom: SPACE.sm, borderBottomWidth: 1, borderBottomColor: theme.line,
        }}>
          <Label style={{ flex: 1 }}>Week</Label>
          <Label style={{ width: 30, textAlign: 'center' }}>Exp</Label>
          <Label style={{ width: 30, textAlign: 'center' }}>Att</Label>
          <Label style={{ width: 30, textAlign: 'center' }}>Mis</Label>
          <Label style={{ width: 40, textAlign: 'right' }}>%</Label>
        </View>

        {rows.map(w => {
          const mis = w.expected - w.attended;
          const pct = w.expected ? Math.round((w.attended / w.expected) * 100) : null;
          const pctInk = pct === null ? theme.muted
            : pct >= 70 ? (theme.isDark ? STATUS.present.fgDark : STATUS.present.fgLight)
            : pct >= 45 ? (theme.isDark ? STATUS.awaiting.fgDark : STATUS.awaiting.fgLight)
            : (theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight);
          const num = { width: 30, textAlign: 'center' as const, fontSize: 12.5, fontWeight: '700' as const, fontVariant: ['tabular-nums' as const] };
          return (
            <View key={w.label} style={{
              flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
              paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.line,
            }}>
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: theme.fgStrong }}>
                {w.label}{w.current ? ' · this week' : ''}{w.partial ? ' · partial' : ''}
              </Text>
              <Text style={{ ...num, color: theme.fg }}>{w.expected}</Text>
              <Text style={{ ...num, color: theme.isDark ? STATUS.present.fgDark : STATUS.present.fgLight }}>{w.attended}</Text>
              <Text style={{ ...num, color: theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight }}>{mis}</Text>
              <Text style={{
                width: 40, textAlign: 'right', fontSize: 13, fontWeight: '800',
                color: pctInk, fontVariant: ['tabular-nums'],
              }}>{pct === null ? '—' : `${pct}%`}</Text>
            </View>
          );
        })}

        <Muted style={{ marginTop: 11 }}>
          {rows.some(w => w.partial)
            ? 'Weeks run Monday to Sunday. The partial week at the start is shown separately rather than blended in.'
            : 'Weeks run Monday to Sunday. Awaiting-upload sessions are counted as expected but not yet attended.'}
        </Muted>
      </View>

      {/* ------------------------------------------------------ week strip */}
      <View style={{
        marginTop: SPACE.md, padding: 18, borderRadius: RADIUS.lg,
        backgroundColor: theme.surface2, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.line,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: SPACE.md }}>
          <Icon name="event_available" size={18} color={holidayInk} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.fg }}>This week’s sessions</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 7 }}>
          {WEEK_STRIP.map(d => {
            const tone = STATUS[d.status];
            const ink = theme.isDark ? tone.fgDark : tone.fgLight;
            const box = statusSurface(ink);
            return (
              <View key={d.day} style={{ flex: 1, alignItems: 'center', gap: 7 }}
                accessible accessibilityLabel={`${d.day}: ${tone.word}`}>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: theme.muted }}>{d.day}</Text>
                <View style={{
                  width: '100%', height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: box.bg, borderWidth: 1, borderColor: box.border,
                }}>
                  <Icon name={tone.icon} size={17} color={ink} />
                </View>
              </View>
            );
          })}
        </View>
        <Muted style={{ marginTop: SPACE.md }}>
          Mon–Wed done · Thu holiday (Onam) · Fri &amp; Sat awaiting upload
        </Muted>
      </View>

      <SearchPicker
        open={picker === 'branch'} onClose={() => setPicker(null)}
        title="Choose a branch" placeholder="Search branches"
        options={BRANCHES.map(label => ({ label }))} value={branch}
        onSelect={l => { setBranch(l); setPicker(null); }} />
      <SearchPicker
        open={picker === 'course'} onClose={() => setPicker(null)}
        title="Choose a course" placeholder="Search courses"
        options={COURSES.map(label => ({ label }))} value={course}
        onSelect={l => { setCourse(l); setPicker(null); }} />
      <SearchPicker
        open={picker === 'period'} onClose={() => setPicker(null)}
        title="Choose a period" placeholder="Search periods"
        options={Object.entries(PERIODS).map(([label, meta]) => ({ label, meta }))} value={period}
        onSelect={l => { setPeriod(l); setPicker(null); }} />
    </Screen>
  );
}
