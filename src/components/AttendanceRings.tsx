import { View, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { SPACE, onStatusFill } from '../theme/tokens';
import { Icon } from './Icon';
import { reportMeta, type ReportRow } from '../data/report';

/**
 * SMALL RINGS -- one per course, or one per sub-range of the period. Each is
 * the attended share of what was expected of that group, Present against
 * Absent, with the percentage in the hole: the same mark the Attendance ring
 * draws for the whole picture, at a size that fits several in a row.
 *
 * WHY RINGS, WHEN THIS USED TO BE A DOT PLOT AND A LINE
 * The requester asked for it in as many words -- "bring donut chart or pie
 * chart based on period and based on course"
 * (requests/2026-09-06-overview-two-per-row-donuts.md) -- and the reason
 * holds up: the Overview is a glance, and four rings that mean exactly what
 * the big ring above them means are one thing to learn, not three. The dot
 * plot and the line each carried an axis and a note explaining how to read
 * it; a ring carries its own number.
 *
 * WHAT IS KEPT FROM THE MARKS IT REPLACED
 * - The numbers come in as ReportRow from the same grouping the bars read.
 *   Nothing here totals anything; the ring cannot disagree with the report
 *   (guardrail 1).
 * - A group that expected NOTHING is a dash on an empty track, never 0%: a
 *   course with no sessions this week and a course everybody skipped are
 *   different facts.
 * - The colour is never the only signal: the percentage is in text ink, the
 *   counts are written under each ring, and the legend names Present and
 *   Absent beside a glyph (guardrail 3). The two fills are the measured
 *   status tokens, the same pair the big ring uses, both themes.
 */

/** The ring's outer size and stroke. 84 fits two across a phone and four or
 *  five across a half-width desktop card, and leaves the hole wide enough
 *  for "100%". */
const SIZE = 84, W = 11;
/** Each ring's column: wide enough for a course name on two lines AND for
 *  the three figures under it -- scheduled, attended, missed -- which is what
 *  widened it from 108. Four still fit across a half-width desktop card, two
 *  across a phone. */
const COL = 132;

export function AttendanceRings({ rows, testID }: { rows: ReportRow[]; testID: string }) {
  const { theme } = useTheme();
  const R = (SIZE - W) / 2, C = 2 * Math.PI * R, c = SIZE / 2;

  const segs = [
    { label: 'Present', color: theme.success, icon: 'check' },
    { label: 'Absent',  color: theme.danger,  icon: 'close' },
  ] as const;

  return (
    <View testID={testID}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
        {rows.map(r => {
          const absent = Math.max(r.expected - r.attended, 0);
          const present = r.expected ? (r.attended / r.expected) * C : 0;
          // The SAME line the member bars write, from the same function --
          // so a course cannot be described one way under a ring and another
          // way under a bar. "1 of 9 present" left the reader to subtract for
          // the figure she is actually chasing: how many were missed.
          const counts = reportMeta(r);
          return (
            <View key={r.label} testID={`${testID}-row`} accessible
              accessibilityLabel={r.pct === null
                ? `${r.label}. No sessions scheduled.`
                : `${r.label}. ${r.pct} per cent present: ${r.attended} present and ${absent} absent of ${r.expected} expected`}
              style={{ width: COL, alignItems: 'center', gap: 5 }}>
              <View>
                <Svg width={SIZE} height={SIZE}>
                  <G rotation={-90} originX={c} originY={c}>
                    <Circle cx={c} cy={c} r={R} stroke={theme.control} strokeWidth={W} fill="none" />
                    {r.expected > 0 ? (
                      <>
                        <Circle cx={c} cy={c} r={R} stroke={theme.success} strokeWidth={W} fill="none"
                          strokeDasharray={`${present} ${C - present}`} strokeLinecap="butt" />
                        <Circle cx={c} cy={c} r={R} stroke={theme.danger} strokeWidth={W} fill="none"
                          strokeDasharray={`${C - present} ${present}`} strokeDashoffset={-present}
                          strokeLinecap="butt" />
                      </>
                    ) : null}
                  </G>
                </Svg>
                {/* the value in the hole, in text ink -- never the segment's colour */}
                <View style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  alignItems: 'center', justifyContent: 'center',
                }} pointerEvents="none">
                  <Text style={{
                    fontSize: 16, fontWeight: '800', color: theme.fgStrong,
                    fontVariant: ['tabular-nums'], lineHeight: 18,
                  }}>{r.pct === null ? '—' : `${r.pct}%`}</Text>
                </View>
              </View>
              <Text numberOfLines={2} style={{
                fontSize: 12, fontWeight: '700', color: theme.fgStrong, textAlign: 'center', lineHeight: 15,
              }}>{r.label}</Text>
              {/* two lines, because the three figures no longer fit on one
                  at this width -- and truncating them would put the ring back
                  to carrying a percentage alone. */}
              <Text numberOfLines={2} style={{
                fontSize: 10.5, lineHeight: 14, color: theme.muted,
                textAlign: 'center', fontVariant: ['tabular-nums'],
              }}>{counts}</Text>
            </View>
          );
        })}
      </View>

      {/* the word AND its icon, never the swatch alone (guardrail 3) */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, marginTop: SPACE.md }}>
        {segs.map(s => (
          <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{
              width: 18, height: 18, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
              backgroundColor: s.color,
            }}>
              {/* the ink on a status fill is MEASURED, both themes -- see
                  onStatusFill and scripts/check-contrast.ts */}
              <Icon name={s.icon} size={12} color={onStatusFill(theme.isDark)} />
            </View>
            <Text style={{ fontSize: 11.5, fontWeight: '600', color: theme.fg }}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
