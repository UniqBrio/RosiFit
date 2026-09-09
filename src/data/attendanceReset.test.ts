/**
 * Resetting a day's register: who it reaches, and what it says first.
 *
 * Run: npx tsx --test src/data/attendanceReset.test.ts
 *
 * The two claims worth holding are the two that were wrong on the screen the
 * requester photographed on 08-Sep-2026:
 *
 *   1. the delete offer is driven by the REGISTER, not by the roster, so a
 *      member marked present while enrolled in no course is still reachable;
 *   2. the warning describes what is TICKED, not what was offered.
 *
 * The sentences are asserted word for word because they are the last thing
 * anybody reads before a hard delete.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resetPreview, resetWarning, deleteWarning, resetOutcome, resetFailure,
  type ResetTarget,
} from './attendanceReset';

const YODA = 'course-yoda';
const DAY = '2026-09-08';

/** the shape fetchAttendance returns, cut to what this module reads */
const row = (member_id: string, member: string, date = DAY, course_id: string | null = YODA) =>
  ({ member_id, member, course_id, date });

/* ------------------------------------------------------- who it reaches */

test('the register drives the offer, so a member enrolled in no course is still reachable', () => {
  // Exactly the 08-Sep-2026 data: the roster knows one member, the register
  // marks four. Rani, Rossy and UniqBotz are enrolled nowhere, which is why
  // the screen read "Members (1)" over a register holding four.
  const preview = resetPreview(
    [
      row('m-jfffjj', 'jfffjj'),
      row('m-rani', 'Rani'),
      row('m-rossy', 'Rossy'),
      row('m-uniq', 'UniqBotz Infotech'),
    ],
    [{ id: 'm-jfffjj', emails: [{ address: 'ggg@gmail.com' }] }],
    YODA, DAY,
  );

  assert.equal(preview.marks, 4);
  assert.equal(preview.members, 4);
  // The one with an address is never offered for deletion; the three the
  // roster could not see are.
  assert.deepEqual(preview.deletable.map(t => t.name),
    ['Rani', 'Rossy', 'UniqBotz Infotech']);
});

test('a member with an address is counted and never offered for deletion', () => {
  const preview = resetPreview(
    [row('m-1', 'Sumathi')],
    [{ id: 'm-1', emails: [{ address: 's@example.com' }] }],
    YODA, DAY,
  );
  assert.equal(preview.members, 1);
  assert.deepEqual(preview.deletable, []);
});

test('another course’s rows on the same day are not touched', () => {
  const preview = resetPreview(
    [row('m-1', 'Rani'), row('m-2', 'Rohini', DAY, 'course-postnatal')],
    [], YODA, DAY,
  );
  assert.equal(preview.marks, 1);
  assert.deepEqual(preview.deletable.map(t => t.name), ['Rani']);
});

test('the same course on another day is not touched', () => {
  const preview = resetPreview(
    [row('m-1', 'Rani'), row('m-1', 'Rani', '2026-09-07')],
    [], YODA, DAY,
  );
  assert.equal(preview.marks, 1);
});

test('her marks on other days are counted, because the delete reaches them', () => {
  const preview = resetPreview(
    [
      row('m-1', 'Rani'),
      row('m-1', 'Rani', '2026-09-07'),
      row('m-1', 'Rani', '2026-09-01'),
      // the same other day twice is still ONE other day
      row('m-1', 'Rani', '2026-09-01', 'course-postnatal'),
    ],
    [], YODA, DAY,
  );
  assert.equal(preview.deletable[0].other_days, 2);
});

test('two rows for one member on the day count as one member and two marks', () => {
  const preview = resetPreview([row('m-1', 'Rani'), row('m-1', 'Rani')], [], YODA, DAY);
  assert.equal(preview.marks, 2);
  assert.equal(preview.members, 1);
});

test('no day, no course, or an unreadable date offers nothing', () => {
  const rows = [row('m-1', 'Rani')];
  assert.deepEqual(resetPreview(rows, [], YODA, null), { marks: 0, members: 0, keeping: 0, deletable: [] });
  assert.deepEqual(resetPreview(rows, [], null, DAY), { marks: 0, members: 0, keeping: 0, deletable: [] });
  assert.deepEqual(resetPreview(rows, [], YODA, '8 Sept'), { marks: 0, members: 0, keeping: 0, deletable: [] });
});

/* --------------------------------------------------------- what it says */

