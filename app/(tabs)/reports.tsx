import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { Screen, Muted, H2, Skeleton, EmptyState, ErrorState } from '../../src/components/ui';
import { ScreenHeader } from '../../src/components/AppShell';
import { MiniPie } from '../../src/components/Donut';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS } from '../../src/theme/tokens';
import { useFollowUp, useWeekRows } from '../../src/data/hooks';
import { resolvePeriod, type PeriodChoice } from '../../src/data/period';
import {
  reportRows, reportTotal, reportHeadline, reportMeta,
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
  const weekRows = useWeekRows(forced);

  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;

  const members = followUp.data?.members ?? [];
  const rows = reportRows(members, scope);
  const overall = reportTotal(members);
  const headline = reportHeadline(rows, scope);

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
          <LinearGradient
            colors={[theme.accentDeep, theme.accentDeep2]}
            start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
            style={{
              marginTop: SPACE.lg, padding: SPACE.xl, borderRadius: 20,
              borderWidth: 1, borderColor: theme.lineStrong,
            }}>
            <Text style={{
              fontSize: 11, fontWeight: '700', letterSpacing: 0.9,
              textTransform: 'uppercase', color: theme.accentInk,
            }}>{headline}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: SPACE.sm, marginTop: 10 }}>
              <Text style={{
                fontSize: 44, fontWeight: '800', color: theme.onAccent,
                fontVariant: ['tabular-nums'],
              }}>{overall.pct === null ? '—' : `${overall.pct}%`}</Text>
              <Text style={{ flex: 1, fontSize: 13, color: theme.onDeep, lineHeight: 19 }}>
                {overall.pct === null
                  ? 'No session was scheduled in this period, so there is nothing to attend'
                  : `of ${overall.expected} scheduled sessions attended`}
              </Text>
            </View>
          </LinearGradient>

          {/* The canvas draws a pie per member, course or branch -- not a bar
              -- and pairs each with its own written percentage and counts, so
              the ring never carries the meaning alone. */}
          <View style={{
            flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, marginTop: SPACE.lg,
          }}>
            {rows.map(r => {
              const meta = reportMeta(r, scope);
              return (
                <View key={r.label}
                  style={{
                    flexGrow: 1, flexBasis: 150, alignItems: 'center', gap: 10,
                    padding: 14, borderRadius: RADIUS.lg, backgroundColor: theme.surface,
                    borderWidth: 1, borderColor: theme.line,
                  }}>
                  <MiniPie pct={r.pct}
                    label={`${r.label}: ${r.pct === null ? 'no sessions' : `${r.pct}%`}. ${meta}`} />
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: theme.fgStrong, textAlign: 'center' }}>
                      {r.label}
                    </Text>
                    <Text style={{
                      fontSize: 10.5, color: theme.muted, marginTop: 4,
                      textAlign: 'center', fontVariant: ['tabular-nums'],
                    }}>{meta}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={{
            flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, marginTop: SPACE.md,
            paddingVertical: 13, paddingHorizontal: 15, borderRadius: RADIUS.md,
            backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
          }}>
            {([['Attended', ink('present')], ['Missed', ink('absent')], ['No sessions scheduled', theme.muted]] as const)
              .map(([label, color]) => (
                <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: color }} />
                  <Text style={{ fontSize: 11.5, fontWeight: '600', color: theme.fg }}>{label}</Text>
                </View>
              ))}
          </View>

          {/* The week table is academy-wide by construction (fetchWeekRows
              takes no scope), so it renders under the course and branch views
              and says which weeks it covers -- not under Members, where a
              per-member reading of it would be wrong. */}
          {scope !== 'Members' && weekRows.state === 'ready' && (weekRows.data ?? []).length > 0 && (
            <View style={{
              marginTop: SPACE.md, padding: SPACE.lg, borderRadius: RADIUS.lg,
              backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
            }}>
              <H2>Week by week</H2>
              <Muted style={{ marginTop: 4, marginBottom: SPACE.md }}>
                Weeks run Monday to Sunday, academy-wide — the scope above does not narrow these rows.
              </Muted>
              {(weekRows.data ?? []).map(w => {
                const pct = w.expected ? Math.round((w.attended / w.expected) * 100) : null;
                const tone = pct === null ? theme.muted
                  : pct >= 70 ? ink('present') : pct >= 45 ? ink('awaiting') : ink('absent');
                return (
                  <View key={w.label} style={{ marginBottom: SPACE.md }}>
                    <View style={{ flexDirection: 'row' }}>
                      <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '700', color: theme.fgStrong }}>
                        {w.label}{w.current ? ' · this week' : ''}{w.partial ? ' · partial' : ''}
                      </Text>
                      <Text style={{ fontSize: 13.5, fontWeight: '800', color: tone, fontVariant: ['tabular-nums'] }}>
                        {pct === null ? '—' : `${pct}%`}
                      </Text>
                    </View>
                    <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.control, marginTop: 6, overflow: 'hidden' }}>
                      <View style={{ width: `${pct ?? 0}%`, height: 8, backgroundColor: tone }} />
                    </View>
                    <Muted style={{ marginTop: 4 }}>
                      {`${w.expected} expected · ${w.attended} attended · ${w.expected - w.attended} missed`}
                    </Muted>
                  </View>
                );
              })}
            </View>
          )}
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
