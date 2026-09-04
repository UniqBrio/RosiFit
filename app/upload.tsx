import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, H2, Body, Muted, Label, Button, Skeleton, ErrorState, EmptyState } from '../src/components/ui';
import { Icon } from '../src/components/Icon';
import { useTheme } from '../src/theme/ThemeProvider';
import { useToast } from '../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface } from '../src/theme/tokens';
import { MATCH_ROWS, OUTCOME_META } from '../src/data/mock';
import { usePendingSessions, useCourses } from '../src/data/hooks';
import type { PendingSession } from '../src/data/repository';
import { isConfigured } from '../src/lib/supabase';
import {
  parseMeetCsv, meetMatchesSession, meetCreatedDate, meetCreatedTime, dedupeRows,
  CSV_COLUMNS, type MeetMeta,
} from '../src/data/meetCsv';
import { sha256Hex, pickCsvFile } from '../src/data/csv';
import { csvPreview, type PreviewResult } from '../src/data/api';
import { setStagedImport } from '../src/data/pending';
import { scopeSessions } from '../src/data/uploadScope';
import { ShellScreen } from '../src/components/AppShell';

const STEPS = ['Course', 'File', 'Process', 'Summary'] as const;

/**
 * WHAT THIS SCREEN USED TO REQUIRE
 * A session to upload AGAINST. Step one listed `sessions` rows already
 * scheduled and waiting for a file, and the import carried the offering and
 * the date chosen from that list.
 *
 * A course whose classes are not on a fixed timetable has no such rows. The
 * screen said "Every session has a file" and there was NO WAY IN AT ALL --
 * for the case that matters most, an academy that schedules as it goes.
 *
 * So the first choice is the COURSE, which is a thing that always exists, and
 * the DATE comes from the file: Google Meet writes its meeting code and the
 * created and ended timestamps above the table, and that is what says which
 * session this is. Sessions still awaiting a file are offered first as
 * shortcuts, because when there IS one it is almost always the answer.
 */

