import test from 'node:test';
import assert from 'node:assert/strict';
import { toPlain, actionTitle, categoryOf } from './auditPlain';

/**
 * requests/2026-09-08-audit-log-deleted-member-name-filters-wrong-info.md —
 * "In audit log show member name if member deleted".
 *
 * WHAT THIS IS GUARDING
 * Every other entry on the screen names its subject by looking `entity_id` up
 * in the table it points at. The `*.hard_deleted` family cannot work that way,
 * and not by accident: `purge_member` (0051), `purge_course` (0047) and the
 * one-off purges in 0053-0055 all DELETE the row they are about, in the same
 * transaction that writes the entry. The lookup therefore misses by design,
 * and the name each of those functions carefully recorded in `metadata` was
 * read by nothing at all.
 *
 * So on 08-Sep-2026 the log held 46 `member.hard_deleted` rows — the most
 * recent activity in the academy, and the most destructive act the app offers
 * — and every one of them named nobody: "Member — member hard deleted", no
 * subject, "No field values recorded", two dashes.
 *
 * The name is not the whole of it. An entry about a deletion whose value
 * columns are empty is a row that says a person was destroyed and declines to
 * say what went with her, on the one screen whose promise is that nothing is
 * hidden. The counts are in the same metadata as the name.
 */

const removal = (over: Record<string, unknown> = {}) => ({
  id: '1',
  action: 'member.hard_deleted',
  entity: 'member',
  // NULL, exactly as fetchAudit produces it: the member row is gone, so the
  // id resolves to no name. This is the input the screen actually gets.
  subject: null as string | null,
  branch: null as string | null,
  who: 'Rosi Owner',
  whoKind: 'super_admin',
  when: new Date(2026, 8, 8, 13, 32).toISOString(),
  changes: [] as { field: string; old: string | null; new: string | null }[],
  meta: {
    name: 'Sumathi', member_code: null, was_soft_deleted_at: null, note: null,
    enrolments: 1, emails_sent: 0, attendance_records: 2, sessions_touched: 2,
    session_ids: ['bc0e86ed-831f-4d11-9a16-fe0fa72a2587'],
  } as Record<string, unknown>,
  ...over,
});

const NOW = new Date(2026, 8, 8, 18, 0);

test('a deleted member is named from the entry that removed her', () => {
  const plain = toPlain(removal(), NOW);
  assert.equal(plain.subject, 'Sumathi',
    'the deletion entry names nobody. Her members row is gone by design (0051); '
    + 'the name is in metadata.name and nothing reads it');
});

test('the deletion says so in words, not as a code', () => {
  const title = actionTitle('member.hard_deleted', 'member');
  assert.ok(!/[._]/.test(title), `"member.hard_deleted" reaches the screen as "${title}"`);
  assert.equal(title, 'Member deleted permanently');
});

test('the whole hard-deleted family names what it removed', () => {
  // Five writers, five metadata shapes, one screen. Each recorded the name
  // under the key that made sense to it; none of them was ever read.
  const cases: { action: string; entity: string; meta: Record<string, unknown>; subject: string }[] = [
    { action: 'course.hard_deleted', entity: 'course',
      meta: { name: 'Prenatal Yoga' }, subject: 'Prenatal Yoga' },
    { action: 'branch.hard_deleted', entity: 'branch',
      meta: { name: 'Madurai', code: 'MDU' }, subject: 'Madurai' },
    { action: 'member_email.hard_deleted', entity: 'member_email',
      meta: { email: 'divya@example.com', member_name: 'Divya Ramesh' }, subject: 'Divya Ramesh' },
    { action: 'member_import_run.hard_deleted', entity: 'member_import_run',
      meta: { file_name: 'register-sep.csv', total_rows: 4 }, subject: 'register-sep.csv' },
  ];
  for (const c of cases) {
    const plain = toPlain(removal({ action: c.action, entity: c.entity, meta: c.meta }), NOW);
    assert.equal(plain.subject, c.subject, `${c.action} names nobody`);
    assert.ok(!/[._]/.test(plain.title), `${c.action} reaches the screen as "${plain.title}"`);
  }
});

test('an address removal is filed under members, an import receipt under uploads', () => {
  assert.equal(categoryOf('member_email.hard_deleted', 'member_email'), 'members');
  assert.equal(categoryOf('member_import_run.hard_deleted', 'member_import_run'), 'uploads',
    'an import receipt is a thing the upload left behind, not a setting');
});

test('the deletion fills its value columns instead of reading "No field values recorded"', () => {
  const plain = toPlain(removal(), NOW);
  assert.equal(plain.changes.length, 1,
    'a permanent deletion recorded no CHANGES, so the row printed two dashes — on the one '
    + 'entry where the previous value is the whole point');
  assert.equal(plain.changes[0].from, 'Sumathi', 'the previous value is who she was');
  assert.equal(plain.changes[0].to, null, 'there is no new value — the record is gone');
  assert.equal(plain.removal, true,
    'the screen needs to know this null means "no longer on record", not "cleared"');
});

test('the row says what went with her, from the counts the deletion recorded', () => {
  const plain = toPlain(removal(), NOW);
  assert.ok(plain.detail, 'the deletion counted her attendance and enrolments and said nothing');
  assert.match(plain.detail!, /2 attendance records/);
  assert.match(plain.detail!, /1 enrolment/);
  assert.match(plain.detail!, /2 sessions/,
    "the sessions she was counted on now show one fewer person present — 0051's own warning");
  assert.ok(!/0 sent emails/.test(plain.detail!),
    'a count of zero is not news; naming it buries the counts that are');
});

test('a deletion that took nothing with it says that, rather than nothing', () => {
  const plain = toPlain(removal({
    meta: { name: 'Anu Nair', enrolments: 0, emails_sent: 0, attendance_records: 0, sessions_touched: 0 },
  }), NOW);
  assert.ok(plain.detail, 'an empty detail reads as "not measured", which is a different fact');
  assert.match(plain.detail!, /[Nn]othing else/);
});

test('the reason a purge recorded is searchable, so "why is the register empty" has an answer', () => {
  // 0052/0053/0055 each record WHO decided and when, because a migration
  // running as no app user would otherwise show seven people destroyed by
  // nobody in particular. It is the only account of the decision that exists.
  const note = "0055_purge_every_member: the entire register removed at the repo owner's "
    + 'explicit request of 08-Sep-2026';
  const plain = toPlain(removal({ meta: { name: 'Shazia', note } }), NOW);
  assert.ok(plain.haystack.includes('purge_every_member'),
    'the note is not searchable, so the one record of who ordered the purge is unreachable');
});

test('an entry whose subject DID resolve is untouched', () => {
  // MUST NOT CHANGE. The fallback is a fallback: a live member's name comes
  // from her row, and metadata must never override what the log resolved.
  const plain = toPlain(removal({
    action: 'member.update', entity: 'member', subject: 'Divya Ramesh',
    meta: { name: 'Somebody Else' },
    changes: [{ field: 'status', old: 'active', new: 'inactive' }],
  }), NOW);
  assert.equal(plain.subject, 'Divya Ramesh');
  assert.equal(plain.changes.length, 1);
  assert.equal(plain.removal, false);
  assert.equal(plain.detail, null);
});

test('a removal with no metadata at all still renders, and claims no name', () => {
  // Totality. An entry written before the metadata shape settled, or by a
  // future purge that forgets it, must degrade to "not recorded" — never to
  // an invented name and never to a crash.
  const plain = toPlain(removal({ meta: undefined }), NOW);
  assert.equal(plain.subject, null);
  assert.equal(plain.title, 'Member deleted permanently');
});
