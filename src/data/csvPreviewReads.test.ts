import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * THE PREVIEW'S REGISTER READS GO OUT TOGETHER (csv-import,
 * docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md RC-10).
 *
 * Run: npx tsx --test src/data/csvPreviewReads.test.ts
 *
 * index.ts calls Deno.serve at module scope and cannot be imported, so this
 * reads the source: the nine register reads of the preview are each STARTED
 * (assigned, not awaited) and then awaited once, together; no read of a
 * register table is awaited on its own; and every per-row question is a
 * lookup in the index load.ts builds rather than a scan of the register.
 */
const ROOT = process.cwd();
const FN = fs.readFileSync(path.join(ROOT, 'supabase/functions/csv-import/index.ts'), 'utf8');
const preview = FN.slice(FN.indexOf('async function preview('), FN.indexOf('async function commit('));

test('the register reads are started, then awaited once together', () => {
  const started = ['staffP', 'aliasesP', 'membersP', 'primaryEmailsP', 'statsP', 'enrollmentsP', 'offeringsP', 'coursesP', 'branchesP'];
  for (const p of started) assert.match(preview, new RegExp(`const ${p} = (pageAllByKey|admin\\.from)\\(`), `${p} is not started as a promise`);
  const all = preview.match(/await Promise\.all\(\[([^\]]+)\]\)/);
  assert.ok(all, 'no single await of all the reads');
  for (const p of started) assert.ok(all![1].includes(p), `${p} is not in the Promise.all`);
  assert.ok(!/await pageAllByKey\(/.test(preview), 'a register read is still awaited on its own');
  // the catalogue is no longer read by the enrolments' ids after them
  assert.ok(!/\.in\('id', offeringIds/.test(preview), 'offerings are still read after the enrolments');
});

test('no per-row scan of the register remains', () => {
  const rows = preview.slice(preview.indexOf('const rows = attendees.map('));
  assert.ok(!/\(aliases \?\? \[\]\)\.filter|\(members \?\? \[\]\)\.filter|\(members \?\? \[\]\)\s*\.map/.test(rows),
    'a row still scans every alias or member');
  assert.match(rows, /aliasesByNormalized\.get\(normalized\)/);
  assert.match(rows, /membersByNormalized\.get\(normalized\)/);
  assert.match(rows, /fuzzyCandidates\(fuzzy, normalized, FUZZY_THRESHOLD\)/);
  assert.match(FN, /import \{ indexRegister/);
});
