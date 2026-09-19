#!/usr/bin/env node
/**
 * check-all - run every check, collect the failures, report them together (T-404).
 *
 * WHY THIS REPLACED AN `&&` CHAIN
 *   `npm run check` used to be `lint && typecheck && test:unit && check:contrast &&
 *   check:icons && check:functions`. `test:unit` has been red on the 8 known RV-03
 *   assertions since CI first executed on 11-Sep, and `&&` stops there - so the three checks
 *   after it never ran. Not "rarely": never, in CI, once. Verified on run 35345932542, whose
 *   log contains no `OK [CONTRAST]`, no `OK [ICONS]` and no `OK [FUNCTION JWT]` line.
 *
 *   The CI step was named "Lint, types, contrast (2,800 pairs) and icons (71 glyphs)". Two of
 *   the four things in that name did not happen. Guardrail 2 of CLAUDE.md - colour ships
 *   measured, never trusted - was being honoured on developer machines and nowhere else, and
 *   T-038's `check:functions` was stranded from the hour it was added.
 *
 *   An `&&` chain answers "what broke first". A gate needs to answer "what is broken". Those
 *   are different questions, and the first one hides work: you fix the earliest failure, push,
 *   and discover the next one, one round trip at a time.
 *
 * THE SHAPE is `db/harness/test.sh`, which has always done this correctly: loop everything,
 * remember whether anything failed, print a summary, exit non-zero at the end.
 *
 * ORDER still matters, just not for stopping. Cheap and broad first (lint, types) so a
 * developer sees the common failures soonest; the slow suites after. Nothing is skipped
 * because of anything before it.
 *
 * USAGE  node scripts/check-all.mjs
 */
import { spawnSync } from 'node:child_process';

/** Every check `npm run check` is responsible for. A step named here that is not an npm
 *  script is a typo that would silently never run, so the spec asserts they all exist. */
export const STEPS = [
  'lint',
  'typecheck',
  'check:edge',
  'test:unit',
  'check:contrast',
  'check:icons',
  'check:functions',
];

/**
 * Run every step. `run` is injected so the spec can drive this without spawning npm.
 * Returns the failures and the exit code the process should use.
 */
export function runAll(steps, run) {
  const failed = [];
  const timings = [];
  for (const step of steps) {
    const started = Date.now();
    const { code } = run(step);
    timings.push({ step, code, ms: Date.now() - started });
    if (code !== 0) failed.push(step);
  }
  return { failed, timings, code: failed.length === 0 ? 0 : 1 };
}

function npmRun(step) {
  const res = spawnSync('npm', ['run', '--silent', step], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  return { code: res.status === null ? 1 : res.status };
}

/* run only when invoked directly, so importing this from the spec does not execute the suite */
const invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('scripts/check-all.mjs');
if (invokedDirectly) {
  const { failed, timings, code } = runAll(STEPS, (step) => {
    console.log(`\n───── ${step}`);
    return npmRun(step);
  });

  console.log('\n═════ check summary');
  for (const t of timings) {
    console.log(`  ${t.code === 0 ? 'PASS' : 'FAIL'}  ${t.step}  (${(t.ms / 1000).toFixed(1)}s)`);
  }

  if (code === 0) {
    console.log(`\nALL ${timings.length} CHECKS PASSED`);
  } else {
    console.log(`\nTHERE ARE FAILURES - ${failed.length} of ${timings.length}: ${failed.join(', ')}`);
    console.log('Every check above ran. Fix them together rather than one push at a time.');
  }
  process.exit(code);
}
