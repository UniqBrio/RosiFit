import test from 'node:test';
import assert from 'node:assert/strict';
import { similarity, normalizeName, prepareFuzzy, fuzzyCandidates } from '../../supabase/functions/_shared/match';

/**
 * THE PREPARED FUZZY TIER ANSWERS EXACTLY WHAT THE PER-MEMBER LOOP ANSWERED
 * (csv-import preview, docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md RC-10).
 *
 * Run: npx tsx --test src/data/edgeFuzzyMatcher.test.ts
 *
 * The matcher is plain TypeScript shared by the Edge Function, so it runs
 * under node here, where it can be checked against the loop it replaces on
 * thousands of generated names -- same ids, same scores, same order -- and
 * timed. The Deno test beside it (supabase/functions/_shared/match.test.ts)
 * runs the same equivalence in CI.
 */
const FIRST = ['Priya', 'Anita', 'Kavya', 'Divya', 'Meena', 'Lakshmi', 'Sneha', 'Pooja', 'Riya', 'Deepa', 'Nithya', 'Shreya', 'Asha', 'Uma'];
const LAST = ['Sharma', 'Iyer', 'Nair', 'Reddy', 'Menon', 'Pillai', 'Rao', 'Krishnan', 'Das', 'Verma', 'K', 'S'];
const name = (i: number) => `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}${i % 5 === 0 ? '' : ' ' + i}`;

/** The loop the preview ran per row, verbatim in shape. */
function loop(members: { id: string; normalized: string }[], row: string, t: number) {
  return members
    .map(m => ({ id: m.id, score: similarity(row, m.normalized) }))
    .filter(s => s.score >= t)
    .sort((a, b) => b.score - a.score);
}

test('the prepared tier returns the loop\'s candidates: same ids, scores and order', () => {
  const members = Array.from({ length: 3000 }, (_, i) => ({ id: `m${i}`, normalized: normalizeName(name(i)) }));
  const index = prepareFuzzy(members);
  // Rows that hit: exact names, names with a typo, names with a dropped
  // surname, and some noise that misses everything.
  const rows = [
    ...members.slice(0, 200).map(m => m.normalized),
    ...members.slice(200, 400).map(m => m.normalized.replace(/a/, 'e')),
    ...members.slice(400, 600).map(m => m.normalized.split(' ').slice(0, 2).join(' ')),
    ...Array.from({ length: 100 }, (_, i) => `zzz qqq ${i}`),
    '', ' ', 'a',
  ];
  let hits = 0;
  for (const t of [0.9, 0.8, 0.5]) {
    for (const row of rows) {
      const expected = loop(members, row, t);
      const got = fuzzyCandidates(index, row, t);
      assert.deepEqual(got, expected, `row "${row}" at ${t}`);
      hits += got.length;
    }
  }
  assert.ok(hits > 500, `the fixture produced only ${hits} candidates -- it is not exercising the tier`);
});

test('an empty row and an empty name score as the loop scored them', () => {
  // bigrams('') is the one padded bigram '  ', so an empty row against an
  // empty name is 1 (the loop's a === b shortcut says so too) and against a
  // real name is 0. Neither reaches the matcher in practice -- blank rows
  // are dropped before it -- but the tier answers as the loop did.
  const members = [{ id: 'blank', normalized: '' }, { id: 'n', normalized: null }, { id: 'ok', normalized: 'asha k' }];
  const index = prepareFuzzy(members);
  const plain = members.map(m => ({ id: m.id, normalized: m.normalized ?? '' }));
  for (const row of ['asha k', '', 'asha']) {
    assert.deepEqual(fuzzyCandidates(index, row, 0.9), loop(plain, row, 0.9), `row "${row}"`);
  }
  assert.deepEqual(fuzzyCandidates(prepareFuzzy([]), 'asha', 0.9), []);
});

test('the length band is exact: a member just outside it scores below the threshold', () => {
  // Pairs built so the Dice score sits right at the band edge: a 9-bigram row
  // against members of 7..12 bigrams that share every bigram they can.
  const row = 'abcdefgh';                      // 9 bigrams with the padding
  const members = ['abcdef', 'abcdefg', 'abcdefgh', 'abcdefghi', 'abcdefghij', 'abcdefghijk', 'abcdefghijkl']
    .map((n, i) => ({ id: `m${i}`, normalized: n }));
  for (const t of [0.95, 0.9, 0.85, 0.8, 0.7]) {
    assert.deepEqual(fuzzyCandidates(prepareFuzzy(members), row, t), loop(members, row, t), `t=${t}`);
  }
});

test('the prepared tier is several times cheaper than the loop it replaces, on this box, right now', () => {
  // Relative, not absolute: an absolute budget flaked under the gate's
  // parallel load (4,000 ms was crossed while the whole suite ran beside
  // it). The loop and the prepared tier run back to back on the same
  // fixture in the same process, so whatever the box is doing, the ratio
  // stands. Measured alone: 300 x 3,000 is ~1,500 ms for the loop and
  // ~300 ms prepared (5x); 1,000 x 5,000 was 16,110 ms against 3,305 ms.
  const members = Array.from({ length: 3000 }, (_, i) => ({ id: `m${i}`, normalized: normalizeName(name(i) + 'x') }));
  const rows = Array.from({ length: 300 }, (_, i) => normalizeName(name(i * 3) + 'y'));
  const t0 = performance.now();
  let loopHits = 0;
  for (const r of rows) loopHits += loop(members, r, 0.8).length;
  const loopMs = performance.now() - t0;
  const t1 = performance.now();
  const index = prepareFuzzy(members);
  let hits = 0;
  for (const r of rows) hits += fuzzyCandidates(index, r, 0.8).length;
  const preparedMs = performance.now() - t1;
  assert.equal(hits, loopHits, 'the same candidates');
  assert.ok(hits > 0);
  assert.ok(preparedMs * 2.5 < loopMs, `prepared ${preparedMs.toFixed(0)} ms against the loop's ${loopMs.toFixed(0)} ms`);
});
