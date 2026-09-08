import test from 'node:test';
import assert from 'node:assert/strict';
import { groupRows } from './auditGroups';
import { toPlain, type PlainEntry } from './auditPlain';

/**
 * "I bulk imported the member and in audit log it shows record for each field
 * of member which is unncessary, just show as memmbers added using bulk import
 * count 4 current value only names if more that 3 show +more on hit they can
 * see full list" (8 Sep 2026).
 *
 * A four-member import wrote about twenty entries and the screen printed twenty
 * acts. They collapse into one row. Every one of those entries is still stored,
 * still exported and still searched — this is a way of DISPLAYING them.
 *
 * The grouping key is exact rather than a heuristic, and that is the thing most
 * worth guarding. `audit_logs.occurred_at` defaults to `now()`, which is the
 * TRANSACTION timestamp, so every row one `bulk_import_members` call wrote
 * carries an identical instant and actor. The group forms only where the
 * database ALSO wrote its own summary row saying an import happened. Drop that
 * third condition and the screen starts inventing acts:
 *
 *   - two unrelated changes sharing an instant merge into an import that never
 *     ran;
 *   - two people importing at the same moment merge into one person's run;
 *   - a group counts ENTRIES and calls them members, so an import of one member
 *     with an address and an enrolment reports three;
 *   - the count drifts from the number the importer itself recorded, which is
 *     the difference between a fact and a tally of whatever the screen loaded.
 */

const NOW = new Date('2026-09-08T18:00:00.000Z');
const AT = '2026-09-08T08:17:00.000Z';
const LATER = '2026-09-08T09:00:00.000Z';

type Raw = Parameters<typeof toPlain>[0];

const raw = (over: Partial<Raw> & { id: string; action: string }): Raw => ({
  entity: 'member', subject: null, branch: 'Coimbatore',
  who: 'Shazia', whoKind: 'super_admin', when: AT, changes: [],
  ...over,
});

const plain = (rows: (Partial<Raw> & { id: string; action: string })[]): PlainEntry[] =>
  rows.map(r => toPlain(raw(r), NOW));

/** One import: a summary plus four members, one of whom brought an address. */
const anImport = () => plain([
  { id: 's', action: 'member.bulk_imported', entity: 'member_import_run',
    meta: { file_name: 'register-sep.csv', total: 4, inserted: 4, skipped: 0, failed: 0 } },
  { id: 'm1', action: 'member.insert', subject: 'Raja' },
  { id: 'e1', action: 'member_email.insert', entity: 'member_email', subject: 'Raja' },
  { id: 'm2', action: 'member.insert', subject: 'Priya Sharma' },
  { id: 'm3', action: 'member.insert', subject: 'Anu Nair' },
  { id: 'm4', action: 'member.insert', subject: 'Kavya Iyer' },
]);

test('an import becomes exactly one row', () => {
  const rows = groupRows(anImport());
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, 'group');
});

test('the row names the members, counts them, and says what it stands for', () => {
  const rows = groupRows(anImport());
  assert.equal(rows[0].kind, 'group');
  if (rows[0].kind !== 'group') return;
  const g = rows[0].group;
  assert.equal(g.title, '4 members added by bulk import');
  assert.equal(g.file, 'register-sep.csv');
  assert.deepEqual(g.names, ['Raja', 'Priya Sharma', 'Anu Nair', 'Kavya Iyer']);
  assert.equal(g.count, 4);
  assert.equal(g.countIsReported, true, 'the count came from the importer, not from a tally');
  assert.equal(g.entryCount, 6, 'the row must say how many entries it replaced');
  assert.equal(g.entries.length, 6, 'and must still carry every one of them');
});

test('it counts MEMBERS, not entries', () => {
  // One member with an address and an enrolment is one member. Counting rows
  // would report three, which is the mistake this whole row exists to fix.
  const rows = groupRows(plain([
    { id: 's', action: 'member.bulk_imported', entity: 'member_import_run',
      meta: { file_name: 'one.csv', inserted: 1 } },
    { id: 'm1', action: 'member.insert', subject: 'Raja' },
    { id: 'e1', action: 'member_email.insert', entity: 'member_email', subject: 'Raja' },
    { id: 'n1', action: 'member_enrollment.insert', entity: 'member_enrollment', subject: 'Raja' },
  ]));
  if (rows[0].kind !== 'group') { assert.fail('expected a group'); return; }
  assert.equal(rows[0].group.title, '1 member added by bulk import', 'and it is singular');
  assert.deepEqual(rows[0].group.names, ['Raja']);
  assert.equal(rows[0].group.entryCount, 4);
});

test('WITHOUT the summary row nothing groups — a shared instant is not an import', () => {
  const rows = groupRows(plain([
    { id: 'm1', action: 'member.insert', subject: 'Raja' },
    { id: 'm2', action: 'member.insert', subject: 'Priya Sharma' },
  ]));
  assert.equal(rows.length, 2);
  assert.ok(rows.every(r => r.kind === 'entry'),
    'two changes that merely share a timestamp must never merge into an import');
});

test('two people importing at the same instant stay two runs', () => {
  const rows = groupRows(plain([
    { id: 's1', action: 'member.bulk_imported', entity: 'member_import_run',
      who: 'Shazia', meta: { inserted: 1 } },
    { id: 'm1', action: 'member.insert', subject: 'Raja', who: 'Shazia' },
    { id: 's2', action: 'member.bulk_imported', entity: 'member_import_run',
      who: 'Priya Menon', whoKind: 'staff', meta: { inserted: 1 } },
    { id: 'm2', action: 'member.insert', subject: 'Divya', who: 'Priya Menon', whoKind: 'staff' },
  ]));
  assert.equal(rows.length, 2);
  assert.ok(rows.every(r => r.kind === 'group'));
  if (rows[0].kind !== 'group' || rows[1].kind !== 'group') return;
  assert.deepEqual(rows[0].group.names, ['Raja']);
  assert.deepEqual(rows[1].group.names, ['Divya']);
  assert.equal(rows[0].group.who, 'Shazia');
  assert.equal(rows[1].group.who, 'Priya Menon');
});

