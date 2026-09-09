/**
 * BULK IMPORT INACTIVE -- the report, read back in (0058).
 *
 * Run: npx tsx --test src/data/statusImport.test.ts
 *
 * The requester's workflow: "user downloads members list from reports and
 * fills in the active from and inactive from dates and reuploads ... if new
 * member add as new member if existing member updates records". And then, on
 * the shape of it: "let there be another button as bulk import inactive dont
 * allow it in bulk import itslef let that be there only to upload member and
 * create their record."
 *
 * So the two claims that matter most here are not about dates at all:
 *
 *   1. THE ROUND TRIP CLOSES. The sheet `memberDetailSheet` writes is a sheet
 *      `validateStatusRows` reads, column for column, and a report uploaded
 *      untouched reports "nothing to update" rather than forty refusals. That
 *      is asserted against the REAL export function, not against a hand-typed
 *      copy of its headers -- a spec that restates the headers would go on
 *      passing the day somebody renames one.
 *
 *   2. THE BOUNDARY HOLDS. This importer never creates anybody, and a name it
 *      cannot find is told to use the other button.
 *
 * Then the rule the file turns on -- BLANK MEANS LEAVE IT ALONE -- from every
 * side that could get it wrong, because a cell that cleared a date would make
 * an export into a bulk eraser.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateStatusRows, tallyStatusImport, canonicalStatusColumn, cellValue, wantedPair,
  STATUS_IMPORT_COLUMNS,
  type StatusImportRow, type StatusMember, type StatusVerdict,
} from './statusImport';
import { memberDetailSheet } from './reportSheets';
import { type Member } from './mock';

const TODAY = '2026-09-09';

const her = (over: Partial<StatusMember> = {}): StatusMember => ({
  id: 'm1', name: 'Divya Ramesh', status: 'active',
  joinedOn: '2026-03-01', inactiveFrom: null, ...over,
});

const row = (over: Partial<StatusImportRow> = {}): StatusImportRow => ({
  row: 2, name: 'Divya Ramesh', activeFrom: '', inactiveFrom: '', status: '', ...over,
});

const judge = (rows: StatusImportRow[], members: StatusMember[]) =>
  validateStatusRows(rows, { members, todayIso: TODAY });

const one = (r: StatusImportRow, m = her()) => judge([r], [m])[0];

/* =============================================== 1. the round trip closes */

const member = (over: Partial<Member> = {}): Member => ({
  id: 'm1', code: '', name: 'Divya Ramesh',
  course: 'Prenatal Flow', course_id: 'c1', branch: 'Coimbatore',
  aliases: [], emails: [{ address: 'a@b.com', primary: true }],
  weekdays: null, status: 'active',
  expected: 6, attended: 6, missed: 0, streak: 0, last: '—',
  joinedOn: '2026-03-01', joined: 'Mar 2026', ...over,
});

/** The export's own sheet, turned into the rows the reader would produce from
 *  it -- by looking the columns up in the REAL header, never by index. */
function roundTrip(members: Member[]): StatusImportRow[] {
  const sheet = memberDetailSheet(members, '7-13 Sep 2026', TODAY);
  const at = (name: string) => {
    const i = sheet.header.findIndex(h => canonicalStatusColumn(h) === name);
    assert.notEqual(i, -1, `the export has no column this reader knows as "${name}"`);
    return i;
  };
  const cName = at('Member'), cAct = at('Active from');
  const cIna = at('Inactive from'), cStat = at('Status');
  return sheet.rows.map((r, n) => ({
    row: n + 2,
    name: cellValue(r[cName]),
    activeFrom: cellValue(r[cAct]),
    inactiveFrom: cellValue(r[cIna]),
    status: cellValue(r[cStat]),
  }));
}

test('every column this reader needs is a column the export actually writes', () => {
  // The claim that makes the feature possible at all, asserted against the
  // real header rather than a copy of it.
  const sheet = memberDetailSheet([member()], 'P', TODAY);
  for (const c of STATUS_IMPORT_COLUMNS) {
    assert.ok(sheet.header.some(h => canonicalStatusColumn(h) === c),
      `the members report has no "${c}" column, so the round trip is broken`);
  }
});

test('the report uploaded untouched changes nothing at all', () => {
  // THE COMMONEST UPLOAD, and the one that must never write: the same export
  // sent back. Every row has to come out `unchanged` -- not "ready with no
  // changes", and certainly not a refusal.
  const people = [
    member(),
    member({ id: 'm2', name: 'Anitha R', status: 'inactive', inactiveFrom: '2026-08-01' }),
    member({ id: 'm3', name: 'Meera S', joinedOn: null, joined: '—' }),
  ];
  const roster: StatusMember[] = people.map(p => ({
    id: p.id, name: p.name, status: p.status,
    joinedOn: p.joinedOn ?? null, inactiveFrom: p.inactiveFrom ?? null,
  }));
  const verdicts = judge(roundTrip(people), roster);
  assert.deepEqual(verdicts.map(v => v.state), ['unchanged', 'unchanged', 'unchanged']);
});

