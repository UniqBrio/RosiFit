/**
 * Bulk import members — file, validate, preview, confirm.
 *
 * Those four words are the canvas' own (`goBulkImport`); the reference for
 * the rest is the UniqBrio Mobile App's Bulk Student Import v1, applied to
 * RosiFit's structure: an .xlsx template with an instructions sheet, a data
 * sheet with dropdowns and a hidden lookup; 500 rows and 5 MB at most;
 * OWNER-ONLY; every row judged on its own; a duplicate skipped, never
 * overwritten; results as Imported / Skipped / Failed; and an error report
 * the person fixes in place and imports again.
 *
 * IT IS NOT THE ATTENDANCE IMPORT, which is the defect it closes: the
 * course detail's Bulk Import opened `/upload`, the Google Meet register
 * importer. The plan calls conflating the two "the likeliest misreading"
 * (§6.6). The two are different in kind, not just in columns: a register is
 * one session's truth and imports atomically; a member list is forty
 * independent facts and imports row by row (§15.2).
 */
import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen, H2, Body, Muted, Label, Button, Skeleton, ErrorState, EmptyState } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { ShellScreen } from '../../src/components/AppShell';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, STATUS, statusSurface } from '../../src/theme/tokens';
import { useCourses, useMembers } from '../../src/data/hooks';
import { useIdentity } from '../../src/data/session';
import { bulkImportMembers, fetchAcademyName } from '../../src/data/repository';
import { pickFile, downloadBlob } from '../../src/data/csv';
import { iso } from '../../src/data/period';
import {
  validateMemberRows, normalizeForMatch, MemberImportError, MEMBER_IMPORT_HELP,
  MEMBER_IMPORT_MAX_ROWS, MEMBER_IMPORT_MAX_BYTES,
  type RowVerdict, type ImportResult, type MemberImportRow,
} from '../../src/data/memberImport';
import { buildMemberTemplate, parseMemberXlsx, buildErrorReport, templateFileName } from '../../src/data/memberXlsx';

