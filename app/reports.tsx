import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Screen, Muted, H2 } from '../src/components/ui';
import { useTheme } from '../src/theme/ThemeProvider';
import { SPACE, RADIUS, TAP_MIN, STATUS } from '../src/theme/tokens';
import { MEMBERS, WEEK_ROWS, attendancePct } from '../src/data/mock';

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
      <Muted>{period}</Muted>

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

      <View style={{
        marginTop: SPACE.lg, padding: SPACE.lg, borderRadius: RADIUS.lg,
        backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
      }}>
        <H2>{headline}</H2>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: SPACE.md, marginTop: SPACE.sm }}>
          <Text style={{ fontSize: 44, fontWeight: '800', color: theme.fgStrong, fontVariant: ['tabular-nums'] }}>
            {big}
          </Text>
          <Muted style={{ flex: 1 }}>{bigNote}</Muted>
        </View>
      </View>

      <View style={{ gap: SPACE.md, marginTop: SPACE.md }}>
        {bars.map(b => {
          const tone = b.value === '—' ? theme.muted
            : b.n >= 70 ? ink('present') : b.n >= 45 ? ink('awaiting') : ink('absent');
          return (
            <View key={b.label}
              accessible accessibilityLabel={`${b.label}: ${b.value === '—' ? 'no sessions' : b.value}. ${b.meta}`}
              style={{
                padding: SPACE.lg, borderRadius: RADIUS.lg, backgroundColor: theme.surface,
                borderWidth: 1, borderColor: theme.line,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, fontWeight: '700', color: theme.fgStrong }}>
                  {b.label}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: tone, fontVariant: ['tabular-nums'] }}>
                  {b.value}
                </Text>
              </View>
              {/* the bar is a second encoding of the number beside it, never
                  the only one */}
              <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.control, marginTop: 8, overflow: 'hidden' }}>
                <View style={{ width: `${Math.max(b.n, 0)}%`, height: 8, backgroundColor: tone }} />
              </View>
              <Muted style={{ marginTop: 6 }}>{b.meta}</Muted>
            </View>
          );
        })}
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

      <Muted style={{ marginTop: SPACE.md, textAlign: 'center' }}>
        Holidays, cancellations and awaiting-upload sessions are excluded everywhere on this screen.
      </Muted>
    </Screen>
  );
}
