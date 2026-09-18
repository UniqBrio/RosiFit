#!/usr/bin/env node
/**
 * PreToolUse adapter — the bridge between Claude Code's hook protocol and the git guard.
 *
 * WHY AN ADAPTER RATHER THAN CALLING THE GUARD DIRECTLY
 *   The two see different worlds. A git pre-commit hook runs AFTER the message is written to
 *   .git/COMMIT_EDITMSG and can read the staged index. A PreToolUse hook runs BEFORE the command
 *   executes, so the commit does not exist yet — the message is still inside the command string.
 *
 *   Reading only COMMIT_EDITMSG here would find the PREVIOUS commit's message, which silently
 *   voids every escape token and blocks work that was correctly justified. The adapter's whole
 *   job is to hand the guard the same CHANGE, expressed the way that mode expresses it.
 *
 * PROTOCOL
 *   stdin  : JSON with { tool_name, tool_input: { command } }
 *   exit 0 : allow
 *   exit 2 : BLOCK, and stderr is shown to the agent as the reason
 *   Any other exit is treated as non-blocking. So a bug in THIS file cannot wedge a session —
 *   it fails open, loudly, which is the same contract the guards themselves follow.
 *
 * Install: referenced from .claude/settings.json. Nothing else needed.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const ALLOW = 0;
const BLOCK = 2;

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

let payload = {};
try {
  payload = JSON.parse(readStdin() || '{}');
} catch {
  // Unparseable input is a protocol problem, not a policy violation. Never block on it.
  process.exit(ALLOW);
}

const command = String(payload?.tool_input?.command ?? '');
if (!command) process.exit(ALLOW);

/**
 * The subcommand of every `git` invocation in the command, skipping global options AND the
 * values they consume.
 *
 * The regex this replaced was `git\s+(?:-[^\s]+\s+)*push` — it allowed options but not their
 * arguments, so `git -C /path push` matched nothing and passed the hook untouched. A guard
 * with a one-flag bypass is decoration, and this one had a two-token bypass nobody knew about
 * (T-401).
 */
function gitSubcommands(cmd) {
  const TAKES_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path']);
  const found = [];
  // Split on shell separators so `git add -A && git commit …` is seen as two invocations,
  // not one — the old whole-string test caught the commit by luck of substring matching.
  for (const segment of cmd.split(/&&|\|\||;|\n/)) {
    const m = /\bgit\s+([\s\S]*)/.exec(segment);
    if (!m) continue;
    const toks = m[1].trim().split(/\s+/);
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      if (TAKES_VALUE.has(t)) { i++; continue; }        // skip the option AND its value
      if (t.startsWith('-')) continue;                   // a flag with no value
      found.push(t);
      break;                                             // first non-option is the subcommand
    }
  }
  return found;
}

// Only git commit and git push are governed. Everything else passes untouched — a hook that
// inspects every command is a hook that gets disabled for being slow.
const subcommands = gitSubcommands(command);
const isCommit = subcommands.includes('commit');
const isPush = subcommands.includes('push');
if (!isCommit && !isPush) process.exit(ALLOW);

/**
 * WHERE the command will run. Not where this hook happens to be.
 *
 * D-9b gives every session its own worktree, and this hook's cwd is the Claude Code session's
 * PRIMARY working directory regardless of which worktree the command targets. Resolving the
 * repository from process cwd therefore judged whichever branch the primary tree happened to
 * hold, and applied that verdict to a push from somewhere else.
 *
 * Measured 18-Sep-2026 (T-401), in both directions. A docs-only push carrying `CASES-NA` was
 * refused because the primary tree sat five commits behind `main` on another branch, where the
 * range holds no commits to carry an escape token but a non-empty reversed diff — unescapable
 * by anything the pushing session could write. And the mirror, which is worse: with the primary
 * tree clean, an unjustified code change in the target worktree sailed through, because the
 * guard was handed an empty range and found nothing to object to. A guard that reads the wrong
 * repository does not fail closed; it reports on a change nobody made.
 */
function targetCwd(cmd) {
  // `git -C <path>` names the repository outright, so it wins over any `cd`.
  const dashC = /\bgit\s+(?:-(?!C\b)\S+\s+)*-C\s+(?:"([^"]+)"|'([^']+)'|([^\s;&|]+))/.exec(cmd);
  if (dashC) return dashC[1] ?? dashC[2] ?? dashC[3];
  // Otherwise the shell's own `cd` is what decides, so read the last one before the git call.
  let dir = null;
  const cd = /(?:^|[;&|]\s*)cd\s+(?:"([^"]+)"|'([^']+)'|([^\s;&|]+))/g;
  for (const m of cmd.matchAll(cd)) dir = m[1] ?? m[2] ?? m[3];
  return dir;
}

const declaredCwd = targetCwd(command);
const gitCwd = declaredCwd && fs.existsSync(declaredCwd) ? declaredCwd : process.cwd();