const ink = (k: keyof typeof STATUS, dark: boolean) => (dark ? STATUS[k].fgDark : STATUS[k].fgLight);
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function MemberImportBody() {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();
  const { courseId } = useLocalSearchParams<{ courseId?: string }>();

  const { identity, loading: identityLoading } = useIdentity();
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
    today: iso(new Date()),
  }), [roster.data, offerings, chosenCourse, chosenBranch]);

  const ready = verdicts?.filter(v => v.state === 'ready') ?? [];
  const blocked = verdicts?.filter(v => v.state === 'blocked') ?? [];

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

  const choose = async () => {
    setRefusal(null);
    setResult(null);
    try {
      const picked = await pickFile(`.xlsx,${XLSX}`, MEMBER_IMPORT_MAX_BYTES);
      if (!picked) return;
      // Judged the moment it is chosen. A "Validate" step between the two
      // would be a tap whose only outcome is the one the screen reaches on
      // its own.
      setBusy('reading');
      const rows = await parseMemberXlsx(picked.bytes);
      setFile({ name: picked.name, rows });
      setVerdicts(validateMemberRows(rows, ctx));
    } catch (e) {
      setFile(null);
      setVerdicts(null);
      setRefusal(e instanceof MemberImportError || e instanceof Error ? e.message : 'That file could not be read.');
    } finally {
      setBusy(null);
    }
  };

  /**
   * One call for the whole file. The server judges every row again and
   * writes each accepted one in her own sub-transaction, so the count that
   * comes back is the count the database accepted -- never the count sent.
   */
  const confirm = async () => {
    if (!file || ready.length === 0 || busy) return;
    setBusy('importing');
    setRefusal(null);
    try {
      const r = await bulkImportMembers({
        rows: ready.map(v => v.row),
        // null when this was not opened from a course: then every row must
        // name its own, and one that does not is refused by name rather than
        // quietly filed under whichever course happened to be first.
        default_offering_id: chosenOffering?.id ?? null,
        file_name: file.name,
      });
      setResult(r);
      flash(r.failed === 0 && r.skipped === 0
        ? `${r.inserted} member${r.inserted === 1 ? '' : 's'} imported`
        : `${r.inserted} imported \u00b7 ${r.skipped} skipped \u00b7 ${r.failed} failed`,
        r.failed ? 'warn' : undefined);
    } catch (e) {
      setRefusal(e instanceof Error ? e.message : 'The import could not be started. Nothing has been saved.');
    } finally {
      setBusy(null);
    }
  };

  /** Row · Status · Reason, then every column as it was -- fix it in place,
   *  import the same file again. Blocked-before-the-tap rows and
   *  refused-by-the-server rows go in the same report. */
  const downloadReport = async () => {
    if (!file) return;
    const byRow = new Map(file.rows.map(r => [r.row, r]));
    const lines = [
      ...blocked.map(v => ({ row: v.row, status: 'blocked', reason: (v as { reason: string }).reason })),
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

  // ------------------------------------------------------------ states
  if (identityLoading || courses.state === 'loading' || roster.state === 'loading') {
    return <Screen><Skeleton lines={6} /></Screen>;
  }
  // PERMISSION-DENIED: an honest no-access state, never an empty form. The
  // buttons that lead here are hidden for staff, but a route can be typed,
  // and the RPC refuses staff regardless -- this just says so first.
  if (!identity?.isSuperAdmin) {
    return (
      <Screen>
        <EmptyState title="Only the academy admin can bulk import"
          body="Adding members one at a time is open to everyone; a file of them changes the shape of the register, and that is the admin's decision."
          action="Back" onAction={() => router.back()} />
      </Screen>
    );
  }
  if (courses.state === 'error') {
    return (
      <Screen>
        <ErrorState onRetry={courses.retry}
          message={courses.error ?? 'The courses could not be loaded. Nothing has been changed.'} />
      </Screen>
    );
  }
  // EMPTY (not configured), and now the ONLY gate before the file.
  // The template's Course column is a dropdown fed from the academy's own
  // courses, and a course typed by hand is refused by Excel itself — so a
  // template built with no courses in it would offer an empty list and every
  // row would fail on upload. The template is not offered at all until there
  // is something for it to list.
  if (courseList.length === 0) {
    return (
      <Screen>
        <EmptyState title="Add a course first"
          body="The template's Course column is a dropdown of your own courses, and a course typed by hand is refused — so there is nothing to build one from yet. Add a course, then come back and download the template."
          action="Add Course" onAction={() => router.push('/course/edit')} />
      </Screen>
    );
  }

  const branchOptions = courseList.find(c => c.name === chosenCourse)?.offerings.map(o => o.branch) ?? [];
  const dark = theme.isDark;

  // ------------------------------------------------------------ results
  if (result && file) {
    const tone = result.failed ? 'absent' : result.skipped ? 'awaiting' : 'present';
    const c = ink(tone, dark);
    return (
      <Screen>
        <View style={{
          padding: SPACE.lg, borderRadius: RADIUS.lg, borderWidth: 1,
          backgroundColor: statusSurface(c).bg, borderColor: statusSurface(c).border,
        }}>
          <H2>{file.name}</H2>
          <View style={{ flexDirection: 'row', gap: SPACE.lg, marginTop: SPACE.md }}>
            <Count n={result.inserted} label="imported" color={ink('present', dark)} />
            <Count n={result.skipped}  label="skipped"  color={ink('awaiting', dark)} />
            <Count n={result.failed}   label="failed"   color={ink('absent', dark)} />
          </View>
          <Muted style={{ marginTop: SPACE.md }}>
            {result.inserted === result.total
              ? `Every row landed \u2014 ${result.inserted} member${result.inserted === 1 ? '' : 's'} on the register, each in the course her row named.`
              : 'Skipped rows were already on the register and were not changed. Failed rows wrote nothing; the report says why, row by row.'}
          </Muted>
        </View>

        {result.rows.some(r => r.status !== 'inserted') || blocked.length ? (
          <>
            <Label style={{ marginTop: SPACE.xl }}>Rows that did not import</Label>
            <View style={{ marginTop: SPACE.sm, gap: 7 }}>
              {[...blocked.map(v => ({ row: v.row.row, name: v.row.full_name, status: 'blocked', reason: (v as { reason: string }).reason })),
                ...result.rows.filter(r => r.status !== 'inserted').map(r => ({ row: r.row, name: r.full_name, status: r.status, reason: r.reason ?? '' }))]
                .sort((a, b) => a.row - b.row)
                .map(r => <ReportRow key={`${r.status}-${r.row}`} {...r} dark={dark} />)}
            </View>
            <Button testID="import-report" label="Download error report" variant="secondary"
              onPress={() => void downloadReport()} style={{ marginTop: SPACE.md }} />
            <Muted style={{ marginTop: 8 }}>Fix the rows in the report, then choose the file again — imported rows are skipped next time, not repeated.</Muted>
          </>
        ) : null}

        <Button testID="import-done" label="Done" onPress={() => router.back()} style={{ marginTop: SPACE.xl }} />
      </Screen>
    );
  }

  // -------------------------------------------------------- the import
  return (
    <Screen>
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

      {/* STEP 2 — the template, offered BEFORE the picker: the commonest way
          to fail an import is to build the file first. */}
      <Label style={{ marginTop: opened ? SPACE.xl : 0 }}>The file</Label>
      <Muted style={{ marginTop: 4 }}>
        {`An Excel workbook (.xlsx), one member per row on the Member Data sheet, up to ${MEMBER_IMPORT_MAX_ROWS} rows. `
         + 'Only her name is required, and each row picks its own course from a dropdown \u2014 one file can cover every course you run.'}
      </Muted>
      <View style={{
        marginTop: SPACE.md, padding: SPACE.lg, borderRadius: RADIUS.md,
        backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
      }}>
        {MEMBER_IMPORT_HELP.map(h => (
          <View key={h.column} style={{ flexDirection: 'row', gap: SPACE.md, marginBottom: 5 }}>
            <Text style={{ width: 108, fontSize: 11.5, fontWeight: '800', color: theme.fgStrong }}>{h.column}</Text>
            <Text style={{ flex: 1, fontSize: 11.5, color: theme.muted }}>{h.means}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.md }}>
        <Button testID="import-template" variant="secondary" style={{ flex: 1 }}
          label={busy === 'template' ? 'Building…' : 'Download template'}
          onPress={() => void downloadTemplate()} disabled={busy !== null} />
        <Button testID="import-choose" style={{ flex: 1 }}
          label={busy === 'reading' ? 'Reading…' : file ? 'Choose another' : 'Choose file'}
          onPress={() => void choose()} disabled={busy !== null} />
      </View>

      {refusal ? (
        <View style={{ marginTop: SPACE.lg }}>
          <ErrorState message={refusal} onRetry={() => setRefusal(null)} />
        </View>
      ) : null}

      {/* STEP 3 — the preview: every row with its verdict, before anything is written */}
      {verdicts && file ? (
        <>
          <H2 style={{ marginTop: SPACE.xl }}>{file.name}</H2>
          <Body style={{ marginTop: 2 }}>
            {`${verdicts.length} row${verdicts.length === 1 ? '' : 's'} · ${ready.length} ready · ${blocked.length} blocked`}
          </Body>

          {blocked.length > 0 ? (
            <View style={{
              flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.md, padding: SPACE.lg,
              borderRadius: RADIUS.md, backgroundColor: statusSurface(ink('awaiting', dark)).bg,
              borderWidth: 1, borderColor: statusSurface(ink('awaiting', dark)).border,
            }}>
              <Icon name="warning" size={19} color={ink('awaiting', dark)} />
              <Muted style={{ flex: 1, color: theme.fg }}>
                {`${blocked.length} row${blocked.length === 1 ? '' : 's'} will not import. The rest still will — fix these in the file and choose it again if you want them too.`}
              </Muted>
            </View>
          ) : null}

          <View style={{ marginTop: SPACE.md, gap: 7 }}>
            {verdicts.map(v => (
              <ReportRow key={v.row.row} row={v.row.row} name={v.row.full_name}
                status={v.state === 'ready' ? 'ready' : 'blocked'}
                reason={v.state === 'ready'
                  ? `${v.row.course} · ${v.row.branch}${v.row.email ? ` · ${v.row.email}` : ' · no email'}`
                  : (v as { reason: string }).reason}
                dark={dark} />
            ))}
          </View>

          {/* STEP 4 — confirm. Says the number it will write, so the tap and
              the outcome are the same sentence. */}
          <Button testID="import-confirm" style={{ marginTop: SPACE.xl }}
            label={busy === 'importing' ? `Importing ${ready.length}…` : `Import ${ready.length} member${ready.length === 1 ? '' : 's'}`}
            onPress={() => void confirm()}
            disabled={ready.length === 0 || busy !== null} />
          <Muted style={{ marginTop: 9, textAlign: 'center' }}>
            {ready.length === 0
              ? 'Nothing in this file can be imported yet.'
              : 'Each member is written on her own, so a refusal stops her row and no other.'}
          </Muted>
        </>
      ) : null}

    </Screen>
  );
}

/** One row of the preview or the report: the WORD, the reason, the sheet row. */
function ReportRow({ row, name, status, reason, dark }:
  { row: number; name: string; status: 'ready' | 'blocked' | 'skipped' | 'failed' | string; reason: string; dark: boolean }) {
  const { theme } = useTheme();
  const tone = status === 'ready' ? 'present' : status === 'skipped' ? 'awaiting' : 'absent';
  const c = ink(tone, dark);
  const word = status === 'ready' ? 'Ready' : status === 'skipped' ? 'Skipped' : status === 'blocked' ? 'Blocked' : 'Failed';
  const icon = status === 'ready' ? 'check' : status === 'skipped' ? 'remove' : 'block';
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

function Count({ n, label, color }: { n: number; label: string; color: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 26, fontWeight: '800', color, fontVariant: ['tabular-nums'] }}>{n}</Text>
      <Text style={{ fontSize: 11, fontWeight: '800', color: theme.muted, textTransform: 'uppercase' }}>{label}</Text>
    </View>
  );
}


export default function MemberImport() {
  const router = useRouter();
  return (
    <ShellScreen title="Bulk import members"
      subtitle="A member list — not the attendance register"
      onBack={() => router.back()}>
      <MemberImportBody />
    </ShellScreen>
  );
}