test('a second import at another time is its own row', () => {
  const rows = groupRows(plain([
    { id: 's1', action: 'member.bulk_imported', entity: 'member_import_run', meta: { inserted: 1 } },
    { id: 'm1', action: 'member.insert', subject: 'Raja' },
    { id: 's2', action: 'member.bulk_imported', entity: 'member_import_run',
      when: LATER, meta: { inserted: 1 } },
    { id: 'm2', action: 'member.insert', subject: 'Divya', when: LATER },
  ]));
  assert.equal(rows.length, 2);
  assert.ok(rows.every(r => r.kind === 'group'));
});

test('ordinary changes are untouched and keep their place', () => {
  const rows = groupRows(plain([
    { id: 'x', action: 'member.update', subject: 'Old Member', when: LATER,
      changes: [{ field: 'status', old: 'active', new: 'paused' }] },
    { id: 's', action: 'member.bulk_imported', entity: 'member_import_run', meta: { inserted: 1 } },
    { id: 'm1', action: 'member.insert', subject: 'Raja' },
  ]));
  assert.equal(rows.length, 2);
  assert.equal(rows[0].kind, 'entry', 'the run must not jump above the change before it');
  assert.equal(rows[1].kind, 'group');
});

test('the group sits where its first entry sat', () => {
  const rows = groupRows(plain([
    { id: 's', action: 'member.bulk_imported', entity: 'member_import_run', meta: { inserted: 1 } },
    { id: 'm1', action: 'member.insert', subject: 'Raja' },
    { id: 'x', action: 'member.update', subject: 'Old Member', when: LATER,
      changes: [{ field: 'status', old: 'active', new: 'paused' }] },
  ]));
  assert.equal(rows[0].kind, 'group');
  assert.equal(rows[1].kind, 'entry');
});

test('with no reported count it tallies what it can see, and says so', () => {
  const rows = groupRows(plain([
    { id: 's', action: 'member.bulk_imported', entity: 'member_import_run' },
    { id: 'm1', action: 'member.insert', subject: 'Raja' },
    { id: 'm2', action: 'member.insert', subject: 'Divya' },
  ]));
  if (rows[0].kind !== 'group') { assert.fail('expected a group'); return; }
  assert.equal(rows[0].group.count, 2);
  assert.equal(rows[0].group.countIsReported, false,
    'a tally must never be presented as the importer’s own figure');
});

test('a nonsense count in metadata is refused, not printed', () => {
  for (const bad of [{ inserted: -1 }, { inserted: 1.5 }, { inserted: '4' }, { inserted: null }]) {
    const rows = groupRows(plain([
      { id: 's', action: 'member.bulk_imported', entity: 'member_import_run', meta: bad },
      { id: 'm1', action: 'member.insert', subject: 'Raja' },
    ]));
    if (rows[0].kind !== 'group') { assert.fail('expected a group'); return; }
    assert.equal(rows[0].group.count, 1, `fell back to the tally for ${JSON.stringify(bad)}`);
    assert.equal(rows[0].group.countIsReported, false);
  }
});

test('the CSV import path groups too', () => {
  const rows = groupRows(plain([
    { id: 's', action: 'csv_import.completed', entity: 'csv_import', meta: { inserted: 2 } },
    { id: 'm1', action: 'csv_import.member_created', subject: 'Raja' },
    { id: 'm2', action: 'csv_import.member_created', subject: 'Divya' },
  ]));
  assert.equal(rows.length, 1);
  if (rows[0].kind !== 'group') return;
  assert.deepEqual(rows[0].group.names, ['Raja', 'Divya']);
});

test('a member named twice in one run is one member', () => {
  const rows = groupRows(plain([
    { id: 's', action: 'member.bulk_imported', entity: 'member_import_run' },
    { id: 'm1', action: 'member.insert', subject: 'Raja' },
    { id: 'm2', action: 'member.insert', subject: 'Raja' },
  ]));
  if (rows[0].kind !== 'group') { assert.fail('expected a group'); return; }
  assert.deepEqual(rows[0].group.names, ['Raja']);
});

test('a run spanning two branches belongs to neither', () => {
  const rows = groupRows(plain([
    { id: 's', action: 'member.bulk_imported', entity: 'member_import_run', branch: 'Coimbatore' },
    { id: 'm1', action: 'member.insert', subject: 'Raja', branch: 'Coimbatore' },
    { id: 'm2', action: 'member.insert', subject: 'Divya', branch: 'Chennai' },
  ]));
  if (rows[0].kind !== 'group') { assert.fail('expected a group'); return; }
  assert.equal(rows[0].group.branch, null,
    'claiming one branch for a run that reached two would be an invented fact');
});

test('the group is searchable on everything it swallowed', () => {
  const rows = groupRows(anImport());
  if (rows[0].kind !== 'group') { assert.fail('expected a group'); return; }
  assert.match(rows[0].group.haystack, /kavya iyer/,
    'a member inside a collapsed run must still be findable');
});

test('an empty log groups to nothing', () => {
  assert.deepEqual(groupRows([]), []);
});
