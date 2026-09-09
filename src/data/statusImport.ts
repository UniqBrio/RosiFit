/**
 * BULK IMPORT INACTIVE -- the register's two dates, read back off the report.
 *
 * THE WORKFLOW THIS SERVES, in the requester's words: "user downloads members
 * list from reports and fills in the active from and inactive from dates and
 * reuploads". So the input file is not a template anybody designed for
 * uploading -- it is the Reports export (`Member details`), sent back with two
 * columns typed into.
 *
 * AND IT IS A SEPARATE IMPORTER, by the requester's own decision: "let there
 * be another button as bulk import inactive dont allow it in bulk import
 * itslef let that be there only to upload member and create their record."
 *
 * The code agrees with them. `bulk_import_members` has exactly one verb -- it
 * CREATES, and a name already on the register is SKIPPED, never overwritten.
 * That skip is what has stopped a re-uploaded file rewriting forty records
 * since 0028. Teaching it to update would turn the most conservative path in
 * the app into its most destructive one, decided by which columns happened to
 * be in the file. So there are two files, two buttons and two functions, and
 * the boundary between them is stated in a refusal a person can read: a name
 * this importer cannot find is told to use Bulk Import first.
 *
 * BLANK MEANS LEAVE IT ALONE -- the rule the whole file turns on. Almost every
 * cell of a re-uploaded export is untouched, so a blank has to mean "as you
 * were", never "clear it". A cell that cleared a date would make an export
 * into a bulk eraser, which is exactly what an accidental re-upload must not
 * be able to be.
 *
 * Pure on purpose, like memberImport.ts: no exceljs and no `document`, so it
 * is tested under scripts/tsconfig.json with nothing to mock. The workbook
 * half lives in statusXlsx.ts.
 */
import type { MemberStatus } from './mock';
import { normalizeForMatch, MemberImportError } from './memberImport';
import { activeFromProblem } from './joined';
import { inactiveFromProblem } from './inactiveFrom';
import { readDate, formatDate, DATE_FORMAT_EXAMPLE } from './memberDate';

/**
 * The columns this reader looks for, by the names the Reports export writes
 * (src/data/reportSheets.ts, `memberDetailSheet`).
 *
 * `Member` is the name column, NOT `Full Name`: this file is the report, and
 * the report has always called that column Member. Only the first four are
 * read; the rest of the export -- course, branch, addresses, the figures --
 * is carried along untouched and ignored, because this importer changes none
 * of it.
 */
export const STATUS_IMPORT_COLUMNS = [
  'Member', 'Active from', 'Inactive from', 'Status',
] as const;
export type StatusImportColumn = (typeof STATUS_IMPORT_COLUMNS)[number];

/** The column that decides whether a sheet is this file at all. */
export const STATUS_IMPORT_REQUIRED: StatusImportColumn = 'Member';

/**
 * HOW MANY ROWS THIS FILE MAY CARRY -- and why it is not the template's 500.
 *
 * The member TEMPLATE creates people, so 500 there is a guard against a
 * runaway file inventing thousands of members. This file is the opposite: it
 * is the academy's own register, exported and sent back, so its natural size
 * is however many members the academy has. Capping it at 500 told an academy
 * of 794 to "narrow the report by course or branch and upload it in two
 * parts" -- asking them to work around the app on a file the app itself
 * produced. That is the defect this constant exists to close (09-Sep-2026,
 * reported with a real 794-member export).
 *
 * A ceiling still exists, because an unbounded read is how a corrupt workbook
 * becomes an out-of-memory error rather than a refusal. 5,000 is well past any
 * plausible register and still a small request: at roughly 120 bytes a row it
 * is under a megabyte, and only the rows that actually CHANGE are ever sent to
 * the server.
 */
export const STATUS_IMPORT_MAX_ROWS = 5000;

/** The sheet the Reports export writes these on. */
export const STATUS_IMPORT_SHEET = 'Member details';

/**
 * Header cells that are the same column under an older name.
 *
 * `Joined on` was what the export called the joining date until 0057 renamed
 * the pair to Active from / Inactive from. A report downloaded the week before
 * the rename is a file somebody has already typed forty dates into, and losing
 * their work to a header change would be the app's fault, not theirs.
 */
