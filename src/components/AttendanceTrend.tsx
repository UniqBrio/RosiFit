import { useState } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { SPACE } from '../theme/tokens';
import type { ReportRow } from '../data/report';

/**
 * A LINE over time — attendance as it moved across the period.
 *
 * WHY A LINE AND NOT A THIRD SET OF BARS
 * Time is the one dimension a reader already knows how to scan: left to
 * right, and the SHAPE is the finding. A row of bars stacked downwards makes
 * "Thursday fell off" something you work out by comparing seven lengths; a
 * line makes it something you see. Bars would also invite the eye to compare
 * days as if they were categories, which is exactly what they are not.
 *
 * ONE MEASURE, ONE AXIS. The percentage is plotted; the counts behind each
 * point are written under the chart rather than given a second y-axis, which
 * is the single most reliable way to make a chart lie about a correlation.
 *
 * A bucket that expected NOTHING breaks the line rather than plotting zero. A
 * week with no sessions is not a week nobody came to, and a line dropping to
 * the floor says the second thing.
 */

/** Labelling every point is chaos and goes unread, so the ends carry the
 *  values and the axis carries the rest. */
function endLabels(points: { i: number; pct: number }[]): Set<number> {
  if (points.length === 0) return new Set();
  const lo = points.reduce((a, b) => (b.pct < a.pct ? b : a));
  const hi = points.reduce((a, b) => (b.pct > a.pct ? b : a));
  return new Set([points[0].i, points[points.length - 1].i, lo.i, hi.i]);
}

export function AttendanceTrend({ rows, overall, testID }:
  { rows: ReportRow[];
    /** the whole period's percentage — the SAME figure the ring shows, drawn
     *  as the line the buckets are read against, never recomputed here */
    overall: number | null;
    testID: string }) {
  const { theme } = useTheme();
  const [width, setWidth] = useState(0);

  const H = 132, TOP = 16, BOTTOM = 18, PAD = 8;
  const plot = H - TOP - BOTTOM;
  const inner = Math.max(width - PAD * 2, 1);
  const x = (i: number) => rows.length <= 1 ? PAD + inner / 2 : PAD + (i / (rows.length - 1)) * inner;
  const y = (pct: number) => TOP + (1 - pct / 100) * plot;

  const points = rows.map((r, i) => ({ i, pct: r.pct })).filter(
    (p): p is { i: number; pct: number } => p.pct !== null);
  const labelled = endLabels(points);

  // Consecutive runs, so a bucket that expected nothing leaves a GAP in the
  // line instead of a false dive to zero.
  const runs: { i: number; pct: number }[][] = [];
  for (const p of points) {
    const last = runs[runs.length - 1];
    if (last && last[last.length - 1].i === p.i - 1) last.push(p);
    else runs.push([p]);
  }
  const linePath = (run: { i: number; pct: number }[]) =>
    run.map((p, k) => `${k === 0 ? 'M' : 'L'}${x(p.i)},${y(p.pct)}`).join(' ');
  const areaPath = (run: { i: number; pct: number }[]) =>
    run.length < 2 ? '' :
      `${linePath(run)} L${x(run[run.length - 1].i)},${TOP + plot} L${x(run[0].i)},${TOP + plot} Z`;

  // first, middle and last only: seven "Mon 31"s will not fit across a phone
  const tickAt = new Set(rows.length <= 3
    ? rows.map((_, i) => i)
    : [0, Math.floor((rows.length - 1) / 2), rows.length - 1]);

  const spoken = rows.map(r => r.pct === null
    ? `${r.label}, nothing expected`
    : `${r.label}, ${r.pct} per cent, ${r.attended} of ${r.expected}`).join('; ');

  return (
    <View testID={testID} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <>
          <View accessibilityRole="image"
            accessibilityLabel={`Attendance through the period: ${spoken}`}>
            <Svg width={width} height={H}>
              {/* the scale, hairline and solid — 0, half, full */}
              {[0, 50, 100].map(t => (
                <Line key={t} x1={PAD} y1={y(t)} x2={width - PAD} y2={y(t)}
                  stroke={theme.line} strokeWidth={1} />
              ))}
              {/* the period's own figure, so every point is read against the
                  number the ring above already stated */}
              {overall !== null ? (
                <Line x1={PAD} y1={y(overall)} x2={width - PAD} y2={y(overall)}
                  stroke={theme.lineStrong} strokeWidth={1} />
              ) : null}

              {runs.map((run, k) => (
                <Path key={`a${k}`} d={areaPath(run)} fill={theme.accent} opacity={0.12} />
              ))}
              {runs.map((run, k) => (
                <Path key={`l${k}`} d={linePath(run)} stroke={theme.accentInk} strokeWidth={2}
                  strokeLinecap="round" strokeLinejoin="round" fill="none" />
              ))}
              {points.map(p => (
                <Circle key={p.i} cx={x(p.i)} cy={y(p.pct)} r={4}
                  fill={theme.accentInk} stroke={theme.surface} strokeWidth={2} />
              ))}
            </Svg>

            {/* the values that ride the marks: the two ends, the best and the
                worst. Text ink, never the line's colour. */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: H }} pointerEvents="none">
              {points.filter(p => labelled.has(p.i)).map(p => (
                <Text key={p.i} style={{
                  position: 'absolute', left: Math.min(Math.max(x(p.i) - 18, 0), Math.max(width - 36, 0)),
                  top: Math.max(y(p.pct) - 17, 0), width: 36, textAlign: 'center',
                  fontSize: 10, fontWeight: '800', color: theme.fg, fontVariant: ['tabular-nums'],
                }}>{`${p.pct}%`}</Text>
              ))}
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
            {rows.map((r, i) => (
              <Text key={r.label} numberOfLines={1} style={{
                flex: 1, fontSize: 9.5, color: theme.dim,
                textAlign: i === 0 ? 'left' : i === rows.length - 1 ? 'right' : 'center',
              }}>{tickAt.has(i) ? r.label : ''}</Text>
            ))}
          </View>

          <Text style={{ fontSize: 10.5, color: theme.muted, marginTop: SPACE.sm, lineHeight: 15 }}>
            {overall === null
              ? 'Nothing was expected in this period, so there is no line to read against.'
              : `The flat line is ${overall}% — this period's own figure, the one in the ring above. Points above it are better than the period, points below it worse. A gap in the line is a stretch with nothing scheduled, not a stretch nobody attended.`}
          </Text>
        </>
      ) : null}
    </View>
  );
}
