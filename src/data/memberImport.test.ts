import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateMemberRows, normalizeForMatch, tallyImport, MEMBER_IMPORT_COLUMNS, MEMBER_IMPORT_HELP,
  MEMBER_IMPORT_MAX_ROWS, MEMBER_IMPORT_MAX_BYTES, MEMBER_IMPORT_HEADERS,
  canonicalColumn, splitAliases, NAME_MIN, NAME_MAX, ALIAS_MAX, EMAIL_MAX,
  type MemberImportRow, type ValidationContext,
} from './memberImport';

const ctx = (over: Partial<ValidationContext> = {}): ValidationContext => ({
  existingNames: new Set<string>(),
  existingAliases: new Set<string>(),
  existingEmails: new Set<string>(),
  offerings: [{ course: 'Yoga Flow', branch: 'Velachery' },
              { course: 'Prenatal Flow', branch: 'Anna Nagar' }],
  defaultCourse: 'Yoga Flow',
  defaultBranch: 'Velachery',
  ...over,
});

/**
 * A row the way the workbook parser hands it over.
 *
 * THE DEFAULT ADDRESS IS PART OF THE FIXTURE, and it is a different one on
 * every row. An address is REQUIRED of every row now, and it is unique
 * academy-wide, so a helper that defaulted to `''` -- or to one shared address
 * -- would make every spec below fail on the email rule before it ever reached
 * the thing it was written to test. Each spec still isolates its own variable;
 * a spec about the email rule states the address itself.
 */
let n = 1;
const row = (over: Partial<MemberImportRow> & { full_name: string }): MemberImportRow => {
  const r = ++n;
  return { row: r, email: `m${r}@example.com`, course: '', branch: '', aliases: [], ...over };
};
const reason = (v: ReturnType<typeof validateMemberRows>[number]) => (v as { reason: string }).reason;

// --------------------------------------------------------- the verdicts

test('a good row is ready, and inherits the course it was opened from', () => {
  const [v] = validateMemberRows([row({ full_name: 'Anitha Rajesh', email: 'a@b.com' })], ctx());
  assert.equal(v.state, 'ready');
  assert.equal(v.row.course, 'Yoga Flow');
  assert.equal(v.row.branch, 'Velachery');
});

test('ONE bad row does not cost the others — the partial-failure rule (plan §15.2)', () => {
  const v = validateMemberRows([
    row({ full_name: 'Anitha Rajesh' }), row({ full_name: '' }), row({ full_name: 'Divya B' }),
  ], ctx());
  assert.deepEqual(v.map(x => x.state), ['ready', 'blocked', 'ready']);
});

test('a member already on the register is blocked, named, and told she will be SKIPPED', () => {
  // The reference skips a duplicate rather than overwriting; saying so before
  // the tap is what stops the count surprising anyone.
  const v = validateMemberRows([row({ full_name: 'Divya  Ramesh' })],
    ctx({ existingNames: new Set(['divya ramesh']) }));
  assert.equal(v[0].state, 'blocked');
  assert.match(reason(v[0]), /already on the register/);
  assert.match(reason(v[0]), /skipped/);
});

test('the same person twice in one file is caught, and only the FIRST imports', () => {
  const v = validateMemberRows([row({ full_name: 'Anitha Rajesh' }), row({ full_name: 'anitha  rajesh' })], ctx());
  assert.deepEqual(v.map(x => x.state), ['ready', 'blocked']);
  assert.match(reason(v[1]), /appears earlier in this file/);
});

test('a display name already belonging to somebody else is blocked', () => {
  // member_aliases is UNIQUE academy-wide: one display name can never point
  // at two members, or an attendance import would have to guess.
  const v = validateMemberRows([row({ full_name: 'Anitha', aliases: ['Divya B'] })],
    ctx({ existingAliases: new Set(['divya b']) }));
  assert.equal(v[0].state, 'blocked');
  assert.match(reason(v[0]), /already belongs to another member/);
});

test('a duplicate display name WITHIN the file is blocked too', () => {
  const v = validateMemberRows([
    row({ full_name: 'Anitha', aliases: ['Anu'] }), row({ full_name: 'Divya', aliases: ['Anu'] }),
  ], ctx());
  assert.deepEqual(v.map(x => x.state), ['ready', 'blocked']);
});

