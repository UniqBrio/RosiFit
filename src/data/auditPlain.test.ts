/**
 * Cases for the plain-language pass over the audit log.
 *
 * Run: npx tsx --test src/data/auditPlain.test.ts
 *
 * The failure this file is really guarding is TOTALITY. A mapping table is
 * right on the day it is written and wrong the first time somebody adds an
 * action — and the wrongness is silent: the screen renders, the row is there,
 * and it says `member_schedule.delete` to a person who does not read code.
 * So the last test below enumerates every action the backend can currently
 * emit and asserts that none of them reaches the screen as a code.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  actionTitle, categoryOf, fieldLabel, valueText, whenText, actorRole,
  isSessionAction, toPlain, visibleEntries,
} from './auditPlain';

/* ------------------------------------------------------------------ titles */

test('a composed trigger action becomes a sentence', () => {
  assert.equal(actionTitle('member.insert', 'member'), 'Member added');
  assert.equal(actionTitle('member.update', 'member'), 'Member updated');
  assert.equal(actionTitle('course.delete', 'course'), 'Course removed');
});

test('an entity whose name contains a dot still splits correctly', () => {
  // `auth.mobile_changed.insert` — splitting on the FIRST dot would look up
  // the entity "auth" and fall through to the generic prettifier.
  assert.equal(actionTitle('auth.mobile_changed.insert', 'auth.mobile_changed'), 'Mobile number changed');
});

test('the verbs that would read wrongly are stated, not composed', () => {
  assert.equal(actionTitle('attendance.insert', 'attendance'), 'Attendance marked');
  assert.equal(actionTitle('app_settings.update', 'app_settings'), 'Academy settings updated');
});

test('a hand-written action uses its own sentence', () => {
  assert.equal(actionTitle('communication.batch_sent', 'email_batch'), 'Follow-up emails sent');
  assert.equal(actionTitle('csv_import.completed', 'csv_import'), 'Attendance file uploaded');
});

test('an action nobody has mapped is still not a code', () => {
  const title = actionTitle('some_future.thing_happened', 'nothing_known');
  assert.equal(title, 'Some future thing happened');
  assert.ok(!/[._]/.test(title), 'a fallback title must never contain a dot or an underscore');
});

/* -------------------------------------------------------------- categories */

test('an upload is filed by what happened, not by which table took the write', () => {
  // csv_import.member_created writes a MEMBER. It belongs with the upload,
  // because "what did that upload do?" is the question somebody has.
  assert.equal(categoryOf('csv_import.member_created', 'member'), 'uploads');
  assert.equal(categoryOf('member.bulk_imported', 'member'), 'uploads');
  assert.equal(categoryOf('member.insert', 'member'), 'members');
});

test('every category resolves for an entity nobody has mapped', () => {
  assert.equal(categoryOf('unknown.insert', 'unknown_table'), 'settings');
});

/* ------------------------------------------------------------------ fields */

test('a column name becomes a label', () => {
  assert.equal(fieldLabel('full_name'), 'Name');
  // 'Joined on' until 0057 gave the column a picker and a name to go with
  // it. The COLUMN is still joined_on -- renaming it would cost a
  // migration nobody can review -- so this map is exactly where the two
  // vocabularies are allowed to meet, and an audit line is read by the
  // same person who read the form that wrote it.
  assert.equal(fieldLabel('joined_on'), 'Active from');
  assert.equal(fieldLabel('inactive_from'), 'Inactive from');
  assert.equal(fieldLabel('created_by'), 'Added by');
});

test('an unmapped column is prettified rather than printed raw', () => {
  assert.equal(fieldLabel('some_new_column'), 'Some new column');
});

/* ------------------------------------------------------------------ values */

test('a date is read the way it is written down', () => {
  assert.equal(valueText('joined_on', '2026-09-07'), '7 Sep 2026');
});

test('a date is not shifted by the timezone', () => {
  // `new Date('2026-01-01')` is UTC midnight, which is 31 December for
  // anyone west of Greenwich. Parsed by hand for exactly this reason.
  assert.equal(valueText('joined_on', '2026-01-01'), '1 Jan 2026');
});

test('a timestamp carries its time in 12-hour form', () => {
  assert.equal(valueText('deleted_at', '2026-09-07T15:11:49'), '7 Sep 2026, 3:11 PM');
});

