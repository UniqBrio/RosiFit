/**
 * BULK IMPORT INACTIVE — the register's two dates, set from the report sent
 * back (0058).
 *
 * THE WORKFLOW, in the requester's words: "user downloads members list from
 * reports and fills in the active from and inactive from dates and
 * reuploads". So there is NO TEMPLATE TO DOWNLOAD here, and that absence is
 * the design: the file the academy uploads is the file RosiFit gave them,
 * Reports → Export, `Member details`, with two columns typed into. A template
 * would ask them to re-key forty names to change two columns.
 *
 * AND IT IS A SECOND BUTTON, by the requester's own decision: "let there be
 * another button as bulk import inactive dont allow it in bulk import itslef
 * let that be there only to upload member and create their record."
 * `/member/import` still only CREATES, and still skips a name already on the
 * register; this screen NEVER creates, and a name it cannot find is sent to
 * that button by name. The two are the same shape on purpose — file, judge,
 * write, report, one tap — because they are the same job on different
 * columns, and the boundary between them has to be the only difference a
 * person notices.
 *
 * The counts are this screen's own four: Updated, Already correct, Failed and
 * Not on the register. "Already correct" is the COMMON case, not a failure —
 * the same export uploaded twice, the file agreeing with the register — so it
 * is counted plainly rather than hidden in a total.
 */
import { useMemo, useState } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Body, Muted, Label, Button, Skeleton, ErrorState, EmptyState } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { FormDialog } from '../../src/components/FormDialog';
import { useTheme } from '../../src/theme/ThemeProvider';
import { SPACE, RADIUS, STATUS, statusSurface, onStatusFill } from '../../src/theme/tokens';
import { useMembers } from '../../src/data/hooks';
import { bulkSetMemberDates } from '../../src/data/repository';
import { pickFile } from '../../src/data/csv';
import { iso } from '../../src/data/period';
import { MEMBER_IMPORT_MAX_ROWS, MEMBER_IMPORT_MAX_BYTES } from '../../src/data/memberImport';
import {
  validateStatusRows, tallyStatusImport, cellValue, MemberImportError,
  STATUS_IMPORT_HELP, STATUS_IMPORT_SHEET,
  type StatusVerdict, type StatusChange, type StatusImportResult, type StatusImportRow,
} from '../../src/data/statusImport';
import { parseStatusXlsx } from '../../src/data/statusXlsx';

const ink = (k: keyof typeof STATUS, dark: boolean) => (dark ? STATUS[k].fgDark : STATUS[k].fgLight);

/**
 * The result of a file the server was never called for — every row was
 * refused here, so nothing was sent and nothing came back. A real result, not
 * an empty one: the counts and the reasons come from the verdicts.
 */
