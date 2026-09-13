import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  validateMemberRows,
  type MemberImportRow, type ValidationContext, type ExistingMember,
} from './memberImport';

/**
 * "Same member can be added with same name email and display name in other
 *  course do not restrict user to add them as member in another course. But
 *  one course cannot have duplicate. A member with same display name and email
 *  and display can be added as new member in another course if he is not
 *  present in that course but if he is present in that course show as
 *  duplicate"
 *
 * THE RULE. A duplicate is a duplicate OF A COURSE. The same name, display
 * name and address may be added again for a course this person is not already
 * in, and may not be added twice to one course. All three checks survive at
 * full strength inside a course -- any one of them matching is a duplicate --
 * and all three stop looking outside it.
 *
 * WHAT "NOT PRESENT IN THAT COURSE" MEANS, and why it is not a new decision.
 * It is `splitByCourse`'s answer, already shipped and already tested
 * (importCourseScope.test.ts): a member whose LIVE enrolment is in another
 * course is not a candidate here, and a member with NO live enrolment is --
 * "nothing contradicts this course for her, and creating a second record for a
 * woman already on the register would be inventing a duplicate to avoid a
 * collision that does not exist". Adopting it means the add paths and the
 * attendance matcher cannot drift into two answers about who somebody is.
 *
 * WHAT IS ASSERTED HERE, in three parts, because the rule lives in three
 * places and each can be loosened on its own:
 *
 *   THE CLIENT RULE, imported and run. validateMemberRows is pure.
 *
 *   THAT THE SERVER CARRIES IT TOO. The migration cannot be executed here
 *   (no Postgres under node, ADR 005), so its wiring is asserted on the
 *   source, the way importCourseScope.test.ts asserts on the Edge Function it
 *   cannot import.
 *
 *   THAT THE ACADEMY-WIDE RULE IS ACTUALLY GONE. A migration that adds the
 *   course-scoped check but leaves the unique indexes standing would refuse
 *   exactly as before, and every assertion above it would still pass.
 *
 * The SAME-course half of the rule is asserted in memberImport.test.ts, where
 * it has been asserted since the import shipped. Those specs are untouched:
 * they were always same-course clashes, and they still refuse.
 */

const ROOT = process.env.COURSE_SCOPE_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => {
  const full = path.join(ROOT, rel);
  assert.ok(fs.existsSync(full),
    `${ROOT} is not the repository root: no ${rel}. Run from the root, or set COURSE_SCOPE_SPEC_ROOT.`);
  return fs.readFileSync(full, 'utf8');
};

const MIGRATION = 'supabase/migrations/0071_duplicate_is_per_course.sql';

const YOGA = 'Yoga Flow';
const PRENATAL = 'Prenatal Flow';

const ctx = (existing: ExistingMember[], defaultCourse = YOGA): ValidationContext => ({
  existing,
  offerings: [{ course: YOGA, branch: 'Velachery' },
              { course: PRENATAL, branch: 'Anna Nagar' }],
  defaultCourse,
  defaultBranch: defaultCourse === YOGA ? 'Velachery' : 'Anna Nagar',
});

/** Somebody on the register. `course: null` is no live enrolment at all. */
const member = (over: Partial<ExistingMember>): ExistingMember =>
  ({ name: 'Divya Ramesh', aliases: [], emails: [], course: YOGA, ...over });

let n = 100;
const row = (over: Partial<MemberImportRow> & { full_name: string }): MemberImportRow => {
  const r = ++n;
  return { row: r, email: `m${r}@example.com`, course: '', branch: '', aliases: [], ...over };
};
const reason = (v: ReturnType<typeof validateMemberRows>[number]) => (v as { reason: string }).reason;

// ------------------------------------------------- the requester's own case
test('the requester\'s case: the same person joins a SECOND course and is not refused', () => {
  const [v] = validateMemberRows(
    [row({ full_name: 'Divya Ramesh', email: 'divya@example.com',
           aliases: ['Divya R'], course: PRENATAL })],
    ctx([member({ name: 'Divya Ramesh', emails: ['divya@example.com'],
                  aliases: ['Divya R'], course: YOGA })]));
  assert.equal(v.state, 'ready',
    `name, address AND display name all match a member of another course, and none of them is this course's business: ${reason(v)}`);
});

test('and is still refused for the course they are already in', () => {
  const [v] = validateMemberRows(
    [row({ full_name: 'Divya Ramesh', email: 'divya@example.com', course: YOGA })],
    ctx([member({ name: 'Divya Ramesh', emails: ['divya@example.com'], course: YOGA })]));
  assert.equal(v.state, 'blocked');
});

// ------------------------------------------------------- one key at a time
test('a NAME held by a member of another course does not block', () => {
  const [v] = validateMemberRows([row({ full_name: 'Divya Ramesh', course: PRENATAL })],
    ctx([member({ name: 'Divya Ramesh', course: YOGA })]));
  assert.equal(v.state, 'ready');
});

test('a NAME held by a member of this course blocks, and is counted as skipped', () => {
  const [v] = validateMemberRows([row({ full_name: 'Divya Ramesh', course: YOGA })],
    ctx([member({ name: 'Divya Ramesh', course: YOGA })]));
  assert.equal((v as { kind?: string }).kind, 'duplicate');
});

test('a DISPLAY NAME held by a member of another course does not block', () => {
  const [v] = validateMemberRows([row({ full_name: 'Someone New', aliases: ['Divya R'], course: PRENATAL })],
    ctx([member({ aliases: ['Divya R'], course: YOGA })]));
  assert.equal(v.state, 'ready');
});