test('the reset states the with-email half FIRST, and by name', () => {
  // "it should ask the attendance will be reset for members with email" --
  // the requester. A total of four members cannot say which of them merely
  // lose a mark and which are about to be deleted, so the two are separate
  // sentences and this is the first of them.
  assert.equal(
    resetWarning({ marks: 4, members: 4, keeping: 1, deletable: [] }, 'Tue 8 Sept'),
    'Attendance will be reset for 1 member with an email — they stay on the course '
    + 'and read Yet to mark. This clears 4 marks on Tue 8 Sept, and the day goes back '
    + 'to awaiting a file so it can be uploaded again.');
});

test('plurals read as plurals', () => {
  assert.equal(
    resetWarning({ marks: 3, members: 3, keeping: 2, deletable: [] }, 'Mon 7 Sept'),
    'Attendance will be reset for 2 members with an email — they stay on the course '
    + 'and read Yet to mark. This clears 3 marks on Mon 7 Sept, and the day goes back '
    + 'to awaiting a file so it can be uploaded again.');
});

test('a day whose whole register is addressless does not claim a with-email half', () => {
  assert.equal(
    resetWarning({ marks: 3, members: 3, keeping: 0, deletable: [] }, 'Mon 7 Sept'),
    'No member on this day has an email on file. This clears 3 marks on Mon 7 Sept, '
    + 'and the day goes back to awaiting a file so it can be uploaded again.');
});

test('a day with nothing recorded says so rather than offering a reset of nothing', () => {
  assert.equal(
    resetWarning({ marks: 0, members: 0, keeping: 0, deletable: [] }, 'Wed 9 Sept'),
    'Nothing is recorded for Wed 9 Sept, so there is nothing to reset.');
});

/* ------------------------------------------------- the permanent half */

const target = (name: string, other_days = 0): ResetTarget =>
  ({ member_id: `m-${name}`, name, has_email: false, other_days });

test('nothing ticked says nothing — the delete half simply is not drawn', () => {
  assert.equal(deleteWarning([]), null);
});

test('the warning describes what is TICKED, not what was offered', () => {
  // Three were offered; one is ticked, and the sentence is about her alone.
  assert.equal(deleteWarning([target('Rani')]),
    'Rani is deleted outright — permanently, with every record of theirs. '
    + 'They have attendance on no other day. This cannot be undone.');
});

test('a member’s marks on other days are named, because the hard delete takes them', () => {
  assert.equal(deleteWarning([target('Rani', 1)]),
    'Rani is deleted outright — permanently, with every record of theirs. '
    + 'This also removes 1 mark on another day. This cannot be undone.');
});

test('several ticked are counted, and their other days are totalled', () => {
  assert.equal(deleteWarning([target('Rani', 2), target('Rossy', 1), target('UniqBotz Infotech')]),
    '3 members with no email are deleted outright — permanently, with every record of theirs. '
    + 'This also removes 3 marks on other days. This cannot be undone.');
});

test('several ticked with nothing elsewhere do not borrow a singular', () => {
  assert.equal(deleteWarning([target('Rani'), target('Rossy')]),
    '2 members with no email are deleted outright — permanently, with every record of theirs. '
    + 'They have attendance on no other day. This cannot be undone.');
});

/* --------------------------------------------------------- what happened */

test('the outcome says what moved and that the day is awaiting again', () => {
  assert.deepEqual(resetOutcome({ cleared: 4, deleted: 3 }, 'Tue 8 Sept'),
    { message: 'Tue 8 Sept: 4 marks cleared, 3 members deleted. The day is awaiting a file again.',
      tone: 'ok' });
});

test('clearing without deleting says only what it did', () => {
  assert.deepEqual(resetOutcome({ cleared: 1, deleted: 0 }, 'Tue 8 Sept'),
    { message: 'Tue 8 Sept: 1 mark cleared. The day is awaiting a file again.', tone: 'ok' });
});

test('a reset that moved nothing reads as warn, and says so in words', () => {
  // Guardrail 3: the tone is never the only signal.
  const outcome = resetOutcome({ cleared: 0, deleted: 0 }, 'Wed 9 Sept');
  assert.equal(outcome.tone, 'warn');
  assert.equal(outcome.message, 'Nothing was recorded for Wed 9 Sept, so nothing changed.');
});

test('a failure says the reason and that nothing was cleared', () => {
  assert.equal(resetFailure(new Error('The register is locked.')),
    'The register is locked. Nothing was cleared.');
  assert.equal(resetFailure('something odd'),
    'The reset did not run. Nothing was cleared.');
});
