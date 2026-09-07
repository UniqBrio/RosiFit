import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "Enable multiple CSV files to be uploaded for the same course and the same
 *  day ... the files should be processed independently and their attendance
 *  data consolidated correctly ... this must not create duplicate attendance
 *  records or overwrite unrelated data."
 *
 * The behaviour itself is held by supabase/tests/34_multiple_files_same_day.sql,
 * which runs the commit against a real database and reads the register back.
 * What that spec CANNOT reach is the two places outside the database that have
 * to agree with it, and both are exactly the kind of thing a later edit
 * loosens without noticing:
 *
 *   THE SCOPE THE OVERRIDE IS KEYED ON. commit_csv_import replaces an earlier
 *   file's rows only when that file came from the same meeting INSTANCE -- the
 *   Meet code AND the created-on line (0044). Drop the timestamp half and the
 *   second call of the day silently erases the first again, which is the whole
 *   defect. Asserted on the migration text because the harness needs Postgres
 *   and this suite runs under plain node.
 *
 *   THE QUESTION THE OPERATOR IS ASKED. csv-import's preview decides
 *   `supersedes`, which is what puts "this file OVERRIDES that register" in
 *   front of her (src/data/uploadOverride.ts). Asked on a WIDER scope than the
 *   commit actually overrides on, it warns about something that will not
 *   happen -- in front of an ordinary second upload, which is how a person
 *   learns to click past the warning that matters.
 *
 *   THE WAY IN, from the day it is about. "Awaiting upload" is a state a day
 *   leaves the moment its first file lands, so gating the strip's press on it
 *   left the second export with no route in from that day.
 *
 * It reads source rather than rendering, for the reason
 * dayStripUploadButton.test.ts gives: there is no component harness here, and
 * these are claims about what is written where. One assertion per test, so a
 * failure names its own claim.
 */

const ROOT = process.env.MULTI_FILE_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => {
  const full = path.join(ROOT, rel);
  assert.ok(fs.existsSync(full),
    `${ROOT} is not the repository root: no ${rel}. Run from the root, or set MULTI_FILE_SPEC_ROOT.`);
  return fs.readFileSync(full, 'utf8');
};

const MIGRATION = 'supabase/migrations/0044_override_scoped_by_meeting_instance.sql';
const EDGE = 'supabase/functions/csv-import/index.ts';
const SCREEN = 'app/course/[id].tsx';

// ------------------------------------------------- the scope of the override
test('the migration that scopes the override to a meeting instance is present', () => {
  assert.ok(fs.existsSync(path.join(ROOT, MIGRATION)), `${MIGRATION} is gone`);
});

test('every clause that reaches an earlier file also asks its created-on line', () => {
  const sql = read(MIGRATION);
  // Three statements reconcile against a file that wrote before this one --
  // kept_by_hand, reverted, removed -- and each pairs the code with the
  // timestamp. Counting them is what catches two being updated and one left.
  const code = sql.match(/ci\.meeting_code is not distinct from v_import\.meeting_code/g) ?? [];
  const started = sql.match(
    /ci\.meeting_started_at is not distinct from v_import\.meeting_started_at/g) ?? [];
  assert.equal(started.length, code.length,
    `${started.length} of ${code.length} override clauses ask the created-on line`);
});

test('the override still reaches three statements, not fewer', () => {
  const sql = read(MIGRATION);
  const started = sql.match(
    /ci\.meeting_started_at is not distinct from v_import\.meeting_started_at/g) ?? [];
  assert.equal(started.length, 3,
    'kept_by_hand, reverted and removed are the three; one has lost its scope');
});

test('nothing here loosens one row per member per day', () => {
  const sql = read(MIGRATION);
  assert.match(sql, /on conflict \(session_id, member_id\) where deleted_at is null/,
    'the upsert no longer keys on attendance_unique_live -- a member can land twice');
});

