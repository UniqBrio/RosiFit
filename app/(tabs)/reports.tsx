import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Muted, Skeleton, EmptyState, ErrorState } from '../../src/components/ui';
import { ScreenHeader } from '../../src/components/AppShell';
import { Icon } from '../../src/components/Icon';
import { DropdownRow, DropdownField, DropdownPanel } from '../../src/components/Dropdown';
import { PeriodPanel, periodFieldValue } from '../../src/components/PeriodFilter';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, onStatusFill } from '../../src/theme/tokens';
import { useFollowUp, useCourses } from '../../src/data/hooks';
import { resolvePeriod, iso, type PeriodChoice } from '../../src/data/period';
import {
  reportRows, reportBars, reportMeta, reportGroups,
  memberDetailLine, courseDetailLine, courseForGroup,
  REPORT_SCOPES, type ReportScope,
} from '../../src/data/report';
import { membersInPeriod } from '../../src/data/joined';
import { reportSheets, reportFileName } from '../../src/data/reportSheets';
import { buildReportWorkbook } from '../../src/data/reportXlsx';
import { downloadBlob } from '../../src/data/csv';

/**
 * The member and course report.
 *
 * THE BRANCH TAB IS GONE, and the branch GROUPING is not
 * (requests/2026-09-08-reports-details-two-sheets-and-dash-course.md, part 1).
 * REPORT_SCOPES is what this screen renders; reportRows still accepts
 * 'Branches' because that arithmetic is specified and passing, and deleting a
 * tested behaviour to remove a button is a larger act than the ask.
 *
 * WHAT WAS WRONG HERE
 * Every figure on this screen was typed by hand. COURSE_BARS and BRANCH_BARS
 * were literal arrays ("Prenatal Flow 74%, 40 scheduled · 30 attended"), the
 * headline said "Attendance across 4 courses" whatever the academy ran, the
 * total said 61%, the period said "1-24 Aug" forever, and the Members scope
 * read the MEMBERS fixture rather than the live query. Nothing on the report
 * was counting anything.
 *
 * That is worse than a screen that is missing. A report is the artefact
 * somebody acts on months later -- "which branch is slipping" -- and this one
 * agreed with the dashboard, the member list and the database by coincidence
 * at best.
 *
 * It now reads the same member rows the dashboard donut reads (guardrail 1,
 * one member source), aggregates them in src/data/report.ts where the
 * arithmetic is testable, and exports what is on screen.
 */
