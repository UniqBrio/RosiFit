import { View, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { SPACE } from '../theme/tokens';

/**
 * C-87. Attendance distribution. "Not expected" is a segment on purpose:
 * omitting it makes a member on a 4-day override look like a 6-day member with
 * poor attendance.
 *
 * The numbers come in as props from member_period_metrics -- this component
 * never computes a total of its own, which is what makes the chart and the
 * report agree by construction.
 */
export function Donut({ attended, missed, notExpected }:
  { attended: number; missed: number; notExpected: number }) {
  const { theme } = useTheme();
  const total = attended + missed + notExpected;
  const expected = attended + missed;
  const R = 54, C = 2 * Math.PI * R, W = 18;

  const segs = [
    { label: 'Present',      value: attended,    color: theme.success },
    { label: 'Absent',       value: missed,      color: theme.danger },
    { label: 'Not expected', value: notExpected, color: theme.muted },
  ].filter(s => s.value > 0);

  let offset = 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.xl }}>
      <View accessibilityRole="image"
        accessibilityLabel={`Attendance: ${segs.map(s => `${s.value} ${s.label.toLowerCase()}`).join(', ')} of ${total}`}>
        <Svg width={132} height={132}>
          <G rotation={-90} originX={66} originY={66}>
            <Circle cx={66} cy={66} r={R} stroke={theme.control} strokeWidth={W} fill="none" />
            {segs.map(s => {
              const len = total ? (s.value / total) * C : 0;
              const el = (
                <Circle key={s.label} cx={66} cy={66} r={R} stroke={s.color} strokeWidth={W} fill="none"
                  strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} strokeLinecap="butt" />
              );
              offset += len;
              return el;
            })}
          </G>
        </Svg>
        {/* the headline number sits in the hole, as on the canvas. It is the
            attended share of what was EXPECTED -- "not expected" is in the
            ring but never in this denominator, or a member on a reduced
            schedule would read as poor attendance. */}
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          alignItems: 'center', justifyContent: 'center',
        }} pointerEvents="none">
          <Text style={{
            fontSize: 22, fontWeight: '800', color: theme.fgStrong,
            fontVariant: ['tabular-nums'], lineHeight: 24,
          }}>{expected ? `${Math.round((attended / expected) * 100)}%` : '—'}</Text>
          <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 0.4, color: theme.muted }}>
            ATTENDED
          </Text>
        </View>
      </View>
      <View style={{ flex: 1, gap: SPACE.sm }}>
        {segs.map(s => (
          <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
            <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: s.color }} />
            {/* the value is written out, so the chart does not rely on colour alone */}
            <Text style={{ flex: 1, fontSize: 13, color: theme.fg }}>{s.label}</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: theme.fgStrong,
              fontVariant: ['tabular-nums'] }}>{s.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * The small pie the canvas' Reports screen draws once per member, course or
 * branch. The percentage sits in the hole and the meta line sits underneath,
 * so the ring is a second encoding of a number that is always written out --
 * never the only signal.
 */
export function MiniPie({ pct, label, size = 88 }:
  { pct: number | null; label: string; size?: number }) {
  const { theme } = useTheme();
  const R = size / 2 - 8, C = 2 * Math.PI * R, W = 16;
  const ink = pct === null ? theme.muted
    : pct >= 70 ? theme.success : pct >= 45 ? theme.warning : theme.danger;
  const len = pct === null ? 0 : (pct / 100) * C;

  return (
    <View accessibilityRole="image" accessibilityLabel={label}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          <Circle cx={size / 2} cy={size / 2} r={R} stroke={theme.control} strokeWidth={W} fill="none" />
          {len > 0 ? (
            <Circle cx={size / 2} cy={size / 2} r={R} stroke={ink} strokeWidth={W} fill="none"
              strokeDasharray={`${len} ${C - len}`} strokeLinecap="butt" />
          ) : null}
        </G>
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}
        pointerEvents="none">
        <Text style={{ fontSize: 17, fontWeight: '800', color: ink, fontVariant: ['tabular-nums'] }}>
          {pct === null ? '—' : `${pct}%`}
        </Text>
      </View>
    </View>
  );
}