test('a member with no joining date is left alone, not dated by the upload', () => {
  // The export writes "Not on record" for her rather than a blank (C-76), and
  // read back in that is not a date and not an instruction. Reading it as one
  // would date every thin record to the day somebody re-uploaded a report.
  const people = [member({ id: 'm3', name: 'Meera S', joinedOn: null, joined: '—' })];
  const [cell] = roundTrip(people);
  assert.equal(cell.activeFrom, '');
  const v = one(cell, her({ id: 'm3', name: 'Meera S', joinedOn: null }));
  assert.equal(v.state, 'unchanged');
});

test('a date typed into the exported sheet is the one that lands', () => {
  const people = [member()];
  const [cell] = roundTrip(people);
  cell.activeFrom = '2026-01-15';                       // what the academy types
  const v = one(cell);
  assert.equal(v.state, 'ready');
  assert.deepEqual(v.state === 'ready' ? v.changes : [], [
    { field: 'Active from', from: '2026-03-01', to: '2026-01-15' },
  ]);
});

/* ================================================== 2. the boundary holds */

test('a name that is not on the register is refused, and named as the other button’s job', () => {
  const v = one(row({ name: 'Somebody New' }));
  assert.equal(v.state, 'blocked');
  assert.equal(v.state === 'blocked' ? v.kind : null, 'unknown');
  assert.match(v.state === 'blocked' ? v.reason : '', /Bulk Import/,
    'the refusal must send them to the importer that DOES create members');
  assert.match(v.state === 'blocked' ? v.reason : '', /only changes dates/);
});

test('nothing this module can return ever means "create her"', () => {
  // The structural half of the boundary: there is no verdict state for an
  // insert, so no screen can grow one by accident.
  const states = judge([row({ name: 'Nobody' }), row()], [her()]).map(v => v.state);
  assert.deepEqual([...new Set(states)].sort(), ['blocked', 'unchanged']);
});

test('two live members with one name is a refusal, never a guess', () => {
  const v = one(row({ activeFrom: '2026-01-01' }),
    her());
  assert.equal(v.state, 'ready');                       // one match: fine
  const two = judge([row({ activeFrom: '2026-01-01' })],
    [her({ id: 'a' }), her({ id: 'b', name: 'divya  ramesh' })])[0];
  assert.equal(two.state, 'blocked');
  assert.equal(two.state === 'blocked' ? two.kind : null, 'ambiguous');
});

test('the same member on two rows is refused rather than last-one-wins', () => {
  const vs = judge(
    [row({ row: 2, activeFrom: '2026-01-01' }), row({ row: 3, activeFrom: '2026-02-01' })],
    [her()]);
  assert.equal(vs[0].state, 'ready');
  assert.equal(vs[1].state, 'blocked');
  assert.match(vs[1].state === 'blocked' ? vs[1].reason : '', /two rows/);
});

/* ======================================== 3. blank means leave it alone */

test('a blank row changes nothing, on a member with dates on both ends', () => {
  const v = one(row(), her({ status: 'inactive', inactiveFrom: '2026-10-01' }));
  assert.equal(v.state, 'unchanged');
});

test('moving only the joining date does not wipe the leaving date', () => {
  // The eraser case. She has a leaving date; the row touches Active from
  // alone; her Inactive from must survive untouched.
  const m = her({ status: 'inactive', inactiveFrom: '2026-10-01' });
  const v = one(row({ activeFrom: '2026-01-01' }), m);
  assert.equal(v.state, 'ready');
  assert.deepEqual(v.state === 'ready' ? v.changes : [],
    [{ field: 'Active from', from: '2026-03-01', to: '2026-01-01' }]);
  assert.equal(wantedPair(row({ activeFrom: '2026-01-01' }), m).inactiveFrom, '2026-10-01');
  assert.equal(wantedPair(row({ activeFrom: '2026-01-01' }), m).status, 'inactive');
});

test('an inactive date with no status beside it means inactive from that day', () => {
  // The file's own name, and the only reading the schema allows:
  // members_inactive_from_needs_status will not hold a date beside 'active'.
  const v = one(row({ inactiveFrom: '2026-10-01' }));
  assert.equal(v.state, 'ready');
  assert.deepEqual(v.state === 'ready' ? v.changes : [], [
    { field: 'Inactive from', from: 'Not on record', to: '2026-10-01' },
    { field: 'Status', from: 'Active', to: 'Inactive' },
  ]);
});

