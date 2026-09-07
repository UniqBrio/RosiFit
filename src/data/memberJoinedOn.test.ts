/**
 * LOADING and SAVING an existing member, on the one field that had neither.
 *
 * Run: npx tsx --test src/data/memberJoinedOn.test.ts
 *
 * THE DEFECT
 *   Opening a member from her course showed "Joined on" empty, on every
 *   member, however long she had been on the register. The date was in the
 *   database and in the SELECT; it was thrown away one line later.
 *   `fetchMembers` mapped `members.joined_on` straight to `joined`, a
 *   FORMATTED MONTH ("Mar 2026"), and the record carried nothing else. A
 *   month is not a date: the form's date row can only open on `yyyy-mm-dd`,
 *   so it opened on nothing, and the seeding effect -- which fills every
 *   other field from her record -- had no field to fill.
 *
 * THE FIX, in three parts, one test group each below
 *   1. the read carries the STORED date (`joinedOn`) as well as its label,
 *      and the label is DERIVED from it by one function, so the two cannot
 *      drift apart;
 *   2. the form seeds `joined` from `existing.joinedOn`, in the same
 *      once-only effect as her name, her course and her status;
 *   3. saving her cannot clear or overwrite it, because no save carries a
 *      joining date at all -- `update_member` (0027) takes no `p_joined_on`,
 *      `MemberUpdate` omits it by construction, and the offline store writes
 *      a named list of fields that does not include it.
 *
 * Parts 2 and 3 read source rather than rendering, the way
 * addMemberStatusShown.test.ts and addMemberBranchDefault.test.ts do: there
 * is no component harness in this project, and the claim is about which
 * fields a form seeds and which fields a save sends -- both of which are
 * exactly the shape of the code.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { joinedLabel } from './period';
import { MEMBERS } from './mock';

const ROOT = process.env.MEMBER_JOINED_SPEC_ROOT ?? process.cwd();
const FORM = 'app/member/edit.tsx';
const REPO = 'src/data/repository.ts';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('the spec is looking at a real tree', () => {
  for (const rel of [FORM, REPO]) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)),
      `${ROOT} is not the repository root: no ${rel}. Run from the root, or set MEMBER_JOINED_SPEC_ROOT.`);
  }
});

/* ------------------------------------------------ 1. the record carries it */

test('the label is derived from the stored date, and says so in one voice', () => {
  assert.equal(joinedLabel('2026-03-14'), 'Mar 2026');
  assert.equal(joinedLabel('2025-11-01'), 'Nov 2025');
  // The day is deliberately dropped from the LABEL -- precision nobody asked
  // for under a name -- which is exactly why the date has to be carried too.
  assert.equal(joinedLabel('2026-03-01'), joinedLabel('2026-03-31'));
});

test('no date on record reads as "not recorded", not as an unknown day', () => {
  assert.equal(joinedLabel(null), '—');
  assert.equal(joinedLabel(''), '—');
  // A half-typed date is not a date, and must not be shown as one.
  assert.equal(joinedLabel('2026-03'), '—');
});

test('the label is the same on every device', () => {
  // This was `toLocaleDateString`, which writes a different month name per
  // locale; the register writes one. A fixed answer here is what lets the
  // fixture check below be a check rather than a coin toss.
  const before = process.env.LANG;
  process.env.LANG = 'de_DE.UTF-8';
  try {
    assert.equal(joinedLabel('2026-03-14'), 'Mar 2026');
  } finally {
    if (before === undefined) delete process.env.LANG; else process.env.LANG = before;
  }
});

test('every fixture member states one joining date, twice, consistently', () => {
  for (const m of MEMBERS) {
    assert.equal(joinedLabel(m.joinedOn), m.joined,
      `${m.name}: her date (${m.joinedOn}) and her label (${m.joined}) disagree`);
  }
});

