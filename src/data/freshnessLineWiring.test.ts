import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * THE STALE INDICATOR IS REACHABLE, AND IT IS THE SAME ONE EVERYWHERE.
 *
 * Run: npx tsx --test src/data/freshnessLineWiring.test.ts
 *
 * THE REGRESSION. `asyncState.ts` made a failed refresh KEEP the last good
 * answer rather than blanking the screen — right, and asked for — but it was
 * silent: nineteen screens read `.error` only behind a `state === 'error'`
 * guard, so data of unbounded age was presented exactly as though it were
 * current.
 *
 * WHY NOT ONE BANNER. That was tried. A single app-wide banner has to
 * aggregate every MOUNTED read, and the tab navigator keeps a tab alive once
 * visited — so it could say "Last updated 9:40 AM" about an invisible screen
 * while the screen in front of you said "Updated just now", and a retry could
 * make the stated age jump backwards. A timestamp is a claim about ONE read
 * and belongs beside that read.
 *
 * `FreshnessLine.tsx` renders in React Native and cannot be imported here;
 * `scripts/tsconfig.json` has no DOM. The RULE is in `src/data/freshness.ts`
 * and is tested there. What that cannot see is whether anything renders it —
 * and a rule nothing draws is the same defect as no indicator at all.
 */

const ROOT = process.env.FRESHNESS_LINE_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => {
  const full = path.join(ROOT, rel);
  assert.ok(fs.existsSync(full),
    `${ROOT} is not the repository root: no ${rel}. Set FRESHNESS_LINE_SPEC_ROOT.`);
  return fs.readFileSync(full, 'utf8');
};
const codeOnly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const line = () => read('src/components/FreshnessLine.tsx');

/* ------------------------------------------------ it asks the one rule */

test('the component decides nothing for itself — it asks the shared rule', () => {
  assert.match(codeOnly(line()), /freshnessOf\(/,
    'a second place deciding what "stale" means is how two screens end up disagreeing');
});

test('it renders nothing when there is nothing honest to say', () => {
  // Before the first answer, and on a first load that failed — which has its
  // own error screen and needs no second opinion from this line.
  assert.match(codeOnly(line()), /if \(!freshness\.label\) return null;/);
});

test('it says the state in WORDS, not in colour alone', () => {
  // Guardrail 3.
  const src = codeOnly(line());
  assert.match(src, /freshness\.label/);
  assert.match(src, /<Icon\s/, 'the icon is the second encoding');
});

/* ------------------------------------------------------------ the retry */

test('a stale line offers a retry', () => {
  assert.match(codeOnly(line()), /read\.retry\(\)/);
});

test('the retry refuses to run during a protected write', () => {
  /* An import is one transaction that writes a row per named member, sweeps
     the rest of the register absent, then reconciles; a read landing between
     those steps sees a register that was never true. T-021's guard is not
     the automatic path's alone — all three refresh entry points respect it. */
  assert.match(codeOnly(line()), /if \(isWriteInFlight\(\)\) return;/);
});

test('the retry is a real tap target', () => {
  // 44 is the floor this app holds every control to.
  assert.match(codeOnly(line()), /minHeight: TAP_MIN,/);
});

test('a retry already running says so rather than looking idle', () => {
  assert.match(codeOnly(line()), /Trying…/);
});

/* ---------------------------------------- it is actually on the screens */

const WIRED: [string, string][] = [
  ['app/(tabs)/attendance.tsx', 'attendance-freshness'],
  ['app/(tabs)/index.tsx', 'overview-freshness'],
  ['app/(tabs)/members.tsx', 'members-freshness'],
  ['app/(tabs)/courses.tsx', 'courses-freshness'],
  ['app/branches.tsx', 'branches-freshness'],
  ['app/staff/index.tsx', 'staff-freshness'],
];

for (const [screen, testID] of WIRED) {
  test(`${screen} draws the shared freshness line`, () => {
    const src = read(screen);
    assert.match(src, /<FreshnessLine\s/,
      `${screen} keeps data after a failed refresh and never says so`);
    assert.ok(src.includes(testID), `${screen} is missing its ${testID} handle`);
  });
}

test('no screen rolls its own version of the sentence', () => {
  // One wording, one place it can change. A screen calling staleLabel or
  // freshnessLabel directly is a second copy waiting to drift.
  for (const [screen] of WIRED) {
    const src = codeOnly(read(screen));
    assert.doesNotMatch(src, /\bstaleLabel\(|\bfreshnessLabel\(/,
      `${screen} builds the freshness sentence itself instead of using FreshnessLine`);
  }
});

/* ------------------------------------------- nothing forbidden crept in */

test('the line never reloads the page and never fetches on a clock', () => {
  const src = codeOnly(line());
  assert.doesNotMatch(src, /location\.reload/);
  // Its one interval ticks a CLOCK so "just now" can become a time; it
  // fetches nothing.
  for (const m of src.matchAll(/setInterval\s*\(([\s\S]{0,120})/g)) {
    assert.match(m[1], /setNow\(/, 'an interval in the freshness line does more than tick a clock');
  }
});

test('the tick is tied to the boundary it renders, not to a number somebody picked', () => {
  assert.match(codeOnly(line()), /JUST_NOW_MS\)/);
});

test('the app-wide banner and its store are gone', () => {
  /* The first attempt. Removed after the fresh-context review showed a single
     banner cannot attribute a timestamp: it aggregated every mounted read,
     could contradict the screen in front of you, and could make the stated
     age jump backwards after a retry. */
  for (const gone of [
    'src/components/StaleBanner.tsx', 'src/data/staleness.ts',
  ]) {
    assert.equal(fs.existsSync(path.join(ROOT, gone)), false,
      `${gone} is back — a second, unattributable staleness indicator`);
  }
  assert.doesNotMatch(read('app/_layout.tsx'), /StaleBanner/);
});
