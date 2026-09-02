import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
import { Screen, H2, Muted, Label, Skeleton, ErrorState } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { SearchPicker } from '../../src/components/Sheet';
import { Donut } from '../../src/components/Donut';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface, type StatusKey } from '../../src/theme/tokens';
import { WEEK_STRIP, PERIODS, hasEmail, ruleSentence } from '../../src/data/mock';
import { useFollowUp, useStaff, useFilterOptions, useWeekRows, usePendingSessions } from '../../src/data/hooks';
import { currentWeek, lastWeek, lastFourWeeks } from '../../src/data/period';
import { useAcademy, ALL_BRANCHES } from '../../src/state/academy';

type PickerKind = null | 'branch' | 'course' | 'period';

export default function Home() {
  const { theme } = useTheme();
  const router = useRouter();
  const { state: forced } = useLocalSearchParams<{ state?: string }>();

  // The scope and the branch belong to the shell, not to this screen: the
  // header above renders on every tabbed screen and its branch selector says
  // "Every figure follows this". Reading them from there is what makes the
  // header's choice reach the chart (C-84/85/86).
  const { scope, branch, setScope, setBranch } = useAcademy();
  const [period, setPeriod] = useState('This week');
  const [picker, setPicker] = useState<PickerKind>(null);

  // The period the filters name IS the period the queries run over, so a
  // tile can never quietly cover a different range from its own label (C-84).
  const range = period === 'Last week' ? lastWeek()
    : period === 'Last 4 weeks' ? lastFourWeeks()
    : currentWeek();

  const followUp = useFollowUp(forced, range);
  const staff = useStaff(forced);
  const filterOptions = useFilterOptions(forced);
  const weekRows = useWeekRows(forced);
  const pending = usePendingSessions(forced);

  const branchOptions = filterOptions.data?.branches ?? ['All branches'];
  const courseOptions = filterOptions.data?.courses ?? ['All courses'];
  const [course, setCourse] = useState<string | null>(null);
  const firstBranch = branchOptions[1] ?? ALL_BRANCHES;
  const branchValue = branch === ALL_BRANCHES ? firstBranch : branch;
  const courseValue = course ?? courseOptions[0];

  const rules = followUp.data?.rules;
  const needAccess = (staff.data ?? []).filter(s => s.access !== 'active').length;
  const awaiting = pending.data?.length ?? WEEK_STRIP.filter(d => d.status === 'awaiting').length;

  const periodLabel = PERIODS[period] ?? range.label;
  const allCourses = courseOptions[0];

  // C-84/85/86. The filters are not decoration: the branch and the course
  // NARROW the set every figure below is counted from, so the label and the
  // number can never describe different populations. The narrowing is applied
  // to the one member list -- the follow-up set is still the same derivation
  // (src/data/followup.ts), just shown for the branch you are looking at.
  const narrowed = (m: { branch: string; course: string }) =>
    (scope === 'academy' || branchValue === ALL_BRANCHES || m.branch === branchValue)
    && (courseValue === allCourses || m.course === courseValue);

  const members = (followUp.data?.members ?? []).filter(narrowed);
  const flagged = (followUp.data?.flagged ?? []).filter(narrowed);
  const noEmail = flagged.filter(m => !hasEmail(m)).length;

  const scopeLabel =
    scope === 'academy'
      ? (courseValue === allCourses ? 'Academy-wide attendance' : `${courseValue} · whole academy`)
      : (courseValue === allCourses ? `${branchValue} branch attendance` : `${courseValue} · ${branchValue}`);

  const allWeeks = weekRows.data ?? [];
  // The donut is counted from the member list itself -- the same rows the
  // member report reads -- which is what its own caption promises and what
  // lets the branch and course filters reach the chart.
  const attended = members.reduce((n, m) => n + m.attended, 0);
  const missed = members.reduce((n, m) => n + Math.max(m.expected - m.attended, 0), 0);
  // "Not expected" is shown so a member on a 4-day override does not read as
  // a 6-day member with poor attendance (C-87).
  const notExpected = members.reduce((n, m) => n + Math.max(6 - m.expected, 0), 0);

  const rows = period === 'This week' ? allWeeks.slice(0, 1)
    : period === 'Last week' ? allWeeks.slice(1, 2) : allWeeks;

  const filters: { label: string; value: string; kind: Exclude<PickerKind, null> }[] = [
    ...(scope === 'branch' ? [{ label: 'Branch', value: branchValue, kind: 'branch' as const }] : []),
    { label: 'Course', value: courseValue, kind: 'course' },
    { label: 'Period', value: period, kind: 'period' },
  ];

  const loading = followUp.state === 'loading' || weekRows.state === 'loading';
  const failed = followUp.state === 'error' || weekRows.state === 'error';

  // Named rather than "someone": the person reading this decides who to call.
  const longestGap = [...flagged].sort((a, b) => b.streak - a.streak)[0] ?? null;

  const needs: {
    icon: string; tone: StatusKey; title: string; sub: string; to: Href; accent?: boolean;
  }[] = [
    { icon: 'cloud_upload', tone: 'awaiting', to: '/upload',
      title: `${awaiting} sessions awaiting upload`, sub: 'Counts for nobody until the file is in' },
    { icon: 'favorite', tone: 'absent', to: '/(tabs)/weekly', accent: true,
      title: `${flagged.length} members to reach out to`,
      sub: longestGap ? `Longest gap: ${longestGap.name.split(' ')[0]}, ${longestGap.streak} sessions`
                      : 'Nobody is over her course’s threshold' },
    { icon: 'mail_off', tone: 'absent', to: '/send',
      title: `${noEmail} members have no email`, sub: 'They stay listed, counted as excluded' },
    { icon: 'lock_open', tone: 'holiday', to: '/staff',
      title: `${needAccess} staff cannot sign in yet`, sub: 'Saved, but no PIN generated' },
  ];

  const holidayInk = theme.isDark ? STATUS.holiday.fgDark : STATUS.holiday.fgLight;
  const holidayBox = statusSurface(holidayInk);

  const controls = (
    <>
      {/* ------------------------------------------------- scope + filters */}
      <View style={{
        flexDirection: 'row', gap: 5, padding: 4, borderRadius: RADIUS.md,
        backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
      }}>
        {([['academy', 'Academy wise', 'apartment'], ['branch', 'Branch wise', 'store']] as const).map(([k, label, icon]) => {
          const on = scope === k;
          return (
            <Pressable key={k}
              onPress={() => {
                setScope(k);
                // Branch wise with no branch chosen would show an
                // academy-wide figure under a branch label. Narrowing to the
                // first branch keeps the label and the number honest.
                setBranch(k === 'academy' ? ALL_BRANCHES
                  : branch === ALL_BRANCHES ? firstBranch : branch);
              }}
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
        <Text style={{ fontSize: 13.5, fontWeight: '800', color: theme.fg }}>Add Holiday</Text>
      </Pressable>
    </>
  );

  // Zeros during a load would be a lie -- "0 members need you" reads as good
  // news -- so the FIGURES wait behind a skeleton. The scope tabs, the
  // filters and Add holiday do not: they are controls, they are correct
  // before any figure arrives, and blanking them was what made the dashboard
  // look like it had no tabs whenever a fetch was slow or failing.
  if (loading) return <Screen>{controls}<View style={{ marginTop: SPACE.lg }}><Skeleton lines={5} /></View></Screen>;
  if (failed) {
    return (
      <Screen>
        {controls}
        <View style={{ marginTop: SPACE.lg }}>
          <ErrorState
            onRetry={() => { followUp.retry(); weekRows.retry(); }}
            message={followUp.error ?? weekRows.error
              ?? 'The dashboard figures could not be loaded. Nothing has been changed.'} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {controls}

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
          }}>{flagged.length}</Text>
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
            {rules ? ruleSentence(rules.global, 'every course') : ''}
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
        {([['Members', 'group', '/(tabs)/members'], ['Courses', 'school', '/(tabs)/courses']] as const).map(([label, icon, to]) => (
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
          <Pressable onPress={() => router.push('/(tabs)/reports')} accessibilityRole="button">
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
          {/* the branch and course filters narrow the chart above; this table
              is whole-academy, and says so rather than looking filtered */}
          {scope === 'branch' || courseValue !== allCourses
            ? ' These rows are academy-wide — the branch and course filters do not narrow them.'
            : ''}
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
        options={branchOptions.map(label => ({ label }))} value={branchValue}
        onSelect={l => { setBranch(l); setPicker(null); }} />
      <SearchPicker
        open={picker === 'course'} onClose={() => setPicker(null)}
        title="Choose a course" placeholder="Search courses"
        options={courseOptions.map(label => ({ label }))} value={courseValue}
        onSelect={l => { setCourse(l); setPicker(null); }} />
      <SearchPicker
        open={picker === 'period'} onClose={() => setPicker(null)}
        title="Choose a period" placeholder="Search periods"
        options={Object.entries(PERIODS).map(([label, meta]) => ({ label, meta }))} value={period}
        onSelect={l => { setPeriod(l); setPicker(null); }} />
    </Screen>
  );
}
