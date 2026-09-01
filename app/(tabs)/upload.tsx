import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, H2, Body, Muted, Label, Button, Skeleton, ErrorState, EmptyState } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface } from '../../src/theme/tokens';
import { MATCH_ROWS, OUTCOME_META } from '../../src/data/mock';
import { usePendingSessions } from '../../src/data/hooks';
import type { PendingSession } from '../../src/data/repository';
import { isConfigured } from '../../src/lib/supabase';
import { parseMeetCsv, sha256Hex, pickCsvFile, CSV_COLUMNS } from '../../src/data/csv';
import { csvPreview, type PreviewResult } from '../../src/data/api';
import { setStagedImport } from '../../src/data/pending';

const STEPS = ['Session', 'File', 'Process', 'Summary'] as const;

export default function Upload() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { state: forced } = useLocalSearchParams<{ state?: string }>();
  const pending = usePendingSessions(forced);

  const [step, setStep] = useState(1);
  const [session, setSession] = useState<PendingSession | null>(null);
  const [file, setFile] = useState<{ name: string; text: string; rows: number } | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const sessions = pending.data ?? [];
  const chosen = session?.label ?? sessions[0]?.label ?? '';
  const picked = file !== null;

  const choose = async () => {
    setFailure(null);
    try {
      const chosenFile = await pickCsvFile();
      if (!chosenFile) return;
      // Parsed here so a file with the wrong columns is refused before
      // anything is sent, and the message can name the three columns the
      // Meet export actually has (C-74).
      const parsed = parseMeetCsv(chosenFile.text);
      if (parsed.rows.length === 0) throw new Error('That file has no attendance rows.');
      setFile({ name: chosenFile.name, text: chosenFile.text, rows: parsed.rows.length });
      flash(`${chosenFile.name} selected`);
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'That file could not be read.');
    }
  };

  const run = async () => {
    setStep(3); setProgress(0); setFailure(null);
    if (timer.current) clearInterval(timer.current);
    // The bar is honest about being indeterminate: it advances while the
    // request is out and finishes when the answer lands, rather than
    // pretending to know how far along a server call is.
    timer.current = setInterval(() => setProgress(p => (p >= 92 ? 92 : p + 7)), 70);

    if (!isConfigured || !file || !session?.offering_id) {
      setTimeout(() => {
        if (timer.current) clearInterval(timer.current);
        setProgress(100); setStep(4);
      }, 900);
      return;
    }

    try {
      const parsed = parseMeetCsv(file.text);
      const result = await csvPreview({
        offering_id: session.offering_id,
        session_date: session.session_date,
        file_name: file.name,
        file_sha256: await sha256Hex(file.text),
        rows: parsed.rows,
      });
      setPreview(result);
      if (timer.current) clearInterval(timer.current);
      setProgress(100);
      setStep(4);
    } catch (err) {
      if (timer.current) clearInterval(timer.current);
      setFailure(err instanceof Error ? err.message : 'That file could not be processed.');
      setStep(2);
    }
  };

  // Live counts once a file has been staged; the fixtures' five outcomes
  // otherwise, which is what the walkthrough and the route harness show.
  const rows = preview?.rows ?? MATCH_ROWS;
  const decisionRows = preview
    ? rows.filter(r => r.kind !== 'matched')
    : MATCH_ROWS.filter(r => r.kind !== 'matched');
  const blocking = decisionRows.filter(r => OUTCOME_META[r.kind].blocks).length;
  const needDecision = decisionRows.length;
  const rowsRead = preview ? preview.rows.length + preview.dropped_count : 18;
  const matchedCount = preview ? (preview.counts.matched ?? 0) + (preview.counts.noEmail ?? 0) : 15;
  const ambiguousCount = preview ? (preview.counts.ambiguous ?? 0) : 3;

  const warnInk = theme.isDark ? STATUS.awaiting.fgDark : STATUS.awaiting.fgLight;
  const okInk = theme.isDark ? STATUS.present.fgDark : STATUS.present.fgLight;

  const goReview = () => {
    if (preview) {
      setStagedImport({
        import_id: preview.import_id, session_label: chosen,
        rows: preview.rows, dropped_count: preview.dropped_count, counts: preview.counts,
      });
    }
    router.push('/match');
  };

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

      {step === 1 && pending.state === 'loading' && <Skeleton lines={3} />}

      {step === 1 && pending.state === 'error' && (
        <ErrorState onRetry={pending.retry}
          message={pending.error ?? 'The sessions awaiting upload could not be loaded. Nothing has been changed.'} />
      )}

      {step === 1 && pending.state === 'ready' && sessions.length === 0 && (
        <EmptyState
          title="Nothing awaiting upload"
          body="Every session that has run has its attendance file in. A new one appears here as soon as a session is due." />
      )}

      {step === 1 && pending.state === 'ready' && sessions.length > 0 && (
        <>
          <Body>
            {`${sessions.length} session${sessions.length === 1 ? ' is' : 's are'} still awaiting upload. Until a file is in, that session counts for nobody.`}
          </Body>
          <View style={{ gap: SPACE.md, marginTop: SPACE.lg }}>
            {sessions.map((s, i) => (
              <Pressable key={s.label}
                onPress={() => { setSession(s); setFile(null); setPreview(null); setFailure(null); setStep(2); }}
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
            {/* C-74: name the three columns, so an operator handed a
                different export can tell at a glance that it will not parse */}
            <Muted style={{ marginTop: 6, textAlign: 'center' }}>
              {`RosiFit reads the Meet export: ${CSV_COLUMNS.join(' · ')}. There is no email column.`}
            </Muted>
            <Button label="Browse files" variant="secondary" style={{ marginTop: SPACE.lg }}
              onPress={() => void choose()} />
          </View>

          {failure && (
            <View
              accessibilityLiveRegion="polite"
              style={{
                marginTop: SPACE.md, padding: SPACE.lg, borderRadius: RADIUS.lg,
                flexDirection: 'row', gap: SPACE.md,
                backgroundColor: statusSurface(theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight).bg,
                borderWidth: 1,
                borderColor: statusSurface(theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight).border,
              }}>
              <Icon name="error" size={20} color={theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight} />
              <Body style={{ flex: 1, fontSize: 12.5, lineHeight: 19 }}>{failure}</Body>
            </View>
          )}

          {picked && (
            <View style={{
              marginTop: SPACE.md, padding: SPACE.lg, borderRadius: RADIUS.lg,
              flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
              backgroundColor: statusSurface(okInk).bg, borderWidth: 1, borderColor: statusSurface(okInk).border,
            }}>
              <Icon name="check_circle" size={22} color={okInk} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: theme.fgStrong, fontVariant: ['tabular-nums'] }}>
                  {file?.name ?? 'meet-attendance.csv'}
                </Text>
                <Text style={{ fontSize: 11.5, color: theme.muted, fontVariant: ['tabular-nums'] }}>
                  {`${file?.rows ?? 0} rows`}
                </Text>
              </View>
              <Button label="Process" onPress={() => void run()} />
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
              ? `Reading ${file?.rows ?? 18} rows and dropping anyone under 15 minutes.`
              : 'Comparing names against the enrolled members.'}
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
              <Count n={rowsRead} label="rows read" color={theme.fgStrong} />
              <Count n={matchedCount} label="matched" color={okInk} />
              <Count n={ambiguousCount} label="ambiguous" color={warnInk} />
            </View>
            {preview && preview.dropped_count > 0 && (
              <Muted style={{ marginTop: SPACE.md }}>
                {`${preview.dropped_count} row${preview.dropped_count === 1 ? '' : 's'} under 15 minutes were dropped before matching.`}
              </Muted>
            )}
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
              {needDecision === 0
                ? ' Every row matched a member. Review them, then the whole file imports together.'
                : ` ${needDecision} row${needDecision === 1 ? '' : 's'} need a decision. You decide each, then the whole file imports together.`}
            </Body>
          </View>

          <Button label={needDecision === 0 ? 'Review and import' : `Review ${needDecision} rows`}
            onPress={goReview} style={{ marginTop: SPACE.lg }} />
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
