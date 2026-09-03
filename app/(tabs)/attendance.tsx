import { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, Muted, Label, Skeleton, EmptyState, ErrorState } from '../../src/components/ui';
import { ScreenHeader } from '../../src/components/AppShell';
import { safeBackTarget } from '../../src/data/nav';
import { Icon } from '../../src/components/Icon';
import { DropdownRow, DropdownField, DropdownPanel, DropdownList } from '../../src/components/Dropdown';
import { PeriodPanel, periodFieldValue } from '../../src/components/PeriodFilter';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface, type StatusKey } from '../../src/theme/tokens';
import { useAttendance, useFilterOptions } from '../../src/data/hooks';
import { resolvePeriod, type PeriodChoice } from '../../src/data/period';
import { formatDate, formatTime } from '../../src/components/DateTimePicker';
import { useAcademy, ALL_BRANCHES } from '../../src/state/academy';
import type { AttendanceRow, AttendanceStatus } from '../../src/data/mock';

/**
 * The attendance register — every fact the uploads produced, filterable.
 *
 * This replaces the month calendar that stood here before. The calendar
 * answered "which days ran"; the question actually being asked of this screen
 * is "who attended what, and when", and that is a list of rows with filters
 * over it, not a grid of days.
 *
 * Every figure on this screen is a COUNT OF THE ROWS BELOW IT. Nothing here
 * re-derives attendance, so the summary and the list cannot disagree — the
 * same reason the dashboard donut reads member_period_metrics rather than
 * counting for itself (C-87).
 *
 * The branch filter reads and writes the shell's academy state, because the
 * header's branch sheet says "Every figure follows this" and a second,
 * screen-local branch would make that untrue.
 */

const ALL_STATUSES = 'All statuses';
const STATUS_OPTIONS = [ALL_STATUSES, 'Present', 'Absent', 'Extra attended'];

/** The list's three statuses map onto the app's status tones, so the word and
 *  the icon carry the meaning and the colour only reinforces it. */
const TONE: Record<AttendanceStatus, StatusKey> = {
  present: 'present', absent: 'absent', extra: 'extra',
};

