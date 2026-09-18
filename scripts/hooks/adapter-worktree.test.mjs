#!/usr/bin/env node
/**
 * adapter-worktree.test.mjs — EXECUTE the PreToolUse adapter against real worktrees (T-401).
 *
 * WHY THIS EXISTS
 *   `guard-reachability.test.sh` proves each guard can still fire. It says nothing about
 *   whether the adapter hands the guard the RIGHT CHANGE, and on 18-Sep-2026 it did not.
 *
 *   The adapter resolved `repoRoot` with `git rev-parse --show-toplevel` in its OWN cwd — the
 *   Claude Code session's primary working directory — and then computed `@{u}..HEAD` there.
 *   Under D-9b every session works in its own worktree, so the adapter was reading whichever
 *   branch the PRIMARY tree happened to hold and applying that verdict to a push from
 *   somewhere else entirely.
 *
 *   Measured that day: the primary tree sat five commits BEHIND `main` on another session's
 *   branch. `origin/main..HEAD` there holds no commits to carry an escape token but a
 *   non-empty reversed diff, so every guard saw a change and none could find a justification.
 *   A docs-only push carrying `CASES-NA` was refused, and nothing the pushing session could
 *   write would have helped. The same guard, run by hand over the range that push actually
 *   covered, printed `[G1] escaped via CASES-NA`.
 *
 *   The direction that matters more is the opposite one: a stale checkout in an unrelated
 *   worktree makes every guard find nothing, for every session. A push that passes proves
 *   nothing while that is true. This test pins both halves.
 *
 * Run: node scripts/hooks/adapter-worktree.test.mjs
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const REPO = path.resolve(HERE, '..', '..');
const ADAPTER = path.join(REPO, '.claude', 'hooks', 'pre-tool-use-guard.mjs');

let pass = 0;
let fail = 0;

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/**
 * A bare "origin", a primary clone, and a second worktree — the D-9b shape.
 * Returns { primary, secondary, tmp }.
 */
function scaffold() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'adapter-'));
  const origin = path.join(tmp, 'origin.git');
  const primary = path.join(tmp, 'primary');
  const secondary = path.join(tmp, 'secondary');

  fs.mkdirSync(origin);
  git(origin, 'init', '-q', '--bare', '-b', 'main');

  fs.mkdirSync(primary);
  git(primary, 'init', '-q', '-b', 'main');
  git(primary, 'config', 'user.email', 't@t.t');
  git(primary, 'config', 'user.name', 't');
  fs.mkdirSync(path.join(primary, 'src'), { recursive: true });
  fs.mkdirSync(path.join(primary, 'docs', 'registers'), { recursive: true });
  fs.writeFileSync(path.join(primary, 'TEST_SUMMARY.md'), '# Test summary\n\n---\n\n');
  fs.writeFileSync(path.join(primary, 'docs', 'registers', 'NOTES.md'), 'seed\n');
  // src/ must be TRACKED, or `git worktree add` creates no such directory in the
  // secondary and the test writes into nowhere.
  fs.writeFileSync(path.join(primary, 'src', '.keep'), '');
  // The adapter looks for the guard under repoRoot and FAILS OPEN when it is absent.
  // Without this copy every case would pass for the wrong reason - which is exactly
  // what the first draft of this test did.
  fs.mkdirSync(path.join(primary, 'scripts', 'hooks'), { recursive: true });
  fs.copyFileSync(
    path.join(REPO, 'scripts', 'hooks', 'pre-commit-guard.sh'),
    path.join(primary, 'scripts', 'hooks', 'pre-commit-guard.sh'),
  );
  git(primary, 'add', '-A');
  git(primary, 'commit', '-qm', 'init');
  git(primary, 'remote', 'add', 'origin', origin);
  git(primary, 'push', '-q', '-u', 'origin', 'main');

  // A second worktree on its own branch, tracking origin/main — exactly how a session works.
  git(primary, 'worktree', 'add', '-q', '-b', 'session-c', secondary, 'main');
  git(secondary, 'branch', '--set-upstream-to=origin/main', 'session-c');

  return { tmp, primary, secondary };
}

/** Invoke the adapter the way Claude Code does: JSON on stdin, cwd = the PRIMARY tree. */
function runAdapter(command, cwd) {
  const res = spawnSync(process.execPath, [ADAPTER], {
    cwd,
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
    encoding: 'utf8',
  });
  return { code: res.status, stderr: res.stderr || '' };
}

function check(label, got, want) {
  if (got === want) { console.log(`  PASS  ${label} (exit ${got})`); pass++; }
  else { console.log(`  FAIL  ${label} (expected ${want}, got ${got})`); fail++; }
}

if (!fs.existsSync(ADAPTER)) {
  console.error(`adapter not found at ${ADAPTER}`);
  process.exit(1);
}

console.log('T-401 adapter reads the command\'s target worktree');

/* ── 1. the exact failure of 18-Sep-2026 ─────────────────────────────────────
   Secondary has a docs-only commit carrying CASES-NA and must be allowed to
   push. The primary is left STALE — on another branch, behind main — which is
   what made the range unreadable. The adapter must judge the secondary. */
{
  const { tmp, primary, secondary } = scaffold();

  // secondary: a legitimate docs-only change with the escape token
  fs.writeFileSync(path.join(secondary, 'docs', 'registers', 'NOTES.md'), 'seed\nrow added\n');
  git(secondary, 'add', '-A');
  git(secondary, 'commit', '-qm', 'docs: add a row\n\nCASES-NA: documentation only.');

  // primary: stale. Another branch, and main moved on without it.
  git(primary, 'checkout', '-q', '-b', 'other');
  fs.writeFileSync(path.join(primary, 'src', 'stale.ts'), 'export const stale = 1\n');
  git(primary, 'add', '-A');
  git(primary, 'commit', '-qm', 'feat: unjustified code change with no cases');

  const { code, stderr } = runAdapter(
    `cd "${secondary}" && git push origin HEAD:main`, primary,
  );
  check('docs-only CASES-NA push is allowed despite a stale primary', code, 0);
  if (code !== 0) console.log('        adapter said: ' + stderr.split('\n')[0]);

  fs.rmSync(tmp, { recursive: true, force: true });
}

/* ── 2. the opposite direction, which matters more ───────────────────────────
   A genuinely unjustified code change in the TARGET worktree must still be
   refused, even when the primary tree is spotless. Without this, "fix" the
   adapter by always allowing and the suite still goes green. */
{
  const { tmp, primary, secondary } = scaffold();

  fs.writeFileSync(path.join(secondary, 'src', 'thing.ts'), 'export const thing = 1\n');
  git(secondary, 'add', '-A');
  git(secondary, 'commit', '-qm', 'feat: a behaviour change with no test case');

  const { code } = runAdapter(`cd "${secondary}" && git push origin HEAD:main`, primary);
  check('unjustified code push is still refused', code, 2);

  fs.rmSync(tmp, { recursive: true, force: true });
}

/* ── 3. git -C is the same statement in another shape ────────────────────── */
{
  const { tmp, primary, secondary } = scaffold();

  fs.writeFileSync(path.join(secondary, 'src', 'thing.ts'), 'export const thing = 1\n');
  git(secondary, 'add', '-A');
  git(secondary, 'commit', '-qm', 'feat: a behaviour change with no test case');

  const { code } = runAdapter(`git -C "${secondary}" push origin HEAD:main`, primary);
  check('git -C target is honoured, and still refused', code, 2);

  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('');
console.log(`${pass} passed, ${fail} failed.`);
process.exit(fail === 0 ? 0 : 1);
