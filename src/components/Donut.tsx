import { View, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';
import { SPACE, onStatusFill } from '../theme/tokens';
import { Icon } from './Icon';

/**
 * C-87. Attendance, as the two things a scheduled session can turn out to
 * be: PRESENT or ABSENT.
 *
 * There used to be a third segment, "Not expected", sized against a fixed
 * six-session week. It existed because the ring's denominator was that whole
 * week, so a member due at four read as two short before she had missed
 * anything. The denominator is now what was actually EXPECTED of the members
 * counted, which fixes that at the root -- and leaves "not expected" as a
 * category describing the absence of a session rather than the outcome of
 * one. It is gone, deliberately
 * (requests/2026-09-06-overview-filters-and-sections.md).
 *
 * The numbers come in as props from member_period_metrics -- this component
 * never computes a total of its own, which is what makes the chart and the
 * report agree by construction.
 */
export function Donut({ attended, missed }: { attended: number; missed: number }) {
  const { theme } = useTheme();
  const expected = attended + missed;
  const R = 54, C = 2 * Math.PI * R, W = 18;

  const segs = [
    { label: 'Present', value: attended, color: theme.success, icon: 'check' },
    { label: 'Absent',  value: missed,   color: theme.danger,  icon: 'close' },
  ];
  const drawn = segs.filter(s => s.value > 0);

  let offset = 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.xl }}>
      <View accessibilityRole="image"
        accessibilityLabel={expected
          ? `Attendance: ${attended} present and ${missed} absent of ${expected} expected sessions`
          : 'Attendance: no sessions were expected in this period'}>
        <Svg width={132} height={132}>
          <G rotation={-90} originX={66} originY={66}>
            <Circle cx={66} cy={66} r={R} stroke={theme.control} strokeWidth={W} fill="none" />
            {drawn.map(s => {
              const len = expected ? (s.value / expected) * C : 0;
              const el = (
                <Circle key={s.label} cx={66} cy={66} r={R} stroke={s.color} strokeWidth={W} fill="none"
                  strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} strokeLinecap="butt" />
              );
              offset += len;
              return el;
            })}
          </G>
        </Svg>
        {/* the headline number sits in the hole, as on the canvas: the
            attended share of what was EXPECTED of these members. Nothing
            unscheduled is in this denominator, so a reduced schedule reads at
            its own attendance rather than as a shortfall. */}
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          alignItems: 'center', justifyContent: 'center',
        }} pointerEvents="none">
          <Text style={{
            fontSize: 24, fontWeight: '800', color: theme.fgStrong,
            fontVariant: ['tabular-nums'], lineHeight: 26,
          }}>{expected ? `${Math.round((attended / expected) * 100)}%` : '—'}</Text>
          <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 0.4, color: theme.muted }}>
            PRESENT
          </Text>
        </View>
      </View>
      <View style={{ flex: 1, gap: SPACE.sm }}>
        {segs.map(s => (
          <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
            {/* the word AND its icon, never the swatch alone (guardrail 3) */}
            <View style={{
              width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center',
              backgroundColor: s.color,
            }}>
              {/* the ink on a status fill is MEASURED, both themes -- see
                  onStatusFill and scripts/check-contrast.ts */}
              <Icon name={s.icon} size={14} color={onStatusFill(theme.isDark)} />
            </View>
            <Text style={{ flex: 1, fontSize: 13, color: theme.fg }}>{s.label}</Text>
            <Text style={{ fontSize: 15, fontWeight: '800', color: theme.fgStrong,
              fontVariant: ['tabular-nums'] }}>{s.value}</Text>
          </View>
        ))}
        <Text style={{ fontSize: 11, color: theme.muted, fontVariant: ['tabular-nums'] }}>
          {expected === 0
            ? 'No sessions expected in this period'
            : `${expected} sessions expected`}
        </Text>
      </View>
    </View>
  );
}
