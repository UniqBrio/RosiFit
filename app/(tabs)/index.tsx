import { useEffect, useState } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, H2, Muted, Skeleton, ErrorState } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import {
  DropdownRow, DropdownField, DropdownPanel, DropdownCheckList, DropdownDone,
} from '../../src/components/Dropdown';
import { PeriodPanel, periodFieldValue } from '../../src/components/PeriodFilter';
import { Donut } from '../../src/components/Donut';
import { AttendanceBars, AttendanceBarsLegend } from '../../src/components/AttendanceBars';
import { AttendanceRings } from '../../src/components/AttendanceRings';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE, RADIUS, TAP_MIN } from '../../src/theme/tokens';
import { useFollowUp, useFilterOptions, useBucketMetrics } from '../../src/data/hooks';
import { distribution } from '../../src/data/followup';
import { reportRows, type ReportRow } from '../../src/data/report';
import { bucketTotals } from '../../src/data/buckets';
import {
  matchesSelection, fieldValue, scopeSentence, toggle, pruned, attentionFirst,
  MEMBER_ROWS_SHOWN, type Selection,
} from '../../src/data/overview';
import { resolvePeriod, type PeriodChoice } from '../../src/data/period';
import { ALL_BRANCHES } from '../../src/state/academy';
import { useAdminRedirect } from '../../src/components/AdminOnly';

/**
 * The Overview: three filters, and the academy's attendance told four ways
 * -- a ring, a ranking, and a ring per course and per sub-range -- from ONE
 * member list, two sections to a row where the width allows.
 *
 * WHAT THIS SCREEN USED TO BE
 * An "Academy wise / Branch wise" tab pair, a Branch field that only appeared
 * under the second of them, and a single ring with three segments -- Present,
 * Absent and "Not expected".
 *
 * WHY EACH OF THOSE CHANGED
 * - The tabs and the filter said the same thing twice. "Academy wise" IS the
 *   branch filter with nothing chosen, so two controls existed for one fact
 *   and could be set to disagree; and the Branch field being hidden behind a
 *   tab meant the commonest narrowing on the screen took two taps to reach.
 *   One checkbox filter replaces both, and the order runs Course, Period,
 *   Branch -- what is being measured, over when, where.
 * - The filters take SEVERAL values now, which is what a checkbox promises
 *   and a radio does not. Two branches compared side by side was not
 *   expressible before.
 * - "Not expected" was never an outcome of a session; it was an artefact of
 *   the old ring's denominator. See src/data/followup.ts for why removing it
 *   costs a reduced-schedule member nothing.
 *
 * WHICH MARK EACH SECTION DRAWS
 *   - BY MEMBER is a ranking, and the bar's LENGTH is a volume -- a member due
 *     at ten sessions draws a longer bar than one due at three, which is the
 *     point when you are deciding who to chase.
 *   - BY COURSE and BY PERIOD are small rings: each course, and each
 *     sub-range of the period, drawn exactly as the Attendance ring draws the
 *     whole. They were a dot plot on a shared axis and a line over time
 *     (ADR-023); the requester asked for donuts instead
 *     (requests/2026-09-06-overview-two-per-row-donuts.md, ADR-026), and one
 *     mark that means one thing everywhere on the screen is easier to read at
 *     a glance than three marks each with an axis to learn.
 *
 * WHY THE SECTIONS SIT TWO TO A ROW
 * Four sections stacked full-width on a desktop was a long scroll of one
 * chart at a time -- the member bars alone filled the window in the
 * requester's screenshot. Two per row puts the whole picture in one screen
 * where the width allows; below TWO_UP_MIN they stack as before.
 *
 * WHY FOUR CHARTS DO NOT REOPEN THE DRIFT THE OLD DASHBOARD HAD
 * The dashboard this screen replaced was cut back to one chart because its
 * hero, its list and its week table each counted the SAME figure from a
 * DIFFERENT query. These four do the opposite: the ring, the member bars and
 * the course rings are three groupings of one narrowed member list, and the
 * period rings are that same query (member_period_metrics) over consecutive
 * sub-ranges that partition the period exactly -- so they sum back to the
 * ring. No section computes a total of its own, so none of them can disagree
 * about the answer.
 */

type FilterKind = 'course' | 'period' | 'branch';

/**
 * The window width at which the sections go two to a row: the same 768 the
 * Attendance tab's header uses to keep its actions beside the title. Below
 * it a phone gets the stack it always had.
 */
const TWO_UP_MIN = 768;