test('midnight and noon do not both read as 12 PM', () => {
  assert.equal(valueText('start_time', '00:30'), '12:30 AM');
  assert.equal(valueText('start_time', '12:30'), '12:30 PM');
});

test('weekday numbers become weekday names', () => {
  assert.equal(valueText('weekdays', '1,2,4'), 'Mon Tue Thu');
});

test('a boolean is a word', () => {
  assert.equal(valueText('is_primary', 'true'), 'Yes');
  assert.equal(valueText('is_primary', 'false'), 'No');
});

test('a redacted value says it was never recorded, and never shows the marker', () => {
  // Guardrail 4. The redaction happened when the row was written; this is
  // only about not printing the machine's marker at somebody.
  assert.equal(valueText('pin', '[redacted]'), 'never recorded');
});

test('an absent value is null, so the caller can choose the right word', () => {
  assert.equal(valueText('notes', null), null);
  assert.equal(valueText('notes', ''), null);
});

/* -------------------------------------------------------------------- when */

test('today, yesterday and older each read differently', () => {
  const now = new Date(2026, 8, 7, 18, 0);                       // 7 Sep 2026
  assert.equal(whenText(new Date(2026, 8, 7, 15, 11).toISOString(), now), 'Today, 3:11 PM');
  assert.equal(whenText(new Date(2026, 8, 6, 9, 2).toISOString(), now), 'Yesterday, 9:02 AM');
  assert.equal(whenText(new Date(2026, 7, 30, 18, 40).toISOString(), now), '30 Aug, 6:40 PM');
  assert.equal(whenText(new Date(2025, 7, 30, 18, 40).toISOString(), now), '30 Aug 2025, 6:40 PM');
});

test('a date at a month boundary still reports the previous day as yesterday', () => {
  const now = new Date(2026, 8, 1, 10, 0);                        // 1 Sep 2026
  assert.equal(whenText(new Date(2026, 7, 31, 23, 30).toISOString(), now), 'Yesterday, 11:30 PM');
});

/* --------------------------------------------------------------- who and what */

test('the role travels beside the name, because two names look alike', () => {
  assert.equal(actorRole('super_admin'), 'Owner');
  assert.equal(actorRole('staff'), 'Staff');
  assert.equal(actorRole('system'), 'Automatic');
  assert.equal(actorRole('anon'), null);
});

/* ------------------------------------------------------------ what is listed */

const entry = (over: Partial<Parameters<typeof toPlain>[0]> = {}) => ({
  id: '1', action: 'member.insert', entity: 'member', subject: 'Ranjani',
  who: 'Shazia', whoKind: 'super_admin', when: new Date(2026, 8, 7, 15, 11).toISOString(),
  changes: [{ field: 'full_name', old: null, new: 'Ranjani' }],
  ...over,
});

test('signing in is not a change and is not listed', () => {
  assert.equal(isSessionAction('auth.login_succeeded'), true);
  assert.equal(isSessionAction('auth.login_failed'), true);
  const shown = visibleEntries(
    [entry({ id: 'a', action: 'auth.login_succeeded', entity: 'app_user' }), entry({ id: 'b' })],
    { category: 'all', query: '', now: new Date(2026, 8, 7, 18, 0) },
  );
  assert.deepEqual(shown.map(e => e.id), ['b']);
});

test('managing an account IS a change, and stays listed', () => {
  // The distinction the requester drew is sign-in versus everything else,
  // not "auth versus everything else": creating a staff account changes a
  // stored record, and the screen's own promise covers accounts.
  assert.equal(isSessionAction('auth.staff_created'), false);
  assert.equal(isSessionAction('auth.pin_issued'), false);
  assert.equal(isSessionAction('auth.mobile_changed'), false);
});

test('a chip narrows the list and the search box narrows it further', () => {
  const now = new Date(2026, 8, 7, 18, 0);
  const rows = [
    entry({ id: 'm', subject: 'Ranjani' }),
    entry({ id: 'c', action: 'course.update', entity: 'course', subject: 'Prenatal Yoga',
            changes: [{ field: 'name', old: 'Yoga', new: 'Prenatal Yoga' }] }),
  ];
  assert.deepEqual(visibleEntries(rows, { category: 'courses', query: '', now }).map(e => e.id), ['c']);
  assert.deepEqual(visibleEntries(rows, { category: 'all', query: 'ranjani', now }).map(e => e.id), ['m']);
  assert.deepEqual(visibleEntries(rows, { category: 'all', query: 'nobody', now }).map(e => e.id), []);
});