const ALIASES: Record<string, StatusImportColumn> = {
  'joined on': 'Active from',
  'full name': 'Member',
};

const HEADER_HINT = /\s*\([^)]*\)\s*$/;

/** A header cell back to the column it is, or null. */
export function canonicalStatusColumn(header: string): StatusImportColumn | null {
  const bare = header.replace(HEADER_HINT, '').trim().toLowerCase();
  return STATUS_IMPORT_COLUMNS.find(c => c.toLowerCase() === bare)
    ?? ALIASES[bare] ?? null;
}

/**
 * Cell values the export writes that are NOT data.
 *
 * `memberDetailSheet` states an absent fact in words rather than leaving a
 * blank -- "Not on record" for a member with no joining date -- because a
 * blank cell reads as "not filled in yet" to somebody looking at a report
 * (C-76). Read back IN, those words are not a date and not an instruction:
 * they mean the same as blank, which is leave it alone.
 */
const NOT_DATA = new Set(['not on record', 'none', 'n/a', '-', '—']);

/** One cell, trimmed, with the export's own non-values folded to blank. */
export function cellValue(raw: string): string {
  const t = (raw ?? '').trim();
  return NOT_DATA.has(t.toLowerCase()) ? '' : t;
}

/** One row of the sheet, as read. Every field '' when its cell was blank. */
export type StatusImportRow = {
  /** the row number in the sheet, so a refusal names the cell to go and fix */
  row: number;
  name: string;
  activeFrom: string;
  inactiveFrom: string;
  status: string;
};

/** Why a row cannot be sent. `unknown` is the boundary with the other
 *  importer and is worth counting on its own. */
export type StatusBlockKind = 'unknown' | 'ambiguous' | 'invalid';

/**
 * What the row would DO, named field by field, so the screen can say "3
 * members updated" and then show which three and what moved on each.
 */
export type StatusChange = { field: 'Active from' | 'Inactive from' | 'Status'; from: string; to: string };

export type StatusVerdict =
  | { state: 'ready'; row: StatusImportRow; memberId: string; changes: StatusChange[] }
  | { state: 'unchanged'; row: StatusImportRow; memberId: string }
  | { state: 'blocked'; row: StatusImportRow; reason: string; kind: StatusBlockKind };

export { MemberImportError };

/** The register, as much of it as judging a row needs. */
export type StatusMember = {
  id: string;
  name: string;
  status: MemberStatus;
  joinedOn: string | null;
  inactiveFrom: string | null;
};

export type StatusContext = {
  members: StatusMember[];
  /** today, ISO -- passed in rather than read, so this stays testable */
  todayIso: string;
};

/** The words the Status column may carry, folded to the column's values. */
function readStatus(cell: string): MemberStatus | null | 'bad' {
  const s = cell.trim().toLowerCase();
  if (!s) return null;                       // blank: leave it alone
  if (s === 'active') return 'active';
  if (s === 'inactive') return 'inactive';
  if (s === 'paused') return 'paused';
  return 'bad';
}

/**
 * What the row WANTS the record to say, once "blank means leave it alone" has
 * been resolved against what the record says now.
 *
 * The one inference is the file's own name: an INACTIVE DATE with no status
 * beside it means inactive from that day. There is no other reading --
 * `members_inactive_from_needs_status` (0045) will not hold a date beside an
 * active status -- and refusing the row instead would refuse the exact thing
 * this button is called after.
 *
 * Exported because supabase/migrations/0058 resolves the same three lines
 * server-side, and the two are asserted against each other in the spec.
 */
