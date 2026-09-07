/**
 * Bulk import members — choose the file and it is imported.
 *
 * The canvas calls it "file, validate, preview, confirm" (`goBulkImport`)
 * and it shipped that way; the preview and the confirm are gone (see
 * `choose` below), so what is left is file, validate, WRITE, report. The
 * reference for the rest is the UniqBrio Mobile App's Bulk Student Import
 * v1, applied to RosiFit's structure: an .xlsx template with an
 * instructions sheet, a data sheet with dropdowns and a hidden lookup;
 * 500 rows and 5 MB at most;
 * OWNER-ONLY; every row judged on its own; a duplicate skipped, never
 * overwritten; results as Imported / Skipped / Failed, with every row that
 * did not land named on the result and the reason beside it.
 *
 * IT IS NOT THE ATTENDANCE IMPORT, which is the defect it closes: the
 * course detail's Bulk Import opened `/upload`, the Google Meet register
 * importer. The plan calls conflating the two "the likeliest misreading"
 * (§6.6). The two are different in kind, not just in columns: a register is
 * one session's truth and imports atomically; a member list is forty
 * independent facts and imports row by row (§15.2).
 */
import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Body, Muted, Label, Button, Skeleton, ErrorState, EmptyState } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { FormDialog } from '../../src/components/FormDialog';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, STATUS, statusSurface, onStatusFill } from '../../src/theme/tokens';
import { useCourses, useMembers } from '../../src/data/hooks';
import { bulkImportMembers, fetchAcademyName } from '../../src/data/repository';
import { pickFile, downloadBlob } from '../../src/data/csv';
import {
  validateMemberRows, normalizeForMatch, tallyImport, MemberImportError, MEMBER_IMPORT_HELP,
  MEMBER_IMPORT_MAX_ROWS, MEMBER_IMPORT_MAX_BYTES,
  type RowVerdict, type ImportResult, type MemberImportRow,
} from '../../src/data/memberImport';
import {
  buildMemberTemplate, parseMemberXlsx, buildErrorReport, templateFileName, templateColumns,
  type ReportLine,
} from '../../src/data/memberXlsx';

const ink = (k: keyof typeof STATUS, dark: boolean) => (dark ? STATUS[k].fgDark : STATUS[k].fgLight);

/**
 * The result of a file the server was never called for -- every row was
 * refused here, so nothing was sent and nothing came back. It is a real
 * result, not an empty one: the counts and the reasons are the answer, and
 * they come from the verdicts rather than from this.
 */