export default function Home() {
  const { theme } = useTheme();
  const router = useRouter();
  const { state: forced } = useLocalSearchParams<{ state?: string }>();

  const [period, setPeriod] = useState<PeriodChoice>({ key: 'This week' });
  const [courses, setCourses] = useState<string[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  // Only one dropdown is out at a time: two overlapping panels have no
  // honest z-order, and the one underneath is unreachable.
  const [open, setOpen] = useState<FilterKind | null>(null);
  // Same first-render rule as app/(tabs)/courses.tsx: the server renders
  // with a width of 0 and the browser would render with the real one, and
  // that mismatch makes React throw the tree away and remount it. So the
  // first render is the stack on both sides and the measured width takes
  // over after mount.
  const { width } = useWindowDimensions();
  const [measured, setMeasured] = useState(false);
  useEffect(() => { setMeasured(true); }, []);
  const twoUp = (measured ? width : 0) >= TWO_UP_MIN;

  // The period the filters name IS the period the queries run over, so no
  // chart can quietly cover a different range from its own label (C-84). A
  // custom range is resolved by the same function as a named one, so the two
  // cannot drift apart.
  const range = resolvePeriod(period);

  const followUp = useFollowUp(forced, range);
  const filterOptions = useFilterOptions(forced);
  // The period section's own load: the same metric as the ring, asked once
  // per sub-range. It gets its own states because it is a second round trip,
  // and blanking the whole screen for it would hide three sections that are
  // already correct.
  const buckets = useBucketMetrics(range, forced);

  /**
   * Overview is the super admin's screen. A staff account is not offered the
   * tab and Home does not land here, so reaching this is a typed URL or a
   * stale bookmark, and it is sent to Attendance instead.
   *
   * It cannot be guarded with the other admin-only routes in app/_layout.tsx:
   * this screen's pathname is '/', and so is the sign-in screen's.
   */
  const { checking: roleChecking } = useAdminRedirect(true);

  // The first entry of each list is the "All ..." label the repository puts
  // at the head; the ticks are chosen from the real ones below it.
  const branchOptions = (filterOptions.data?.branches ?? [ALL_BRANCHES]).slice(1);
  const courseOptions = (filterOptions.data?.courses ?? ['All courses']).slice(1);
  const allBranchesLabel = filterOptions.data?.branches?.[0] ?? ALL_BRANCHES;
  const allCoursesLabel = filterOptions.data?.courses?.[0] ?? 'All courses';

  // A branch removed under More -> Configuration, or a course renamed, must
  // not leave a tick on a value nothing can match -- the figures would narrow
  // to nothing while the field still read "2 branches".
  const selection: Selection = {
    courses: pruned(courses, courseOptions),
    branches: pruned(branches, branchOptions),
  };
  // C-84/85/86. The filters are not decoration: they NARROW the set every
  // figure below is counted from, so a label and a number on this screen can
  // never describe different populations.
  const members = (followUp.data?.members ?? []).filter(m => matchesSelection(m, selection));

  const periodLabel = range.label;             // the dates the queries ran over
  const caption = scopeSentence(selection, periodLabel);

  // Every section below is counted from THIS list. The ring is its total, the
  // member and course bars are two groupings of it, and the period bars are
  // the same members' figures per sub-range (C-84/85/86/87).
  const { attended, missed } = distribution(members);
  const flaggedHere = (followUp.data?.flagged ?? []).filter(m => matchesSelection(m, selection));

  const memberRows = attentionFirst(reportRows(members, 'Members'));
  const courseRows = reportRows(members, 'Courses');

  const ids = new Set(members.map(m => m.id));
  const periodRows: ReportRow[] = (buckets.data ?? []).map(b => {
    const t = bucketTotals(b, ids);
    return {
      label: b.label, expected: t.expected, attended: t.attended,
      // Nothing expected is NOT 0% attended -- a bucket with no sessions and
      // a bucket everybody skipped are different facts.
      pct: t.expected === 0 ? null : Math.round((t.attended / t.expected) * 100),
    };
  });

  const filters: { label: string; value: string; kind: FilterKind; narrowed: boolean }[] = [
    { label: 'Course', kind: 'course', narrowed: selection.courses.length > 0,
      value: fieldValue(selection.courses, allCoursesLabel, 'courses') },
    { label: 'Period', kind: 'period', narrowed: false,
      value: periodFieldValue(period) },
    { label: 'Branch', kind: 'branch', narrowed: selection.branches.length > 0,
      value: fieldValue(selection.branches, allBranchesLabel, 'branches') },
  ];

  const controls = (
    /* The filters open in place. A bottom sheet hid the very figures the
       filter is meant to narrow, so the choice was made blind; a panel under
       the field keeps the charts in view while it is open. */
    <DropdownRow open={open !== null}>
      <View style={{ flexDirection: 'row', gap: SPACE.sm }}>
        {filters.map(f => (
          <DropdownField key={f.label}
            label={f.label} value={f.value}
            open={open === f.kind}
            highlight={f.narrowed}
            onPress={() => setOpen(o => (o === f.kind ? null : f.kind))}
            testID={`home-filter-${f.kind}`} />
        ))}
      </View>

      {open === 'course' ? (
        <DropdownPanel footer={
          <DropdownDone onPress={() => setOpen(null)} label="Done" testID="home-course-done" />}>
          <DropdownCheckList options={courseOptions.map(label => ({ label }))}
            allLabel={allCoursesLabel} selected={selection.courses}
            onToggle={l => setCourses(c => toggle(c, l))}
            onAll={() => setCourses([])} testID="home-course" />
        </DropdownPanel>
      ) : null}
      {open === 'period' ? (
        <DropdownPanel maxHeight={430}>
          <PeriodPanel choice={period} onChange={setPeriod}
            onDone={() => setOpen(null)} testID="home-period" />
        </DropdownPanel>
      ) : null}
      {open === 'branch' ? (
        <DropdownPanel footer={
          <DropdownDone onPress={() => setOpen(null)} label="Done" testID="home-branch-done" />}>
          <DropdownCheckList options={branchOptions.map(label => ({ label }))}
            allLabel={allBranchesLabel} selected={selection.branches}
            onToggle={l => setBranches(b => toggle(b, l))}
            onAll={() => setBranches([])} testID="home-branch" />
        </DropdownPanel>
      ) : null}
    </DropdownRow>
  );

  // Zeros during a load would be a lie, so the FIGURES wait behind a
  // skeleton. The filters do not: they are controls, they are correct before
  // any figure arrives, and blanking them was what made the dashboard look
  // like it had no filters whenever a fetch was slow.
  // The FILTERS wait too while the role is unresolved -- they are this
  // screen's controls, and drawing a staff member the dashboard's controls a
  // moment before taking her off the dashboard is the flash the guard exists
  // to avoid. It is the same skeleton either way, so an admin sees no new state.
  if (roleChecking) {
    return <Screen><View style={{ marginTop: SPACE.lg }}><Skeleton lines={7} /></View></Screen>;
  }
  if (followUp.state === 'loading') {
    return <Screen>{controls}<View style={{ marginTop: SPACE.lg }}><Skeleton lines={7} /></View></Screen>;
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

      {/* The four sections share ONE grid: two to a row from TWO_UP_MIN,
          stacked below it, and the same gap either way. Each card sits in a
          Cell that is half the row's width; the row's negative side margin
          and the cell's side padding are how two 50% cells keep a gap
          without a pixel width that a scrollbar could push over the edge. */}
      <View testID="home-sections" style={{
        marginTop: SPACE.lg, rowGap: SPACE.md,
        flexDirection: twoUp ? 'row' : 'column', flexWrap: twoUp ? 'wrap' : 'nowrap',
        marginHorizontal: twoUp ? -SPACE.md / 2 : 0,
      }}>

      {/* ------------------------------------------------ the whole picture */}
      <Cell twoUp={twoUp}>
      <View style={{
        flex: 1, padding: 18, borderRadius: RADIUS.lg,
        backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
      }}>
        <H2>Attendance</H2>
        <Muted style={{ marginTop: 4 }}>{caption}</Muted>
        <View style={{ marginTop: SPACE.lg }}>
          <Donut attended={attended} missed={missed} />
        </View>

        {/* The three facts that decide whether anything below needs reading:
            who is in the figures, how many courses they span, and how many of
            them the follow-up rule has flagged. All three are counted from
            the same narrowed list as the ring. */}
        <View style={{
          flexDirection: 'row', marginTop: SPACE.lg, paddingTop: SPACE.md,
          borderTopWidth: 1, borderTopColor: theme.line,
        }}>
          <Fact value={String(members.length)} label={members.length === 1 ? 'Member' : 'Members'} />
          <Fact value={String(courseRows.length)} label={courseRows.length === 1 ? 'Course' : 'Courses'} />
          <Fact value={String(flaggedHere.length)} label="Need follow-up"
            onPress={() => router.push('/(tabs)/weekly')} testID="home-flagged" />
        </View>
      </View>
      </Cell>

      {/* ------------------------------------- by member: a ranked bar list */}
      <Cell twoUp={twoUp}><Card>
        <SectionHead title="Based on member" icon="person"
          caption={memberRows.length === 0 ? '' : memberRows.length > MEMBER_ROWS_SHOWN
            ? `Lowest attendance first · ${MEMBER_ROWS_SHOWN} of ${memberRows.length} shown, all of them on Reports`
            : 'Lowest attendance first'} />
        {memberRows.length === 0 ? (
          <Muted style={{ marginTop: SPACE.sm }}>
            No member matches these filters, so there is nobody to compare.
          </Muted>
        ) : (
          <View style={{ marginTop: SPACE.md }}>
            <AttendanceBars rows={memberRows.slice(0, MEMBER_ROWS_SHOWN)} testID="home-by-member" />
            <View style={{ marginTop: SPACE.md }}><AttendanceBarsLegend /></View>
          </View>
        )}
      </Card></Cell>

      {/* ---------------------------------------- by course: a ring per course */}
      <Cell twoUp={twoUp}><Card>
        <SectionHead title="Based on course" icon="menu_book"
          caption={courseRows.length === 0 ? '' : 'Present and absent, course by course'} />
        {courseRows.length === 0 ? (
          <Muted style={{ marginTop: SPACE.sm }}>No course matches these filters.</Muted>
        ) : (
          <View style={{ marginTop: SPACE.md }}>
            <AttendanceRings rows={courseRows} testID="home-by-course" />
          </View>
        )}
      </Card></Cell>

      {/* ------------------------------------ by period: a ring per sub-range */}
      <Cell twoUp={twoUp}><Card>
        <SectionHead title="Based on period" icon="date_range"
          caption={`${periodLabel}, split into ${periodRows.length || 'no'} ${periodRows.length === 1 ? 'part' : 'parts'}`} />
        {buckets.state === 'loading' ? (
          <View style={{ marginTop: SPACE.md }}><Skeleton lines={4} /></View>
        ) : buckets.state === 'error' ? (
          <View style={{ marginTop: SPACE.md }}>
            <ErrorState onRetry={buckets.retry}
              message={buckets.error ?? 'The period breakdown could not be loaded. The figures above are unaffected.'} />
          </View>
        ) : periodRows.length === 0 ? (
          <Muted style={{ marginTop: SPACE.sm }}>
            There is nothing to split this period into yet.
          </Muted>
        ) : (
          <View style={{ marginTop: SPACE.md }}>
            <AttendanceRings rows={periodRows} testID="home-by-period" />
          </View>
        )}
      </Card></Cell>
      </View>

      {/* the charts read the same numbers as the report -- there is no
          separate calculation anywhere (C-87) */}
      <View style={{
        marginTop: SPACE.md, padding: 15, borderRadius: RADIUS.md,
        backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
      }}>
        <Muted>
          Every figure here is counted from one member list — the same one the member report
          reads — so no two charts on this screen can disagree. Holidays, cancellations and
          sessions awaiting upload are excluded.
        </Muted>
      </View>
    </Screen>
  );
}

/* ------------------------------------------------------------- the pieces */

/** One headline fact. Tappable only when it leads somewhere. */
function Fact({ value, label, onPress, testID }:
  { value: string; label: string; onPress?: () => void; testID?: string }) {
  const { theme } = useTheme();
  const body = (
    <>
      <Text style={{ fontSize: 19, fontWeight: '800', color: theme.fgStrong, fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <Text numberOfLines={1} style={{ fontSize: 10.5, fontWeight: '700', color: theme.muted }}>{label}</Text>
        {onPress ? <Icon name="chevron_right" size={14} color={theme.accentInk} /> : null}
      </View>
    </>
  );
  if (!onPress) return <View style={{ flex: 1, gap: 2 }}>{body}</View>;
  return (
    <Pressable testID={testID} onPress={onPress}
      accessibilityRole="button" accessibilityLabel={`${value} ${label}. Opens the weekly review`}
      style={({ pressed }) => ({
        flex: 1, gap: 2, minHeight: TAP_MIN, justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}>
      {body}
    </Pressable>
  );
}

function SectionHead({ title, icon, caption }: { title: string; icon: string; caption: string }) {
  const { theme } = useTheme();
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
        <Icon name={icon} size={17} color={theme.accentInk} />
        <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '800', color: theme.fgStrong }}>{title}</Text>
      </View>
      {caption ? (
        <Text style={{ fontSize: 11, color: theme.muted, marginTop: 3 }}>{caption}</Text>
      ) : null}
    </>
  );
}

/** One slot of the sections grid: half the row when two-up, the whole row
 *  when stacked. The card inside fills it, so two cards in one row are the
 *  same height. */
function Cell({ children, twoUp }: { children: React.ReactNode; twoUp: boolean }) {
  return (
    <View style={{
      width: twoUp ? '50%' : '100%',
      paddingHorizontal: twoUp ? SPACE.md / 2 : 0,
    }}>{children}</View>
  );
}

/** One section's card. The three sections draw different marks inside it, so
 *  what they share is the frame and nothing else. */
function Card({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={{
      flex: 1, padding: 16, borderRadius: RADIUS.lg,
      backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
    }}>{children}</View>
  );
}
