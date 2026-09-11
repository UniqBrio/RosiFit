/**
 * ONE PLACE WHERE A QUERY MAY BE WRITTEN, and a guard that says so.
 *
 * Run: npx tsx --test src/data/dataLayerBoundary.test.ts
 *
 * `pageAll.test.ts` proves the read shapes are correct; `pagedReads.test.ts`
 * proves they are used at every call site in the data layer. Both are worth
 * nothing the first time somebody writes `supabase.from('members')` in a
 * screen: that read goes to the network past all of it and reports success
 * while returning part of the table. This is the rung under both.
 *
 * The boundary holds TODAY — there are no Supabase queries outside src/data/
 * anywhere in this app — so nothing is being migrated here. What is being
 * added is the thing that notices when that stops being true.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.BOUNDARY_SPEC_ROOT ?? process.cwd();
const GUARD = 'scripts/audits/check-data-layer-boundary.mjs';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('THE BOUNDARY HOLDS: no Supabase query is written outside src/data/', () => {
  // The guard is the implementation; this runs it, so the spec and the audit
  // cannot disagree about what the rule is.
  const out = execFileSync('node', [path.join(ROOT, GUARD)], { cwd: ROOT, encoding: 'utf8' });
  assert.match(out, /0 Supabase queries found there\./,
    `a query outside src/data/ bypasses every read shape in pageAll.ts:\n${out}`);
});

test('the guard insists on the RECEIVER, because `.from(` is not a query', () => {
  /*
   * `Array.from(` appears six times in this app and none of them talk to a
   * database. A pattern of `.from(` would report all six, the guard would be
   * switched off inside a week, and the rule it carries would go with it.
   */
  const src = read(GUARD);
  assert.match(src, /supabase\\s\*\\\.\\s\*\(from\|rpc\)/,
    'the pattern must name `supabase.` — `.from(` alone matches Array.from');
});

test('it catches BOTH halves: a table read and an RPC', () => {
  const src = read(GUARD);
  for (const half of ['from', 'rpc']) {
    assert.ok(src.includes(half),
      `${GUARD}: an RPC reaches the network the same way a .from() does`);
  }
});

test('the guard is wired into a command somebody actually runs', () => {
  // A checker nothing invokes is a file. This is the same objection
  // gate-runner.mjs makes about green-by-omission.
  const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
  assert.match(pkg.scripts['audit:boundary'] ?? '', /check-data-layer-boundary/,
    'npm run audit:boundary must run it');
  assert.match(pkg.scripts['audit:all'] ?? '', /audit:boundary/,
    'and audit:all must include it, or nothing will');
});

test('it is NOT a ratchet, because the correct number of violations is nought', () => {
  /*
   * Every other audit here carries a baseline of grandfathered findings,
   * because every other audit was pointed at code that already existed. This
   * one starts clean, and a baseline would only ever be a place to put the
   * first breach.
   */
  const src = read(GUARD);
  assert.doesNotMatch(src, /evaluateRatchet|writeBaseline/,
    'no baseline: there is nothing to grandfather and nowhere to hide a breach');
});

test('the same rule is written for ESLint, for whenever it is installed here', () => {
  /*
   * The request asked for `no-restricted-syntax`. ESLint is not a dependency
   * of this repo — the gate's own Lint step (G6) reports BLOCKED, before this
   * change and after it — so the guard above is what runs today. The config
   * is here so the rule is enforced by the linter too the moment one arrives,
   * rather than being remembered.
   */
  const cfg = read('eslint.config.mjs');
  assert.match(cfg, /no-restricted-syntax/);
  assert.match(cfg, /src\/data/,
    'the rule must name the one directory the query is allowed in');
  assert.match(cfg, /Property\[name=\/\^\(from\|rpc\)\$\/\]|MemberExpression/,
    'it must select the call itself, not a filename');
});
