import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, H2, Body, Muted, Label, Button } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface } from '../../src/theme/tokens';
import { MATCH_ROWS, OUTCOME_META, PENDING_SESSIONS } from '../../src/data/mock';

const STEPS = ['Session', 'File', 'Process', 'Summary'] as const;

export default function Upload() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [chosen, setChosen] = useState(PENDING_SESSIONS[0].label);
  const [picked, setPicked] = useState(false);
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const run = () => {
    setStep(3); setProgress(0);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setProgress(p => {
        const n = p + 7;
        if (n >= 100) { if (timer.current) clearInterval(timer.current); setStep(4); return 100; }
        return n;
      });
    }, 70);
  };

  const blocking = MATCH_ROWS.filter(r => OUTCOME_META[r.kind].blocks).length;
  const needDecision = MATCH_ROWS.length;
  const warnInk = theme.isDark ? STATUS.awaiting.fgDark : STATUS.awaiting.fgLight;
  const okInk = theme.isDark ? STATUS.present.fgDark : STATUS.present.fgLight;

  return (
    <Screen>
      <Muted>{`Step ${step} of 4 · ${STEPS[step - 1]}`}</Muted>

      {/* the four steps are always visible, so it is clear how much is left
          and that nothing has been written yet */}
      <View style={{ flexDirection: 'row', gap: 6, marginTop: SPACE.md, marginBottom: SPACE.lg }}>
        {STEPS.map((label, i) => {
          const done = step >= i + 1;
          return (
            <View key={label} style={{ flex: 1, gap: 6 }}>
              <View style={{ height: 4, borderRadius: 2, backgroundColor: done ? theme.accent : theme.line }} />
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: done ? theme.accentInk : theme.muted }}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      {step === 1 && (
        <>
          <Body>
            Two sessions are still awaiting upload. Until a file is in, that session counts for nobody.
          </Body>
          <View style={{ gap: SPACE.md, marginTop: SPACE.lg }}>
            {PENDING_SESSIONS.map((s, i) => (
              <Pressable key={s.label}
                onPress={() => { setChosen(s.label); setPicked(false); setStep(2); }}
                accessibilityRole="button" accessibilityLabel={`${s.title}. ${s.meta}`}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: SPACE.md, padding: SPACE.lg,
                  borderRadius: RADIUS.lg, backgroundColor: theme.surface,
                  borderWidth: 1, borderColor: i === 0 ? statusSurface(warnInk).border : theme.line,
                  opacity: pressed ? 0.75 : 1,
                })}>
                <View style={{ alignItems: 'center', width: 40 }}>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: theme.fgStrong, fontVariant: ['tabular-nums'] }}>
                    {s.dayNum}
                  </Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: theme.muted }}>{s.mon}</Text>
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '700', color: theme.fgStrong }}>{s.title}</Text>
                  <Text style={{ fontSize: 11.5, color: theme.muted }}>{s.meta}</Text>
                </View>
                <Icon name="chevron_right" size={22} color={i === 0 ? warnInk : theme.muted} />
              </Pressable>
            ))}
          </View>
        </>
      )}

      {step === 2 && (
        <>
          <Label>Session</Label>
          <Text style={{ fontSize: 15, fontWeight: '700', color: theme.fgStrong, marginTop: 4 }}>{chosen}</Text>

          <View style={{
            marginTop: SPACE.lg, padding: SPACE.xl, borderRadius: RADIUS.lg,
            backgroundColor: theme.surface2, borderWidth: 1, borderStyle: 'dashed',
            borderColor: theme.lineStrong, alignItems: 'center',
          }}>
            <Icon name="description" size={30} color={theme.accentInk} />
            <H2 style={{ marginTop: SPACE.md }}>Choose the Google Meet CSV</H2>
            <Muted style={{ marginTop: 6, textAlign: 'center' }}>
              Meet exports one row per participant with join and leave times.
            </Muted>
            <Button label="Browse files" variant="secondary" style={{ marginTop: SPACE.lg }}
              onPress={() => { setPicked(true); flash('meet-attendance-22aug.csv selected'); }} />
          </View>

          {picked && (
            <View style={{
              marginTop: SPACE.md, padding: SPACE.lg, borderRadius: RADIUS.lg,
              flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
              backgroundColor: statusSurface(okInk).bg, borderWidth: 1, borderColor: statusSurface(okInk).border,
            }}>
              <Icon name="check_circle" size={22} color={okInk} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: theme.fgStrong, fontVariant: ['tabular-nums'] }}>
                  meet-attendance-22aug.csv
                </Text>
                <Text style={{ fontSize: 11.5, color: theme.muted, fontVariant: ['tabular-nums'] }}>18 rows · 12 KB</Text>
              </View>
              <Button label="Process" onPress={run} />
            </View>
          )}
        </>
      )}

      {step === 3 && (
        <View style={{ alignItems: 'center', paddingVertical: SPACE.xxl }}>
          <View accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: progress }}
            accessibilityLabel="Matching names"
            style={{
              width: 132, height: 132, borderRadius: 66, borderWidth: 8,
              borderColor: theme.accent, alignItems: 'center', justifyContent: 'center',
            }}>
            <Text style={{ fontSize: 30, fontWeight: '800', color: theme.fgStrong, fontVariant: ['tabular-nums'] }}>
              {`${progress}%`}
            </Text>
          </View>
          <H2 style={{ marginTop: SPACE.lg }}>Matching names</H2>
          <Muted style={{ marginTop: 6, textAlign: 'center' }}>
            {progress < 45
              ? 'Reading 18 rows and dropping anyone under 15 minutes.'
              : 'Comparing names against 8 enrolled members.'}
          </Muted>
        </View>
      )}

      {step === 4 && (
        <>
          <View style={{
            padding: SPACE.xl, borderRadius: RADIUS.lg,
            backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
          }}>
            <Label>Processed</Label>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.fgStrong, marginTop: 4 }}>{chosen}</Text>
            <View style={{ flexDirection: 'row', marginTop: SPACE.lg }}>
              <Count n={18} label="rows read" color={theme.fgStrong} />
              <Count n={15} label="matched" color={okInk} />
              <Count n={3} label="ambiguous" color={warnInk} />
            </View>
          </View>

          {/* C-79: the file is atomic. Saying so here is what stops anyone
              believing a partial import already happened. */}
          <View style={{
            marginTop: SPACE.md, padding: SPACE.lg, borderRadius: RADIUS.lg,
            flexDirection: 'row', gap: SPACE.md,
            backgroundColor: statusSurface(warnInk).bg, borderWidth: 1, borderColor: statusSurface(warnInk).border,
          }}>
            <Icon name="pause_circle" size={22} color={warnInk} />
            <Body style={{ flex: 1, fontSize: 12.5, lineHeight: 19 }}>
              <Text style={{ fontWeight: '800', color: theme.fgStrong }}>Nothing has been imported yet.</Text>
              {` ${needDecision} rows need a decision — one possible existing member, one ambiguous name, `}
              {'one matched member with no email, and one not found at all. You decide each, then the whole file imports together.'}
            </Body>
          </View>

          <Button label={`Review ${needDecision} rows`} onPress={() => router.push('/match')}
            style={{ marginTop: SPACE.lg }} />
          <Button label="Later" variant="secondary" onPress={() => router.push('/(tabs)')}
            style={{ marginTop: SPACE.sm }} />
          <Muted style={{ marginTop: SPACE.md, textAlign: 'center' }}>
            {`${blocking} of those block the import. Nothing is written until they are decided.`}
          </Muted>
        </>
      )}
    </Screen>
  );
}

function Count({ n, label, color }: { n: number; label: string; color: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 26, fontWeight: '800', color, fontVariant: ['tabular-nums'] }}>{n}</Text>
      <Text style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}