test('search reaches the changed values, not only the heading', () => {
  const now = new Date(2026, 8, 7, 18, 0);
  const rows = [entry({ changes: [{ field: 'status', old: 'active', new: 'inactive' }] })];
  assert.equal(visibleEntries(rows, { category: 'all', query: 'inactive', now }).length, 1);
});

test('a change with nothing on either side is dropped rather than drawn blank', () => {
  const plain = toPlain(entry({ changes: [{ field: 'notes', old: null, new: null }] }));
  assert.deepEqual(plain.changes, []);
});

test('a branch narrows to what can be traced to it, and says nothing about the rest', () => {
  const now = new Date(2026, 8, 7, 18, 0);
  const rows = [
    entry({ id: 'cbe', branch: 'Coimbatore' }),
    entry({ id: 'mdu', branch: 'Madurai' }),
    // A message template belongs to no branch. It must not appear under one
    // — "at every branch" would be an invented fact about it.
    entry({ id: 'tpl', action: 'email_template.update', entity: 'email_template', branch: null }),
  ];
  assert.deepEqual(
    visibleEntries(rows, { category: 'all', query: '', branch: 'Coimbatore', now }).map(e => e.id),
    ['cbe'],
  );
  assert.deepEqual(
    visibleEntries(rows, { category: 'all', query: '', branch: null, now }).map(e => e.id),
    ['cbe', 'mdu', 'tpl'],
  );
});

test('the branch is searchable, so the box finds what the filter would', () => {
  const now = new Date(2026, 8, 7, 18, 0);
  const rows = [entry({ branch: 'Coimbatore' })];
  assert.equal(visibleEntries(rows, { category: 'all', query: 'coimbatore', now }).length, 1);
});

/* ---------------------------------------------------------------- totality */

test('every action the backend can emit reads as words', () => {
  // Hand-written actions: `grep -ohE "audit_log(_as)?\(\s*'[^']+'" supabase/`
  const named = [
    'auth.pin_reset', 'auth.pin_issued', 'auth.pin_changed', 'auth.staff_created',
    'auth.staff_reenabled', 'auth.mobile_changed', 'auth.login_succeeded',
    'auth.login_failed', 'auth.bootstrap_completed', 'auth.recovery_passed',
    'auth.recovery_failed', 'auth.pin_reset_requested',
    'communication.batch_sent',
    'csv_import.completed', 'csv_import.email_added', 'csv_import.matched_existing',
    'csv_import.member_created', 'csv_import.row_skipped',
    // written by csv-import's preview when the same file is offered twice, so
    // the log can say why an upload produced no import at all
    'csv_import.already_imported',
    'holiday.applied', 'holiday.removed',
    'member.bulk_imported', 'member.created', 'member.merged', 'member.updated',
  ];
  // Trigger actions: `grep -ohE "audit_row_change\('[^']+'\)" supabase/migrations/`
  const entities = [
    'app_settings', 'app_user', 'attendance', 'auth.mobile_changed', 'branch',
    'course', 'course_communication', 'course_follow_up_config', 'email_template',
    'follow_up_config', 'holiday', 'member', 'member_alias', 'member_email',
    'member_enrollment', 'member_schedule', 'offering', 'offering_schedule', 'session',
  ];
  const composed = entities.flatMap(e => ['insert', 'update', 'delete'].map(op => `${e}.${op}`));

  for (const action of [...named, ...composed]) {
    const entity = composed.includes(action) ? action.slice(0, action.lastIndexOf('.')) : action.split('.')[0];
    const title = actionTitle(action, entity);
    assert.ok(
      !/[._]/.test(title) && title === title.trim() && title.length > 0,
      `"${action}" reaches the screen as "${title}" — that is still a code`,
    );
    // and it must land under one of the seven chips
    assert.ok(
      ['members', 'courses', 'attendance', 'uploads', 'messages', 'settings']
        .includes(categoryOf(action, entity)),
      `"${action}" has no chip to appear under`,
    );
  }
});