export function wantedPair(row: StatusImportRow, m: StatusMember):
  { status: MemberStatus; inactiveFrom: string | null } {
  const stated = readStatus(row.status);
  const dated = cellValue(row.inactiveFrom);
  const held = m.inactiveFrom ?? '';

  // WHICH CELL WAS EDITED. Both are read against what the register already
  // holds, because that is the only way to tell a cell somebody TYPED from a
  // cell the export wrote and nobody touched.
  const statusEdited = stated !== null && stated !== 'bad' && stated !== m.status;
  const dateEdited = dated !== '' && dated !== held;

  if (statusEdited) {
    // The status column was changed by hand, so it is the instruction. Active
    // takes the leaving date off, exactly as set_member_status does with it.
    const status = stated as MemberStatus;
    return {
      status,
      inactiveFrom: status === 'active' ? null : (dated || m.inactiveFrom || null),
    };
  }

  if (dateEdited) {
    // A DATE TYPED INTO AN OTHERWISE UNTOUCHED ROW, and this is the case the
    // whole button exists for. It used to be lost: the reading was "an
    // inactive date with NO STATUS beside it means inactive from that day",
    // and the export always writes a Status -- so on a real report there was
    // never no status beside it, the exported "Active" won, and the date the
    // academy had just typed was discarded in silence (reported 09-Sep-2026
    // against a 794-member export with two dates filled in).
    //
    // Typing a date is an explicit act and the exported status is not, so the
    // date wins. To put somebody back on the register you clear the cell, or
    // set Status to Active -- both of which are edits, and both land above.
    return { status: 'inactive', inactiveFrom: dated };
  }

  // Nothing was edited: the row agrees with the register and must write
  // nothing. The stored date is the default, so a row that only moves the
  // JOINING date cannot wipe the leaving one on its way past.
  const status = stated && stated !== 'bad' ? stated : m.status;
  return {
    status,
    inactiveFrom: status === 'active' ? null : (dated || m.inactiveFrom || null),
  };
}

/** The word a status is shown as, so a change reads in the file's own terms. */
const WORD: Record<MemberStatus, string> = {
  active: 'Active', inactive: 'Inactive', paused: 'Paused',
};

/**
 * WHAT THIS ROW WOULD CHANGE about one member -- nothing more.
 *
 * Lifted out of `validateStatusRows` so the ambiguity checks can ask it
 * FIRST. A row that changes nothing needs no write, and a row that needs no
 * write cannot be harmed by not knowing which of two same-named members it
 * meant: whichever it is, the answer is the same and it is "nothing".
 */
function changesFor(row: StatusImportRow, m: StatusMember): StatusChange[] {
  const wanted = wantedPair(row, m);
  const active = cellValue(row.activeFrom);
  const changes: StatusChange[] = [];
  // Compared as ISO -- the row reaching here has already been through
  // `readDate`, so both sides of every `!==` are the stored shape -- and SHOWN
  // as 10-Oct-2026, because this list is read by the person who just typed the
  // dates in and they should recognise what they typed.
  if (active && active !== (m.joinedOn ?? '')) {
    changes.push({ field: 'Active from', from: formatDate(m.joinedOn) || 'Not on record', to: formatDate(active) });
  }
  if ((wanted.inactiveFrom ?? '') !== (m.inactiveFrom ?? '')) {
    changes.push({
      field: 'Inactive from',
      from: formatDate(m.inactiveFrom) || 'Not on record',
      to: formatDate(wanted.inactiveFrom) || 'Not on record',
    });
  }
  if (wanted.status !== m.status) {
    changes.push({ field: 'Status', from: WORD[m.status], to: WORD[wanted.status] });
  }
  return changes;
}

/**
 * Every row, judged BEFORE anything is written -- the same posture
 * `validateMemberRows` takes, and for the same reason: a blocked row carries
 * its reason in the row rather than in a summary count, because "3 rows
 * blocked" is a number somebody has to take on trust and "row 7: Divya Ramesh
 * is not on the register" is one they can act on.
 *
 * The server judges again (`bulk_set_member_dates`, 0058) and its pass is what
 * makes the result true. This one decides which rows are worth sending, and
 * gives the others a reason in the same second.
 */