test('an address already on another member is blocked', () => {
  const v = validateMemberRows([row({ full_name: 'Anitha', email: 'a@b.com' })],
    ctx({ existingEmails: new Set(['a@b.com']) }));
  assert.equal(v[0].state, 'blocked');
});

/**
 * AMENDED 06-Sep-2026: a blank address is blocked too, on the requester's
 * "make sure email is mandatory while uploading member".
 *
 * C-76 is NOT reversed by this. C-76 is about the ATTENDANCE import -- a
 * member the register already knows, who has no address on file: her
 * attendance still imports, she is still counted, and she is excluded from
 * sends with the reason shown. That is a member who is already there. This is
 * the file that CREATES her, which is the one moment the address can be asked
 * for at no cost to anybody, and the one place a hundred addressless members
 * arrive at once.
 */
test('a malformed address is blocked, and so is a BLANK one — the address is required', () => {
  const v = validateMemberRows([
    row({ full_name: 'Anitha', email: 'not-an-email' }), row({ full_name: 'Divya', email: '' }),
  ], ctx());
  assert.deepEqual(v.map(x => x.state), ['blocked', 'blocked']);
  assert.match(reason(v[1]), /No email in this row/);
});

/** The COUNT a row with no address lands in: Failed, not Skipped and not No
 *  course -- it is a row to fix in the file and import again. */
test('a row with no address is counted as Failed, and named as the reason', () => {
  const v = validateMemberRows([row({ full_name: 'Anitha', email: '' })], ctx());
  assert.equal(v[0].state, 'blocked');
  assert.equal((v[0] as { kind: string }).kind, 'invalid');
  assert.deepEqual(tallyImport(v, null),
    { imported: 0, skipped: 0, failed: 1, noCourse: 0, total: 1 });
});

/** A cell holding nothing but spaces is not an address either. The parser
 *  trims, so this is the row a hand-built file hands over. */
test('a whitespace-only address is no address', () => {
  const v = validateMemberRows([row({ full_name: 'Anitha', email: '   ' })], ctx());
  assert.equal(v[0].state, 'blocked');
});

test('a course that does not run at that branch says where it DOES run', () => {
  const v = validateMemberRows([row({ full_name: 'Anitha', course: 'Yoga Flow', branch: 'Anna Nagar' })], ctx());
  assert.equal(v[0].state, 'blocked');
  assert.match(reason(v[0]), /runs at Velachery/);
});

test('a course named without a branch resolves to the branch it runs at', () => {
  const v = validateMemberRows([row({ full_name: 'Anitha', course: 'prenatal flow' })], ctx());
  assert.equal(v[0].state, 'ready');
  assert.equal(v[0].row.branch, 'Anna Nagar');
});

test('a course nobody offers says to add it first', () => {
  const v = validateMemberRows([row({ full_name: 'Anitha', course: 'Kickboxing' })], ctx());
  assert.match(reason(v[0]), /no course called/);
});

test('no course anywhere — and not opened from one — is blocked', () => {
  const v = validateMemberRows([row({ full_name: 'Anitha' })], ctx({ defaultCourse: '', defaultBranch: '' }));
  assert.equal(v[0].state, 'blocked');
  assert.match(reason(v[0]), /not opened from one/);
});

/**
 * WAS: 'a joining date in the future is blocked; a blank one is not' and
 * 'a date that is not a date says the shape it wants'. Both asserted the
 * Joined On column, which the file no longer has -- every bulk-imported
 * member joins on the day she is imported (0028/0029 read a missing
 * joined_on as null; create_member coalesces null to current_date). The
 * assertion that replaces them is that no such column exists to get wrong.
 */
test('there is no joining date to get wrong — the column is gone', () => {
  assert.ok(!MEMBER_IMPORT_COLUMNS.includes('Joined On' as never),
    'Joined On is not a column any more');
  assert.ok(!MEMBER_IMPORT_HELP.some(h => /joined/i.test(h.column)),
    'and the help does not ask for one');
});

// -------------------------------------------------------- the constants

test('the help text covers every column, in order — one source for screen and template', () => {
  assert.deepEqual(MEMBER_IMPORT_HELP.map(h => h.column), [...MEMBER_IMPORT_COLUMNS]);
});

