#!/usr/bin/env node
/**
 * check-data-layer-boundary — a Supabase query may only be written in src/data/.
 *
 * WHY
 *   RC-039 was a read that returned 1,000 of 3,110 rows with `200 OK` and
 *   `error: null`. The fix is in src/data/: keyset paging, a bounded shape,
 *   and a guard for anything that is neither. All three are worth precisely
 *   nothing the first time somebody writes `supabase.from('members')` in a
 *   screen — that read goes straight to the network, past every one of them,
 *   and reports success while returning part of the table.
 *
 *   So the rule is not "page your reads". It is "reads live in one place",
 *   which is the only version of the rule a machine can check.
 *
 * WHAT IT LOOKS FOR
 *   `supabase.from(` and `supabase.rpc(` — the receiver included, deliberately.
 *   A bare `.from(` matches `Array.from(`, which appears six times in this
 *   app and none of them are queries. A detector that is confidently wrong is
 *   worse than one that declines, so this one insists on the receiver.
 *
 * WHERE IT IS ALLOWED
 *   src/data/ only. `src/lib/supabase.ts` creates the client and does not
 *   query through it; screens and components call the functions in src/data/.
 *
 * NOT A RATCHET. There are zero violations today (checked against the whole
 * tree, 11-Sep-2026), so there is no baseline to grandfather and nothing to
 * argue about later: the correct number is nought.
 *
 * USAGE  node scripts/audits/check-data-layer-boundary.mjs [--dirs app,src]
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const ROOT = process.cwd();
const DIRS = arg('--dirs', 'app,src').split(',').map(d => d.trim()).filter(Boolean);

/** The one directory a query may be written in, as a path prefix. */
const DATA_LAYER = 'src/data/';

/**
 * The receiver is part of the pattern. `.from(` alone matches `Array.from(`,
 * `Object.from(`-alikes and any builder anybody adds later; `supabase.` is
 * what makes it a query. The client is imported under exactly this name
 * everywhere in this app (src/lib/supabase.ts exports `supabase`), and the
 * spec beside this file asserts that stays true.
 */
const QUERY = /\bsupabase\s*\.\s*(from|rpc)\s*\(/;

const EXTS = ['.ts', '.tsx'];

function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      walk(full, out);
    } else if (EXTS.includes(path.extname(e.name))) {
      out.push(full);
    }
  }
  return out;
}

const files = DIRS.flatMap(d => walk(path.resolve(ROOT, d)));
const violations = [];
let scanned = 0;

for (const file of files) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  if (rel.startsWith(DATA_LAYER)) continue;
  scanned++;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    // A comment naming the rule is not a breach of it. This file's own
    // prose, and repository.ts's, would otherwise report themselves.
    if (/^\s*(\*|\/\/|\/\*)/.test(line)) return;
    if (QUERY.test(line)) violations.push(`${rel}:${i + 1}  ${line.trim()}`);
  });
}

if (files.length === 0) {
  console.error('DATA LAYER BOUNDARY: nothing was scanned. Run from the repository root.');
  process.exit(3);
}

for (const v of violations) console.log(`  FAIL  ${v}`);

console.log(
  `\n${scanned} files outside ${DATA_LAYER} scanned; `
  + `${violations.length} Supabase ${violations.length === 1 ? 'query' : 'queries'} found there.`);

if (violations.length) {
  console.log(
    `\nA query written outside ${DATA_LAYER} goes to the network past every read shape in\n`
    + '  src/data/pageAll.ts — so it can return 1,000 of 3,110 rows with 200 and no error,\n'
    + '  which is RC-039 exactly. Move it into src/data/ and call it from here: page it with\n'
    + '  pageAllByKey, bound it with readBounded, or read one row with .single()/.maybeSingle().');
  process.exit(1);
}
