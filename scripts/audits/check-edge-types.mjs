#!/usr/bin/env node
/**
 * check-edge-types - is the Edge Function tree type checked? (T-027, RV-21, A:F-11)
 *
 * WHAT WAS ACTUALLY WRONG, measured before this was written
 *   RV-21 and A:F-11 say `tsconfig.json` excludes `supabase/`, `scripts/` and `**\/*.test.ts`,
 *   so "every Edge Function and every spec" goes unchecked. Two of those three are wrong:
 *
 *     scripts/  - has its own tsconfig, run as the second half of `npm run typecheck`.
 *     specs     - scripts/tsconfig.json includes `../src/**\/*.test.ts`. That resolves 130
 *                 files and passes. They have been checked all along.
 *
 *   Removing `**\/*.test.ts` from the CLIENT config is the wrong fix and the repository had
 *   already written down why: the app sets `customConditions: ["react-native"]`, under which
 *   `@types/node`'s exports do not resolve. Doing it anyway produces 435 errors, 385 of them
 *   `TS2591 Cannot find name 'node:test'`. That is a worse config, not a wider net.
 *
 *   The Edge tree is the real gap, and `supabase/` stays excluded from the client config
 *   because it is Deno, not React Native - RV-21 is explicit that removing it is not the fix.
 *   Deno checks Deno.
 *
 * WHY A WRAPPER RATHER THAN `deno check` IN THE SCRIPT
 *   `npm run check` is the definition of done and is run on developer machines, where Deno may
 *   not be installed - it is not an npm dependency and cannot be. A bare `deno check` in the
 *   chain turns "I do not have a tool" into "your change is broken", which is how a check gets
 *   removed. So: run it when Deno is there, and when it is not, say so LOUDLY and pass. CI
 *   installs Deno (denoland/setup-deno) before this runs, so in CI it always really executes
 *   and a real error is a real failure.
 *
 *   The skip is audible on purpose. A check that can be absent without anyone noticing is the
 *   thing this whole gate exists to stop being.
 *
 * USAGE  node scripts/audits/check-edge-types.mjs
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join('supabase', 'functions');

if (!fs.existsSync(DIR)) {
  console.log(`OK [EDGE TYPES] no ${DIR} - nothing to check.`);
  process.exit(0);
}

const probe = spawnSync('deno', ['--version'], { encoding: 'utf8', shell: process.platform === 'win32' });
if (probe.error || probe.status !== 0) {
  console.log([
    '',
    'SKIPPED [EDGE TYPES] - no `deno` on PATH, so the Edge Function tree was NOT type checked.',
    '',
    '  This is a skip, not a pass. Eleven functions and their specs are unchecked right now on',
    '  this machine. CI installs Deno and runs this for real, so a type error still blocks there',
    '  - but you will not see it here until you install Deno:',
    '',
    '      winget install DenoLand.Deno      (or see https://deno.com)',
    '',
  ].join('\n'));
  process.exit(0);
}

const version = (probe.stdout || '').split('\n')[0].trim();

/* Type check every .ts under the tree. `deno check` follows imports, so the entrypoints and
   _shared modules are all reached; naming them explicitly keeps a file that nothing imports
   from going unchecked. */
/** Directories that are not source. `node_modules` is the one that matters and it is
 *  RECENT: T-027 set `nodeModulesDir: "auto"` so `deno check` can resolve the npm
 *  specifier, and Deno then materialises the dependency tree right here. Walking into
 *  it turned 25 files into 333 and the invocation into "The command line is too long" -
 *  a red that says nothing about this repository's types. Deno checks the dependency
 *  graph it actually reaches; it does not need to be handed node_modules. */
const NOT_SOURCE = new Set(['node_modules']);

const targets = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory() && (NOT_SOURCE.has(e.name) || e.name.startsWith('.'))) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith('.ts')) targets.push(full.split(path.sep).join('/'));
  }
})(DIR);

if (targets.length === 0) {
  console.log('OK [EDGE TYPES] no .ts files under ' + DIR + '.');
  process.exit(0);
}

/* RUN FROM INSIDE THE TREE, not from the repository root.
   Deno looks for deno.json from its cwd upwards. Invoked from the root it never finds
   supabase/functions/deno.json, so `nodeModulesDir` is not applied and the npm: specifier in
   _shared/db.ts cannot resolve - which fails every file whose graph reaches db.ts, for a
   reason that has nothing to do with its types. That was CI runs 35346441309 and 35347901748:
   the setting was right and simply never read. Paths go relative to the same directory. */
const prefix = `${DIR.split(path.sep).join('/')}/`;
const rel = targets.map((t) => (t.startsWith(prefix) ? t.slice(prefix.length) : t));
const res = spawnSync('deno', ['check', ...rel], {
  cwd: DIR,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: process.platform === 'win32',
});

const out = `${res.stdout || ''}${res.stderr || ''}`.trim();

if (res.status !== 0) {
  console.log(`\nBLOCKED [EDGE TYPES] - deno check failed over ${targets.length} file(s) in ${DIR}.\n`);
  if (out) console.log(out);
  console.log([
    '',
    '  This tree runs in production as Edge Functions and has never been type checked until now.',
    '  A `!` that silences the compiler here is not caught by anything else: the client tsconfig',
    '  excludes supabase/ on purpose, because this is Deno and not React Native.',
    '',
  ].join('\n'));
  process.exit(1);
}

console.log(`OK [EDGE TYPES] ${targets.length} file(s) in ${DIR} type check clean (${version}).`);
process.exit(0);