test('the live read carries the column itself, not only its label', () => {
  const src = read(REPO);
  assert.match(src, /select\('id, member_code, full_name, status,[^']*joined_on/,
    'fetchMembers must still ask for joined_on');
  assert.match(src, /joinedOn: \(m\.joined_on as string \| null\) \?\? null,/,
    'fetchMembers must carry the stored date onto the member record');
  assert.match(src, /joined: joinedLabel\(/,
    'the label must be derived by joinedLabel, not formatted a second time here');
  assert.equal(src.split('joinedOn: (m.joined_on as string | null) ?? null,').length - 1, 1,
    'the column is carried once: two mappings are two places for it to differ');
});

/* -------------------------------------------------------- 2. LOADING her */

/** The once-only seeding effect, from its guard to its `setSeeded(true)`. */
function seedingEffect(src: string): string {
  const open = src.indexOf('if (seeded || !existing) return;');
  assert.notEqual(open, -1, 'the form no longer has a once-only seeding guard');
  const close = src.indexOf('setSeeded(true);', open);
  assert.notEqual(close, -1, 'the seeding effect never marks itself seeded');
  return src.slice(open, close);
}

test('opening an existing member seeds Joined on from her record', () => {
  const block = seedingEffect(read(FORM));
  assert.match(block, /setJoined\(existing\.joinedOn \?\? ''\)/,
    'the seeding effect must fill the joining date from her record, as it fills every other field');
});

test('her joining date is seeded from the stored date, never from today', () => {
  const block = seedingEffect(read(FORM));
  assert.doesNotMatch(block, /setJoined\([^)]*new Date\(\)/,
    "today's date on a member who joined last year reads as a fact it isn't");
  // The Add form is the one that may default to today, and it still does.
  assert.match(read(FORM), /useState\(editing \? '' : iso\(new Date\(\)\)\)/,
    'the Add form still opens on today');
});

test('the row is shown, and shown as not editable, on the Edit form', () => {
  const src = read(FORM);
  const row = src.slice(src.indexOf('<DateField label="Joined on"'));
  assert.notEqual(row.length, 0, 'the form no longer has a Joined on row');
  assert.match(row.slice(0, 600), /readOnly=\{Boolean\(editing\)\}/,
    'the Edit form must show the date without offering a picker for it — '
    + 'update_member takes no joining date, so an editable row would discard what it was told');
  assert.match(row.slice(0, 600), /testID="member-joined-on"/,
    'the row a reviewer looks for must stay findable by testID');
});

/* -------------------------------------------------------- 3. SAVING her */

/** The `update_member` RPC call, from its name to the closing brace. */
function updateRpcArgs(src: string): string {
  const open = src.indexOf("supabase.rpc('update_member', {");
  assert.notEqual(open, -1, 'updateMember no longer calls the update_member RPC');
  const close = src.indexOf('});', open);
  assert.notEqual(close, -1, 'the update_member call is never closed');
  return src.slice(open, close);
}

test('saving an existing member sends no joining date, so none can be lost', () => {
  const src = read(REPO);
  assert.doesNotMatch(updateRpcArgs(src), /joined_on/,
    'update_member (0027) takes no p_joined_on: sending one would be a write path '
    + 'that could rewrite the day every session she was ever expected at is counted from');
  assert.match(src, /export type MemberUpdate = Omit<MemberInput, 'joined_on'> & \{ id: string \}/,
    'the update input must omit joined_on by construction, not by remembering to leave it out');
});

test('the offline store leaves her joining date exactly as it found it', () => {
  const src = read(REPO);
  const open = src.indexOf('export async function updateMember');
  assert.notEqual(open, -1, 'updateMember is gone');
  const body = src.slice(open, src.indexOf('supabase.rpc(', open));
  assert.match(body, /\.\.\.MEMBERS\[i\],/,
    'the offline update must start from her existing record');
  assert.doesNotMatch(body, /^\s*joinedOn:/m,
    'a save that assigns joinedOn is a save that can overwrite it');
  assert.doesNotMatch(body, /^\s*joined:/m,
    'a save that assigns the label is a save that can contradict the date');
});

test('the form only ever sends a joining date when it is creating her', () => {
  const src = read(FORM);
  const sends = [...src.matchAll(/joined_on:/g)];
  assert.equal(sends.length, 1, 'exactly one call may carry a joining date');
  // ...and it is the create. The window is measured back from the argument
  // to the call it belongs to.
  const before = src.slice(0, sends[0].index);
  assert.match(before.slice(-400), /await createMember\(\{/,
    'the joining date may only be sent by createMember — an update that carried one '
    + 'would write the blank field over the date she actually joined on');
});