export function validateStatusRows(
  rows: StatusImportRow[], ctx: StatusContext,
): StatusVerdict[] {
  // Normalised once, and counted, so two live members who normalise to one
  // name are caught rather than silently resolved to whichever came first.
  const byName = new Map<string, StatusMember[]>();
  for (const m of ctx.members) {
    const k = normalizeForMatch(m.name);
    const at = byName.get(k);
    if (at) at.push(m); else byName.set(k, [m]);
  }

  const seen = new Set<string>();
  return rows.map((row): StatusVerdict => {
    const name = row.name.trim();
    if (!name) {
      return { state: 'blocked', row, kind: 'invalid', reason: 'no name in this row' };
    }
    const key = normalizeForMatch(name);
    const found = byName.get(key) ?? [];

    if (found.length === 0) {
      // THE BOUNDARY between the two importers, said as an instruction rather
      // than as a complaint. This file never creates anybody.
      return {
        state: 'blocked', row, kind: 'unknown',
        reason: 'not on the register — add them with Bulk Import first, this file only changes dates',
      };
    }
    // A status nobody can read is worth reporting even on a row that asks for
    // nothing else: it is a typo in a cell somebody typed in, and staying
    // quiet about it would be reading past the one thing they got wrong.
    if (readStatus(row.status) === 'bad') {
      return {
        state: 'blocked', row, kind: 'invalid',
        reason: `“${row.status.trim()}” is not a status — write Active or Inactive`,
      };
    }

    // ------------------------------------------------- the date, as typed
    //
    // EVERY SHAPE WHOSE MEANING IS NOT IN QUESTION, RESOLVED TO ONE -- the
    // requester's ask on 09-Sep-2026, in their words: "if they enter date in
    // any format convert that to dd-mmm-yyyy". So 10-Oct-2026, 10 Oct 2026,
    // 10 October 2026, Oct 10 2026 and the ISO every export written before
    // that day carries all arrive here as the same day.
    //
    // AND ONE SHAPE STILL REFUSED, which is the point of doing this in a
    // module rather than with a looser regex: an all-numeric date that is not
    // ISO. 01/09/2026 is 1 September to the academy and 9 January to Postgres
    // under this project's DateStyle, and no reader can tell which the person
    // meant -- so it is handed back with the fix in it rather than guessed at.
    // That is 0029's lesson and it survives this change intact.
    //
    // Read BEFORE anything is compared, because everything below -- the
    // "does this row ask for anything" test, the two window refusals, the
    // change list -- measures the row against ISO columns on the record.
    const activeRead = readDate(cellValue(row.activeFrom));
    if (activeRead && 'problem' in activeRead) {
      return { state: 'blocked', row, kind: 'invalid', reason: activeRead.problem };
    }
    const inactiveRead = readDate(cellValue(row.inactiveFrom));
    if (inactiveRead && 'problem' in inactiveRead) {
      return { state: 'blocked', row, kind: 'invalid', reason: inactiveRead.problem };
    }
    // THE ROW EVERY VERDICT BELOW CARRIES, dates in the stored shape. The
    // verdict is what the screen sends to `bulk_set_member_dates`, and that
    // function takes ISO like every other date the app writes -- so the
    // conversion has to be IN the verdict, not applied again by the caller.
    // Nothing else about the row is touched: the name, the status word and the
    // row number are what the sheet said.
    const dated: StatusImportRow = {
      ...row,
      activeFrom: activeRead ? activeRead.iso : '',
      inactiveFrom: inactiveRead ? inactiveRead.iso : '',
    };

    // DOES THIS ROW ASK FOR ANYTHING? True when SOME candidate already matches
    // it exactly -- and "some", not "every", is the whole subtlety.
    //
    // An untouched row carries the values of the member it was exported from,
    // so it matches THAT member exactly and no other: three members called
    // Anitha have three different joining dates, and Anitha #1's row is a
    // change when measured against #2. Requiring every candidate to agree
    // therefore called every duplicate row an edit, which is how this went
    // wrong the first time I fixed it.
    //
    // Matching one candidate exactly is enough, because it means the file is
    // describing a member the register already agrees with -- so there is
    // nothing to write, whichever of the two the person had in mind.
    //
    // Asked FIRST, before the ambiguity refusal, because the file IS the whole
    // register: a 796-row export contains every duplicate name the academy
    // has, touched or not. Refusing them all reported SEVEN failures against
    // an upload that edited four members -- six of them rows nobody had
    // touched, burying the one that mattered (reported 09-Sep-2026).
    const asksNothing = found.some(m => changesFor(dated, m).length === 0);

    if (found.length > 1) {
      if (asksNothing) return { state: 'unchanged', row: dated, memberId: found[0].id };
      return {
        state: 'blocked', row: dated, kind: 'ambiguous',
        reason: `more than one member is called “${name}” — change their dates on their own records`,
      };
    }
    if (seen.has(key)) {
      // The same member twice in one sheet, with two different answers. The
      // last row would silently win.
      if (asksNothing) return { state: 'unchanged', row: dated, memberId: found[0].id };
      return {
        state: 'blocked', row: dated, kind: 'invalid',
        reason: `“${name}” is on two rows of this file — leave one of them`,
      };
    }
    // Only a row that actually writes claims the name: an untouched row must
    // not make a real edit further down the file look like the duplicate.
    if (!asksNothing) seen.add(key);

    const m = found[0];
    const wanted = wantedPair(dated, m);
    const active = dated.activeFrom;

    // The two refusals the app can answer for itself, measured against the
    // pair this row would WRITE rather than against what the record holds --
    // a row that moves both ends is legal even when each end is illegal
    // beside the other's old value.
    if (active) {
      const why = activeFromProblem(active, wanted.inactiveFrom, ctx.todayIso);
      if (why) return { state: 'blocked', row: dated, kind: 'invalid', reason: why };
    }
    if (wanted.inactiveFrom) {
      const why = inactiveFromProblem(wanted.inactiveFrom, active || m.joinedOn);
      if (why) return { state: 'blocked', row: dated, kind: 'invalid', reason: why };
    }

    const changes = changesFor(dated, m);

    // THE RE-UPLOAD, and it is the COMMON case: the same export sent twice.
    // Not a failure and not a write -- the file agreeing with the register.
    // 0045 learned this lesson on the attendance import; this is the same
    // lesson, so the screen can say "nothing to update" and mean it.
    if (changes.length === 0) return { state: 'unchanged', row: dated, memberId: m.id };
    return { state: 'ready', row: dated, memberId: m.id, changes };
  });
}

