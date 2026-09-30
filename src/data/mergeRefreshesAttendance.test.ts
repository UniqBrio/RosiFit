import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "if we add them under existing member who were under no email with status
 * as present it still shows absent" (the academy, 30-Sep-2026).
 *
 * A merge MOVES ATTENDANCE: the stray's present lands on the member it is
 * merged into. The course screen's day chips (`useCourseDay`) and the member's
 * week (`useMemberWeek`) re-read on the ATTENDANCE signal only, so a merge
 * that announced a member change alone left the card reading Absent until
 * the screen was reopened. Both paths -- live and fixture -- must announce
 * both changes.
 *
 * Source-reading, like the other repository specs beside it: there is no
 * component harness in this project.
 */

const ROOT = process.env.MERGE_REFRESH_SPEC_ROOT ?? process.cwd();
const REPO = 'src/data/repository.ts';
const read = () => fs.readFileSync(path.join(ROOT, REPO), 'utf8');

function mergeBody(src: string): string {
  const start = src.indexOf('export async function mergeMemberInto(');
  assert.ok(start >= 0, 'mergeMemberInto must still be the merge path');
  const end = src.indexOf('\nexport ', start + 10);
  return src.slice(start, end < 0 ? undefined : end);
}

test('the live merge announces the attendance it moved, after the write lands', () => {
  const body = mergeBody(read());
  const rpc = body.indexOf("rpc('merge_member_into'");
  assert.ok(rpc >= 0, 'the live path must call merge_member_into');
  const after = body.slice(rpc);
  assert.match(after, /membersChanged\(\);/, 'the member list must still be told');
  assert.match(after, /attendanceChanged\(\);/,
    'the day register must be told too, or the merged-into member keeps reading Absent');
});

test('and so does the fixture merge, so the two stores tell one story', () => {
  const body = mergeBody(read());
  const rpc = body.indexOf("rpc('merge_member_into'");
  const fixture = body.slice(0, rpc);
  assert.match(fixture, /membersChanged\(\);\s*attendanceChanged\(\);/,
    'the fixture path must announce both changes');
});
