import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Screen, Muted, Label } from '../../src/components/ui';
import { ScreenHeader } from '../../src/components/AppShell';
import { Icon } from '../../src/components/Icon';
import { Sheet } from '../../src/components/Sheet';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE, RADIUS, STATUS, statusSurface, type StatusKey } from '../../src/theme/tokens';

/**
 * August 2026, as the canvas draws it: a Monday-start grid where every
 * session-bearing day carries an icon, with the legend spelling out that the
 * icon and its WORD carry the meaning, never the colour alone.
 */
type Day = { n: number; status: StatusKey | null };

const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const START_PAD = 5; // 1 Aug 2026 is a Saturday

function buildMonth(): (Day | null)[] {
  const cells: (Day | null)[] = Array.from({ length: START_PAD }, () => null);
  for (let d = 1; d <= 31; d++) {
    const dow = (START_PAD + d - 1) % 7;              // 0 = Monday
    const teach = dow === 0 || dow === 2 || dow === 4; // Mon / Wed / Fri
    let status: StatusKey | null = null;
    if (d === 19) status = 'holiday';
    else if (d === 21) status = 'cancelled';
    else if (teach && d <= 20) status = 'present';
    else if (teach && (d === 22 || d === 23)) status = 'awaiting';
    else if (teach) status = 'scheduled';
    cells.push({ n: d, status });
  }
  return cells;
}

const LEGEND: StatusKey[] = ['present', 'scheduled', 'awaiting', 'cancelled', 'holiday'];

export default function Sessions() {
  const { theme } = useTheme();
  const [day, setDay] = useState<Day | null>(null);
  const cells = buildMonth();
  const ink = (k: StatusKey) => theme.isDark ? STATUS[k].fgDark : STATUS[k].fgLight;

  const sheetMeta = (s: StatusKey) =>
    s === 'present' ? '18 expected · 16 attended · uploaded'
    : s === 'awaiting' ? '18 expected · counts for nobody yet'
    : s === 'scheduled' ? '18 expected · not yet held'
    : 'Does not count toward attendance';
  const sheetTitle = (s: StatusKey) =>
    s === 'holiday' ? 'Onam holiday'
    : s === 'cancelled' ? 'Prenatal Flow · cancelled'
    : 'Prenatal Flow · 6:00 pm';

  return (
    <Screen>
      <ScreenHeader title="August 2026" subtitle="26 sessions · 2 awaiting upload" />

      <View style={{ flexDirection: 'row', marginTop: SPACE.lg }}>
        {DOW.map(d => (
          <Text key={d} style={{
            flex: 1, textAlign: 'center', fontSize: 10.5, fontWeight: '700',
            color: theme.muted, letterSpacing: 0.5,
          }}>{d}</Text>
        ))}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: SPACE.sm }}>
        {cells.map((c, i) => {
          if (!c) return <View key={`pad${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 0.82 }} />;
          const s = c.status;
          const cInk = s ? ink(s) : theme.dim;
          const box = s ? statusSurface(cInk) : null;
          return (
            <View key={c.n} style={{ width: `${100 / 7}%`, aspectRatio: 0.82, padding: 2 }}>
              <Pressable
                onPress={() => s && setDay(c)}
                disabled={!s}
                accessibilityRole="button"
                accessibilityLabel={`${c.n} August, ${s ? STATUS[s].word : 'no sessions'}`}
                style={({ pressed }) => ({
                  flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 3,
                  backgroundColor: s ? box!.bg : theme.surface2,
                  borderWidth: 1, borderColor: s ? box!.border : theme.line,
                  opacity: pressed ? 0.7 : 1,
                })}>
                <Text style={{
                  fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'],
                  color: s ? theme.fgStrong : theme.dim,
                }}>{c.n}</Text>
                {s ? <Icon name={STATUS[s].icon} size={13} color={cInk} /> : null}
              </Pressable>
            </View>
          );
        })}
      </View>

      <View style={{
        marginTop: SPACE.lg, padding: SPACE.lg, borderRadius: RADIUS.lg,
        backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
      }}>
        <Label>Legend — icon and word, never colour alone</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md, marginTop: SPACE.md }}>
          {LEGEND.map(k => {
            const c = ink(k);
            const box = statusSurface(c);
            return (
              <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: '44%' }}>
                <View style={{
                  width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: box.bg, borderWidth: 1, borderColor: box.border,
                }}>
                  <Icon name={STATUS[k].icon} size={14} color={c} />
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: theme.fg }}>{STATUS[k].word}</Text>
              </View>
            );
          })}
        </View>
        <Muted style={{ marginTop: SPACE.md }}>
          Cancelled classes and holidays never count toward attendance.
        </Muted>
      </View>

      <Sheet open={!!day} onClose={() => setDay(null)}
        title={day ? `${day.n} August 2026` : ''}>
        {day?.status ? (
          <>
            <Muted style={{ marginTop: 4 }}>{STATUS[day.status].word}</Muted>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginTop: SPACE.lg,
              padding: SPACE.md, borderRadius: RADIUS.md, backgroundColor: theme.surface2,
              borderWidth: 1, borderColor: theme.line,
            }}>
              <View style={{
                width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
                backgroundColor: statusSurface(ink(day.status)).bg,
                borderWidth: 1, borderColor: statusSurface(ink(day.status)).border,
              }}>
                <Icon name={STATUS[day.status].icon} size={18} color={ink(day.status)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: theme.fgStrong }}>
                  {sheetTitle(day.status)}
                </Text>
                <Text style={{ fontSize: 11.5, color: theme.muted, marginTop: 2, fontVariant: ['tabular-nums'] }}>
                  {sheetMeta(day.status)}
                </Text>
              </View>
              <Text style={{ fontSize: 11, fontWeight: '800', color: ink(day.status) }}>
                {STATUS[day.status].word}
              </Text>
            </View>
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