test('Active in the status column takes the leaving date off', () => {
  const v = one(row({ status: 'Active' }), her({ status: 'inactive', inactiveFrom: '2026-10-01' }));
  assert.equal(v.state, 'ready');
  assert.deepEqual(v.state === 'ready' ? v.changes : [], [
    { field: 'Inactive from', from: '2026-10-01', to: 'Not on record' },
    { field: 'Status', from: 'Inactive', to: 'Active' },
  ]);
});

/* ============================================== 4. the refusals it owns */

test('a mistyped date is refused with the cell quoted back', () => {
  // 0029's lesson: '01/09/2026' is a real date to Postgres, read under
  // DateStyle, and on this project that is MDY -- so it would import as
  // 9 January, silently. Only YYYY-MM-DD, on both columns.
  const a = one(row({ activeFrom: '01/09/2026' }));
  assert.equal(a.state, 'blocked');
  assert.match(a.state === 'blocked' ? a.reason : '', /01\/09\/2026/);
  const b = one(row({ inactiveFrom: '1 October 2026' }));
  assert.equal(b.state, 'blocked');
});

test('a word that is not a status is refused, not folded to inactive', () => {
  const v = one(row({ status: 'Left' }));
  assert.equal(v.state, 'blocked');
  assert.match(v.state === 'blocked' ? v.reason : '', /Active or Inactive/);
});

test('a joining date after the leaving date is refused, both ends in one row', () => {
  const v = one(row({ activeFrom: '2026-11-01', inactiveFrom: '2026-10-01' }));
  assert.equal(v.state, 'blocked');
});

test('a row moving BOTH ends forward is legal, though each is illegal beside the old other', () => {
  // The pair has to be judged against what the row would WRITE. Her stored
  // window is Mar->Apr; the row moves it to May->Jun. Measured against her
  // OLD leaving date, the new joining date is in the future of it and would
  // be refused -- which would refuse an entirely ordinary correction.
  const m = her({ status: 'inactive', inactiveFrom: '2026-04-01' });
  const v = one(row({ activeFrom: '2026-05-01', inactiveFrom: '2026-06-01' }), m);
  assert.equal(v.state, 'ready');
});

test('a future joining date is refused here, as it is everywhere else', () => {
  const v = one(row({ activeFrom: '2026-09-10' }));
  assert.equal(v.state, 'blocked');
  assert.match(v.state === 'blocked' ? v.reason : '', /future/);
});

test('a row with no name at all is refused rather than matched to nobody', () => {
  const v = one(row({ name: '   ', activeFrom: '2026-01-01' }));
  assert.equal(v.state, 'blocked');
  assert.equal(v.state === 'blocked' ? v.kind : null, 'invalid');
});

/* ================================================= 5. what the screen reads */

test('the tally counts both halves, and does not call unchanged a failure', () => {
  const verdicts: StatusVerdict[] = [
    { state: 'ready', row: row({ row: 2 }), memberId: 'a', changes: [] },
    { state: 'unchanged', row: row({ row: 3 }), memberId: 'b' },
    { state: 'blocked', row: row({ row: 4 }), kind: 'unknown', reason: 'x' },
    { state: 'blocked', row: row({ row: 5 }), kind: 'invalid', reason: 'y' },
  ];
  const t = tallyStatusImport(verdicts, {
    total: 1, updated: 1, unchanged: 0, failed: 0,
    rows: [{ row: 2, full_name: 'a', status: 'updated' }],
  });
  assert.equal(t.total, 4);
  assert.equal(t.updated, 1);
  assert.equal(t.unchanged, 1);
  // "not on the register" is counted on its own: it is the boundary with the
  // other importer, and it is the one the person acts on differently.
  assert.equal(t.unknown, 1);
  assert.equal(t.failed, 1);
});

test('a file that agrees entirely reports no failures and no writes', () => {
  const verdicts = judge([row(), row({ row: 3, name: 'Anitha R' })],
    [her(), her({ id: 'm2', name: 'Anitha R' })]);
  const t = tallyStatusImport(verdicts, null);
  assert.equal(t.unchanged, 2);
  assert.equal(t.updated, 0);
  assert.equal(t.failed, 0);
  assert.equal(t.unknown, 0);
});

test('the export’s own non-values read as blank, never as data', () => {
  for (const v of ['Not on record', 'None', 'n/a', '-', '—', '  ']) {
    assert.equal(cellValue(v), '', `"${v}" must read as an empty cell`);
  }
  assert.equal(cellValue('2026-03-01'), '2026-03-01');
});

test('the old "Joined on" header still finds the joining date', () => {
  // A report downloaded before 0057 renamed the pair is a file somebody has
  // already typed forty dates into.
  assert.equal(canonicalStatusColumn('Joined on'), 'Active from');
  assert.equal(canonicalStatusColumn('Active from'), 'Active from');
  assert.equal(canonicalStatusColumn('Full Name'), 'Member');
  assert.equal(canonicalStatusColumn('Attendance %'), null);
});