export default function Reports() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const { state: forced } = useLocalSearchParams<{ state?: string }>();

  const [scope, setScope] = useState<ReportScope>('Courses');
  // The period is a CONTROL, not a caption. It used to be a hardcoded string
  // that changed with the scope, so the report claimed a range nobody chose
  // and no query had run over.
  const [period, setPeriod] = useState<PeriodChoice>({ key: 'This month' });
  // The line above was the intent; the control itself was never mounted, so
  // `setPeriod` had no call site and the report stayed pinned to whatever
  // calendar month it opened on -- while the subtitle went on naming that
  // range as though somebody had chosen it. This opens the panel that sets it.
  const [periodOpen, setPeriodOpen] = useState(false);
  const range = resolvePeriod(period);

  const followUp = useFollowUp(forced, range);
  // ADDITIVE, and deliberately not folded into the line above. A course row
  // now states what the course form holds -- its branches, its days, its
  // times -- and none of that is a FIGURE: every number on this screen still
  // comes from the member rows alone (guardrail 1). So the report renders in
  // full while this is loading and if it fails; the detail line is simply
  // absent. A report that failed for want of a decoration would be a report
  // that failed for a reason nothing to do with attendance.
  const courses = useCourses(forced);

  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;

  // The members the PERIOD could be about. A member who joined after the
  // whole range had passed was not in it, and her row -- 0 expected, 0
  // attended, "no sessions scheduled" -- is not a reading of her attendance
  // but a member the academy did not have that month, in the report and in
  // the CSV somebody keeps (src/data/joined.ts).
  const members = membersInPeriod(followUp.data?.members ?? [], range);
  // ONE grouping, read twice: the bars are drawn from it and the detail line
  // under each bar is counted from it. Two groupings is exactly how a member
  // count and the bar above it start disagreeing.
  const groups = reportGroups(members, scope);
  const rows = reportRows(members, scope);
  const bars = reportBars(rows);
  const courseList = courses.data ?? [];
  const today = iso(new Date());

  /**
   * What each row is ABOUT -- the fields of the form behind its name
   * (requests/2026-09-08-reports-details-two-sheets-and-dash-course.md,
   * parts 2 and 3). Index-aligned with `bars`, because both are mapped from
   * `groups` one for one.
   *
   * A branch grouping has no form behind it, so it gets no line rather than
   * an invented one. It has no tab either; the scope survives only because
   * its arithmetic is specified and passing.
   */
  const detailFor = (i: number): string | null => {
    const g = groups[i];
    if (!g) return null;
    if (scope === 'Members') return memberDetailLine(g.members[0], today);
    if (scope === 'Courses') return courseDetailLine(g.members.length, courseForGroup(g, courseList));
    return null;
  };

  // The count sits ON the coloured segment, so its ink follows the THEME, not
  // the canvas: see onStatusFill. Swept in scripts/check-contrast.ts.
  const onBar = onStatusFill(theme.isDark);

  /**
   * The export -- a WORKBOOK now, not a CSV.
   *
   * Sheet 1 is the file that was exported before this change, unmoved: the
   * same header and the same five values per row, because it is the sheet
   * somebody already keeps and compares month to month. Sheet 2 is every
   * member the report counted with what her form holds, and the Courses
   * report gets a third with each course's own fields and its member count
   * (requests/2026-09-08-reports-details-two-sheets-and-dash-course.md).
   *
   * ASYNC, because exceljs is loaded on first use -- ~950 KB that no member
   * of staff should download to read a register. `busy` is what stops a
   * second press starting a second build while the first is still running.
   */
  const [busy, setBusy] = useState(false);
  const exportReport = async () => {
    if (busy) return;
    // The rules come with the member rows, so this cannot be null while the
    // button is on screen -- the button only renders in the ready state. Said
    // rather than asserted: an export that invented a follow-up rule would
    // put a threshold nobody set into a file somebody keeps.
    const loaded = followUp.data;
    if (!loaded) return flash('The report is still loading.', 'warn');
    setBusy(true);
    try {
      const sheets = reportSheets({
        scope, rows, members,
        courses: courseList,
        rules: loaded.rules,
        periodLabel: range.label,
        todayIso: today,
      });
      downloadBlob(
        reportFileName(scope, range.from, range.to),
        new Blob([await buildReportWorkbook(sheets)], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );
      // The second sheet is NAMED, not counted. "2 sheets" tells somebody
      // nothing about the one that is new to them, and a workbook whose
      // second sheet nobody notices is the same as no second sheet.
      flash(`Exported ${rows.length} ${rows.length === 1 ? 'row' : 'rows'} · with ${sheets[1].name.toLowerCase()}, opens in Excel`);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'The report could not be exported.', 'warn');
    } finally {
      setBusy(false);
    }
  };

  const ready = followUp.state === 'ready';

  return (
    <Screen header={
      <ScreenHeader title="Reports" subtitle={`${range.label} · uploaded sessions only`}
        right={ready && rows.length > 0 ? (
          /* THE export control. It was one of two -- an identical full-width
             button sat under the legend and made the same call on the same
             rows -- and it is now the only one. */
          <Pressable testID="reports-export" onPress={exportReport}
            accessibilityRole="button" accessibilityState={{ busy }}
            accessibilityLabel={scope === 'Courses'
              ? 'Export this course report as a spreadsheet of two sheets: attendance and course details'
              : `Export this ${scope.toLowerCase()} report as a spreadsheet of two sheets: attendance and member details`}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 5,
              height: 36, paddingHorizontal: 12, borderRadius: 11,
              backgroundColor: theme.control, borderWidth: 1, borderColor: theme.lineStrong,
              opacity: pressed ? 0.7 : 1,
            })}>
            <Icon name="download" size={16} color={theme.accentInk} />
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.accentInk }}>
              {busy ? 'Exporting…' : 'Export'}
            </Text>
          </Pressable>
        ) : undefined} />}>

      {/* The date filter. It is the SAME control Overview and Attendance
          carry -- one PeriodPanel, so the four named ranges and the custom
          one mean the same thing on every screen that has a period (CP-012).
          Reports was the only screen holding a period it could not be asked
          to change.

          It sits ABOVE the branch below, so it renders in the loading, error
          and empty states as well as the ready one. That is the whole point
          of putting it here: "Nothing to report yet" for a month somebody did
          not pick, with no way to pick another, is a dead end -- and it is
          the state a filter is most needed in. */}
      <DropdownRow open={periodOpen} style={{ marginTop: SPACE.md }}
        dismiss={{ onPress: () => setPeriodOpen(false), testID: 'reports-filter-dismiss' }}>
        <View style={{ flexDirection: 'row' }}>
          <DropdownField
            testID="reports-filter-period"
            label="Period" value={periodFieldValue(period)}
            open={periodOpen}
            onPress={() => setPeriodOpen(o => !o)} />
        </View>

        {periodOpen ? (
          <DropdownPanel maxHeight={430}>
            <PeriodPanel testID="reports-period" choice={period}
              onChange={setPeriod} onDone={() => setPeriodOpen(false)} />
          </DropdownPanel>
        ) : null}
      </DropdownRow>

      <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md }}>
        {REPORT_SCOPES.map(s => {
          const on = scope === s;
          return (
            <Pressable key={s} testID={`reports-scope-${s.toLowerCase()}`}
              onPress={() => setScope(s)}
              accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={{
                flex: 1, minHeight: TAP_MIN, alignItems: 'center', justifyContent: 'center',
                borderRadius: RADIUS.pill,
                backgroundColor: on ? theme.accent : theme.surface,
                borderWidth: 1, borderColor: on ? theme.accent : theme.lineStrong,
              }}>
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: on ? theme.onAccent : theme.fg }}>{s}</Text>
            </Pressable>
          );
        })}
      </View>

      {followUp.state === 'loading' ? (
        <View style={{ marginTop: SPACE.lg }}><Skeleton lines={6} /></View>
      ) : followUp.state === 'error' ? (
        <View style={{ marginTop: SPACE.lg }}>
          <ErrorState onRetry={followUp.retry}
            message={followUp.error ?? 'The report could not be loaded. Nothing has been changed.'} />
        </View>
      ) : rows.length === 0 ? (
        <View style={{ marginTop: SPACE.lg }}>
          <EmptyState
            title="Nothing to report yet"
            body="A report counts uploaded sessions. Once attendance files are in for this period, every member and course appears here." />
        </View>
      ) : (
        <>
          {/* ONE card, as the canvas draws it: a title, "attended vs missed",
              and a stacked bar per row. The hero gradient that used to sit
              above this is not in the canvas -- it restated as a headline the
              same figure the bars already carry, and it is the second-place-
              a-number-lives pattern the dashboard was just cleared of. */}
          <View style={{
            marginTop: SPACE.xl, padding: 16, borderRadius: 20,
            backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: SPACE.sm }}>
              <Text style={{ flex: 1, fontSize: 13, fontWeight: '800', color: theme.fgStrong }}>
                {`By ${scope.toLowerCase().replace(/s$/, '')}`}
              </Text>
              <Text style={{ fontSize: 10.5, color: theme.muted }}>Attended vs missed</Text>
            </View>

            <View style={{ gap: 14, marginTop: 16 }}>
              {bars.map((b, i) => {
                const valueInk = b.pct === null ? theme.muted
                  : b.pct >= 70 ? ink('present') : b.pct >= 45 ? ink('awaiting') : ink('absent');
                const meta = reportMeta(b);
                const detail = detailFor(i);
                return (
                  <View key={b.label}
                    accessible
                    accessibilityLabel={`${b.label}.${detail ? ` ${detail}.` : ''} ${b.pct === null ? 'No sessions scheduled' : `${b.pct} per cent`}. ${meta}`}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: SPACE.sm }}>
                      <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: theme.fgStrong }}>
                        {b.label}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: valueInk, fontVariant: ['tabular-nums'] }}>
                        {b.pct === null ? '—' : `${b.pct}%`}
                      </Text>
                    </View>

                    {/* WHAT THIS ROW IS ABOUT -- the fields of the form behind
                        its name. Above the bar rather than below it, because
                        it identifies the row and the meta line under the bar
                        reads the bar. Wraps rather than clips: on a phone the
                        end of the line is the member count and the days, which
                        is the part this was added for. */}
                    {detail ? (
                      <Text style={{ fontSize: 11, color: theme.muted, marginTop: 2, lineHeight: 15 }}>
                        {detail}
                      </Text>
                    ) : null}

                    <View style={{
                      flexDirection: 'row', height: 22, marginTop: 7, borderRadius: 7,
                      overflow: 'hidden', backgroundColor: theme.surface2,
                      borderWidth: 1, borderColor: theme.line,
                    }}>
                      {/* padding only when there is a count to inset. A flex
                          item cannot shrink below its own padding, so a 5px
                          gutter gave every ZERO-width segment a 5px stub --
                          a course with nothing scheduled drew a green and red
                          sliver, which reads as data where there is none. */}
                      <View style={{
                        width: `${b.attendedPct}%`, minWidth: 0,
                        backgroundColor: ink('present'),
                        alignItems: 'flex-end', justifyContent: 'center',
                        paddingRight: b.attendedLabel ? 5 : 0,
                      }}>
                        {b.attendedLabel ? (
                          <Text style={{ fontSize: 9.5, fontWeight: '800', color: onBar, fontVariant: ['tabular-nums'] }}>
                            {b.attendedLabel}
                          </Text>
                        ) : null}
                      </View>
                      <View style={{
                        width: `${b.missedPct}%`, minWidth: 0,
                        backgroundColor: ink('absent'),
                        alignItems: 'flex-end', justifyContent: 'center',
                        paddingRight: b.missedLabel ? 5 : 0,
                      }}>
                        {b.missedLabel ? (
                          <Text style={{ fontSize: 9.5, fontWeight: '800', color: onBar, fontVariant: ['tabular-nums'] }}>
                            {b.missedLabel}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {/* every figure in words, so the bar is never the only
                        signal and a zero-length one still says why */}
                    <Text style={{ fontSize: 10.5, color: theme.muted, marginTop: 5, fontVariant: ['tabular-nums'] }}>
                      {meta}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={{
            flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, marginTop: 14,
            paddingVertical: 13, paddingHorizontal: 15, borderRadius: RADIUS.lg,
            backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
          }}>
            {([['Attended', ink('present')], ['Missed', ink('absent')],
               ['Bar length = sessions scheduled', theme.lineStrong]] as const)
              .map(([label, color]) => (
                <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: color }} />
                  <Text style={{ fontSize: 11.5, fontWeight: '600', color: theme.fg }}>{label}</Text>
                </View>
              ))}
          </View>

          {/* THE SECOND EXPORT BUTTON IS GONE.
              `reports-export-excel` sat here, under the legend, and did
              exactly what `reports-export` in the header does -- the same
              call, on the same rows, saving the same file. The requester
              removed it in those words: "remove export button from button as
              export is already present on top right".

              It was a prior round's MUST NOT CHANGE
              (requests/2026-09-07-reports-date-filter.md, "both export
              controls"), and src/components/reportsPeriodFilter.test.ts
              asserted it was still here. That assertion is now inverted
              rather than deleted, so the surface stays guarded and the
              reversal is on the record instead of silent. */}
        </>
      )}

      <View style={{
        marginTop: SPACE.lg, padding: 15, borderRadius: RADIUS.md,
        backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
      }}>
        <Muted>
          Sessions still awaiting upload are counted for nobody here. Holidays and cancellations are
          excluded from every figure.
        </Muted>
      </View>
    </Screen>
  );
}
