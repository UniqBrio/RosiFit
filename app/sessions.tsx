import { View, Text, Pressable } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Screen, Card, H1, H2, Body, Muted, Button, Pill, Row, Divider } from '../src/components/ui';
import { useTheme } from '../src/theme/ThemeProvider';
import { SPACE, RADIUS } from '../src/theme/tokens';
import { MONTH_DAYS, MONTH_LABEL, type SessionDay } from '../src/data/mock';

export default function Sessions() {
  const { theme } = useTheme();
  const router = useRouter();
  const [sel, setSel] = useState<SessionDay | null>(null);

  const toneFor = (s: SessionDay['status']) =>
    s === 'completed' ? theme.success : s === 'holiday' ? theme.warning
    : s === 'cancelled' ? theme.danger : s === 'scheduled' ? theme.accentInk : theme.muted;

  const firstDow = new Date(2026, 7, 1).getDay();           // 0 = Sun
  const lead = (firstDow + 6) % 7;                          // grid starts Monday

  return (
    <Screen>
      <H1>Sessions</H1>
      <Muted style={{ marginBottom: SPACE.lg }}>{MONTH_LABEL} · Prenatal Fitness · Coimbatore</Muted>

      <Card>
        <Row style={{ marginBottom: SPACE.sm }}>
          {['M','T','W','T','F','S','S'].map((d, i) => (
            <Text key={i} style={{ flex: 1, textAlign: 'center', fontSize: 11,
              fontWeight: '700', color: theme.muted }}>{d}</Text>
          ))}
        </Row>
        {/* the calendar stays a grid on every width -- a month collapsed into a
            list stops being a month */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {Array.from({ length: lead }).map((_, i) => (
            <View key={`lead${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />
          ))}
          {MONTH_DAYS.map(d => {
            const on = sel?.day === d.day;
            const has = d.status !== 'none';
            return (
              <Pressable key={d.day} onPress={() => has && setSel(d)} disabled={!has}
                accessibilityRole="button"
                accessibilityLabel={`${d.day} ${MONTH_LABEL}: ${has ? d.status : 'no session'}`}
                style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}>
                <View style={{ flex: 1, borderRadius: RADIUS.sm, alignItems: 'center',
                  justifyContent: 'center', gap: 3,
                  borderWidth: on ? 2 : 1,
                  borderColor: on ? theme.accent : has ? theme.line : 'transparent',
                  backgroundColor: has ? theme.surface2 : 'transparent' }}>
                  <Text style={{ fontSize: 13, fontWeight: has ? '700' : '400',
                    color: has ? theme.fgStrong : theme.dim }}>{d.day}</Text>
                  {has ? <View style={{ width: 6, height: 6, borderRadius: 3,
                    backgroundColor: toneFor(d.status) }} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Divider />
        <Row style={{ flexWrap: 'wrap', gap: SPACE.md }}>
          {[['Completed','completed'],['Scheduled','scheduled'],['Holiday','holiday'],['Cancelled','cancelled']].map(([l, s]) => (
            <Row key={l} style={{ gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: toneFor(s as SessionDay['status']) }} />
              <Muted>{l}</Muted>
            </Row>
          ))}
        </Row>
      </Card>

      {sel && (
        <Card>
          <H2>{sel.day} {MONTH_LABEL}</H2>
          <Row style={{ marginTop: SPACE.sm }}>
            <Pill text={sel.status}
              tone={sel.status === 'completed' ? 'success' : sel.status === 'holiday' ? 'warning'
                  : sel.status === 'cancelled' ? 'danger' : 'neutral'} />
          </Row>
          {sel.status === 'completed' && (
            <Row style={{ marginTop: SPACE.md, gap: SPACE.xl }}>
              <View><Muted>Expected</Muted><Body style={{ fontWeight: '800' }}>{sel.expected}</Body></View>
              <View><Muted>Present</Muted><Body style={{ fontWeight: '800' }}>{sel.present}</Body></View>
              <View><Muted>Missed</Muted><Body style={{ fontWeight: '800', color: theme.danger }}>
                {(sel.expected ?? 0) - (sel.present ?? 0)}</Body></View>
            </Row>
          )}
          {sel.status === 'holiday' && (
            <Muted style={{ marginTop: SPACE.sm }}>
              A holiday. Not expected, not missed, no effect on any streak, and no schedule was changed.
            </Muted>
          )}
          {sel.status === 'cancelled' && (
            <Muted style={{ marginTop: SPACE.sm }}>
              Cancelled for this date only. Like a holiday it counts for nothing — recorded separately
              so a thin week can be explained.
            </Muted>
          )}
          {sel.status === 'scheduled' && (
            <>
              <Muted style={{ marginTop: SPACE.sm }}>Not yet held.</Muted>
              <Button label="Cancel this session" variant="secondary"
                style={{ marginTop: SPACE.md }} onPress={() => {}} />
            </>
          )}
        </Card>
      )}

      <Button label="+ Add holiday" onPress={() => router.push('/holiday')} />
    </Screen>
  );
}
