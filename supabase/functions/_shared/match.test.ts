// The prepared fuzzy tier answers exactly what the per-member similarity()
// loop answered -- same ids, same scores, same order -- for every row of a
// generated register, at three thresholds. src/data/edgeFuzzyMatcher.test.ts
// is the same check under node (where this box can run it); this one runs
// where the Edge Functions are type-checked and tested, with the CI Deno.
import { assertEquals } from 'jsr:@std/assert@1';
import { fuzzyCandidates, normalizeName, prepareFuzzy, similarity } from './match.ts';

const FIRST = ['Priya', 'Anita', 'Kavya', 'Divya', 'Meena', 'Lakshmi', 'Sneha', 'Pooja', 'Riya', 'Deepa'];
const LAST = ['Sharma', 'Iyer', 'Nair', 'Reddy', 'Menon', 'Pillai', 'Rao', 'K', 'S'];
const name = (i: number) => `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}${i % 5 === 0 ? '' : ' ' + i}`;

function loop(members: { id: string; normalized: string }[], row: string, t: number) {
  return members
    .map((m) => ({ id: m.id, score: similarity(row, m.normalized) }))
    .filter((s) => s.score >= t)
    .sort((a, b) => b.score - a.score);
}

Deno.test('prepared fuzzy matching equals the per-member loop, row for row', () => {
  const members = Array.from({ length: 2000 }, (_, i) => ({ id: `m${i}`, normalized: normalizeName(name(i)) }));
  const index = prepareFuzzy(members);
  const rows = [
    ...members.slice(0, 100).map((m) => m.normalized),
    ...members.slice(100, 200).map((m) => m.normalized.replace(/a/, 'e')),
    ...members.slice(200, 300).map((m) => m.normalized.split(' ').slice(0, 2).join(' ')),
    'zzz qqq', '', 'a',
  ];
  let hits = 0;
  for (const t of [0.9, 0.8, 0.5]) {
    for (const row of rows) {
      const got = fuzzyCandidates(index, row, t);
      assertEquals(got, loop(members, row, t), `row "${row}" at ${t}`);
      hits += got.length;
    }
  }
  assertEquals(hits > 200, true);
});

Deno.test('an empty register and a name with no match answer nothing', () => {
  assertEquals(fuzzyCandidates(prepareFuzzy([]), 'asha', 0.9), []);
  assertEquals(fuzzyCandidates(prepareFuzzy([{ id: 'x', normalized: 'priya menon' }]), 'zzz qqq', 0.9), []);
});
