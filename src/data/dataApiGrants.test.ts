/**
 * EVERY DATA API CALL THIS APP MAKES IS BACKED BY A GRANT WRITTEN IN A MIGRATION.
 *
 * Run: npx tsx --test src/data/dataApiGrants.test.ts
 *
 * WHY THIS FILE EXISTS. From 30-Oct-2026 Supabase stops granting anything
 * automatically on objects created in `public` — to anon, authenticated OR
 * service_role (T-145, RC-124). A grant that exists in production only because
 * the platform handed it out is a grant a fresh project does not have: the
 * app works on the project it was built on and fails on the next one. 0097
 * found two such grants that were load-bearing (normalize_name and
 * normalize_email) and wrote them down; this file makes sure the next call
 * the app adds is written down too.
 *
 * It reads the migration TEXT, for the reason src/data/migrationGrants.test.ts
 * gives (KL-008): the text is the one thing that is the same on every project,
 * and a grant the shim or the platform supplied is invisible in it.
 *
 * What it ties together:
 *   - the client (src/, app/) runs as `authenticated`: every `.from('t')` and
 *     `.rpc('f')` it makes needs a grant to authenticated;
 *   - the Edge Functions (supabase/functions/) run as `service_role`: every
 *     `.from('t')` and `.rpc('f')` they make needs a grant to service_role.
 * Whether a call is ALLOWED is RLS's question and the SQL suite's job
 * (supabase/tests/58, 74). This only asks that the grant exist at all.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.DATA_API_GRANTS_SPEC_ROOT ?? process.cwd();
const MIGRATIONS = path.join(ROOT, 'supabase/migrations');

const migrationFiles = fs.readdirSync(MIGRATIONS).filter(f => f.endsWith('.sql')).sort();

/**
 * A line with its `--` comment cut off — but not a `--` inside a '…' literal,
 * where cutting would take the statement's `;` with it and fuse the next
 * statement onto this one.
 */
function uncomment(line: string): string {
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === "'") quoted = !quoted;
    else if (!quoted && line.startsWith('--', i)) return line.slice(0, i);
  }
  return line;
}

/** One migration's statements, comments stripped, so prose naming a table is not read as SQL. */
function statementsOf(sql: string): string[] {
  return sql.split('\n')
    .map(uncomment)
    .join('\n')
    .split(';')
    .map(s => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

const statements = migrationFiles.flatMap(f =>
  statementsOf(fs.readFileSync(path.join(MIGRATIONS, f), 'utf8')));

/** Source files under `dir`, spec files excluded: a spec's stub RPC is not an app call. */
function sources(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); }
      else if (/\.(ts|tsx)$/.test(e.name) && !/[._]test\.(ts|tsx)$/.test(e.name)) out.push(p);
    }
  };
  walk(path.join(ROOT, dir));
  return out;
}

function calls(dirs: string[], verb: 'from' | 'rpc'): Set<string> {
  const re = new RegExp(`\\.${verb}\\(\\s*['"\`]([a-z0-9_]+)['"\`]`, 'g');
  const out = new Set<string>();
  for (const f of dirs.flatMap(sources)) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(re)) out.add(m[1]);
  }
  return out;
}

/** Roles a `grant … on [table] public.x, public.y to …` statement names, per table. */
function tableGrantees(table: string): Set<string> {
  const roles = new Set<string>();
  for (const s of statements) {
    const m = /^grant .+? on (?:table )?(.+?) to (.+)$/i.exec(s);
    if (!m || /^(function|sequence|schema|all )/i.test(m[1])) continue;
    const tables = m[1].split(',').map(t => t.trim().toLowerCase().replace(/^public\./, ''));
    if (!tables.includes(table)) continue;
    for (const r of m[2].split(',')) roles.add(r.trim().toLowerCase());
  }
  return roles;
}