test('a DISPLAY NAME held by a member of this course still blocks', () => {
  const [v] = validateMemberRows([row({ full_name: 'Someone New', aliases: ['Divya R'], course: YOGA })],
    ctx([member({ aliases: ['Divya R'], course: YOGA })]));
  assert.match(reason(v), /already belongs to another member/);
});

test('an ADDRESS held by a member of another course does not block', () => {
  const [v] = validateMemberRows([row({ full_name: 'Someone New', email: 'divya@example.com', course: PRENATAL })],
    ctx([member({ emails: ['divya@example.com'], course: YOGA })]));
  assert.equal(v.state, 'ready');
});

test('an ADDRESS held by a member of this course still blocks', () => {
  const [v] = validateMemberRows([row({ full_name: 'Someone New', email: 'divya@example.com', course: YOGA })],
    ctx([member({ emails: ['divya@example.com'], course: YOGA })]));
  assert.match(reason(v), /already on another member/);
});

// ------------------------------------------- the member who is in no course
test('a member with NO live enrolment blocks in EVERY course — splitByCourse\'s own answer', () => {
  // Not an edge case: it is how 22_bulk_import_members.sql's Kavitha Ramesh
  // sits on the register, and it is what stops this change turning "already
  // there, enrolled nowhere" into a second record for the same person.
  for (const course of [YOGA, PRENATAL]) {
    const [v] = validateMemberRows([row({ full_name: 'Divya Ramesh', course })],
      ctx([member({ name: 'Divya Ramesh', course: null })]));
    assert.equal(v.state, 'blocked', `${course}: nothing contradicts this course for them`);
  }
});

// ------------------------------------------------------ twice in one file
test('one file may carry the same person once per course', () => {
  const v = validateMemberRows([
    row({ full_name: 'Divya Ramesh', email: 'divya@example.com', aliases: ['Divya R'], course: YOGA }),
    row({ full_name: 'Divya Ramesh', email: 'divya@example.com', aliases: ['Divya R'], course: PRENATAL }),
  ], ctx([]));
  assert.deepEqual(v.map(x => x.state), ['ready', 'ready']);
});

test('but not twice for ONE course — the earlier row still claims it', () => {
  const v = validateMemberRows([
    row({ full_name: 'Divya Ramesh', course: YOGA }),
    row({ full_name: 'Divya Ramesh', course: YOGA }),
  ], ctx([]));
  assert.deepEqual(v.map(x => x.state), ['ready', 'blocked']);
});

test('a row naming a course nobody runs is told THAT, not that it is a duplicate', () => {
  // The checks moved below the course resolution, so this row can no longer
  // be filed `duplicate` on a course that does not exist.
  const [v] = validateMemberRows([row({ full_name: 'Divya Ramesh', course: 'Kickboxing' })],
    ctx([member({ name: 'Divya Ramesh', course: null })]));
  assert.equal((v as { kind?: string }).kind, 'no-course');
});

// --------------------------------------------------- the server carries it
test('the migration drops the academy-wide unique index on addresses', () => {
  assert.match(read(MIGRATION), /drop index if exists public\.member_emails_unique_live/,
    'member_emails_unique_live still stands, so the database refuses before any of the above is reached.');
});

test('the migration drops the academy-wide unique index on display names', () => {
  assert.match(read(MIGRATION), /drop index if exists public\.member_aliases_unique/,
    'member_aliases_unique still stands, so a display name is still academy-wide unique.');
});

test('the replacements are NOT unique — a plain index, or nothing has changed', () => {
  const src = read(MIGRATION);
  const replacements = src.match(/create (unique )?index if not exists (member_emails_email_live|member_aliases_lookup)/g) ?? [];
  assert.equal(replacements.length, 2, 'both replacement indexes must be created');
  assert.ok(!replacements.some(r => r.includes('unique')),
    'a UNIQUE replacement index would re-impose the academy-wide rule under a new name.');
});

test('both member write paths go through the course-scoped refusal', () => {
  const src = read(MIGRATION);
  for (const fn of ['create_member', 'update_member']) {
    assert.ok(new RegExp(`'${fn}'`).test(src) , `${MIGRATION} does not patch ${fn}.`);
  }
  assert.match(src, /perform public\.refuse_course_duplicate\(p_offering_id, p_full_name, p_emails, p_aliases, null\)/,
    'create_member must ask the course-scoped question before it writes.');
  assert.match(src, /perform public\.refuse_course_duplicate\(p_offering_id, p_full_name, p_emails, p_aliases, p_member_id\)/,
    'update_member must ask it too, excluding the member being edited.');
});

test('the bulk import\'s own name check is scoped to the course as well', () => {
  // It is the check that decides `skipped`, which is what the result screen
  // counts -- create_member would refuse the row anyway, but as `failed`.
  assert.match(read(MIGRATION), /public\.is_in_course\(m\.id, v_offering\)/,
    'bulk_import_members still skips on an academy-wide name match.');
});

test('the check-and-insert is serialised, because the unique indexes no longer do it', () => {
  assert.match(read(MIGRATION), /pg_advisory_xact_lock/,
    'without a lock, two concurrent adds can both pass the check and both write — which the unique index used to make impossible.');
});

test('the migration verifies its own anchors rather than hoping they matched', () => {
  const src = read(MIGRATION);
  assert.match(src, /does not contain the anchor this migration expects/,
    'a pg_get_functiondef rewrite that does not check its anchor can succeed while changing nothing (0061).');
});
