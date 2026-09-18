/**
 * T-018: when the draft does not know who has already been written to, it
 * ticks NOBODY and says so.
 *
 * Run: npx tsx --test src/data/sendFailsClosed.test.ts
 *
 * The send draft reads `fetchSentForPeriod` to mark the members who already
 * had this week's message, and starts their boxes empty so a second identical
 * email is a deliberate tick rather than an accident. That guard is the only
 * thing standing between a slow Tuesday and 456 people receiving the same
 * message twice.
 *
 * It was wired to fail OPEN. `already.state === 'error'` was missing from the
 * screen's `failed` gate (`app/send/index.tsx:206-207`), so a failed read did
 * not stop the draft rendering; `already.data` was then `undefined`, `sent`
 * collapsed to `{}` through `?? {}`, and `defaultSelection` read that as "no
 * member has been written to" and pre-ticked EVERY recipient
 * (`src/data/sent.ts:92`). One tap on Send and everybody already contacted
 * gets a second copy, which cannot be recalled (B:F-06, C:RF-08).
 *
 * `{}` and "unknown" were the same value, and that is the whole defect.
 * `SentMap | null` separates them: `{}` still means "read it, nobody has been
 * written to" and still ticks everyone, which is the ordinary Monday. `null`
 * means "the read did not answer", and the only safe answer to that is
 * nobody.
 *
 * The screen-level half is read from the source, because `app/` cannot be
 * imported in this runner.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { defaultSelection } from './sent';

const ROOT = process.env.SEND_FAILS_CLOSED_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => {
  const full = path.join(ROOT, rel);
  assert.ok(fs.existsSync(full),
    `${ROOT} is not the repository root: no ${rel}. Run from the root, or set SEND_FAILS_CLOSED_SPEC_ROOT.`);
  return fs.readFileSync(full, 'utf8');
};
const code = (rel: string) => read(rel)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

const FLAGGED = ['m-1', 'm-2', 'm-3'];

test('an unknown sent-map ticks nobody', () => {
  // fetchSentForPeriod rejected. Nothing is known about who has had this
  // week's message, so nothing may be pre-selected.
  assert.deepEqual(defaultSelection(FLAGGED, null), []);
});

test('a known-empty sent-map still ticks everyone', () => {
  // The ordinary Monday: the read answered, and it answered "nobody yet".
  // Failing closed must not cost the one-tap send it was built for.
  assert.deepEqual(defaultSelection(FLAGGED, {}), FLAGGED);
});

test('a known sent-map still leaves out the member already written to', () => {
  assert.deepEqual(
    defaultSelection(FLAGGED, { 'm-2': '2026-09-15T09:00:00.000Z' }),
    ['m-1', 'm-3'],
  );
});

test('the screen refuses when the already-sent read failed', () => {
  const src = code('app/send/index.tsx');
  const gate = src.slice(src.indexOf('const failed ='));
  const line = gate.slice(0, gate.indexOf(';'));

  // Without this the draft renders as though the read had succeeded, and the
  // list it shows is the one that sends everything twice.
  assert.match(line, /already\.state === 'error'/);
});

test('the refusal is what renders, not the list', () => {
  const src = code('app/send/index.tsx');
  const branch = src.slice(src.indexOf('if (failed'), src.indexOf('if (failed') + 500);

  // `failed` has to reach an ErrorState with a retry, or the gate above is a
  // boolean nobody reads.
  assert.ok(/ErrorState/.test(branch) && /onRetry/.test(branch),
    'the failed branch must render a retryable refusal');
});

test('the draft passes the unknown map through rather than flattening it', () => {
  const src = code('app/send/index.tsx');

  // `already.data ?? {}` is the line that turned "did not answer" into
  // "nobody has been written to". If it comes back, so does the defect.
  assert.ok(!/mergeSent\(already\.data \?\? \{\}/.test(src),
    'app/send/index.tsx still flattens an unknown sent-map to {}');
});