test('a member an earlier file marked present is never swept back by the next one', () => {
  const sql = read(MIGRATION);
  // The absent sweep is what makes the register the UNION of its files. Turn
  // this into an update and every later file resets the day.
  assert.match(sql,
    /on conflict \(session_id, member_id\) where deleted_at is null do nothing;/,
    'the absent sweep no longer leaves an existing row alone');
});

// ------------------------------------------- the question asked before it runs
test('the preview asks for an earlier file on the same meeting code', () => {
  const edge = read(EDGE);
  assert.match(edge, /alreadyQuery\.eq\('meeting_code', meetingCode\)/,
    'the supersedes lookup no longer scopes by meeting code');
});

test('and on the same created-on line, so it matches what the commit overrides', () => {
  const edge = read(EDGE);
  assert.match(edge, /\.eq\('meeting_started_at', meetingStartedAt\)/,
    'the supersedes lookup is wider than the override: it will warn about a '
    + 'replacement that is not going to happen');
});

test('a file with no created-on line is compared against the others that have none', () => {
  const edge = read(EDGE);
  assert.match(edge, /\.is\('meeting_started_at', null\)/,
    'a code-less, timestamp-less file no longer finds its own earlier version');
});

test('the one thing a repeat upload is stopped for is the identical file', () => {
  const edge = read(EDGE);
  // By FINGERPRINT, which is a claim about the bytes and not about the day.
  // A guard keyed on the offering and the date instead would be the block
  // this change exists to remove.
  assert.match(edge, /\.eq\('file_sha256', fileSha256\)\.eq\('status', 'completed'\)/,
    'the repeat-upload guard no longer keys on the file fingerprint');
});

test('a day that already has a register is REPORTED to the screen, never refused', () => {
  const edge = read(EDGE);
  // `supersedes` leaves the preview as an answer the screen turns into a
  // question (uploadOverride.ts). The moment it becomes a throw, a second
  // meeting's file stops being uploadable at all.
  // \r? because this file is CRLF on disk and a spec that reads source has to
  // read what is actually there.
  assert.match(edge, /return json\(\{[\s\S]*?\r?\n {4}supersedes,\r?\n/,
    'supersedes is no longer returned to the screen as information');
});

// --------------------------------------------- the way in, from the day itself
test('a day that already has a register carries a press of its own', () => {
  const src = read(SCREEN);
  assert.match(src, /testID=\{`course-day-add-\$\{d\.iso\}`\}/,
    'no course-day-add-<iso> on the strip: an uploaded day has nothing to press again');
});

test('it is offered on a day that recorded something, not on an awaiting one', () => {
  const src = read(SCREEN);
  assert.match(src, /const second = d\.canUpload && \(d\.key === 'present' \|\| d\.key === 'absent'\)/,
    'the second-file press is no longer gated on the day having a register');
});

test('it asks the same question about WHEN a file may be attached', () => {
  const src = read(SCREEN);
  // Two derivations of "may this day take a file" is the defect uploadWindow
  // was written to end; a second one here would reopen it on the other branch.
  assert.match(src, /const second = d\.canUpload &&/,
    'the second-file press has its own week rule instead of d.canUpload');
});

test('the press keeps the date, so the file can still be asked about', () => {
  const src = read(SCREEN);
  const at = src.indexOf('testID={`course-day-add-${d.iso}`}');
  assert.match(src.slice(at, at + 400),
    /pathname: '\/upload', params: \{ courseId: course\.id, date: d\.iso \}/,
    'the second-file press has lost its date parameter, so a file from another day '
    + 'stops being asked about');
});

test('the two presses are exclusive, so no day shows both', () => {
  const src = read(SCREEN);
  assert.match(src, /const waiting = d\.key === 'awaiting' && d\.canUpload;/,
    'the awaiting gate has changed shape; `waiting` and `second` may now both be true');
});

test('an uploaded day still keeps its status icon in the cell', () => {
  const src = read(SCREEN);
  // The added press says what can be done next; the tick still says what the
  // day recorded. Losing the tick would trade one for the other.
  assert.match(src, /waiting \? null : <Icon name=\{tone\.icon\}/,
    'the uploaded day no longer draws its status icon in the cell');
});