const NOTHING_SENT: StatusImportResult = {
  total: 0, updated: 0, unchanged: 0, failed: 0, rows: [],
};
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function StatusImportBody() {
  const { theme } = useTheme();
  const router = useRouter();
  const roster = useMembers();

  const [file, setFile] = useState<{ name: string; rows: StatusImportRow[] } | null>(null);
  const [verdicts, setVerdicts] = useState<StatusVerdict[] | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [busy, setBusy] = useState<'reading' | 'saving' | null>(null);
  const [result, setResult] = useState<StatusImportResult | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  // The register, as much of it as judging a row needs. Names, not ids: the
  // sheet carries a name and nothing else that identifies anybody.
  const ctx = useMemo(() => ({
    members: (roster.data ?? []).map(m => ({
      id: m.id, name: m.name, status: m.status,
      joinedOn: m.joinedOn ?? null,
      inactiveFrom: m.inactiveFrom ?? null,
    })),
    todayIso: iso(new Date()),
  }), [roster.data]);

  const blocked = useMemo(
    () => (verdicts ?? []).filter(v => v.state === 'blocked'), [verdicts]);

  // The four counts, from BOTH halves: rows this screen refused never reached
  // the server and have no verdict there, and rows that were sent have none
  // here beyond "ready". Neither half is the whole file.
  const tally = useMemo(() => tallyStatusImport(verdicts ?? [], result), [verdicts, result]);

  /**
   * WHAT MOVED, per member — the point of the whole screen. "3 members
   * updated" is a number somebody has to take on trust; "Divya Ramesh ·
   * Active from 2026-03-01 → 2026-01-15" is the change itself, and it is the
   * only place the change is ever shown, because this importer writes two
   * dates that no other screen lists side by side.
   *
   * The CHANGES come from the verdict, which judged the row against the
   * register before anything was sent; the ROW being here at all comes from
   * the server, which is what makes it true. A row the server did not report
   * as updated is not on this list however confident the verdict was.
   */
  const moved = useMemo(() => {
    const byRow = new Map<number, StatusChange[]>();
    for (const v of verdicts ?? []) if (v.state === 'ready') byRow.set(v.row.row, v.changes);
    return (result?.rows ?? [])
      .filter(r => r.status === 'updated')
      .map(r => ({ row: r.row, name: r.full_name, changes: byRow.get(r.row) ?? [] }))
      .sort((a, b) => a.row - b.row);
  }, [verdicts, result]);

  /** Every row that changed nothing and was not meant to, in sheet order,
   *  whichever side refused it — "why did this member not move" is one
   *  question, so it gets one list. */
  const notLanded = useMemo(() => [
    ...blocked.map(v => ({ row: v.row.row, name: v.row.name, status: v.kind, reason: v.reason })),
    ...(result?.rows ?? []).filter(r => r.status === 'failed')
      .map(r => ({ row: r.row, name: r.full_name, status: 'failed', reason: r.reason ?? '' })),
  ].sort((a, b) => a.row - b.row), [blocked, result]);

  /**
   * CHOOSING THE FILE IS THE IMPORT. Read, judge, write, report — one tap,
   * exactly as /member/import does it, and for the reason that screen gives:
   * the only two answers to a preview are "yes" and "choose a different
   * file", and the commonest case is a file that is simply correct.
   *
   * The server judges every row again (bulk_set_member_dates, 0058) and each
   * write goes through set_member_status and set_member_active_from, so a
   * bulk row is refused by the same sentence the Edit form would show for it.
   * What comes back is what the database accepted, never what was sent.
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
      const rows = await parseStatusXlsx(picked.bytes);
      const judged = validateStatusRows(rows, ctx);
      setFile({ name: picked.name, rows });
      setVerdicts(judged);

      const send = judged.filter(v => v.state === 'ready');
      // A file in which nothing can be written is still a result. Calling the
      // server with an empty list would only be asking it to agree — and the
      // re-uploaded export, every row unchanged, lands here every time.
      if (send.length === 0) { setResult(NOTHING_SENT); return; }

      setBusy('saving');
      const r = await bulkSetMemberDates({
        rows: send.map(v => ({
          row: v.row.row,
          full_name: v.row.name.trim(),
          // Blank means LEAVE IT ALONE, so a blank cell is sent as null and
          // never as ''. The server reads null the same way (0058), which is
          // what stops a re-uploaded export erasing the columns it did not
          // fill in.
          active_from: cellValue(v.row.activeFrom) || null,
          inactive_from: cellValue(v.row.inactiveFrom) || null,
          // The WORD the sheet carries, not the column's value: the server
          // lowers it, so "Active" and "active" are one answer.
          status: v.row.status.trim() || null,
        })),
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
  const dark = theme.isDark;
  const loading = roster.state === 'loading';
  const failed = !loading && roster.state === 'error';
  // NOTHING TO CHANGE THE DATES OF. This importer only ever moves dates on
  // members who already exist, so an empty register is not a file problem and
  // must not be reported as one — there is simply nobody for a row to match.
  const emptyRegister = !loading && !failed && (roster.data ?? []).length === 0;
  const showResult = result !== null && file !== null;
  const anyChange = tally.updated > 0;

  const body = loading ? <Skeleton lines={6} />
    : failed ? (
      <ErrorState onRetry={roster.retry}
        message={roster.error ?? 'The register could not be loaded. Nothing has been changed.'} />
    ) : emptyRegister ? (
      <EmptyState title="Nobody is on the register yet"
        body="This import only moves dates on members who are already here — it never adds anybody. Add them with Bulk Import first, then come back with the members report."
        action="Bulk Import" onAction={() => router.replace('/member/import')} />
    ) : showResult && result && file ? (
      <>
        {/* The WORD and the icon, never the fill alone (guardrail 3). The ink
            on a status fill is measured in both themes — onStatusFill, swept
            by scripts/check-contrast.ts. */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.md,
          padding: SPACE.lg, borderRadius: RADIUS.md,
          backgroundColor: anyChange ? ink('present', dark) : ink('awaiting', dark),
        }}>
          <Icon name={anyChange ? 'check_circle' : 'warning'} size={22} color={onStatusFill(dark)} />
          <Text style={{ fontSize: 17, fontWeight: '800', color: onStatusFill(dark) }}>
            {anyChange ? 'Dates updated' : 'Nothing was changed'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.md }}>
          <Count testID="status-import-count-updated" n={tally.updated}
            label="Updated" color={ink('present', dark)} />
          <Count testID="status-import-count-unchanged" n={tally.unchanged}
            label="Already correct" color={ink('awaiting', dark)} />
        </View>
        <View style={{ flexDirection: 'row', gap: SPACE.md, marginTop: SPACE.md }}>
          <Count testID="status-import-count-failed" n={tally.failed}
            label="Failed" color={ink('absent', dark)} />
          <Count testID="status-import-count-unknown" n={tally.unknown}
            label="Not on the register" color={ink('cancelled', dark)} />
        </View>

        {/* The re-uploaded export is the COMMON case, and it has to read as
            the file agreeing with the register rather than as a failed
            import. */}
        <Muted style={{ marginTop: SPACE.md }}>
          {!anyChange && tally.unchanged === tally.total
            ? 'Every row already matched the register, so nothing was written. That is what a report uploaded untouched should do.'
            : anyChange
              ? 'Blank cells were left alone — only the dates typed into the file were moved. Nothing was added to the register.'
              : 'Nothing was written. The reasons are below, row by row.'}
        </Muted>

        {moved.length ? (
          <>
            <Label style={{ marginTop: SPACE.xl }}>What moved</Label>
            <View style={{ marginTop: SPACE.sm, gap: 7 }}>
              {moved.map(m => <MovedRow key={`moved-${m.row}`} {...m} dark={dark} />)}
            </View>
          </>
        ) : null}

        {notLanded.length ? (
          <>
            <Label style={{ marginTop: SPACE.xl }}>Rows that were not changed</Label>
            <View style={{ marginTop: SPACE.sm, gap: 7 }}>
              {notLanded.map(r => <ReportRow key={`${r.status}-${r.row}`} {...r} dark={dark} />)}
            </View>
            <Muted style={{ marginTop: SPACE.md }}>
              Fix those rows in your file and choose it again — the ones that landed already match, so they come back as Already correct rather than being written twice.
            </Muted>
          </>
        ) : null}
      </>
    ) : (
      <>
        {/* WHERE THE FILE COMES FROM, said before the picker. The commonest
            way to fail this import is to build a spreadsheet for it: there is
            no template, and a file that is not the export is refused by
            statusXlsx with that same sentence. */}
        <View style={{
          padding: SPACE.lg, borderRadius: RADIUS.md,
          backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
          flexDirection: 'row', alignItems: 'center', gap: SPACE.md,
        }}>
          <Icon name="upload_file" size={20} color={theme.accentInk} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.fgStrong }}>
              The members report, sent back
            </Text>
            <Muted style={{ marginTop: 2 }}>
              {`Reports → Export, the “${STATUS_IMPORT_SHEET}” sheet, with Active from and Inactive from typed in.`}
            </Muted>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.md, marginTop: SPACE.xl }}>
          <Label style={{ flex: 1 }}>The file</Label>
          {/* The whole description of the file is BEHIND this, in a dialog
              over the dialog — the shape every other explanation in this app
              takes, and the shape /member/import's help already has. */}
          <Pressable testID="status-import-help" onPress={() => setHelpOpen(true)}
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
          <Button testID="status-import-reports" variant="secondary" style={{ flex: 1 }}
            label="Open Reports" onPress={() => router.replace('/(tabs)/reports')}
            disabled={busy !== null} />
          {/* One tap: choosing the file reads it, judges it, writes it and
              reports. The label says which of those is happening. */}
          <Button testID="status-import-choose" style={{ flex: 1 }}
            label={busy === 'reading' ? 'Reading…' : busy === 'saving' ? 'Updating…'
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
  // A DIALOG, not a page, for the reason /member/import is one: changing the
  // dates on a file of members is done TO the list you are looking at. The
  // route pairs this with DIALOG_SCREEN in app/_layout.tsx.
  return (
    <FormDialog
      title={showResult ? 'Import complete' : 'Bulk import inactive'}
      subtitle={showResult && file ? file.name
        : 'Active from and Inactive from — this file never adds anybody'}
      onClose={() => router.back()}
      closeTestID={showResult ? 'status-import-result-close' : 'status-import-close'}
      footer={showResult ? (
        <View style={{
          padding: SPACE.lg, borderTopWidth: 1, borderTopColor: theme.line,
          backgroundColor: theme.shell,
        }}>
          <Button testID="status-import-done" label="Done" onPress={() => router.back()} />
        </View>
      ) : null}
      overlays={
        <Modal visible={helpOpen} transparent animationType="fade"
          onRequestClose={() => setHelpOpen(false)}>
          <FormDialog title="What the file needs"
            subtitle="The members report — not the member template"
            onClose={() => setHelpOpen(false)}
            closeTestID="status-import-help-close"
            footer={
              <View style={{
                padding: SPACE.lg, borderTopWidth: 1, borderTopColor: theme.line,
                backgroundColor: theme.shell,
              }}>
                <Button testID="status-import-help-done" label="Got it"
                  onPress={() => setHelpOpen(false)} />
              </View>
            }>
            <Body>
              {`The members report exported from Reports — an Excel workbook (.xlsx), its “${STATUS_IMPORT_SHEET}” sheet, `
               + `one member per row, up to ${MEMBER_IMPORT_MAX_ROWS} rows. `
               + 'There is no template to download: fill in the two date columns on the file RosiFit gave you and upload that.'}
            </Body>
            <View style={{
              marginTop: SPACE.lg, padding: SPACE.lg, borderRadius: RADIUS.md,
              backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.line,
            }}>
              {STATUS_IMPORT_HELP.map(h => (
                <View key={h.column} style={{ flexDirection: 'row', gap: SPACE.md, marginBottom: 5 }}>
                  <Text style={{ width: 108, fontSize: 11.5, fontWeight: '800', color: theme.fgStrong }}>
                    {h.column}
                  </Text>
                  <Text style={{ flex: 1, fontSize: 11.5, color: theme.muted }}>{h.means}</Text>
                </View>
              ))}
            </View>
            {/* The boundary between the two buttons, said where somebody
                about to upload the wrong file will read it. */}
            <Muted style={{ marginTop: SPACE.md }}>
              This import never adds anybody. A name that is not on the register is reported back, not created — put them on it with Bulk Import first.
            </Muted>
          </FormDialog>
        </Modal>
      }>
      {body}
    </FormDialog>
  );
}

