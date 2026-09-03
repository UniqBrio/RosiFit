import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Muted, Skeleton, EmptyState, ErrorState } from '../../src/components/ui';
import { ScreenHeader } from '../../src/components/AppShell';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, onStatusFill } from '../../src/theme/tokens';
import { useFollowUp } from '../../src/data/hooks';
import { resolvePeriod, type PeriodChoice } from '../../src/data/period';
import {
  reportRows, reportBars, reportMeta,
  REPORT_SCOPES, type ReportScope,
} from '../../src/data/report';
import { toCsv } from '../../src/data/csvFormat';
import { downloadCsv } from '../../src/data/csv';

/**
 * The member, course and branch report.
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
  const range = resolvePeriod(period);

  const followUp = useFollowUp(forced, range);

  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;

  const members = followUp.data?.members ?? [];
  const rows = reportRows(members, scope);
  const bars = reportBars(rows);

  // The count sits ON the coloured segment, so its ink follows the THEME, not
  // the canvas: see onStatusFill. Swept in scripts/check-contrast.ts.
  const onBar = onStatusFill(theme.isDark);

  const exportReport = () => {
    try {
      downloadCsv(
        `rosifit-${scope.toLowerCase()}-report-${range.from}-to-${range.to}.csv`,
        toCsv(
          [scope === 'Members' ? 'Member' : scope === 'Courses' ? 'Course' : 'Branch',
           'Expected', 'Attended', 'Missed', 'Attendance %', 'Period'],
          rows.map(r => [
            r.label,
            String(r.expected),
            String(r.attended),
            String(r.expected - r.attended),
            // The same words the screen shows. An exported "0%" where the
            // screen says "no sessions" is the report disagreeing with itself
            // in the file somebody keeps.
            r.pct === null ? 'no sessions scheduled' : `${r.pct}%`,
            range.label,
          ]),
        ),
      );
      flash(`Exported ${rows.length} ${rows.length === 1 ? 'row' : 'rows'} · CSV, opens in Excel`);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'The report could not be exported.', 'warn');
    }
  };

  const ready = followUp.state === 'ready';

  return (
    <Screen>
      <ScreenHeader title="Reports" subtitle={`${range.label} · uploaded sessions only`}
        right={ready && rows.length > 0 ? (
          <Pressable testID="reports-export" onPress={exportReport}
            accessibilityRole="button"
            accessibilityLabel={`Export this ${scope.toLowerCase()} report as CSV`}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 5,
              height: 36, paddingHorizontal: 12, borderRadius: 11,
              backgroundColor: theme.control, borderWidth: 1, borderColor: theme.lineStrong,
              opacity: pressed ? 0.7 : 1,
            })}>
            <Icon name="download" size={16} color={theme.accentInk} />
            <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.accentInk }}>Export</Text>
          </Pressable>
        ) : undefined} />

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
            body="A report counts uploaded sessions. Once attendance files are in for this period, every member, course and branch appears here." />
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
              <Text style={{ fontSize: 10.5, color: theme.muted }}>attended vs missed</Text>
            </View>

            <View style={{ gap: 14, marginTop: 16 }}>
              {bars.map(b => {
                const valueInk = b.pct === null ? theme.muted
                  : b.pct >= 70 ? ink('present') : b.pct >= 45 ? ink('awaiting') : ink('absent');
                const meta = reportMeta(b);
                return (
                  <View key={b.label}
                    accessible
                    accessibilityLabel={`${b.label}. ${b.pct === null ? 'No sessions scheduled' : `${b.pct} per cent`}. ${meta}`}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: SPACE.sm }}>
                      <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: theme.fgStrong }}>
                        {b.label}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: valueInk, fontVariant: ['tabular-nums'] }}>
                        {b.pct === null ? '—' : `${b.pct}%`}
                      </Text>
                    </View>

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

          <Pressable testID="reports-export-excel" onPress={exportReport}
            accessibilityRole="button"
            accessibilityLabel={`Export this ${scope.toLowerCase()} report as a spreadsheet`}
            style={({ pressed }) => ({
              marginTop: 14, height: 50, borderRadius: RADIUS.lg,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm,
              backgroundColor: theme.control, borderWidth: 1, borderColor: theme.lineStrong,
              opacity: pressed ? 0.75 : 1,
            })}>
            <Icon name="download" size={19} color={theme.accentInk} />
            <Text style={{ fontSize: 13.5, fontWeight: '800', color: theme.accentInk }}>Export as Excel</Text>
          </Pressable>
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
