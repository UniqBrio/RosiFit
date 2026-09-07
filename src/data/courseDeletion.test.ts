/**
 * What the academy is told before and after a course is deleted.
 *
 * Run: npx tsx --test src/data/courseDeletion.test.ts
 *
 * The confirmation is the last thing anybody reads before the one write in
 * the product that cannot be undone, so its sentence is asserted word for
 * word: which counts it names, how it reads when there is nothing to warn
 * about, and that losing the numbers does not make it gentler.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { deletionWarning, deletionOutcome, type DeletionPreview } from './courseDeletion';

const history: DeletionPreview = {
  offerings: 1, membersEnrolled: 3, sessions: 8, sessionsCompleted: 7,
  attendanceRecords: 39, imports: 11,
};

/* -------------------------------------------------------- the confirmation */

test('a course with history is warned about in numbers, and told the files come free', () => {
  assert.equal(deletionWarning({ kind: 'counted', preview: history }),
    '3 members are enrolled. This permanently deletes the course, its 1 offering, '
    + 'all 8 sessions (7 completed) and the 39 attendance records on them. '
    + 'That attendance history cannot be recovered. '
    + 'The 11 files imported into it can be uploaded again afterwards. '
    + 'Recorded in the audit log.');
});

test('singulars read as singulars', () => {
  const one: DeletionPreview = {
    offerings: 2, membersEnrolled: 1, sessions: 1, sessionsCompleted: 1,
    attendanceRecords: 1, imports: 1,
  };
  assert.equal(deletionWarning({ kind: 'counted', preview: one }),
    '1 member is enrolled. This permanently deletes the course, its 2 offerings, '
    + 'its 1 session (1 completed) and the 1 attendance record on them. '
    + 'That attendance history cannot be recovered. '
    + 'The 1 file imported into it can be uploaded again afterwards. '
    + 'Recorded in the audit log.');
});

test('sessions with nobody marked on them say so rather than inventing a count', () => {
  const words = deletionWarning({ kind: 'counted', preview: { ...history, attendanceRecords: 0, imports: 0 } });
  assert.match(words, /all 8 sessions \(7 completed\) and no attendance records\./);
  assert.doesNotMatch(words, /uploaded again/);
});

test('a course nothing has happened in is permanent but has no history to warn about', () => {
  const empty: DeletionPreview = {
    offerings: 1, membersEnrolled: 0, sessions: 0, sessionsCompleted: 0,
    attendanceRecords: 0, imports: 0,
  };
  assert.equal(deletionWarning({ kind: 'counted', preview: empty }),
    'Nobody is enrolled. This permanently deletes the course and its 1 offering. '
    + 'Nothing has been recorded on it yet. Recorded in the audit log.');
});

test('while the count is running, the dialog says that and nothing else', () => {
  assert.equal(deletionWarning({ kind: 'counting' }), 'Counting what this will delete…');
});

test('a failed count still warns in full -- losing the numbers does not soften it', () => {
  const words = deletionWarning({ kind: 'uncounted' });
  assert.match(words, /^What this will delete could not be counted\. /);
  assert.match(words, /permanently deletes the course, its offerings, every session and every attendance record/);
  assert.match(words, /cannot be recovered/);
  assert.match(words, /Recorded in the audit log\.$/);
});

/* --------------------------------------------------------------- the toast */

test('a real deletion counts what it removed, and is the only ok', () => {
  const out = deletionOutcome('Postnatal', { sessionsRemoved: 8, attendanceRemoved: 39, alreadyDeleted: false }, 'live');
  assert.equal(out.message, 'Postnatal deleted — 8 sessions and 39 attendance records removed');
  assert.equal(out.tone, 'ok');
});

test('a course with no sessions is simply deleted', () => {
  const out = deletionOutcome('Postnatal', { sessionsRemoved: 0, attendanceRemoved: 0, alreadyDeleted: false }, 'live');
  assert.equal(out.message, 'Postnatal deleted');
  assert.equal(out.tone, 'ok');
});

test('already gone is a warning, not a success', () => {
  const out = deletionOutcome('Postnatal', { sessionsRemoved: 0, attendanceRemoved: 0, alreadyDeleted: true }, 'live');
  assert.equal(out.message, 'Postnatal was already deleted');
  assert.equal(out.tone, 'warn');
});

test('a fixture-only deletion says so, whatever it counted', () => {
  const out = deletionOutcome('Postnatal', { sessionsRemoved: 3, attendanceRemoved: 9, alreadyDeleted: false }, 'fixture');
  assert.equal(out.message, 'Postnatal deleted on this device only. The academy database is not configured.');
  assert.equal(out.tone, 'warn');
});