test('the ceilings are the reference’s: 500 rows, 5 MB', () => {
  assert.equal(MEMBER_IMPORT_MAX_ROWS, 500);
  assert.equal(MEMBER_IMPORT_MAX_BYTES, 5 * 1024 * 1024);
});

test('normalizeForMatch collapses the way the database does', () => {
  assert.equal(normalizeForMatch('Priya  R.'), 'priya r');
  assert.equal(normalizeForMatch('PRIYA R'), 'priya r');
});

// ------------------------------------------- the header hints and commas

test('a display-name cell is split on COMMAS, which is what the header asks for', () => {
  assert.deepEqual(splitAliases('Anitha R, Anitha,  Anitha Rajesh '),
    ['Anitha R', 'Anitha', 'Anitha Rajesh']);
});

test('a semicolon still splits — a file from the EARLIER template must not import one long alias', () => {
  // The old template asked for semicolons. Splitting only on commas would
  // have made "Anitha R;Anitha" a single display name matching nobody, and
  // one alias is a legal row, so nothing would have said so.
  assert.deepEqual(splitAliases('Anitha R;Anitha'), ['Anitha R', 'Anitha']);
});

test('an empty or all-separator cell yields no display names', () => {
  assert.deepEqual(splitAliases(''), []);
  assert.deepEqual(splitAliases(' , ; '), []);
});