function UploadBody() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  // Where she came FROM decides what she is offered. A day on a course opens
  // straight into that session; the course itself narrows the list to its own
  // sessions; the academy-wide Attendance list narrows nothing. One screen,
  // three honest entry points -- see src/data/uploadScope.ts.
  const { state: forced, courseId, date } = useLocalSearchParams<
    { state?: string; courseId?: string; date?: string }>();
  const pending = usePendingSessions(forced);
  // Courses always exist; sessions awaiting a file may not. This is what makes
  // the upload reachable for an academy that schedules as it goes.
  const courses = useCourses(forced);

  const [step, setStep] = useState(1);
  /**
   * What the file will be imported into. An OFFERING (a course at a branch),
   * never a session: the session is derived from the file's own date, and may
   * not exist yet at all.
   *
   * `session` is set only when she took a shortcut from a day already
   * awaiting a file; it is a convenience, not a requirement.
   */
  const [target, setTarget] = useState<
    { offering_id: string; course: string; branch: string } | null>(null);
  const [session, setSession] = useState<PendingSession | null>(null);
  const [file, setFile] = useState<
    { name: string; text: string; rows: number; meta: MeetMeta } | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const scope = scopeSessions(pending.data ?? [], courseId, date);
  const sessions = scope.sessions;
  /**
   * What step 2 says she is uploading FOR.
   *
   * This used to fall back to `sessions[0].label` -- the first day anywhere in
   * the academy awaiting a file. Picking a course with no session at all then
   * announced "Fri 22 Aug · Prenatal Flow", a day she had not chosen and a
   * course that might not be hers. A screen guessing which session it is about
   * is the one thing this flow cannot afford.
   *
   * A shortcut from a waiting day names that day. A course names the course:
   * the day is not known yet, because it comes from the file.
   */
  const chosen = session?.label
    ?? (target ? `${target.course} · ${target.branch}` : '');

  /**
   * One session means the choice was already made, on the screen she tapped.
   * Asking her to make it again is where she picks the wrong one.
   *
   * Guarded on `session` rather than on a ran-once ref: if she uses "Choose a
   * different session" the preselect must not put her straight back, and the
   * back-out clears the params, so this stops applying rather than fighting
   * her.
   */
  useEffect(() => {
    if (!scope.preselect || session) return;
    setSession(scope.preselect);
    setTarget({
      offering_id: scope.preselect.offering_id,
      course: scope.preselect.course,
      branch: scope.preselect.meta.split(' · ')[0] ?? '',
    });
    setStep(2);
  }, [scope.preselect, session]);

  /**
   * The offerings she can upload for: every branch of every course, narrowed
   * to one course when that is where she came from.
   *
   * This list does NOT depend on anything being scheduled, which is the whole
   * point. A course that has never had a session generated still appears, and
   * a file can still be imported into it.
   */
  const targets = (courses.data ?? [])
    .filter(c => !courseId || c.id === courseId)
    .flatMap(c => c.offerings.map(o => ({
      offering_id: o.id, course: c.name, branch: o.branch,
    })));

  /**
   * One offering means the choice was already made on the screen she tapped.
   * Only auto-selected when a course scope was ASKED for: academy-wide, an
   * academy that happens to run one course should still see what it is
   * choosing.
   */
  useEffect(() => {
    if (target || !courseId || targets.length !== 1) return;
    setTarget(targets[0]);
    setStep(2);
  }, [target, courseId, targets]);
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
      setFile({
        name: chosenFile.name, text: chosenFile.text, rows: parsed.rows.length,
        // The lines Meet writes above the table. They are the only evidence
        // in the file of WHICH meeting it came from, which is what lets the
        // map below say whether it matches the session picked.
        meta: parsed.meta,
      });
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

    if (!isConfigured || !file || !target?.offering_id) {
      setTimeout(() => {
        if (timer.current) clearInterval(timer.current);
        setProgress(100); setStep(4);
      }, 900);
      return;
    }

    try {
      const parsed = parseMeetCsv(file.text);
      const day = meetCreatedDate(parsed.meta.created);
      if (!day) throw new Error(
        'This file carries no “Created on” line, so RosiFit cannot tell which day it covers.');
      const result = await csvPreview({
        offering_id: target.offering_id,
        // FROM THE FILE, not from a list. The session this belongs to is
        // whatever day the meeting ran; if no such session exists yet, the
        // import creates it (0024).
        session_date: day,
        file_name: file.name,
        file_sha256: await sha256Hex(file.text),
        meeting_code: parsed.meta.code,
        meeting_started_at: parsed.meta.created,
        // Deduped before it is sent, so the count reviewed is the count
        // written: one person, one session, one day.
        rows: dedupeRows(parsed.rows).rows,
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

  /* ----------------------------------------------- what the file says it is
   *
   * THIS PANEL CHANGED MEANING. It used to ask "does the file match the
   * session you picked" -- a check that only made sense while a session was
   * something chosen in advance. The date now comes FROM the file, so the
   * panel states what the file says and the app cannot contradict it.
   *
   * One check survives, and only where it is real: when she took a shortcut
   * from a day already awaiting a file, a file for a DIFFERENT day is
   * probably the wrong file. `ok: null` is "cannot be checked", never
   * "wrong" -- warning on unknown trains people past the warning that counts.
   */
  const fileDate = meetCreatedDate(file?.meta.created ?? null);
  const fileTime = meetCreatedTime(file?.meta.created ?? null);
  const mapMatches = session
    ? meetMatchesSession(file?.meta.created ?? null, session.session_date)
    : null;
  const dupNames = file ? dedupeRows(parseMeetCsv(file.text).rows).duplicates : [];

  const sessionMap: { label: string; value: string; ok: boolean | null }[] = file ? [
    { label: 'Meeting code', value: file.meta.code ?? 'not in this file',
      ok: file.meta.code ? true : null },
    { label: 'Session date', value: fileDate ?? 'not in this file',
      ok: fileDate ? (mapMatches ?? true) : null },
    { label: 'Started at', value: fileTime ?? 'no time in this file',
      ok: fileTime ? true : null },
    { label: 'Course', value: target ? `${target.course} · ${target.branch}` : '—', ok: null },
    { label: 'Rows read', value: `${file.rows}`, ok: true },
  ] : [];

  const mapNote = !fileDate
    ? 'This file carries no “Created on” line, so RosiFit cannot tell which day it covers. Pick a day awaiting a file instead, or export it again from Meet.'
    : mapMatches === false
    ? `This file is from ${fileDate}, but the day you tapped is ${session?.session_date}. Check you have the right file before importing.`
    : 'The meeting code and date come from the lines above the table in the Meet file — that is what says which session this is. The course and branch come from RosiFit, never from the file.';

  /** Blocked from processing: no course to import into, or no date to import for. */
  const cannotRun = !target || !fileDate;

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

      {step === 1 && (pending.state === 'loading' || courses.state === 'loading') && (
        <Skeleton lines={4} />
      )}

      {step === 1 && courses.state === 'error' && (
        <ErrorState onRetry={courses.retry}
          message={courses.error ?? 'The course list could not be loaded. Nothing has been changed.'} />
      )}

      {/* NO COURSES is the only state that genuinely blocks an upload. It used
          to be "no session is awaiting a file", which blocked the case this
          screen exists for: an academy that schedules as it goes has no
          sessions waiting and a file to import all the same. */}
      {step === 1 && courses.state === 'ready' && targets.length === 0 && (
        <EmptyState
          title={courseId ? 'This course runs at no branch yet' : 'No course to upload for'}
          body="A file is imported into a course at a branch, so add that first. The days it runs do not have to be decided — the attendance file says which day it covers."
          action={courseId ? 'Show every course' : 'Add a course'}
          onAction={() => router.replace(courseId ? '/upload' : '/course/edit')} />
      )}

      {step === 1 && courses.state === 'ready' && targets.length > 0 && (
        <>
          {/* Days already awaiting a file come first, because when there IS
              one it is almost always the answer -- and taking the shortcut
              also lets the screen check the file's date against that day. */}
          {sessions.length > 0 ? (
            <>
              <Label>{`Waiting for a file · ${sessions.length}`}</Label>
              <View style={{ gap: SPACE.sm, marginTop: SPACE.sm, marginBottom: SPACE.lg }}>
                {sessions.map(sn => (
                  <Pressable key={sn.label} testID={`upload-session-${sn.session_date}`}
                    onPress={() => {
                      setSession(sn);
                      setTarget({ offering_id: sn.offering_id, course: sn.course,
                        branch: sn.meta.split(' · ')[0] ?? '' });
                      setFile(null); setPreview(null); setFailure(null); setStep(2);
                    }}
                    accessibilityRole="button" accessibilityLabel={`${sn.title}. ${sn.meta}`}
                    style={({ pressed }) => ({
                      flexDirection: 'row', alignItems: 'center', gap: SPACE.md, padding: SPACE.lg,
                      borderRadius: RADIUS.lg, backgroundColor: theme.surface,
                      borderWidth: 1, borderColor: statusSurface(warnInk).border,
                      opacity: pressed ? 0.75 : 1,
                    })}>
                    <View style={{ alignItems: 'center', width: 40 }}>
                      <Text style={{ fontSize: 22, fontWeight: '800', color: theme.fgStrong, fontVariant: ['tabular-nums'] }}>
                        {sn.dayNum}
                      </Text>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: theme.muted }}>{sn.mon}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={{ fontSize: 14.5, fontWeight: '700', color: theme.fgStrong }}>{sn.title}</Text>
                      <Text style={{ fontSize: 11.5, color: theme.muted }}>{sn.meta}</Text>
                    </View>
                    <Icon name="chevron_right" size={22} color={warnInk} />
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          {/* ALWAYS PRESENT, whatever is or is not scheduled. This is the row
              that makes an unscheduled class uploadable at all. */}
          <Label>{sessions.length ? 'Or any course, any day' : 'Choose the course'}</Label>
          <Body style={{ marginTop: 6 }}>
            The file says which day it covers, so the class does not have to have been scheduled.
          </Body>
          <View style={{ gap: SPACE.sm, marginTop: SPACE.md }}>
            {targets.map(t => (
              <Pressable key={t.offering_id} testID={`upload-offering-${t.offering_id}`}
                onPress={() => {
                  setTarget(t); setSession(null);
                  setFile(null); setPreview(null); setFailure(null); setStep(2);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Upload a file for ${t.course} at ${t.branch}`}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: SPACE.md, padding: SPACE.lg,
                  borderRadius: RADIUS.lg, backgroundColor: theme.surface,
                  borderWidth: 1, borderColor: theme.line, opacity: pressed ? 0.75 : 1,
                })}>
                <Icon name="school" size={20} color={theme.accentInk} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 14.5, fontWeight: '700', color: theme.fgStrong }}>{t.course}</Text>
                  <Text style={{ fontSize: 11.5, color: theme.muted }}>{t.branch}</Text>
                </View>
                <Icon name="chevron_right" size={22} color={theme.muted} />
              </Pressable>
            ))}
          </View>

          {courseId ? (
            <Pressable testID="upload-show-all" onPress={() => router.replace('/upload')}
              accessibilityRole="button" accessibilityLabel="Show every course"
              style={({ pressed }) => ({
                alignSelf: 'flex-start', marginTop: SPACE.md,
                minHeight: 34, paddingHorizontal: 12, borderRadius: RADIUS.sm,
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
                opacity: pressed ? 0.7 : 1,
              })}>
              <Icon name="list" size={15} color={theme.accentInk} />
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.fg }}>Show every course</Text>
            </Pressable>
          ) : null}
        </>
      )}

      {step === 2 && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md }}>
            <View style={{ flex: 1 }}>
              {/* "Session" was a promise this screen can no longer make at
                  this point: the session is whatever day the FILE says, and
                  the file has not been chosen yet. */}
              <Label>{session ? 'Session' : 'Uploading for'}</Label>
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.fgStrong, marginTop: 4 }}>{chosen}</Text>
            </View>
            {/* The only way back to the picker, and it must exist: opening
                from a day preselects the session, so without this a wrong
                preselect would be a trap. router.replace drops the scope
                params too -- otherwise the picker would reopen on the one
                session she is trying to get away from. */}
            <Pressable testID="upload-change-session" onPress={() => {
                setSession(null); setTarget(null);
                setFile(null); setPreview(null); setFailure(null); setStep(1);
                router.replace('/upload');
              }}
              accessibilityRole="button" accessibilityLabel="Choose a different session"
              style={({ pressed }) => ({
                minHeight: 34, paddingHorizontal: 12, borderRadius: RADIUS.sm,
                justifyContent: 'center',
                backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
                opacity: pressed ? 0.7 : 1,
              })}>
              <Text style={{ fontSize: 11.5, fontWeight: '800', color: theme.fg }}>Change</Text>
            </Pressable>
          </View>

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
              Meet exports one row per participant with join and leave times.
            </Muted>
            <Muted style={{ marginTop: 6, textAlign: 'center' }}>
              {`RosiFit reads the Meet export: ${CSV_COLUMNS.join(' · ')}. There is no email column.`}
            </Muted>
            {/* Said out loud because the parser USED to get this wrong: it
                read the first line as the header, so a genuine Meet export --
                which starts with the meeting code and the created and ended
                times -- was refused for having no Full Name column. */}
            <Muted style={{ marginTop: 6, textAlign: 'center' }}>
              Meet writes its own lines first — meeting code, created and ended times — then the
              table. RosiFit reads past those, so upload the file exactly as Meet gave it to you.
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
              {/* Blocked when there is no day to import FOR. The date comes
                  from the file, so a file with no "Created on" line has
                  nothing to import into -- and processing it would land
                  attendance on a date nobody chose. */}
              <Button testID="upload-process" label="Process"
                disabled={cannotRun} onPress={() => void run()} />
            </View>
          )}

          {/* ------------------------------------------- mapped to this session
              The canvas' session map. It is the last chance to notice the
              wrong file: everything after this point matches names and asks
              for decisions, and none of it looks at WHICH meeting the rows
              came from. The meeting code and date are read from the lines
              Meet writes above the table; course and branch come from
              RosiFit and are not the file's to say. */}
          {picked && file ? (
            <View style={{
              marginTop: SPACE.md, padding: SPACE.lg, borderRadius: RADIUS.lg,
              backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Icon name="link" size={17} color={theme.accentInk} />
                <Label style={{ flex: 1 }}>Mapped to this session</Label>
              </View>

              <View style={{ gap: 9, marginTop: SPACE.md }}>
                {sessionMap.map(row => (
                  <View key={row.label}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
                    <Text style={{ flex: 1, fontSize: 11.5, color: theme.muted }}>{row.label}</Text>
                    <Text numberOfLines={1} style={{
                      flexShrink: 1, fontSize: 12, fontWeight: '700',
                      color: row.ok === false ? warnInk : theme.fgStrong,
                      fontVariant: ['tabular-nums'],
                    }}>{row.value}</Text>
                    {/* the icon is a SECOND encoding of row.ok, never the
                        only one -- the value itself changes colour and the
                        note below spells the mismatch out */}
                    <Icon
                      name={row.ok === null ? 'lock' : row.ok ? 'check_circle' : 'warning'}
                      size={15}
                      color={row.ok === null ? theme.dim : row.ok ? okInk : warnInk} />
                  </View>
                ))}
              </View>

              <View style={{
                marginTop: SPACE.md, paddingTop: SPACE.md,
                borderTopWidth: 1, borderTopColor: theme.line,
              }}>
                <Text style={{
                  fontSize: 11.5, lineHeight: 17,
                  color: mapMatches ? theme.muted : warnInk,
                }}>{mapNote}</Text>
              </View>
            </View>
          ) : null}

          {/* ONE PERSON, ONE SESSION, ONE DAY -- said out loud, before the
              import, with the names. Meet writes a line per JOIN, so anybody
              whose connection dropped is in the file twice; collapsing that
              silently would leave a file that says 14 rows importing 12 with
              no explanation. */}
          {dupNames.length > 0 ? (
            <View style={{
              flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.md, padding: SPACE.lg,
              borderRadius: RADIUS.md, backgroundColor: statusSurface(warnInk).bg,
              borderWidth: 1, borderColor: statusSurface(warnInk).border,
            }}>
              <Icon name="content_copy" size={18} color={warnInk} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: warnInk }}>
                  {`${dupNames.length} repeated ${dupNames.length === 1 ? 'name' : 'names'} — counted once`}
                </Text>
                <Muted style={{ marginTop: 4, color: theme.fg }}>
                  {`${[...new Set(dupNames)].join(', ')} ${dupNames.length === 1 ? 'appears' : 'appear'} more than once, which Meet does when somebody rejoins. She is marked present once — a member cannot be in her own session twice.`}
                </Muted>
              </View>
            </View>
          ) : null}

          {/* A day that already has a file. Not refused -- a corrected export
              is a real thing -- but never silent: one session per day is a
              database invariant, so this file UPDATES that register. */}
          {preview?.supersedes ? (
            <View style={{
              flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.md, padding: SPACE.lg,
              borderRadius: RADIUS.md, backgroundColor: statusSurface(warnInk).bg,
              borderWidth: 1, borderColor: statusSurface(warnInk).border,
            }}>
              <Icon name="history" size={18} color={warnInk} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: warnInk }}>
                  This day already has a file
                </Text>
                <Muted style={{ marginTop: 4, color: theme.fg }}>
                  {`${preview.supersedes.file_name} was imported for this course on this date. Importing this one CORRECTS that register rather than adding to it — nobody is counted twice.`}
                </Muted>
              </View>
            </View>
          ) : null}
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
              ? `Reading ${file?.rows ?? 18} rows. Everyone the file names was there — time in the call decides nothing.`
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
            {/* WHY a row was dropped, and WHICH one.
                This said "under 15 minutes". There is no minutes floor -- it
                was removed on purpose, because it dropped a member who
                reconnected or joined from a phone and then recorded her
                absent from a class she attended. Rows are dropped now for
                exactly two reasons, both in csv-import: the name cell is
                blank, or it repeats a name already in the file (Meet writes
                a line per JOIN). The names come back from the preview for
                this reason -- a count alone has to be taken on trust. */}
            {preview && preview.dropped_count > 0 && (
              <Muted style={{ marginTop: SPACE.md }}>
                {`${preview.dropped_count} row${preview.dropped_count === 1 ? '' : 's'} `
                 + `dropped before matching — a blank name, or a repeat of another row`
                 + (preview.dropped_names?.length
                     ? `: ${preview.dropped_names.join(', ')}.`
                     : '.')}
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

/**
 * Under the shell, not instead of it. This screen is pushed on the root
 * stack, so it is not one of the tab navigator's own and wore no academy
 * header and no Home · Reports · More pill until ShellScreen drew them.
 */
export default function Upload() {
  const router = useRouter();
  return (
    <ShellScreen title="Upload attendance" subtitle="The register from Google Meet, matched before anything is written" onBack={() => router.back()}>
      <UploadBody />
    </ShellScreen>
  );
}
