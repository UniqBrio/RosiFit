import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Muted, H2 } from '../../src/components/ui';
import { ScreenHeader } from '../../src/components/AppShell';
import { MiniPie } from '../../src/components/Donut';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE, RADIUS, TAP_MIN, STATUS } from '../../src/theme/tokens';
import { MEMBERS, WEEK_ROWS, attendancePct } from '../../src/data/mock';

type Scope = 'Members' | 'Courses' | 'Branches';

/** Pre-aggregated the way the canvas shows them; the member set is live. */
const COURSE_BARS = [
  { label: 'Prenatal Flow',            value: '74%', meta: '40 scheduled · 30 attended', n: 74 },
  { label: 'Postnatal Core',           value: '38%', meta: '34 scheduled · 13 attended', n: 38 },
  { label: 'Trimester 3 Gentle',       value: '52%', meta: '25 scheduled · 13 attended', n: 52 },
  { label: 'Pelvic Floor Foundations', value: '—',   meta: 'no sessions scheduled this month', n: 0 },
];
const BRANCH_BARS = [
  { label: 'Coimbatore · RS Puram', value: '68%', meta: '44 scheduled · 30 attended', n: 68 },
  { label: 'Madurai',               value: '55%', meta: '33 scheduled · 18 attended', n: 55 },
  { label: 'Chennai · Adyar',       value: '49%', meta: '22 scheduled · 11 attended', n: 49 },
];

export default function Reports() {
  const { theme } = useTheme();
  const [scope, setScope] = useState<Scope>('Courses');
  const ink = (k: keyof typeof STATUS) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;

  const bars = scope === 'Courses' ? COURSE_BARS
    : scope === 'Branches' ? BRANCH_BARS
    : MEMBERS.map(m => {
        const pct = attendancePct(m);
        return {
          label: m.name,
          value: pct === null ? '—' : `${pct}%`,
          meta: m.expected === 0
            ? 'no sessions scheduled this week'
            : `${m.expected} scheduled · ${m.attended} attended`,
          n: pct ?? 0,
        };
      });

  const headline = scope === 'Members' ? 'Attendance across 8 members'
    : scope === 'Branches' ? 'Attendance across 3 branches' : 'Attendance across 4 courses';
  // the period is stated with the number, and it CHANGES with the scope --
  // members are a this-week view, courses and branches a this-month one
  const period = scope === 'Members'
    ? '18–24 Aug · this week, uploaded sessions only'
    : '1–24 Aug · uploaded sessions only';
  const big = scope === 'Members' ? '26%' : '61%';
  const bigNote = scope === 'Members'
    ? 'of this week’s scheduled sessions attended'
    : 'of scheduled sessions attended this month';

  return (
    <Screen>
      <ScreenHeader title="Reports" subtitle={period} />

      <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.md }}>
        {(['Members', 'Courses', 'Branches'] as Scope[]).map(s => {
          const on = scope === s;
          return (
            <Pressable key={s} onPress={() => setScope(s)}
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
          <Text style={{ fontSize: 44, fontWeight: '800', color: '#FFFFFF', fontVariant: ['tabular-nums'] }}>
            {big}
          </Text>
          <Text style={{ flex: 1, fontSize: 13, color: theme.onDeep, lineHeight: 19 }}>{bigNote}</Text>
        </View>
      </LinearGradient>

      {/* The canvas draws a pie per member, course or branch -- not a bar --
          and pairs each with its own written percentage and counts, so the
          ring never carries the meaning alone. */}
      <View style={{
        flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, marginTop: SPACE.lg,
      }}>
        {bars.map(b => (
          <View key={b.label}
            style={{
              flexGrow: 1, flexBasis: 150, alignItems: 'center', gap: 10,
              padding: 14, borderRadius: RADIUS.lg, backgroundColor: theme.surface,
              borderWidth: 1, borderColor: theme.line,
            }}>
            <MiniPie pct={b.value === '—' ? null : b.n}
              label={`${b.label}: ${b.value === '—' ? 'no sessions' : b.value}. ${b.meta}`} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 12.5, fontWeight: '800', color: theme.fgStrong, textAlign: 'center' }}>
                {b.label}
              </Text>
              <Text style={{ fontSize: 10.5, color: theme.muted, marginTop: 4, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
                {b.meta}
              </Text>
            </View>
          </View>
        ))}
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

      {scope !== 'Members' && (
        <View style={{
          marginTop: SPACE.md, padding: SPACE.lg, borderRadius: RADIUS.lg,
          backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
        }}>
          <H2>Week by week</H2>
          <Muted style={{ marginTop: 4, marginBottom: SPACE.md }}>
            Weeks run Monday to Sunday. Partial weeks at either end of a range are shown separately.
          </Muted>
          {WEEK_ROWS.map(w => {
            const pct = Math.round((w.attended / w.expected) * 100);
            const tone = pct >= 70 ? ink('present') : pct >= 45 ? ink('awaiting') : ink('absent');
            return (
              <View key={w.label} style={{ marginBottom: SPACE.md }}>
                <View style={{ flexDirection: 'row' }}>
                  <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '700', color: theme.fgStrong }}>
                    {w.label}{w.current ? ' · this week' : ''}{w.partial ? ' · partial' : ''}
                  </Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: tone, fontVariant: ['tabular-nums'] }}>
                    {pct}%
                  </Text>
                </View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.control, marginTop: 6, overflow: 'hidden' }}>
                  <View style={{ width: `${pct}%`, height: 8, backgroundColor: tone }} />
                </View>
                <Muted style={{ marginTop: 4 }}>
                  {`${w.expected} expected · ${w.attended} attended · ${w.expected - w.attended} missed`}
                </Muted>
              </View>
            );
          })}
        </View>
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