/** Roles a `grant execute on function public.f(…) to …` statement names, for function f. */
function functionGrantees(fn: string): Set<string> {
  const roles = new Set<string>();
  const re = new RegExp(`^grant execute on function .*\\bpublic\\.${fn}\\s*\\(.* to (.+)$`, 'i');
  for (const s of statements) {
    const m = re.exec(s);
    if (m) for (const r of m[1].split(',')) roles.add(r.trim().toLowerCase());
  }
  return roles;
}

const CLIENT = ['src', 'app'];
const EDGE = ['supabase/functions'];

test('the spec is looking at a real tree', () => {
  assert.ok(migrationFiles.length > 10, `${MIGRATIONS} does not look like the migration directory`);
  // Not vacuous: the call sites below are what the app actually does.
  assert.ok(calls(CLIENT, 'from').size >= 20, 'found too few client table reads to be the app');
  assert.ok(calls(EDGE, 'from').size >= 15, 'found too few Edge table reads to be the Edge tree');
  assert.ok(calls(CLIENT, 'rpc').size >= 20, 'found too few client RPCs to be the app');
  assert.ok(calls(EDGE, 'rpc').size >= 5, 'found too few Edge RPCs to be the Edge tree');
});

test('every table the client reads or writes is granted to `authenticated` in a migration', () => {
  const missing = [...calls(CLIENT, 'from')].filter(t => !tableGrantees(t).has('authenticated')).sort();
  assert.deepEqual(missing, [],
    'the client calls .from() on these tables, and no migration grants them to authenticated:\n'
    + missing.map(t => `    public.${t}`).join('\n')
    + '\n\n  After 30-Oct-2026 a new table carries no grant until a migration writes one. Add, in the\n'
    + '  migration that creates it, the narrowest grant the screen needs, e.g.\n'
    + '      grant select on public.<table> to authenticated;\n'
    + '  RLS still decides which rows; the grant only decides whether the call is attempted.');
});

test('every table an Edge Function reads or writes is granted to `service_role` in a migration', () => {
  const missing = [...calls(EDGE, 'from')].filter(t => !tableGrantees(t).has('service_role')).sort();
  assert.deepEqual(missing, [],
    'an Edge Function calls .from() on these tables, and no migration grants them to service_role:\n'
    + missing.map(t => `    public.${t}`).join('\n')
    + '\n\n  service_role bypasses RLS, not grants. After 30-Oct-2026 it is not granted new tables\n'
    + '  automatically either — write it down: grant select, insert, … on public.<table> to service_role;');
});

test('every RPC the client calls is granted to `authenticated` in a migration', () => {
  const missing = [...calls(CLIENT, 'rpc')].filter(f => !functionGrantees(f).has('authenticated')).sort();
  assert.deepEqual(missing, [],
    'the client calls these functions, and no migration grants EXECUTE on them to authenticated:\n'
    + missing.map(f => `    public.${f}`).join('\n')
    + '\n\n  grant execute on function public.<name>(<args>) to authenticated;\n'
    + '  and revoke it from anon directly (src/data/migrationGrants.test.ts says why).');
});

test('every RPC an Edge Function calls is granted to `service_role` in a migration', () => {
  const missing = [...calls(EDGE, 'rpc')].filter(f => !functionGrantees(f).has('service_role')).sort();
  assert.deepEqual(missing, [],
    'an Edge Function calls these functions, and no migration grants EXECUTE on them to service_role:\n'
    + missing.map(f => `    public.${f}`).join('\n')
    + '\n\n  grant execute on function public.<name>(<args>) to service_role;');
});

