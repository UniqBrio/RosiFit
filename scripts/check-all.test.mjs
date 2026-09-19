#!/usr/bin/env node
/**
 * check-all.test.mjs — every check runs, even when one of them fails (T-404).
 *
 * WHAT WENT WRONG
 *   `npm run check` was an `&&` chain. `test:unit` sits in the middle of it and has been red
 *   on the 8 known RV-03 assertions since CI first executed on 11-Sep, so everything after it
 *   never ran. Verified on CI run 35345932542: the log contains no `OK [CONTRAST]`, no
 *   `OK [ICONS]` and no `OK [FUNCTION JWT]` line at all.
 *
 *   The gate step was named "Lint, types, contrast (2,800 pairs) and icons (71 glyphs)" and
 *   the contrast and icons halves of that name did not execute. Guardrail 2 of CLAUDE.md says
 *   colour ships measured and never trusted; it was measured on developer machines only.
 *   T-038's check:functions was born stranded the same way and never ran once.
 *
 *   An `&&` chain reports the FIRST failure and hides every verdict behind it. That is the
 *   opposite of what a gate is for: you want to know everything that is broken, not the
 *   earliest thing.
 *
 * THE SHAPE, borrowed from db/harness/test.sh
 *   Run every step, collect the failures, print them together, exit non-zero at the end.
 *
 * Run: node scripts/check-all.test.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const REPO = path.resolve(HERE, '..');

let pass = 0;
let fail = 0;

function check(label, fn) {
  try {
    fn();
    console.log(`  PASS  ${label}`);
    pass++;
  } catch (err) {
    console.log(`  FAIL  ${label}`);
    console.log(`        ${err.message.split('\n')[0]}`);
    fail++;
  }
}

console.log('T-404 npm run check runs every step and collects the failures');

const mod = await import('./check-all.mjs');
const { STEPS, runAll } = mod;

/* ── 1. the defect itself ──────────────────────────────────────────────────
   One step fails in the middle. Every other step must still have been run. */
check('a failing step does not stop the ones after it', () => {
  const attempted = [];
  const outcome = runAll(STEPS, (step) => {
    attempted.push(step);
    return { code: step === 'test:unit' ? 1 : 0 };
  });
  assert.deepEqual(attempted, STEPS, 'every step should be attempted, in order');
  assert.equal(outcome.failed.length, 1);
  assert.equal(outcome.failed[0], 'test:unit');
  assert.equal(outcome.code, 1, 'a failure anywhere must still exit non-zero');
});

/* ── 2. every failure is reported, not just the first ────────────────────── */
check('two failures are both reported', () => {
  const outcome = runAll(STEPS, (step) => ({
    code: step === 'test:unit' || step === 'check:contrast' ? 1 : 0,
  }));
  assert.deepEqual(outcome.failed, ['test:unit', 'check:contrast']);
  assert.equal(outcome.code, 1);
});

/* ── 3. all green is still green ──────────────────────────────────────────
   Without this, "always exit 1" would pass the two cases above. */
check('all passing exits zero', () => {
  const outcome = runAll(STEPS, () => ({ code: 0 }));
  assert.deepEqual(outcome.failed, []);
  assert.equal(outcome.code, 0);
});

/* ── 4. the contract: package.json must not go back to an && chain ────────
   The runner existing is not enough - `check` has to actually use it. This is
   the assertion that fails on the parent commit. */
check('npm run check delegates to the runner, and chains no checks with &&', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
  const script = pkg.scripts.check;
  assert.ok(script.includes('check-all.mjs'), `check should run check-all.mjs, got: ${script}`);
  assert.ok(
    !/&&\s*npm run (lint|typecheck|test:unit|check:)/.test(script),
    `check must not chain checks with &&, got: ${script}`,
  );
});

/* ── 5. the steps the runner declares all exist as scripts ────────────────
   A typo in STEPS would otherwise be a step that silently never runs, which is
   the whole failure mode this row is about. */
check('every declared step is a real npm script', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
  const missing = STEPS.filter((s) => !(s in pkg.scripts));
  assert.deepEqual(missing, [], `steps with no npm script: ${missing.join(', ')}`);
});

console.log('');
console.log(`${pass} passed, ${fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