const NOTHING_SENT: ImportResult = {
  run_id: 'not-sent', total: 0, inserted: 0, skipped: 0, failed: 0, rows: [],
};
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function MemberImportBody() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { courseId } = useLocalSearchParams<{ courseId?: string }>();

  const courses = useCourses();
  const roster = useMembers();

  const courseList = useMemo(() => courses.data ?? [], [courses.data]);
  const opened = useMemo(
    () => (courseId ? courseList.find(c => c.id === courseId) ?? null : null),
    [courseId, courseList]);

  const [academy, setAcademy] = useState('RosiFit Academy');
  useEffect(() => { void fetchAcademyName().then(setAcademy).catch(() => undefined); }, []);

  const [file, setFile] = useState<{ name: string; rows: MemberImportRow[] } | null>(null);
  const [verdicts, setVerdicts] = useState<RowVerdict[] | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [busy, setBusy] = useState<'template' | 'reading' | 'importing' | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  // THE COURSE IS PER ROW, and it lives in the file. There is no picker
  // here: one spreadsheet can carry members for as many courses as the
  // academy runs, and asking for a single course up front would have meant
  // one upload per course. Opened from a course detail, that course is what
  // a BLANK Course cell falls back to -- a default for the file, never a
  // filter, and a row naming another course still joins the one it names.
  const chosenOffering = opened?.offerings[0] ?? null;
  const chosenCourse = opened?.name ?? '';
  const chosenBranch = chosenOffering?.branch ?? '';

  const offerings = useMemo(
    () => courseList.flatMap(c => c.offerings.map(o => ({ course: c.name, branch: o.branch }))),
    [courseList]);

  const ctx = useMemo(() => ({
    existingNames: new Set((roster.data ?? []).map(m => normalizeForMatch(m.name))),
    existingAliases: new Set((roster.data ?? []).flatMap(m => m.aliases.map(normalizeForMatch))),
    existingEmails: new Set((roster.data ?? []).flatMap(m => m.emails.map(e => e.address.toLowerCase()))),
    offerings,
    defaultCourse: chosenCourse,
    defaultBranch: chosenBranch,
  }), [roster.data, offerings, chosenCourse, chosenBranch]);

  const blocked = verdicts?.filter(v => v.state === 'blocked') ?? [];

  // The four counts, from BOTH halves: rows this screen refused never reached
  // the server and have no verdict there, and rows that were sent have none
  // here beyond "ready". Neither half is the whole file.
  const tally = useMemo(() => tallyImport(verdicts ?? [], result), [verdicts, result]);

  /** Every row that is not on the register, in sheet order, whichever side
   *  refused it -- one list, because "why did she not import" is one question. */
  const notLanded = useMemo(() => [
    ...blocked.map(v => ({ row: v.row.row, name: v.row.full_name, status: v.kind, reason: v.reason })),
    ...(result?.rows ?? []).filter(r => r.status !== 'inserted')
      .map(r => ({ row: r.row, name: r.full_name, status: r.status, reason: r.reason ?? '' })),
  ].sort((a, b) => a.row - b.row), [blocked, result]);

  /**
   * The rows that did not land, as a workbook: Row · Status · Reason, then
   * every column as it was.
   *
   * NOT an approval, and not a step -- the import has already happened when
   * this appears. It is here because the on-screen list is only readable
   * while it is short: a 500-row file with 200 refusals is a list nobody
   * scrolls, and the thing the person has to do next is edit those rows in
   * the file they already have open. Client-refused and server-refused rows
   * go in the same report, because "why did she not import" is one question.
   */
  const downloadReport = async () => {
    if (!file) return;
    const byRow = new Map(file.rows.map(r => [r.row, r]));
    const lines: ReportLine[] = [
      ...blocked.map(v => ({ row: v.row, status: v.kind, reason: v.reason })),
      ...(result?.rows ?? []).filter(r => r.status !== 'inserted')
        .map(r => ({ row: byRow.get(r.row)!, status: r.status, reason: r.reason ?? '' }))
        .filter(l => l.row),
    ];
    try {
      const bytes = await buildErrorReport(lines);
      downloadBlob('rosifit-import-errors.xlsx', new Blob([bytes], { type: XLSX }));
      flash(`${lines.length} row${lines.length === 1 ? '' : 's'} in the report`);
    } catch (e) {
      flash(e instanceof Error ? e.message : 'The report could not be saved.', 'warn');
    }
  };

  const downloadTemplate = async () => {
    setBusy('template');
    try {
      const bytes = await buildMemberTemplate({
        academy, offerings,
        openedFrom: chosenOffering ? { course: chosenCourse, branch: chosenBranch } : null,
      });
      downloadBlob(templateFileName(academy), new Blob([bytes], { type: XLSX }));
      flash('Template saved · fill in the Member Data sheet and choose it below');
    } catch (e) {
      flash(e instanceof Error ? e.message : 'The template could not be saved.', 'warn');
    } finally {
      setBusy(null);
    }
  };

  /**
   * CHOOSING THE FILE IS THE IMPORT. Read, judge, write, report -- one tap.
   *
   * There used to be a preview between the two: every row with its verdict,
   * and an "Import N members" button under it. It was a list nobody could act
   * on -- the only two answers to it were "yes" and "choose a different file"
   * -- and it made the commonest case, a file that is simply correct, cost a
   * second tap and a scroll past forty rows to find it.
   *
   * Nothing is lost by moving it after the write. Every row is still judged
   * before anything is sent, a refused row still writes nothing, and the
   * reasons are still row by row -- they are in the result now, each one
   * naming the row in the sheet it came from, which is what anybody who has
   * to act on them has to go back to.
   *
   * The server judges every row again (bulk_import_members, 0028) and writes
   * each accepted one in her own sub-transaction, so the count that comes
   * back is the count the database accepted -- never the count sent.
   */
  const choose = async () => {
    setRefusal(null);
    setResult(null);
    setVerdicts(null);
    setFile(null);
    try {
      const picked = await pickFile(`.xlsx,${XLSX}`, MEMBER_IMPORT_MAX_BYTES);
      if (!picked) return;
      setBusy('reading');
      const rows = await parseMemberXlsx(picked.bytes);
      const judged = validateMemberRows(rows, ctx);
      setFile({ name: picked.name, rows });
      setVerdicts(judged);

      const send = judged.filter(v => v.state === 'ready');
      // A file in which NOTHING can be written is still a result, not an
      // error: the counts and the reasons are the answer. Calling the server
      // with an empty list would only be asking it to agree.
      if (send.length === 0) { setResult(NOTHING_SENT); return; }

      setBusy('importing');
      const r = await bulkImportMembers({
        rows: send.map(v => v.row),
        // null when this was not opened from a course: then every row must
        // name its own, and one that does not is refused by name rather than
        // quietly filed under whichever course happened to be first.
        default_offering_id: chosenOffering?.id ?? null,
        file_name: picked.name,
      });
      setResult(r);
    } catch (e) {
      setFile(null);
      setVerdicts(null);
      setRefusal(e instanceof MemberImportError || e instanceof Error
        ? e.message : 'That file could not be read. Nothing has been saved.');
    } finally {
      setBusy(null);
    }
  };

  // ------------------------------------------------------------ states
  // Each of these is the SAME dialog with different content in it. As a page
  // they were separate screens; over the screen that opened it they are
  // answers to one question, and the way out is the same close in the same
  // corner for every one of them.
  const dark = theme.isDark;
  const loading = courses.state === 'loading' || roster.state === 'loading';
  // NO PERMISSION-DENIED STATE, since 0038. Bulk import was owner-only and
  // this screen said so; the repo owner opened it to staff on 07-Sep-2026
  // (requests/2026-09-07-staff-write-access.md) and bulk_import_members now
  // asks only for an active user, so there is no role left to refuse. The
  // subscription still can: that refusal arrives from the RPC, on the result.
  const failed = !loading && courses.state === 'error';
  // NOT CONFIGURED, and the ONLY gate before the file. The template's Course
  // column is a dropdown fed from the academy's own courses, and a course
  // typed by hand is refused by Excel itself -- so a template built with no
  // courses in it would offer an empty list and every row would fail on
  // upload. The template is not offered at all until there is something for
  // it to list.
  const unconfigured = !loading && !failed && courseList.length === 0;
  // THE RESULT IS THIS DIALOG, not a second one over it. A card over a card,
  // with two scrims and two closes for one action, was what it took while the
  // import was a page underneath; the import is a dialog now, so the answer
  // arrives where the question was asked.
  const showResult = result !== null && file !== null;

  const body = loading ? <Skeleton lines={6} />
    : failed ? (
      <ErrorState onRetry={courses.retry}
        message={courses.error ?? 'The courses could not be loaded. Nothing has been changed.'} />
    ) : unconfigured ? (
      <EmptyState title="Add a course first"
        body="The template's Course column is a dropdown of your own courses, and a course typed by hand is refused — so there is nothing to build one from yet. Add a course, then come back and download the template."
        action="Add Course" onAction={() => router.push('/course/edit')} />
    ) : showResult && result && file ? (
      <>
        {/* The WORD and the icon, never the fill alone (guardrail 3). The ink
            on a status fill is measured in both themes -- onStatusFill, swept
            by scripts/check-contrast.ts. */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.md,
          padding: SPACE.lg, borderRadius: RADIUS.md,
          backgroundColor: tally.imported > 0 ? ink('present', dark) : ink('awaiting', dark),
        }}>
          <Icon name={tally.imported > 0 ? 'check_circle' : 'warning'}
            size={22} color={onStatusFill(dark)} />
          <Text style={{ fontSize: 17, fontWeight: '800', color: onStatusFill(dark) }}>
            {tally.imported > 0 ? 'Import complete' : 'Nothing was imported'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.md }}>
          <Count testID="import-count-imported" n={tally.imported}
            label="Imported" color={ink('present', dark)} />
          <Count testID="import-count-skipped" n={tally.skipped}
            label="Skipped (already exist)" color={ink('awaiting', dark)} />
        </View>
        <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.md }}>
          <Count testID="import-count-failed" n={tally.failed}
            label="Failed" color={ink('absent', dark)} />
          <Count testID="import-count-nocourse" n={tally.noCourse}
            label="No course" color={ink('cancelled', dark)} />
        </View>

        <Muted style={{ marginTop: SPACE.md }}>
          {tally.imported === tally.total
            ? `Every row landed — ${tally.imported} member${tally.imported === 1 ? '' : 's'} on the register, each in the course her row named.`
            : 'Skipped rows were already on the register and were not changed. Nothing was written for the others; the reasons are below, row by row.'}
        </Muted>

        {notLanded.length ? (
          <>
            <Label style={{ marginTop: SPACE.xl }}>Rows that did not import</Label>
            <View style={{ marginTop: SPACE.sm, gap: 7 }}>
              {notLanded.map(r => <ReportRow key={`${r.status}-${r.row}`} {...r} dark={dark} />)}
            </View>
            {/* Offered, never required: the import is already done, and for a
                short list the reasons above are the whole answer. It earns its
                place on the long ones, where the list is longer than the card
                and the fix happens in the workbook anyway. */}
            <Button testID="import-report" label="Download these rows" variant="secondary"
              onPress={() => void downloadReport()} style={{ marginTop: SPACE.md }} />
            <Muted style={{ marginTop: 8 }}>
              Fix those rows in your file and choose it again — the ones that imported are skipped next time, not repeated.
            </Muted>
          </>
        ) : null}
      </>
    ) : (
      <>
        {/* Opened from a course, that course is what a BLANK Course cell means.
            Stated, not offered: it is a default for the file, not a decision to
            take here, and a row naming another course still joins that one. */}
        {opened ? (
          <View style={{
            padding: SPACE.lg, borderRadius: RADIUS.md,
            backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
            flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
          }}>
            <Icon name="school" size={20} color={theme.accentInk} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.fgStrong }}>
                {`${opened.name}${chosenBranch ? ` \u00b7 ${chosenBranch}` : ''}`}
              </Text>
              <Muted style={{ marginTop: 2 }}>A row with a blank Course joins this one.</Muted>
            </View>
          </View>
        ) : null}

        {/* The template, offered BEFORE the picker: the commonest way to fail
            an import is to build the file first. */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
          marginTop: opened ? SPACE.xl : 0,
        }}>
          <Label style={{ flex: 1 }}>The file</Label>
          {/* The whole description of the file is BEHIND this, in a dialog over
              the dialog -- the shape every other explanation in this app takes.
              Inline it was a paragraph and a six-row table standing between the
              person and the two buttons they came here to press: read once, and
              scrolled past on every visit after. */}
          <Pressable testID="import-help" onPress={() => setHelpOpen(true)}
            accessibilityRole="button" accessibilityLabel="What the file needs"
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: SPACE.md, paddingVertical: 7, borderRadius: RADIUS.md,
              backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
              opacity: pressed ? 0.7 : 1,
            })}>
            <Icon name="info" size={16} color={theme.accentInk} />
            <Text style={{ fontSize: 12, fontWeight: '800', color: theme.accentInk }}>
              What the file needs
            </Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.md }}>
          <Button testID="import-template" variant="secondary" style={{ flex: 1 }}
            label={busy === 'template' ? 'Building\u2026' : 'Download template'}
            onPress={() => void downloadTemplate()} disabled={busy !== null} />
          {/* One tap: choosing the file reads it, judges it, writes it and
              reports. The label says which of those is happening. */}
          <Button testID="import-choose" style={{ flex: 1 }}
            label={busy === 'reading' ? 'Reading\u2026' : busy === 'importing' ? 'Importing\u2026'
                   : file ? 'Choose another' : 'Choose file'}
            onPress={() => void choose()} disabled={busy !== null} />
        </View>

        {refusal ? (
          <View style={{ marginTop: SPACE.lg }}>
            <ErrorState message={refusal} onRetry={() => setRefusal(null)} />
          </View>
        ) : null}
      </>
    );

  // --------------------------------------------- the dialog it all sits in
  // A DIALOG, not a page (06-Sep-2026). Importing a file of members is
  // something done TO the list you are looking at, the way the attendance
  // upload is done to the register you are looking at -- and that one has
  // been a FormDialog over its screen since decision 009. As a page this one
  // REPLACED the screen it was started from, so "import these members into
  // this academy" was asked with the thing being imported into no longer on
  // screen. The route pairs this with DIALOG_SCREEN in app/_layout.tsx --
  // transparentModal, so the screen underneath stays mounted and visible.
  // The URL is unchanged.
  return (
    <FormDialog
      title={showResult ? 'Import complete' : 'Bulk import members'}
      subtitle={showResult && file ? file.name : 'A member list — not the attendance register'}
      onClose={() => router.back()}
      closeTestID={showResult ? 'import-result-close' : 'import-close'}
      footer={showResult ? (
        <View style={{
          padding: SPACE.lg, borderTopWidth: 1, borderTopColor: theme.line,
          backgroundColor: theme.shell,
        }}>
          <Button testID="import-done" label="Done" onPress={() => router.back()} />
        </View>
      ) : null}
      overlays={
        /* A pop-up over the dialog, drawn the way app/upload.tsx draws its own.
           It goes through `overlays` so it renders OUTSIDE the card rather than
           inside the body that scrolls. */
        <Modal visible={helpOpen} transparent animationType="fade"
          onRequestClose={() => setHelpOpen(false)}>
          <FormDialog title="What the file needs"
            subtitle="A member list — not the attendance register"
            onClose={() => setHelpOpen(false)}
            closeTestID="import-help-close"
            footer={
              <View style={{
                padding: SPACE.lg, borderTopWidth: 1, borderTopColor: theme.line,
                backgroundColor: theme.shell,
              }}>
                <Button testID="import-help-done" label="Got it" onPress={() => setHelpOpen(false)} />
              </View>
            }>
            <Body>
              {`An Excel workbook (.xlsx), one member per row on the Member Data sheet, up to ${MEMBER_IMPORT_MAX_ROWS} rows. `
               + 'Her name and her email address are both required \u2014 a row with no address is not imported. '
               + 'Each row picks its own course from a dropdown \u2014 one file can cover every course you run.'}
            </Body>
            <View style={{
              marginTop: SPACE.lg, padding: SPACE.lg, borderRadius: RADIUS.md,
              backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
            }}>
              {/* The same columns their template has: an academy running
                  everything at one branch gets no Branch column, so describing
                  one here would describe a cell that is not in their file. */}
              {MEMBER_IMPORT_HELP.filter(h => templateColumns(offerings).includes(h.column as never)).map(h => (
                <View key={h.column} style={{ flexDirection: 'row', gap: SPACE.md, marginBottom: 5 }}>
                  <Text style={{ width: 108, fontSize: 11.5, fontWeight: '800', color: theme.fgStrong }}>{h.column}</Text>
                  <Text style={{ flex: 1, fontSize: 11.5, color: theme.muted }}>{h.means}</Text>
                </View>
              ))}
            </View>
            {/* Said here rather than asked for in the file: the column is gone,
                so there is no cell left to get it wrong in. */}
            <Muted style={{ marginTop: SPACE.md }}>
              Nobody is asked for a joining date. Every member a file imports joins on the day it is imported.
            </Muted>
          </FormDialog>
        </Modal>
      }>
      {body}
    </FormDialog>
  );
}

