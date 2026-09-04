#!/usr/bin/env node
/**
 * check-audit-attribution - does every Edge Function action name the person who took it?
 *
 * WHY
 *   audit_log() derives its actor from auth.uid(). Every Edge Function calls it on the
 *   SERVICE-ROLE client, where auth.uid() is null, so the entry lands with no actor and
 *   actor_kind 'anon' -- the label an unauthenticated request carries. The audit screen then
 *   renders it as "System". In an append-only table that by design cannot be corrected, a batch
 *   of emails sent by the super admin became indistinguishable from a batch sent by nobody.
 *   That was RC-011, and it went unnoticed because nothing FAILS when the actor is dropped:
 *   the write succeeds, the screen renders, and only the column is empty.
 *
 *   0023 added audit_log_as(p_actor, ...) for callers that have already authenticated somebody.
 *   This check is the rung that keeps it used: a new function calling audit_log() gets caught
 *   here rather than six months later, by somebody asking who sent an email.
 *
 * THE ALLOW-LIST IS THE POINT, not an escape hatch
 *   Three flows legitimately have no actor: signing in, registering the first account, and
 *   answering the PIN recovery questions. All three run BEFORE a session exists. Naming the
 *   account an attempt was aimed at would record her as having done something she may know
 *   nothing about -- so those keep audit_log(), and are listed below by name with that reason.
 *   A function not on the list has authenticated its caller and has no excuse.
 *
 * NOT A RATCHET. The backlog is zero and the rule is absolute, so this is a clean gate: there
 * is no honest reason for a NEW unattributed call, which is exactly what a baseline would let in.
 *
 * USAGE  node scripts/audits/check-audit-attribution.mjs [--report]
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'supabase', 'functions');

/** Pre-session flows: no session exists yet, so there is genuinely nobody to name. */
const NO_SESSION_YET = {
  'auth-login': 'a sign-in attempt: nobody has proved who they are, and that is the point',
  'auth-bootstrap': 'the first account does not exist until this call succeeds',
  'recovery-check': 'the questions are answered before any session is granted',
};

const CALL = /\brpc\(\s*['"]audit_log['"]/g;

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|js)$/.test(e.name)) out.push(p);
  }
  return out;
}

if (!fs.existsSync(DIR)) {
  console.log('OK [AUDIT ATTRIBUTION] no supabase/functions directory - nothing to check.');
  process.exit(0);
}

const findings = [];
let attributed = 0;
let exempt = 0;
for (const file of walk(DIR)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const fn = rel.split('/')[2];
  const src = fs.readFileSync(file, 'utf8');
  attributed += (src.match(/\brpc\(\s*['"]audit_log_as['"]/g) ?? []).length;
  const bare = (src.match(CALL) ?? []).length;
  if (!bare) continue;
  if (NO_SESSION_YET[fn]) { exempt += bare; continue; }
  findings.push(`${rel}  ${bare} unattributed audit_log() call${bare === 1 ? '' : 's'}`);
}

if (process.argv.includes('--report')) {
  findings.forEach((f) => console.log(`UNATTRIBUTED  ${f}`));
  console.log(`\n${attributed} attributed, ${exempt} exempt (pre-session), ${findings.length} file(s) to fix.`);
  process.exit(0);
}

if (findings.length) {
  console.log(`\nBLOCKED [AUDIT ATTRIBUTION] - ${findings.length} function(s) log without an actor:\n`);
  findings.forEach((f) => console.log(`  + ${f}`));
  console.log([
    '',
    '  This function has already authenticated its caller, so the identity is in hand and only',
    '  the log is throwing it away. Use audit_log_as (0023):',
    '',
    "      await admin.rpc('audit_log_as', { p_actor: caller.id, p_action: …, … });",
    '',
    '  If the call genuinely happens before any session exists, add the function to',
    '  NO_SESSION_YET in this file WITH THE REASON - never silently.',
    '',
  ].join('\n'));
  process.exit(1);
}

console.log(`OK [AUDIT ATTRIBUTION] ${attributed} attributed, ${exempt} exempt (pre-session), 0 unattributed.`);
process.exit(0);
