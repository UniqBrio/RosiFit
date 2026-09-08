import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "On uploading attendance csv file the data is reflecting on members card
 *  only after refresh."
 *
 * THE RULE. Every write announces itself, and every mounted list refetches
 * when it hears -- that is what onMembersChanged and onAttendanceChanged are
 * for, and setAttendance fires BOTH because the register moving and the
 * per-member figures derived from it moving are one event.
 *
 * The CSV import was the one write that said nothing. It is committed by an
 * Edge Function through src/data/api.ts, which never touches repository.ts,
 * so no listener heard it: the Members tab kept the figures it had loaded
 * before the upload until something remounted it, and an import whose numbers
 * do not appear reads exactly like an import that did nothing.
 *
 * WHAT IS ASSERTED HERE. repository.ts and app/upload.tsx cannot be imported
 * in this runner -- they pull in the Supabase client and expo-router -- so
 * the wiring is asserted on the source, the way importCourseScope.test.ts
 * asserts on the Edge Function it cannot run. Two claims, each able to be
 * lost on its own: that the announcement covers both lists, and that the
 * commit path actually makes it.
 *
 * One assertion per test, so a failure names its own claim.
 */

const ROOT = process.env.IMPORT_REVALIDATE_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => {
  const full = path.join(ROOT, rel);
  assert.ok(fs.existsSync(full),
    `${ROOT} is not the repository root: no ${rel}. Run from the root, or set IMPORT_REVALIDATE_SPEC_ROOT.`);
  return fs.readFileSync(full, 'utf8');
};

/** The body of a named top-level function, up to the brace in column one. */
function functionBody(source: string, signature: string): string {
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, `${signature} is not in the file`);
  const open = source.indexOf('{', start);
  const end = source.slice(open).search(/[\r\n]\}/);
  assert.notEqual(end, -1, `${signature} has no closing brace`);
  return source.slice(open, open + end);
}

test('the import announcement revalidates the register AND the member figures', () => {
  // Attendance alone would move the day strip and leave the member card's
  // Missed count beside it unchanged -- two answers to one question on one
  // screen, which is the same complaint wearing the other face.
  const body = functionBody(read('src/data/repository.ts'),
    'export function attendanceImported()');
  assert.ok(body.includes('attendanceChanged()') && body.includes('membersChanged()'),
    'attendanceImported must fire attendanceChanged() and membersChanged(): '
    + `it fires ${body.includes('attendanceChanged()') ? 'attendance' : 'neither'} only`);
});

test('a committed CSV import announces itself', () => {
  // The announcement sits on the success path only: a commit that threw wrote
  // nothing, and telling every list to refetch after it would be asking them
  // to re-read what has not changed.
  const upload = read('app/upload.tsx');
  const commit = upload.indexOf('await csvCommit(');
  assert.notEqual(commit, -1, 'app/upload.tsx no longer commits an import');
  const done = upload.indexOf("setPhase('done')", commit);
  assert.notEqual(done, -1, 'the commit no longer finishes at the done phase');
  assert.ok(upload.slice(commit, done).includes('attendanceImported()'),
    'nothing between csvCommit and the result screen tells the member list to '
    + 'refetch, so the cards keep what they read before the upload');
});
