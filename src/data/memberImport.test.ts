import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateMemberRows, normalizeForMatch, MEMBER_IMPORT_COLUMNS, MEMBER_IMPORT_HELP,
  MEMBER_IMPORT_MAX_ROWS, MEMBER_IMPORT_MAX_BYTES,
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
  today: '2026-09-04',
  ...over,
});

/** A row the way the workbook parser hands it over. */
let n = 1;
const row = (over: Partial<MemberImportRow> & { full_name: string }): MemberImportRow => ({
  row: ++n, email: '', course: '', branch: '', aliases: [], joined_on: '', ...over,
});
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

test('a malformed address is blocked; a BLANK one is not (C-76)', () => {
  const v = validateMemberRows([
    row({ full_name: 'Anitha', email: 'not-an-email' }), row({ full_name: 'Divya' }),
  ], ctx());
  assert.deepEqual(v.map(x => x.state), ['blocked', 'ready']);
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

test('a joining date in the future is blocked; a blank one is not (blank means today)', () => {
  const v = validateMemberRows([
    row({ full_name: 'Anitha', joined_on: '2026-09-05' }), row({ full_name: 'Divya' }),
  ], ctx());
  assert.deepEqual(v.map(x => x.state), ['blocked', 'ready']);
});

test('a date that is not a date says the shape it wants', () => {
  const v = validateMemberRows([row({ full_name: 'Anitha', joined_on: '01/09/2026' })], ctx());
  assert.match(reason(v[0]), /YYYY-MM-DD/);
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
