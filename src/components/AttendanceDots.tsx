import { useState } from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { SPACE, STATUS } from '../theme/tokens';
import { Icon } from './Icon';
import type { ReportRow } from '../data/report';

/**
 * A DOT PLOT — where each course sits on one shared 0–100% attendance axis.
 *
 * WHY THIS IS NOT THE MEMBER SECTION'S BAR
 * The two sections answer different questions, so they get different marks.
 * The member section ranks PEOPLE and its bar length is a volume — a member
 * with ten sessions draws a longer bar than one with three, which is the
 * point when you are deciding who to chase. A course is a RATE: "is Postnatal
 * Core keeping up with Prenatal Flow" is a question about position on a
 * common scale, and the answer is read off one axis in a single glance,
 * across four rows, without comparing lengths that start in different places.
 *
 * Every dot sits on the same axis, so the spread down the column IS the
 * finding. The volume that a bar would have carried is written out under each
 * row instead — nothing is lost, it is just not the thing being compared.
 *
 * The dot takes its colour from the attendance band, which is a STATUS and
 * not a series identity: the percentage is written beside it and the band is
 * named in words, so the colour is never the only signal (guardrail 3).
 */

/** Where a rate stops being fine and starts being a problem. The same two
 *  thresholds the report screen colours its percentages by, so a course does
 *  not change band between two screens. */
const GOOD = 70, FAIR = 45;

export function AttendanceDots({ rows, testID }: { rows: ReportRow[]; testID: string }) {
  const { theme } = useTheme();
  const [width, setWidth] = useState(0);

  const ink = (k: 'present' | 'absent' | 'awaiting') =>
    theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;

  const band = (pct: number) => pct >= GOOD
    ? { color: ink('present'), word: 'on track' }
    : pct >= FAIR ? { color: ink('awaiting'), word: 'slipping' }
    : { color: ink('absent'), word: 'needs attention' };

  const H = 26, R = 5, PAD = R + 2;          // room for the dot's surface ring
  const x = (pct: number) => PAD + (pct / 100) * Math.max(width - PAD * 2, 1);

  return (
    <View testID={testID} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <>
          {rows.map(r => {
            const b = r.pct === null ? null : band(r.pct);
            const counts = r.expected === 0
              ? 'No sessions scheduled — nothing to measure'
              : `${r.expected} expected · ${r.attended} present · ${Math.max(r.expected - r.attended, 0)} absent`;
            return (
              <View key={r.label} testID={`${testID}-row`} accessible
                accessibilityLabel={r.pct === null
                  ? `${r.label}. No sessions scheduled.`
                  : `${r.label}. ${r.pct} per cent present, ${b!.word}. ${counts}`}
                style={{ marginBottom: SPACE.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: SPACE.sm }}>
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: theme.fgStrong }}>
                    {r.label}
                  </Text>
                  {/* the value in text ink, never the mark's colour */}
                  <Text style={{ fontSize: 13, fontWeight: '800', color: theme.fg, fontVariant: ['tabular-nums'] }}>
                    {r.pct === null ? '—' : `${r.pct}%`}
                  </Text>
                </View>

                <Svg width={width} height={H}>
                  {/* the axis and its two guides: hairline, solid, recessive */}
                  <Line x1={PAD} y1={H / 2} x2={width - PAD} y2={H / 2}
                    stroke={theme.line} strokeWidth={1} />
                  {[0, 50, 100].map(t => (
                    <Line key={t} x1={x(t)} y1={H / 2 - 5} x2={x(t)} y2={H / 2 + 5}
                      stroke={theme.line} strokeWidth={1} />
                  ))}
                  {r.pct !== null ? (
                    <>
                      {/* a 2px ring in the surface colour, so a dot landing on
                          a tick stays a dot rather than merging with it */}
                      <Circle cx={x(r.pct)} cy={H / 2} r={R + 2} fill={theme.surface} />
                      <Circle cx={x(r.pct)} cy={H / 2} r={R} fill={b!.color} />
                    </>
                  ) : null}
                </Svg>

                <Text style={{ fontSize: 10.5, color: theme.muted, fontVariant: ['tabular-nums'] }}>
                  {counts}
                </Text>
              </View>
            );
          })}

          {/* the axis is labelled ONCE, under the plot it belongs to */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
            {['0%', '50%', '100% present'].map(t => (
              <Text key={t} style={{ fontSize: 10, color: theme.dim }}>{t}</Text>
            ))}
          </View>

          {/* the bands, in words and glyphs — the dot's colour is a status,
              and a status in this app never travels alone (guardrail 3) */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, marginTop: SPACE.sm }}>
            {([['present', `${GOOD}% and up`], ['awaiting', `${FAIR}–${GOOD - 1}%`], ['absent', `under ${FAIR}%`]] as const)
              .map(([k, range]) => (
                <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: ink(k) }} />
                  <Icon name={STATUS[k].icon} size={12} color={theme.muted} />
                  <Text style={{ fontSize: 10.5, color: theme.muted, fontVariant: ['tabular-nums'] }}>{range}</Text>
                </View>
              ))}
          </View>
        </>
      ) : null}
    </View>
  );
}
