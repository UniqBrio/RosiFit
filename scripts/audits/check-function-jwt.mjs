#!/usr/bin/env node
/**
 * check-function-jwt - does every Edge Function declare its verify_jwt posture?
 *
 * WHY
 *   `supabase functions deploy` decides verify_jwt from the CLI default, which is TRUE, unless
 *   config.toml says otherwise. Before T-038 the posture of all eleven functions lived only in
 *   header comments and in supabase/SETUP.md, and a comment does not survive a deploy. This
 *   project has already lost a function's public-ness to a redeploy once (SETUP.md:180).
 *
 *   The failure is silent and asymmetric. A public function that flips to verify_jwt=true does
 *   not error at deploy time: it starts returning 401 to callers who have no session and never
 *   will. For `auth-login` or `auth-lookup` that is sign-in broken for everybody. For
 *   `ses-feedback` it is every SNS bounce notification rejected while the dashboard looks
 *   healthy - the academy keeps emailing an address that has already hard-bounced.
 *
 * WHAT THIS BLOCKS
 *   A new directory under supabase/functions/ with no entry in supabase/config.toml. That is
 *   the whole rule, and it is deliberately not a judgement about which posture is right: the
 *   check cannot know whether a new function should be public. It only refuses to let one ship
 *   with the question unanswered, because an unanswered question resolves to TRUE at deploy
 *   time and nobody finds out until a user cannot sign in.
 *
 * NOT A RATCHET. Every directory has an entry today, so there is no backlog to baseline and no
 * honest reason for a new gap.
 *
 * USAGE  node scripts/audits/check-function-jwt.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const FUNCTIONS_DIR = path.join('supabase', 'functions');
const CONFIG = path.join('supabase', 'config.toml');

/** Not a function: shared modules imported by the others, deployed with nothing. */
const NOT_A_FUNCTION = new Set(['_shared']);

function fail(lines) {
  console.log(`\nBLOCKED [FUNCTION JWT] - ${lines.title}\n`);
  lines.body.forEach((l) => console.log(l));
  console.log('');
  process.exit(1);
}

if (!fs.existsSync(CONFIG)) {
  fail({
    title: 'supabase/config.toml is missing.',
    body: [
      '  Without it every `supabase functions deploy` takes verify_jwt from the CLI default,',
      '  which is true. That silently turns the public functions - auth-login, auth-bootstrap,',
      '  auth-lookup, recovery-check, ses-feedback, unsubscribe - into 401s.',
      '',
      '  Restore the file. T-038 has the posture of all eleven and why each is what it is.',
    ],
  });
}

if (!fs.existsSync(FUNCTIONS_DIR)) {
  fail({ title: `${FUNCTIONS_DIR} does not exist.`, body: ['  Nothing to check. This is almost certainly wrong.'] });
}

const dirs = fs.readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .filter((n) => !NOT_A_FUNCTION.has(n))
  .sort();

const toml = fs.readFileSync(CONFIG, 'utf8');

/* Strip comment tails before matching, so a function named only inside the prose at the top of
   config.toml - and there are several, deliberately - is never mistaken for a declaration. */
const code = toml.split(/\r?\n/).map((l) => l.replace(/#.*$/, '')).join('\n');

/* Line by line rather than one big regex. A TOML section runs to the next [header] or to the
   end of the file, and JavaScript has no \Z anchor to express "end of input" in a lookahead -
   written as one regex it silently matched a literal Z instead. */
const declared = new Map();
{
  let current = null;
  for (const raw of code.split(/\n/)) {
    const header = /^\s*\[([^\]]+)\]\s*$/.exec(raw);
    if (header) {
      const fn = /^functions\.([A-Za-z0-9_-]+)$/.exec(header[1].trim());
      current = fn ? fn[1] : null;
      if (current && !declared.has(current)) declared.set(current, null);
      continue;
    }
    if (!current) continue;
    const v = /^\s*verify_jwt\s*=\s*(true|false)\s*$/.exec(raw);
    if (v) declared.set(current, v[1] === 'true');
  }
}

const missing = dirs.filter((d) => !declared.has(d));
const valueless = dirs.filter((d) => declared.has(d) && declared.get(d) === null);
const orphans = [...declared.keys()].filter((n) => !dirs.includes(n)).sort();

if (missing.length || valueless.length || orphans.length) {
  const body = [];
  if (missing.length) {
    body.push('  No [functions.<name>] section in supabase/config.toml:');
    missing.forEach((d) => body.push(`    + ${d}`));
    body.push('');
    body.push('    Add one, and state verify_jwt explicitly. The question this answers is:');
    body.push('    can somebody call this WITHOUT being signed in? If the caller is mid-sign-in,');
    body.push('    locked out, or is AWS SNS, the answer is yes and verify_jwt = false.');
    body.push('    If you leave it out, the deploy answers true for you.');
    body.push('');
  }
  if (valueless.length) {
    body.push('  Section present but verify_jwt not stated:');
    valueless.forEach((d) => body.push(`    + ${d}`));
    body.push('');
    body.push('    An absent value is not a default here - it is an unanswered question, and the');
    body.push('    CLI answers it with true.');
    body.push('');
  }
  if (orphans.length) {
    body.push('  Declared in config.toml with no directory under supabase/functions/:');
    orphans.forEach((d) => body.push(`    + ${d}`));
    body.push('');
    body.push('    Either the function was deleted and its entry left behind, or the name is');
    body.push('    misspelt - in which case the real function has no entry and deploys as true.');
    body.push('');
  }
  fail({ title: `${missing.length + valueless.length + orphans.length} problem(s).`, body });
}

const publicCount = dirs.filter((d) => declared.get(d) === false).length;
console.log(
  `OK [FUNCTION JWT] ${dirs.length} function(s), all declared - `
  + `${publicCount} public (verify_jwt=false), ${dirs.length - publicCount} authenticated.`,
);
process.exit(0);
