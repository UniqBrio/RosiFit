/**
 * What the academy is told BEFORE and AFTER a removal.
 *
 * Run: npx tsx --test src/data/memberRemoval.test.ts
 *
 * AMENDED 08-Sep-2026, and the amendment is the point. Until 0051 this file
 * asserted the sentence "Priya removed, 3 attendance records kept" and was
 * right to, for as long as that was true: the delete was a soft one and the
 * foreign keys refused anything else. The repo owner withdrew that promise
 * (requests/2026-09-08-hard-delete-member.md) after being shown that
 * attendance_records, session_expectations and email_messages all reference
 * members(id) with NO ACTION -- so her rows either go with her or the deletion
 * cannot happen at all. The assertions below are the new contract; the old
 * ones are not weakened, they are the opposite claim and could not both stand.
 *
 * These exist because the deletion is the one write the app cannot undo, and
 * because three of its four outcomes are ones nobody meets by hand: she was
 * already gone, the write only reached the offline fixture list, or it was
 * refused. Each of those reads like success if the sentence is wrong.
 *
 * The tone assertions are not cosmetic. `ok` is claimed by exactly one
 * outcome; anything else is `warn`, because a removal that did not really
 * happen must not look like one that did.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  removalOutcome, removalFailure, firstName, deletionWarning,
  type DeletionPreview,
} from './memberRemoval';

const real = { attendanceRemoved: 3, sessionsTouched: 2, alreadyDeleted: false };

const preview = (over: Partial<DeletionPreview> = {}): DeletionPreview => ({
  attendanceRecords: 3, sessionsAttended: 2, enrolments: 1, emailsSent: 0, ...over,
});

/* ================================================ BEFORE: the confirmation */

/**
 * AMENDED 08-Sep-2026 for requests/2026-09-08-member-delete-confirm-yes-no.md.
 *
 * The repo owner saw the counted paragraph on screen and cut it: "this is very
 * much info keep it simple you are deleting member and its records do you want
 * to delete it permanently thats it". So the six tests that asserted the
 * COUNTS -- the plurals, the mail clause, the "not enrolled in anything"
 * branch, the counting and uncounted wordings -- are gone with the words they
 * quoted. What replaces them is below, and it is the part that was never about
 * the numbers: the two facts that decide the answer must both be in the
 * sentence, in every state, and the withdrawn promise must still be in none.
 */

test('the warning says the records go, and that it is permanent', () => {
  const body = deletionWarning({ kind: 'counted', preview: preview() });
  assert.match(body, /all her records/,
    'the records going with her is half of what the tap decides');
  assert.match(body, /permanently/,
    'and the other half is that it cannot be taken back');
});

test('the sentence does not vary with the count', () => {
  // The words are the same before, during and after the preview -- a dialog
  // whose body reflows a second after it opens is one people re-read rather
  // than answer, and there is nothing left in it that a count would change.
  const shown = new Set([
    deletionWarning({ kind: 'counting' }),
    deletionWarning({ kind: 'uncounted' }),
    deletionWarning({ kind: 'counted', preview: preview() }),
    deletionWarning({ kind: 'counted', preview: preview({ attendanceRecords: 0, sessionsAttended: 0, enrolments: 0 }) }),
  ]);
  assert.equal(shown.size, 1, `the body must read the same in every state, got: ${[...shown].join(' | ')}`);
});

test('it stays a short question, not a paragraph', () => {
  // The defect this replaced was LENGTH. A bound, so the clauses cannot creep
  // back one true fact at a time.
  const body = deletionWarning({ kind: 'counted', preview: preview() });
  assert.ok(body.length <= 140, `the body is back to a paragraph (${body.length} chars): ${body}`);
  assert.match(body, /\?$/, 'a Yes/No dialog must end in the question those answers answer');
});

test('the withdrawn promise appears nowhere in any branch', () => {
  // The single most important assertion in this file. If "history stays" ever
  // comes back into the dialog, the app is promising the opposite of what the
  // database now does, in the one sentence nobody can take back.
  for (const state of [
    { kind: 'counting' } as const,
    { kind: 'uncounted' } as const,
    { kind: 'counted', preview: preview() } as const,
    { kind: 'counted', preview: preview({ attendanceRecords: 0, sessionsAttended: 0 }) } as const,
  ]) {
    const body = deletionWarning(state);
    assert.doesNotMatch(body, /history stays|untouched|is kept|records kept/i,
      `a withdrawn promise survives in: ${body}`);
  }
});

/* The six tests that stood here asserted the counted paragraph -- the plurals,
 * the mail clause, the "not enrolled in anything" branch, and the separate
 * counting and uncounted wordings. They are removed with the sentences they
 * quoted; see the AMENDED note above. The counts themselves still exist behind
 * member_deletion_preview and are still asserted in supabase/tests. */

/* ================================================== AFTER: the four outcomes */

test('a real deletion names her, counts what WENT, and is the only ok', () => {
  const out = removalOutcome('Priya Raman', real, 'live');
  assert.equal(out.message, 'Priya removed — 3 attendance records across 2 sessions deleted');
  assert.equal(out.tone, 'ok');
});