/**
 * The five words a row can end on, and each of them says which COUNT the row
 * is in -- 'duplicate' and 'skipped' both read "Skipped" because the register
 * did the same thing with both: nothing. A row refused here and a row refused
 * by the server are the same fact to the person reading the list, so they are
 * drawn the same and sorted together.
 */
const OUTCOME: Record<string, { tone: keyof typeof STATUS; word: string; icon: string }> = {
  duplicate:   { tone: 'awaiting',  word: 'Skipped',   icon: 'remove' },
  skipped:     { tone: 'awaiting',  word: 'Skipped',   icon: 'remove' },
  'no-course': { tone: 'cancelled', word: 'No course', icon: 'school' },
  invalid:     { tone: 'absent',    word: 'Failed',    icon: 'block' },
  failed:      { tone: 'absent',    word: 'Failed',    icon: 'block' },
};

function ReportRow({ row, name, status, reason, dark }:
  { row: number; name: string; status: string; reason: string; dark: boolean }) {
  const { theme } = useTheme();
  const { tone, word, icon } = OUTCOME[status] ?? OUTCOME.failed;
  const c = ink(tone, dark);
  return (
    <View accessible accessibilityLabel={`Row ${row}, ${name || 'no name'}, ${word}. ${reason}`}
      style={{
        flexDirection: 'row', gap: SPACE.md, padding: SPACE.md, borderRadius: RADIUS.md,
        backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
      }}>
      <View style={{
        width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
        backgroundColor: statusSurface(c).bg, borderWidth: 1, borderColor: statusSurface(c).border,
      }}>
        <Icon name={icon} size={17} color={c} />
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700', color: theme.fgStrong }}>
          {name || `Row ${row}`}
        </Text>
        {/* the word, never the colour alone (guardrail 3) */}
        <Text style={{ fontSize: 11.5, color: c, fontWeight: '800', marginTop: 2 }}>{`${word} · row ${row}`}</Text>
        <Text style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>{reason}</Text>
      </View>
    </View>
  );
}

/** One of the four tiles the result is read as: the number, then the word
 *  for it -- never the colour alone (guardrail 3). */
function Count({ n, label, color, testID }:
  { n: number; label: string; color: string; testID: string }) {
  const { theme } = useTheme();
  return (
    <View testID={testID} accessible accessibilityLabel={`${n} ${label}`}
      style={{
        flex: 1, alignItems: 'center', paddingVertical: SPACE.md, paddingHorizontal: SPACE.sm,
        borderRadius: RADIUS.md, backgroundColor: theme.surface,
        borderWidth: 1, borderColor: theme.line,
      }}>
      <Text style={{ fontSize: 26, fontWeight: '800', color, fontVariant: ['tabular-nums'] }}>{n}</Text>
      <Text numberOfLines={2} style={{
        fontSize: 11, fontWeight: '800', color: theme.muted, textAlign: 'center', marginTop: 2,
      }}>{label}</Text>
    </View>
  );
}


export default function MemberImport() {
  return <MemberImportBody />;
}
