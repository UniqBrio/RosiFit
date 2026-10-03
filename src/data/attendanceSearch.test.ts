import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { matchesAttendanceQuery } from './memberSearch';

// ATTENDANCE SEARCH FINDS A MEMBER BY ANY NAME THEY ARE KNOWN BY
// (the academy, 01-Oct-2026: "enable search by display name as well and update
// the placeholder"). The box matched the name only, while saying "or code".

const ROOT = process.env.ATTENDANCE_SEARCH_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const row = {
  member: 'Divya Ramesh', code: 'RF-000102',
  aliases: ['Divya R', 'DR Phone'], emails: ['divya.r@gmail.com'],
};

test('a row is found by name, Google Meet display name, email or code -- case and spaces ignored', () => {
  assert.ok(matchesAttendanceQuery(row, 'ramesh'));
  assert.ok(matchesAttendanceQuery(row, '  dr phone '), 'a display name');
  assert.ok(matchesAttendanceQuery(row, 'DIVYA.R@GMAIL'), 'an email');
  assert.ok(matchesAttendanceQuery(row, 'rf-000102'), 'the code the box used to promise');
  assert.ok(matchesAttendanceQuery(row, ''), 'no query is not a filter');
  assert.ok(!matchesAttendanceQuery(row, 'shazia'));
});

test('a row built without the search fields is still found by name', () => {
  assert.ok(matchesAttendanceQuery({ member: 'Shazia Begum' }, 'begum'));
  assert.ok(!matchesAttendanceQuery({ member: 'Shazia Begum' }, 'shazia.b@'));
});

test('the Attendance screen uses it, says so, and the read carries the fields', () => {
  const screen = read('app/(tabs)/attendance.tsx');
  assert.match(screen, /matchesAttendanceQuery\(r, q\)/);
  assert.match(screen, /placeholder="Search by name, display name or email"/);
  const repo = read('src/data/repository.ts');
  assert.match(repo, /from\('member_aliases'\)\.select\('id, member_id, alias_display'\)/);
  assert.match(repo, /aliases: aliasesBy\.get\(r\.member_id as string\) \?\? \[\]/);
  assert.match(repo, /emails: emailsBy\.get\(r\.member_id as string\) \?\? \[\]/);
});

// Appended 03-Oct-2026: the course screen's attendance roster searches the same
// way ("the correction ... is still not reflecting in app" -- the academy). The
// roster box matched name and email only, under "Search by name or email".
test('the course roster search uses the same rule and says so', () => {
  const screen = read('app/course/[id].tsx');
  assert.match(screen, /return members\.filter\(m => matchesAttendanceQuery\(\{\s*member: m\.name, code: m\.code, aliases: m\.aliases,/);
  assert.match(screen, /testID="course-member-search"[\s\S]{0,120}placeholder="Search by name, display name or email"/);
});