test('the Display Names header says its shape, in brackets', () => {
  assert.match(MEMBER_IMPORT_HEADERS['Display Names'], /^Display Names \(/);
  assert.match(MEMBER_IMPORT_HEADERS['Display Names'], /comma/i);
});

test('every column has a header, and every header names its column back', () => {
  for (const c of MEMBER_IMPORT_COLUMNS) {
    assert.ok(MEMBER_IMPORT_HEADERS[c], `${c} has a header cell`);
    assert.equal(canonicalColumn(MEMBER_IMPORT_HEADERS[c]), c, `${c} reads back`);
  }
});

test('the BARE column name still names its column — files built from the earlier template', () => {
  for (const c of MEMBER_IMPORT_COLUMNS) assert.equal(canonicalColumn(c), c);
  assert.equal(canonicalColumn('  display names  '), 'Display Names', 'and case and space do not matter');
});

test('a header that is not one of ours is not forced into a column', () => {
  assert.equal(canonicalColumn('Phone'), null);
  assert.equal(canonicalColumn('Joined On'), null, 'the date column is not read any more');
  assert.equal(canonicalColumn(''), null);
});

// ------------------------------------------------------ the cell bounds

test('an address longer than the RFC ceiling is blocked before it reaches the database', () => {
  const long = `${'a'.repeat(EMAIL_MAX)}@example.com`;
  const v = validateMemberRows([row({ full_name: 'Anitha', email: long })], ctx());
  assert.equal(v[0].state, 'blocked');
  assert.match(reason(v[0]), new RegExp(String(EMAIL_MAX)));
});

test('a display name longer than a name is blocked, and named in the refusal', () => {
  const long = 'A'.repeat(ALIAS_MAX + 1);
  const v = validateMemberRows([row({ full_name: 'Anitha', aliases: [long] })], ctx());
  assert.equal(v[0].state, 'blocked');
  assert.match(reason(v[0]), /longer than/);
});

test('a name at each end of the bound is fine — the bounds are the column’s own (0006)', () => {
  const v = validateMemberRows([
    row({ full_name: 'A'.repeat(NAME_MIN) }),
    row({ full_name: 'B'.repeat(NAME_MAX) }),
    row({ full_name: 'C'.repeat(NAME_MAX + 1) }),
  ], ctx());
  assert.deepEqual(v.map(x => x.state), ['ready', 'ready', 'blocked']);
});

// --------------------------------------------- the four counts, and the kind

/**
 * Why the KIND is set where the refusal is, not read back out of the reason.
 *
 * Three of the four counts a person is shown can be reached without the
 * server ever seeing the row. Deriving the count from the reason SENTENCE
 * would make every one of them depend on the wording of a message, so a copy
 * edit would silently move a row from Failed to No course.
 */
test('a duplicate is kind "duplicate" — she is already there, so nothing happened to her', () => {
  const v = validateMemberRows([
    row({ full_name: 'Divya Ramesh' }),
    row({ full_name: 'Anitha' }), row({ full_name: 'anitha' }),
  ], ctx({ existingNames: new Set(['divya ramesh']) }));
  assert.deepEqual(v.map(x => (x as { kind?: string }).kind),
    ['duplicate', undefined, 'duplicate'],
    'already on the register, and the same person twice in one file');
});

test('a course we do not run is kind "no-course" — its own count, fixed in RosiFit not the file', () => {
  const v = validateMemberRows([
    row({ full_name: 'Anitha', course: 'Kickboxing' }),
    row({ full_name: 'Divya', course: 'Yoga Flow', branch: 'Anna Nagar' }),
    row({ full_name: 'Meera' }),
  ], ctx({ defaultCourse: '', defaultBranch: '' }));
  assert.deepEqual(v.map(x => (x as { kind?: string }).kind),
    ['no-course', 'no-course', 'no-course'],
    'no such course, not at that branch, and none named at all');
});

test('everything else is kind "invalid" — a row to fix in the file and import again', () => {
  const v = validateMemberRows([
    row({ full_name: 'A' }),
    row({ full_name: 'Anitha', email: 'not-an-email' }),
    row({ full_name: 'Divya', aliases: ['Taken'] }),
  ], ctx({ existingAliases: new Set(['taken']) }));
  assert.deepEqual(v.map(x => (x as { kind?: string }).kind),
    ['invalid', 'invalid', 'invalid']);
});

test('the tally merges BOTH halves — rows refused here never reached the server', () => {
  // The client half has no server verdict and the server half has no client
  // verdict beyond "ready", so neither on its own is the file.
  const v = validateMemberRows([
    row({ full_name: 'Anitha' }),                                  // ready, sent
    row({ full_name: 'Divya' }),                                   // ready, sent
    row({ full_name: 'Meera Krishnan' }),                          // duplicate
    row({ full_name: 'Kavya', course: 'Kickboxing' }),             // no course
    row({ full_name: 'Sita', email: '' }),                         // invalid
  ], ctx({ existingNames: new Set(['meera krishnan']) }));
  assert.deepEqual(v.map(x => x.state),
    ['ready', 'ready', 'blocked', 'blocked', 'blocked']);

  // what the server said about the two it was sent
  const result = {
    run_id: 'r', total: 2, inserted: 1, skipped: 1, failed: 0,
    rows: [
      { row: v[0].row.row, full_name: 'Anitha', status: 'inserted' as const },
      { row: v[1].row.row, full_name: 'Divya', status: 'skipped' as const, reason: 'already there' },
    ],
  };
  assert.deepEqual(tallyImport(v, result),
    { imported: 1, skipped: 2, failed: 1, noCourse: 1, total: 5 },
    'the server’s skip and the client’s duplicate are the same count');
});

test('the total is the FILE’s row count, never the count that was sent', () => {
  const v = validateMemberRows([
    row({ full_name: 'Anitha' }), row({ full_name: 'Divya', email: '' }),
  ], ctx());
  assert.equal(tallyImport(v, { run_id: 'r', total: 1, inserted: 1, skipped: 0, failed: 0, rows: [] }).total, 2);
});

test('a file in which nothing can be written tallies without a server result at all', () => {
  // Nothing is sent, so there is nothing to merge — the counts are the
  // verdicts, and they are still the whole answer.
  // The default course stays: a row is judged on its COURSE before its
  // address, so blanking the default would make both rows 'no-course' and the
  // spec would stop testing the merge it was written for.
  const v = validateMemberRows([
    row({ full_name: 'Anitha', email: '' }), row({ full_name: 'Divya', course: 'Kickboxing' }),
  ], ctx());
  assert.deepEqual(tallyImport(v, null),
    { imported: 0, skipped: 0, failed: 1, noCourse: 1, total: 2 });
});

test('an empty file tallies to nothing at all, not to a crash', () => {
  assert.deepEqual(tallyImport([], null),
    { imported: 0, skipped: 0, failed: 0, noCourse: 0, total: 0 });
});
