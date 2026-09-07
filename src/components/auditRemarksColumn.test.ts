import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "the remarks should be in table as last column not under setting there
 * itself user add remarks" (8 Sep 2026).
 *
 * This REVERSES a decision the request file settled deliberately. Q5 of
 * requests/2026-09-07-audit-log-for-end-users.md read "Taken: free-standing —
 * the requester said 'another section'", and said in as many words that
 * entry-level annotation was "a bigger feature and is not what was asked".
 * It is what is asked now, so the note moved to the row it explains and
 * migration 0044 gave audit_remarks a nullable audit_log_id.
 *
 * What can silently go wrong, and why source shape is the right guard (there
 * is no component harness in this project):
 *
 *   - the standalone section comes back, or is never removed, and the same
 *     remark is offered in two places that disagree about what it belongs to;
 *   - the composer is opened for every row at once, so fifty half-written
 *     drafts live behind a filter change with nothing on screen saying so;
 *   - the remark is attached to the LINE rather than the ENTRY, so an entry
 *     with three changed fields grows three copies of one note;
 *   - the remarks load fails and the column simply renders empty, which reads
 *     as "no remarks" - a different and false statement about the record;
 *   - Remarks stops being LAST, which is the one position that adds a column
 *     without moving any of the five the reader already knows.
 */

const ROOT = process.env.REMARKS_COLUMN_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const AUDIT = 'app/audit.tsx';
const REPO = 'src/data/repository.ts';
const MIGRATION = 'supabase/migrations/0044_audit_remarks_on_an_entry.sql';
const audit = read(AUDIT);

test('Remarks is a column, and it is the last one', () => {
  const block = audit.match(/const COLS = \[([\s\S]*?)\] as const;/);
  assert.ok(block, 'audit.tsx no longer declares a COLS literal');
  const labels = [...block[1].matchAll(/label:\s*'([^']+)'/g)].map(m => m[1]);
  assert.equal(labels[labels.length - 1], 'Remarks',
    'Remarks must be the LAST column - anywhere else moves a column the reader already knows');
  assert.equal(labels.filter(l => l === 'Remarks').length, 1);
});

test('the standalone Remarks section is gone', () => {
  assert.doesNotMatch(audit, /const remarksSection/,
    'the section came back - a remark would be offered in two places at once');
  assert.doesNotMatch(audit, /key="remarks"/,
    'the section is still being pushed into the page');
});

test('one row is open for writing at a time', () => {
  assert.match(audit, /const \[composingFor, setComposingFor\] = useState<string \| null>\(null\)/,
    'the composer is no longer keyed to a single entry');
  assert.match(audit, /const open = composingFor === r\.id/,
    'the cell no longer decides openness from the one composing entry');
});

test('a remark is attached to the ENTRY, and drawn once per entry', () => {
  assert.match(audit, /\{l\.first \? remarksCell\(r\) : null\}/,
    'the remarks cell must render on the first line only, like the actor and the time');
  assert.match(audit, /addRemark\(draft, composingFor\)/,
    'the entry being annotated is no longer passed to addRemark');
});

test('the repository sends the entry and reads it back', () => {
  const repo = read(REPO);
  assert.match(repo, /export async function addRemark\(body: string, entryId: string\)/,
    'addRemark stopped taking the entry it is about');
  assert.match(repo, /audit_log_id: Number\(entryId\)/, 'the insert no longer names the entry');
  assert.match(repo, /audit_log_id: number \| null/, 'the row type lost audit_log_id');
  // A bigint and its decimal string are the same entry; comparing one to the
  // other matches nothing and the column just looks empty.
  assert.match(repo, /entryId: r\.audit_log_id === null \? null : String\(r\.audit_log_id\)/,
    'audit_log_id must be stringified to match the ids the screen keys rows by');
  // The author is still never sent - the insert policy refuses any other value.
  assert.doesNotMatch(repo, /author_app_user_id:\s*[^)]*insert/,
    'the client must never name a remark author');
});

test('a failed remarks load is reported, not rendered as emptiness', () => {
  assert.match(audit, /key="remark-error"/,
    'nothing surfaces a remarks load failure now that the section is gone');
  assert.match(audit, /remarks\.state === 'error'/);
});

test('0044 is additive, nullable, and leaves audit_logs alone', () => {
  const sql = read(MIGRATION);
  assert.match(sql, /alter table public\.audit_remarks[\s\S]*add column audit_log_id bigint/,
    '0044 must ADD a column, never rebuild the table');
  // Scoped to the column DEFINITION. The partial index below it legitimately
  // reads `where audit_log_id is not null`, and a blunt search for "not null"
  // over the whole file fails on that rather than on anything being wrong.
  const addColumn = sql.match(/alter table public\.audit_remarks[\s\S]*?;/);
  assert.ok(addColumn, '0044 no longer alters audit_remarks');
  assert.doesNotMatch(addColumn[0], /not null/i,
    'audit_log_id must stay nullable - every remark written under 0043 has none');
  assert.doesNotMatch(sql, /alter table public\.audit_logs/,
    'audit_logs is immutable and must not be touched');
  assert.doesNotMatch(sql, /drop /i, '0044 must drop nothing');
  assert.match(sql, /on delete restrict/,
    'an orphaned remark must be impossible rather than merely unlikely');
});