/**
 * One member whose dates moved, and WHAT moved on them — field, old value,
 * new value. The arrow is the whole content: a list of names would say the
 * import worked, and this says what it did.
 */
function MovedRow({ row, name, changes, dark }:
  { row: number; name: string; changes: StatusChange[]; dark: boolean }) {
  const { theme } = useTheme();
  const c = ink('present', dark);
  const said = changes.map(ch => `${ch.field} ${ch.from} to ${ch.to}`).join(', ');
  return (
    <View accessible accessibilityLabel={`Row ${row}, ${name}, updated. ${said}`}
      style={{
        flexDirection: 'row', gap: SPACE.md, padding: SPACE.md, borderRadius: RADIUS.md,
        backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line,
      }}>
      <View style={{
        width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
        backgroundColor: statusSurface(c).bg, borderWidth: 1, borderColor: statusSurface(c).border,
      }}>
        <Icon name="check_circle" size={17} color={c} />
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '700', color: theme.fgStrong }}>
          {name || `Row ${row}`}
        </Text>
        {/* the word, never the colour alone (guardrail 3) */}
        <Text style={{ fontSize: 11.5, color: c, fontWeight: '800', marginTop: 2 }}>
          {`Updated · row ${row}`}
        </Text>
        {changes.map(ch => (
          <Text key={ch.field} style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>
            {`${ch.field} · ${ch.from} → ${ch.to}`}
          </Text>
        ))}
      </View>
    </View>
  );
}

/**
 * The words a row that did not move can end on. `unknown` is the boundary
 * with the other importer and is drawn as its own outcome rather than as a
 * failure: the file is not wrong, the member is simply not here yet.
 */
const OUTCOME: Record<string, { tone: keyof typeof STATUS; word: string; icon: string }> = {
  unknown:   { tone: 'cancelled', word: 'Not on the register', icon: 'person_add' },
  ambiguous: { tone: 'absent',    word: 'Failed',              icon: 'block' },
  invalid:   { tone: 'absent',    word: 'Failed',              icon: 'block' },
  failed:    { tone: 'absent',    word: 'Failed',              icon: 'block' },
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
        <Text style={{ fontSize: 11.5, color: c, fontWeight: '800', marginTop: 2 }}>
          {`${word} · row ${row}`}
        </Text>
        <Text style={{ fontSize: 11.5, color: theme.muted, marginTop: 2 }}>{reason}</Text>
      </View>
    </View>
  );
}

/** One of the four tiles the result is read as: the number, then the word for
 *  it — never the colour alone (guardrail 3). */
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

export default function StatusImport() {
  return <StatusImportBody />;
}