test('0097 is the last word on default privileges, and it takes service_role out too', () => {
  /*
   * The default this project sets for its own new tables and sequences must be
   * the one the platform will have: nothing, for every Data API role. A later
   * migration that re-grants by default would quietly bring back the "works
   * here, not there" class this file exists for, so any
   * `alter default privileges … grant` is a failure, and 0097's two revokes must
   * name service_role. ONE default grant is allowed, and it is 0097's: EXECUTE on
   * new functions to service_role, which states the owner-approved entry spec 19
   * pins (RC-042) so the platform cannot change it. Anything wider fails here.
   */
  const defaults = statements.filter(s => /^alter default privileges/i.test(s));
  const STATED = /^alter default privileges for role postgres in schema public grant execute on functions to service_role$/i;
  assert.deepEqual(defaults.filter(s => /\bgrant\b/i.test(s) && !STATED.test(s)), [],
    'a migration grants by DEFAULT privilege; grant on the object instead');
  for (const kind of ['tables', 'sequences']) {
    assert.ok(defaults.some(s =>
      new RegExp(`revoke all on ${kind} from anon, authenticated, service_role$`, 'i').test(s)),
      `no migration revokes the default on ${kind} from anon, authenticated and service_role`);
  }
});

test('every function created in public is revoked from PUBLIC by name', () => {
  /*
   * The one automatic grant the 30-Oct-2026 change cannot take away. PostgreSQL's
   * own global default gives EXECUTE on every new function to PUBLIC, and anon
   * is a member of PUBLIC; a per-schema default entry cannot subtract from it
   * (0097's header). So the revoke has to be on the function. All 72 carry one
   * today (verified 21-Oct-2026); a function that does not is callable by anyone
   * holding the public anon key the moment it is created.
   */
  const created = new Set([...statements.join(';\n').matchAll(
    /create (?:or replace )?function public\.([a-z0-9_]+)\s*\(/gi)].map(m => m[1]));
  const revokedFromPublic = new Set<string>();
  for (const s of statements) {
    const m = /^revoke (?:all|execute)(?: privileges)? on function (.+) from (.+)$/i.exec(s);
    if (!m || !/\bpublic\b/i.test(m[2])) continue;
    for (const f of m[1].matchAll(/public\.([a-z0-9_]+)\s*\(/gi)) revokedFromPublic.add(f[1]);
  }
  assert.ok(created.size >= 70, `found only ${created.size} functions; the parser is not reading the tree`);
  const missing = [...created].filter(f => !revokedFromPublic.has(f)).sort();
  assert.deepEqual(missing, [],
    'these functions are never revoked from PUBLIC, so anon can execute them:\n'
    + missing.map(f => `    public.${f}`).join('\n')
    + '\n\n  revoke execute on function public.<name>(<args>) from public, anon;');
});

test('a table created from 0097 on carries RLS and its own grants in the same file', () => {
  /*
   * Every table before 0097 was checked by hand and by the SQL suite (09, 74).
   * From here the rule is mechanical: the migration that creates a table in
   * public enables and FORCES row level security on it, and states at least one
   * grant on it — because after 30-Oct-2026 there is no other way it gets one.
   */
  const problems: string[] = [];
  for (const f of migrationFiles.filter(f => f >= '0097')) {
    const st = statementsOf(fs.readFileSync(path.join(MIGRATIONS, f), 'utf8'));
    for (const s of st) {
      const m = /^create table (?:if not exists )?public\.([a-z0-9_]+)/i.exec(s);
      if (!m) continue;
      const t = m[1];
      const has = (re: RegExp) => st.some(x => re.test(x));
      if (!has(new RegExp(`^alter table public\\.${t} enable row level security$`, 'i'))) problems.push(`${f}: ${t} has no ENABLE ROW LEVEL SECURITY`);
      if (!has(new RegExp(`^alter table public\\.${t} force row level security$`, 'i'))) problems.push(`${f}: ${t} has no FORCE ROW LEVEL SECURITY`);
      if (!has(new RegExp(`^grant .+ on (?:table )?(?:[^;]*,\\s*)?public\\.${t}\\b`, 'i'))) problems.push(`${f}: ${t} is granted to nobody`);
    }
  }
  assert.deepEqual(problems, []);
});