test('one record over one session is singular -- "1 records" is how a toast looks unread', () => {
  const out = removalOutcome('Priya Raman',
    { attendanceRemoved: 1, sessionsTouched: 1, alreadyDeleted: false }, 'live');
  assert.equal(out.message, 'Priya removed — 1 attendance record across 1 session deleted');
  assert.equal(out.tone, 'ok');
});

test('a member who never attended is told nothing of hers is left', () => {
  // Silence here would read as a count that failed rather than a count of
  // none -- and "nothing of hers is left" is the whole of what this change
  // promises, so it is the right sentence for the case that proves it.
  const out = removalOutcome('Priya Raman',
    { attendanceRemoved: 0, sessionsTouched: 0, alreadyDeleted: false }, 'live');
  assert.equal(out.message, 'Priya removed — nothing of hers is left');
  assert.equal(out.tone, 'ok');
});

test('a second tap says she had already gone, and is NOT ok', () => {
  // Two taps on a slow connection is not a failure a person needs to read
  // about -- but it is not a fresh removal either. delete_member stays
  // idempotent under 0051 precisely so this branch is reachable.
  const out = removalOutcome('Priya Raman', { ...real, alreadyDeleted: true }, 'live');
  assert.equal(out.message, 'Priya had already been removed');
  assert.equal(out.tone, 'warn');
});

test('offline, the sentence says the academy database was not touched', () => {
  const out = removalOutcome('Priya Raman', real, 'fixtures');
  assert.equal(out.message,
    'Priya removed on this device only. The academy database is not configured.');
  assert.equal(out.tone, 'warn');
});

test('already-gone beats the source -- a second tap offline is not congratulated', () => {
  // The order of the two checks is the assertion. If `source` were tested
  // first, a repeat tap against fixtures would claim a removal that removed
  // nothing.
  const out = removalOutcome('Priya Raman',
    { attendanceRemoved: 0, sessionsTouched: 0, alreadyDeleted: true }, 'fixtures');
  assert.equal(out.message, 'Priya had already been removed');
  assert.equal(out.tone, 'warn');
});

test('the removed count is never quoted on an outcome that removed nothing', () => {
  // Both unhappy branches are handed a non-zero count and neither repeats it:
  // a number in a sentence about a deletion that did not happen is a claim
  // about rows nobody touched.
  for (const out of [
    removalOutcome('Priya Raman', real, 'fixtures'),
    removalOutcome('Priya Raman', { ...real, alreadyDeleted: true }, 'live'),
  ]) {
    assert.ok(!out.message.includes('3'), `leaked the removed count: ${out.message}`);
  }
});

/* ------------------------------------------------------------ the refusal */

test('a refusal shows the reason the repository already made readable', () => {
  // The lapsed-subscription branch of deleteMember, and the guard
  // 33_delete_member_subscription_gate.sql pins on the database side --
  // unchanged by 0051, which kept both guards exactly as 0044 had them.
  const out = removalFailure(new Error(
    'She could not be removed — the subscription has to be active. Nothing has been changed.'));
  assert.equal(out.message,
    'She could not be removed — the subscription has to be active. Nothing has been changed.');
  assert.equal(out.tone, 'warn');
});

test('something thrown that is not an Error still says nothing has been changed', () => {
  // After a destructive action that failed, the first question is not what
  // went wrong but whether it went half-way.
  const out = removalFailure('websocket closed');
  assert.equal(out.message, 'She could not be removed. Nothing has been changed.');
  assert.equal(out.tone, 'warn');
});

test('no outcome is ever silent', () => {
  const outs = [
    removalOutcome('Priya Raman', real, 'live'),
    removalOutcome('Priya Raman', real, 'fixtures'),
    removalOutcome('Priya Raman', { ...real, alreadyDeleted: true }, 'live'),
    removalFailure(new Error('x')),
    removalFailure(null),
  ];
  for (const out of outs) assert.ok(out.message.trim().length > 0);
});

/* -------------------------------------------------------------- her name */

test('a toast addresses her by her first name', () => {
  assert.equal(firstName('Priya Raman'), 'Priya');
});

test('a single-word name is its own first name', () => {
  assert.equal(firstName('Lakshmi'), 'Lakshmi');
  assert.equal(removalOutcome('Lakshmi', real, 'live').message,
    'Lakshmi removed — 3 attendance records across 2 sessions deleted');
});

test('a stray leading space does not produce a nameless toast', () => {
  // A name arriving off an imported file is not always trimmed, and
  // " Priya".split(' ')[0] is the empty string -- which would have shipped a
  // toast addressed to nobody.
  assert.equal(firstName('  Priya Raman'), 'Priya');
  assert.equal(firstName('Priya   Raman'), 'Priya');
});

test('a blank name stays blank rather than becoming undefined', () => {
  assert.equal(firstName(''), '');
  assert.equal(firstName('   '), '');
});