// `--no-verify` bypasses git's own hooks. It must not also bypass this one, or the guards are
// one flag away from being decorative.
const noVerify = /(^|\s)(--no-verify|-n)(\s|$)/.test(command);

const repoRoot = (() => {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: gitCwd, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
})();
if (!repoRoot) process.exit(ALLOW); // not a git repository — nothing to guard

let guard = path.join(repoRoot, 'scripts', 'hooks', 'pre-commit-guard.sh');
if (!fs.existsSync(guard)) {
  // A workspace-mode app LINKS the process half rather than copying it, so the guard lives in
  // the framework, named by .framework-link.json. Without this lookup the DEFAULT scaffold
  // shipped with no commit guards at all - the adapter warned and allowed, on every commit,
  // in exactly the mode most apps use.
  try {
    const link = JSON.parse(fs.readFileSync(path.join(repoRoot, '.framework-link.json'), 'utf8'));
    const linked = path.resolve(repoRoot, String(link.framework ?? ''), 'scripts', 'hooks', 'pre-commit-guard.sh');
    if (fs.existsSync(linked)) guard = linked;
  } catch { /* no link file, or unreadable - fall through to the audible warning */ }
}
if (!fs.existsSync(guard)) {
  // Fail OPEN, but AUDIBLY. A dead guard must never be silent.
  console.error('[framework] pre-commit-guard.sh not found — commit guards are NOT running.');
  process.exit(ALLOW);
}

/**
 * Recover the escape text the way each mode expresses it.
 *   commit : the message is in the command  (-m "...", or a heredoc, or -F file)
 *   push   : the messages are in the commits being pushed, so read the log range
 * Getting this wrong is the classic failure — a token written at commit time is invisible at
 * push time, and every guard silently rejects a correctly justified change.
 */
function escapeTextForCommit() {
  const parts = [];
  for (const re of [/-m\s+"((?:[^"\\]|\\.)*)"/g, /-m\s+'([^']*)'/g, /--message[= ]\s*"((?:[^"\\]|\\.)*)"/g]) {
    for (const m of command.matchAll(re)) parts.push(m[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'));
  }
  // Heredoc form: git commit -m "$(cat <<'EOF' ... EOF)"
  const heredoc = command.match(/<<-?\s*'?(\w+)'?\n([\s\S]*?)\n\s*\1/);
  if (heredoc) parts.push(heredoc[2]);
  // -F <file>
  const fileFlag = command.match(/(?:-F|--file)\s+(\S+)/);
  if (fileFlag) {
    try { parts.push(fs.readFileSync(path.resolve(repoRoot, fileFlag[1]), 'utf8')); } catch { /* ignore */ }
  }
  return parts.join('\n');
}

function pushRange() {
  try {
    const upstream = execFileSync('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], {
      cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return `${upstream}..HEAD`;
  } catch {
    return 'HEAD~1..HEAD'; // no upstream yet — the first push of a new branch
  }
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-'));
const msgFile = path.join(tmp, 'COMMIT_EDITMSG');
fs.writeFileSync(msgFile, isCommit ? escapeTextForCommit() : '', 'utf8');

const env = { ...process.env };
if (isPush) env.PRE_PUSH_RANGE = pushRange();

/*
 * RC-019. This hook runs BEFORE the command, so it inspects the index as it stands now. A
 * command that stages its own changes - `git add -A && git commit -F msg`, or `commit -am` -
 * therefore presents an EMPTY index to the guard, every guard finds no change, and the commit
 * sails through in silence. It is the shape people actually type, so the bypass was the common
 * path rather than an edge case. Tell the guard to read the working tree instead.
 */
const STAGES_ITS_OWN = /\bgit\s+add\b/.test(command)
  || /\bcommit\b[^\n]*\s-[A-Za-z]*a/.test(command);
if (isCommit && STAGES_ITS_OWN) env.GUARD_WORKTREE = '1';

const result = spawnSync('bash', [guard, msgFile], {
  cwd: repoRoot,
  env,
  encoding: 'utf8',
  timeout: 110_000,
});

try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ }

if (result.error || result.status === null) {
  console.error(`[framework] guard could not run (${result.error?.message ?? 'timeout'}) — NOT enforced for this command.`);
  process.exit(ALLOW);
}

if (result.status === BLOCK) {
  console.error(result.stderr || 'Blocked by a framework commit guard.');
  console.error('');
  console.error('Each guard has its OWN escape token, and it excuses only that guard.');
  console.error('There is no global bypass — put the token, with a justification, in the commit message.');
  process.exit(BLOCK);
}

if (noVerify && result.status === 0) {
  console.error('[framework] note: --no-verify skips git\'s own hooks. The framework guards ran anyway.');
}

if (result.stderr?.trim()) console.error(result.stderr.trim()); // SKIPPED warnings stay audible
process.exit(ALLOW);