const STATUS_FILTER: Record<string, AttendanceStatus | null> = {
  [ALL_STATUSES]: null, Present: 'present', Absent: 'absent', 'Extra attended': 'extra',
};

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** '2026-09-02' -> 'Wed 2 Sep 2026' */
function dayLabel(iso: string): string {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${DAYS_SHORT[d.getDay()]} ${formatDate(iso)}`;
}

type FilterKind = 'branch' | 'course' | 'status' | 'period';

export default function Attendance() {
  const { theme } = useTheme();
  const router = useRouter();
  const { state: forced, from } = useLocalSearchParams<{ state?: string; from?: string }>();
  // Where back goes. These three sit INSIDE the tab group -- the canvas keeps
  // the academy header and the nav pill on them -- so router.back() pops to
  // the first tab rather than to the screen that opened this one. The caller
  // names its origin instead; `from` is a URL parameter, so it is validated
  // (src/data/nav.ts) rather than navigated to on trust.
  const backTo = safeBackTarget(from, '/courses');
  const { branch, chooseBranch } = useAcademy();

  const [choice, setChoice] = useState<PeriodChoice>({ key: 'This week' });
  const [course, setCourse] = useState('All courses');
  const [status, setStatus] = useState(ALL_STATUSES);
  const [query, setQuery] = useState('');
  // Only one dropdown is out at a time: two overlapping panels have no
  // honest z-order. The half-picked custom range lives inside PeriodPanel,
  // which is what keeps a start with no end from being applied as a one-day
  // range and silently narrowing the list.
  const [open, setOpen] = useState<FilterKind | null>(null);

  // The period the filter NAMES is the period the query runs over, so a count
  // can never cover a different range from its own label (C-84). Both come
  // from resolvePeriod, off the same two dates.
  const range = resolvePeriod(choice);
  const periodLabel = periodFieldValue(choice);

  const attendance = useAttendance(range, forced);
  const options = useFilterOptions(forced);

  const branchOptions = options.data?.branches ?? [ALL_BRANCHES];
  const courseOptions = options.data?.courses ?? ['All courses'];
  const allCourses = courseOptions[0];

  const all = attendance.data ?? [];
  const wantedStatus = STATUS_FILTER[status] ?? null;
  const q = query.trim().toLowerCase();

  const rows = useMemo(() => all.filter(r =>
    (branch === ALL_BRANCHES || r.branch === branch)
    && (course === allCourses || r.course === course)
    && (wantedStatus === null || r.status === wantedStatus)
    && (!q || r.member.toLowerCase().includes(q) || r.code.toLowerCase().includes(q))
  ), [all, branch, course, allCourses, wantedStatus, q]);

  // Counts, straight off the filtered rows. Present + extra is what turned
  // up; only an EXPECTED absence is a miss, which is the table's own
  // invariant (`status <> 'absent' or expected`) restated on screen.
  const present = rows.filter(r => r.status === 'present').length;
  const absent = rows.filter(r => r.status === 'absent').length;
  const extra = rows.filter(r => r.status === 'extra').length;
  const expected = rows.filter(r => r.expected).length;
  const pct = expected ? Math.round((present / expected) * 100) : null;

  const scopeLabel = branch === ALL_BRANCHES ? 'Every branch' : branch;
  const filters: { label: string; value: string; kind: FilterKind }[] = [
    { label: 'Branch', value: branch, kind: 'branch' },
    { label: 'Course', value: course, kind: 'course' },
    { label: 'Status', value: status, kind: 'status' },
    { label: 'Period', value: periodLabel, kind: 'period' },
  ];

  // Grouped by day, newest first: an attendance register is read a session at
  // a time, and a flat list repeats the same date on every row.
  const groups = useMemo(() => {
    const byDate = new Map<string, AttendanceRow[]>();
    for (const r of rows) {
      const list = byDate.get(r.date) ?? [];
      list.push(r);
      byDate.set(r.date, list);
    }
    return [...byDate.entries()];
  }, [rows]);

  const ink = (k: StatusKey) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;

  const uploadButton = (
    <Pressable testID="attendance-upload" onPress={() => router.push('/upload')}
      accessibilityRole="button" accessibilityLabel="Upload attendance from a Google Meet CSV"
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
        minHeight: TAP_MIN, paddingHorizontal: SPACE.lg, borderRadius: RADIUS.md,
        backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1,
      })}>
      <Icon name="cloud_upload" size={18} color={theme.onAccent} />
      <Text style={{ fontSize: 13, fontWeight: '800', color: theme.onAccent }}>Upload</Text>
    </Pressable>
  );

  const controls = (
    <>
      {/* The filters open in place. A sheet covered the very rows it was
          about to narrow, so the choice was made blind; a panel under the
          fields keeps the counts and the list in view (C-58/C-29). */}
      <DropdownRow open={open !== null}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
          {filters.map(f => (
            <DropdownField key={f.kind}
              testID={`attendance-filter-${f.kind}`}
              label={f.label} value={f.value}
              open={open === f.kind}
              highlight={f.kind !== 'period' && !f.value.startsWith('All')}
              onPress={() => setOpen(o => (o === f.kind ? null : f.kind))}
              style={{ flexBasis: '48%', flexGrow: 1 }} />
          ))}
        </View>

        {open === 'branch' ? (
          <DropdownPanel>
            <DropdownList testID="attendance-branch"
              options={branchOptions.map(label => ({ label }))} value={branch}
              onSelect={l => { chooseBranch(l); setOpen(null); }} />
          </DropdownPanel>
        ) : null}
        {open === 'course' ? (
          <DropdownPanel>
            <DropdownList testID="attendance-course"
              options={courseOptions.map(label => ({ label }))} value={course}
              onSelect={l => { setCourse(l); setOpen(null); }} />
          </DropdownPanel>
        ) : null}
        {open === 'status' ? (
          <DropdownPanel>
            <DropdownList testID="attendance-status"
              options={STATUS_OPTIONS.map(label => ({ label }))} value={status}
              onSelect={l => { setStatus(l); setOpen(null); }} />
          </DropdownPanel>
        ) : null}
        {open === 'period' ? (
          <DropdownPanel maxHeight={430}>
            <PeriodPanel testID="attendance-period" choice={choice}
              onChange={setChoice} onDone={() => setOpen(null)} />
          </DropdownPanel>
        ) : null}
      </DropdownRow>

      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginTop: SPACE.sm,
        height: 46, borderRadius: RADIUS.md, backgroundColor: theme.surface,
        borderWidth: 1, borderColor: theme.lineStrong, paddingHorizontal: 13,
      }}>
        <Icon name="search" size={19} color={theme.muted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search a member or code"
          placeholderTextColor={theme.muted} accessibilityLabel="Search attendance by member or code"
          style={{ flex: 1, color: theme.fgStrong, fontSize: 13.5, fontWeight: '600' }} />
      </View>
    </>
  );

  if (attendance.state === 'loading') {
    return (
      <Screen>
        <ScreenHeader title="Attendance" subtitle={range.label}
          onBack={() => router.navigate(backTo)} right={uploadButton} />
        {controls}
        <View style={{ marginTop: SPACE.lg }}><Skeleton lines={5} /></View>
      </Screen>
    );
  }

  if (attendance.state === 'error') {
    return (
      <Screen>
        <ScreenHeader title="Attendance" subtitle={range.label}
          onBack={() => router.navigate(backTo)} right={uploadButton} />
        {controls}
        <View style={{ marginTop: SPACE.lg }}>
          <ErrorState onRetry={attendance.retry}
            message={attendance.error ?? 'The attendance records could not be loaded. Nothing has been changed.'} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Attendance"
        subtitle={`${rows.length} record${rows.length === 1 ? '' : 's'} · ${scopeLabel} · ${range.label}`}
        onBack={() => router.navigate(backTo)} right={uploadButton} />

      {controls}

      {/* ------------------------------------------------------- the totals */}
      <View style={{
        marginTop: SPACE.lg, padding: SPACE.lg, borderRadius: RADIUS.lg,
        backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: SPACE.sm }}>
          <Text style={{
            fontSize: 30, fontWeight: '800', color: theme.accentInk, fontVariant: ['tabular-nums'],
          }}>{pct === null ? '—' : `${pct}%`}</Text>
          <Text style={{ flex: 1, fontSize: 12.5, color: theme.muted }}>
            {pct === null ? 'nothing expected in this range' : 'of expected sessions attended'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md }}>
          {([['present', present], ['absent', absent], ['extra', extra]] as const).map(([k, n]) => {
            const c = ink(k);
            const box = statusSurface(c);
            return (
              <View key={k} accessible accessibilityLabel={`${n} ${STATUS[k].word}`}
                style={{
                  flex: 1, alignItems: 'center', gap: 4, paddingVertical: SPACE.md,
                  borderRadius: RADIUS.md, backgroundColor: box.bg,
                  borderWidth: 1, borderColor: box.border,
                }}>
                <Icon name={STATUS[k].icon} size={17} color={c} />
                <Text style={{
                  fontSize: 18, fontWeight: '800', color: theme.fgStrong, fontVariant: ['tabular-nums'],
                }}>{n}</Text>
                <Text style={{ fontSize: 10.5, fontWeight: '700', color: theme.muted }}>{STATUS[k].word}</Text>
              </View>
            );
          })}
        </View>
        <Muted style={{ marginTop: SPACE.md, paddingTop: SPACE.md, borderTopWidth: 1, borderTopColor: theme.line }}>
          These are counts of the rows below, under the filters above — nothing is calculated twice.
          An extra attended is someone who came when she was not expected, so it is never a miss.
        </Muted>
      </View>

      {/* --------------------------------------------------------- the list */}
      {all.length === 0 ? (
        <EmptyState
          title="No attendance in this range"
          body="Attendance appears here once a Google Meet file has been uploaded for a session in this period. A session awaiting its file counts for nobody until then."
          action="Upload attendance" onAction={() => router.push('/upload')} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nothing matches these filters"
          body={`There is attendance in ${range.label}, but none of it matches the branch, course, status or search you have set. Widen one of them.`} />
      ) : (
        <View style={{ marginTop: SPACE.lg, gap: SPACE.lg }}>
          {groups.map(([date, list]) => (
            <View key={date}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.sm,
              }}>
                <Icon name="event" size={16} color={theme.accentInk} />
                <Label style={{ flex: 1 }}>{dayLabel(date)}</Label>
                <Muted>{`${list.length} record${list.length === 1 ? '' : 's'}`}</Muted>
              </View>

              <View style={{ gap: SPACE.sm }}>
                {list.map(r => {
                  const tone = TONE[r.status];
                  const c = ink(tone);
                  const box = statusSurface(c);
                  return (
                    <View key={r.id}
                      accessible
                      accessibilityLabel={
                        `${r.member}, ${r.code}. ${STATUS[tone].word}. ${r.course}, ${r.branch}. `
                        + (r.minutes === null ? 'No time in call' : `${r.minutes} minutes in call`)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
                        padding: SPACE.md, borderRadius: RADIUS.md,
                        backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
                      }}>
                      <View style={{
                        width: 38, height: 38, borderRadius: 12,
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: box.bg, borderWidth: 1, borderColor: box.border,
                      }}>
                        <Icon name={STATUS[tone].icon} size={18} color={c} />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700', color: theme.fgStrong }}>
                          {r.member}
                        </Text>
                        <Text numberOfLines={1} style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>
                          {`${r.code} · ${r.course} · ${r.branch}`}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        {/* the word, always — the colour is never the only signal */}
                        <Text style={{ fontSize: 11, fontWeight: '800', color: c }}>{STATUS[tone].word}</Text>
                        <Text style={{
                          fontSize: 11, color: theme.muted, marginTop: 2, fontVariant: ['tabular-nums'],
                        }}>
                          {r.time ? formatTime(r.time) : '—'}
                          {r.minutes === null ? '' : ` · ${r.minutes} min`}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      )}

    </Screen>
  );
}
