import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { SPACE, RADIUS, STATUS, onStatusFill } from '../theme/tokens';
import { reportBars, reportMeta, type ReportRow } from '../data/report';

/**
 * Attended-vs-missed bars, one row per thing being compared.
 *
 * ONE component for all three Overview sections -- by member, by course, by
 * period -- because they are the same question asked of three groupings, and
 * three hand-drawn copies of a bar is how two of them end up with a different
 * scale, a different rounding, or a legend that stops matching its chart.
 *
 * THE BAR'S LENGTH IS ITSELF A FIGURE. The track is scaled to the widest
 * row's scheduled count, so a course with 40 sessions draws twice the bar of
 * one with 20 and the green/red split inside it is that row's attendance.
 * Two numbers per row, in one shape, comparable straight down the column.
 *
 * Every figure is also written out underneath (reportMeta), so nothing here
 * rests on a length or a colour alone -- guardrail 3 applied to a chart.
 */
export function AttendanceBars({ rows, testID }: { rows: ReportRow[]; testID: string }) {
  const { theme } = useTheme();
  const ink = (k: 'present' | 'absent' | 'awaiting') =>
    theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;
  // The count sits ON the coloured segment, so its ink follows the THEME.
  // Measured in both directions by scripts/check-contrast.ts.
  const onBar = onStatusFill(theme.isDark);
  const bars = reportBars(rows);

  return (
    <View style={{ gap: 13 }} testID={testID}>
      {bars.map(b => {
        const valueInk = b.pct === null ? theme.muted
          : b.pct >= 70 ? ink('present') : b.pct >= 45 ? ink('awaiting') : ink('absent');
        const meta = reportMeta(b);
        return (
          <View key={b.label} testID={`${testID}-row`}
            accessible
            accessibilityLabel={`${b.label}. ${b.pct === null ? 'No sessions scheduled' : `${b.pct} per cent present`}. ${meta}`}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: SPACE.sm }}>
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: theme.fgStrong }}>
                {b.label}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: valueInk, fontVariant: ['tabular-nums'] }}>
                {b.pct === null ? '—' : `${b.pct}%`}
              </Text>
            </View>

            <View style={{
              flexDirection: 'row', height: 20, marginTop: 6, borderRadius: 7,
              overflow: 'hidden', backgroundColor: theme.surface2,
              borderWidth: 1, borderColor: theme.line,
            }}>
              {/* padding only when there is a count to inset. A flex item
                  cannot shrink below its own padding, so a gutter would give
                  every ZERO-width segment a stub -- a row with nothing
                  scheduled drawing a sliver of green and red, which reads as
                  data where there is none. */}
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

            <Text style={{ fontSize: 10.5, color: theme.muted, marginTop: 4, fontVariant: ['tabular-nums'] }}>
              {meta}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Present · Absent · what the bar's length means — said once, under the
 *  three sections it applies to, rather than repeated inside each. */
export function AttendanceBarsLegend() {
  const { theme } = useTheme();
  const ink = (k: 'present' | 'absent') => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;
  return (
    <View style={{
      flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md,
      paddingVertical: 11, paddingHorizontal: 14, borderRadius: RADIUS.lg,
      backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
    }}>
      {([['Present', ink('present')], ['Absent', ink('absent')],
         ['Bar length = sessions expected', theme.lineStrong]] as const).map(([label, color]) => (
        <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: color }} />
          <Text style={{ fontSize: 11.5, fontWeight: '600', color: theme.fg }}>{label}</Text>
        </View>
      ))}
    </View>
  );
}