/** What the server returns, per row. */
export type StatusRowResult = {
  row: number;
  full_name: string;
  status: 'updated' | 'unchanged' | 'failed';
  reason?: string;
  member_id?: string;
};

export type StatusImportResult = {
  total: number;
  updated: number;
  unchanged: number;
  failed: number;
  rows: StatusRowResult[];
};

/** The counts the screen reads, from BOTH halves: rows this screen refused
 *  never reached the server and have no verdict there, and rows that were
 *  sent have none here beyond "ready". Neither half is the whole file. */
export function tallyStatusImport(
  verdicts: StatusVerdict[], result: StatusImportResult | null,
): { total: number; updated: number; unchanged: number; failed: number; unknown: number } {
  const blocked = verdicts.filter(v => v.state === 'blocked');
  return {
    total: verdicts.length,
    updated: result?.updated ?? 0,
    // Both halves call it unchanged, and both mean it: the file agrees with
    // the register. Counting them apart would be a distinction with no
    // consequence anybody can act on.
    unchanged: verdicts.filter(v => v.state === 'unchanged').length + (result?.unchanged ?? 0),
    failed: blocked.filter(b => b.kind !== 'unknown').length
      + (result?.rows ?? []).filter(r => r.status === 'failed').length,
    unknown: blocked.filter(b => b.kind === 'unknown').length,
  };
}

/** What each column is for, shown in the screen's help. */
export const STATUS_IMPORT_HELP: { column: string; means: string }[] = [
  { column: 'Member', means: 'Who the row is about. Matched by name against the register — this file never adds anybody.' },
  { column: 'Active from', means: `The first day they are on the register, written as ${DATE_FORMAT_EXAMPLE}. Blank leaves it alone.` },
  { column: 'Inactive from', means: `The first day they are off it, written as ${DATE_FORMAT_EXAMPLE}. Blank leaves it alone.` },
  { column: 'Status', means: 'Active or Inactive. Blank leaves it alone — a date with no status beside it means inactive from that day.' },
];
