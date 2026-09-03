import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen, H2, Muted, Skeleton, ErrorState } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { DropdownRow, DropdownField, DropdownPanel, DropdownList } from '../../src/components/Dropdown';
import { PeriodPanel, periodFieldValue } from '../../src/components/PeriodFilter';
import { Donut } from '../../src/components/Donut';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE, RADIUS } from '../../src/theme/tokens';
import { useFollowUp, useFilterOptions } from '../../src/data/hooks';
import { distribution } from '../../src/data/followup';
import { resolvePeriod, type PeriodChoice } from '../../src/data/period';
import { useAcademy, ALL_BRANCHES } from '../../src/state/academy';

/**
 * The dashboard: scope, filters, and ONE chart.
 *
 * WHAT THIS SCREEN USED TO BE
 * A hero card reading "N members need you", a "What needs you" list of four
 * routes, two quick links, a week-by-week table and a fixture week strip --
 * all above and below the chart. The canvas revision of 3 Sep drops every one
 * of them and leaves the scope tabs, the filters and the attendance
 * distribution.
 *
 * WHY THAT IS AN IMPROVEMENT AND NOT JUST LESS
 * Every removed block was a SECOND place a number lived. The hero counted the
 * flagged set, the list counted it again in different words, and the week
 * table counted attendance from a different query (useWeekRows) than the
 * chart beside it -- and then had to carry a caption admitting the branch and
 * course filters did not reach it. Guardrail 1 is that the follow-up list is
 * derived from one member list precisely so those numbers cannot drift; a
 * dashboard that states the same figure four ways is where that drift becomes
 * visible to the academy first.
 *
 * The week strip was worse than duplicated: it rendered WEEK_STRIP, a
 * hardcoded fixture, on the live dashboard -- "Mon-Wed done · Thu holiday
 * (Onam)" regardless of what the academy actually did that week.
 *
 * Everything removed is still reachable: the flagged set on Weekly, awaiting
 * uploads on the shell's bell and the Upload screen, staff without access on
 * Staff, and a week-by-week table on Reports -- though that one still reads
 * the WEEK_ROWS fixture rather than the live query, which is its own defect
 * and not this screen's to fix.
 */

type FilterKind = 'branch' | 'course' | 'period';

export default function Home() {
  const { theme } = useTheme();
  const { state: forced } = useLocalSearchParams<{ state?: string }>();

  // The scope and the branch belong to the shell, not to this screen: the
  // header above renders on every tabbed screen and its branch selector says
  // "Every figure follows this". Reading them from there is what makes the
  // header's choice reach the chart (C-84/85/86).
  const { scope, branch, setScope, setBranch } = useAcademy();
  const [period, setPeriod] = useState<PeriodChoice>({ key: 'This week' });
  // Only one dropdown is out at a time: two overlapping panels have no
  // honest z-order, and the one underneath is unreachable.
  const [open, setOpen] = useState<FilterKind | null>(null);

  // The period the filters name IS the period the query runs over, so the
  // chart can never quietly cover a different range from its own label
  // (C-84). A custom range is resolved by the same function as a named one,
  // so the two cannot drift apart.
  const range = resolvePeriod(period);

  const followUp = useFollowUp(forced, range);
  const filterOptions = useFilterOptions(forced);

  const branchOptions = filterOptions.data?.branches ?? [ALL_BRANCHES];
  const courseOptions = filterOptions.data?.courses ?? ['All courses'];
  const [course, setCourse] = useState<string | null>(null);
  const firstBranch = branchOptions[1] ?? ALL_BRANCHES;
  const branchValue = branch === ALL_BRANCHES ? firstBranch : branch;
  const courseValue = course ?? courseOptions[0];

  // the dates the query actually ran over, never a second, written copy
  const periodLabel = range.label;
  const allCourses = courseOptions[0];

  // C-84/85/86. The filters are not decoration: the branch and the course
  // NARROW the set the chart is counted from, so the label and the number can
  // never describe different populations. The narrowing is applied to the one
  // member list -- the follow-up set is still the same derivation
  // (src/data/followup.ts), just shown for the branch you are looking at.
  const narrowed = (m: { branch: string; course: string }) =>
    (scope === 'academy' || branchValue === ALL_BRANCHES || m.branch === branchValue)
    && (courseValue === allCourses || m.course === courseValue);

  const members = (followUp.data?.members ?? []).filter(narrowed);

  const scopeLabel =
    scope === 'academy'
      ? (courseValue === allCourses ? 'Academy-wide attendance' : `${courseValue} · whole academy`)
      : (courseValue === allCourses ? `${branchValue} branch attendance` : `${courseValue} · ${branchValue}`);

  // The donut is counted from the member list itself -- the same rows the
  // member report reads -- which is what its own caption promises (C-87).
  // The arithmetic lives in src/data/followup so the promise is testable.
  const { attended, missed, notExpected } = distribution(members);

  const filters: { label: string; value: string; kind: FilterKind }[] = [
    ...(scope === 'branch' ? [{ label: 'Branch', value: branchValue, kind: 'branch' as const }] : []),
    { label: 'Course', value: courseValue, kind: 'course' as const },
    { label: 'Period', value: periodFieldValue(period), kind: 'period' as const },
  ];

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
            <Pressable key={k} testID={`home-scope-${k}`}
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

      {/* The filters open in place. A bottom sheet hid the very figures the
          filter is meant to narrow, so the choice was made blind; a panel
          under the field keeps the chart in view while it is open. */}
      <DropdownRow open={open !== null} style={{ marginTop: SPACE.sm }}>
        <View style={{ flexDirection: 'row', gap: SPACE.sm }}>
          {filters.map(f => (
            <DropdownField key={f.label}
              label={f.label} value={f.value}
              open={open === f.kind}
              highlight={f.kind !== 'period' && !f.value.startsWith('All')}
              onPress={() => setOpen(o => (o === f.kind ? null : f.kind))}
              testID={`home-filter-${f.kind}`} />
          ))}
        </View>

        {open === 'branch' ? (
          <DropdownPanel>
            <DropdownList options={branchOptions.map(label => ({ label }))} value={branchValue}
              onSelect={l => { setBranch(l); setOpen(null); }} testID="home-branch" />
          </DropdownPanel>
        ) : null}
        {open === 'course' ? (
          <DropdownPanel>
            <DropdownList options={courseOptions.map(label => ({ label }))} value={courseValue}
              onSelect={l => { setCourse(l); setOpen(null); }} testID="home-course" />
          </DropdownPanel>
        ) : null}
        {open === 'period' ? (
          <DropdownPanel maxHeight={430}>
            <PeriodPanel choice={period} onChange={setPeriod}
              onDone={() => setOpen(null)} testID="home-period" />
          </DropdownPanel>
        ) : null}
      </DropdownRow>
    </>
  );

  // Zeros during a load would be a lie, so the FIGURES wait behind a
  // skeleton. The scope tabs and the filters do not: they are controls, they
  // are correct before any figure arrives, and blanking them was what made
  // the dashboard look like it had no tabs whenever a fetch was slow.
  if (followUp.state === 'loading') {
    return <Screen>{controls}<View style={{ marginTop: SPACE.lg }}><Skeleton lines={5} /></View></Screen>;
  }
  if (followUp.state === 'error') {
    return (
      <Screen>
        {controls}
        <View style={{ marginTop: SPACE.lg }}>
          <ErrorState onRetry={followUp.retry}
            message={followUp.error ?? 'The dashboard figures could not be loaded. Nothing has been changed.'} />
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
    </Screen>
  );
}
