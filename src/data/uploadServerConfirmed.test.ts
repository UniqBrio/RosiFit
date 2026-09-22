import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * T18–T23: THE UPLOAD MAY ONLY DECLARE WHAT THE SERVER HAS CONFIRMED,
 * and the Attendance screen must not blank while it is being refreshed.
 *
 * Run: npx tsx --test src/data/uploadServerConfirmed.test.ts
 *
 * WHY ON THE SOURCE. `app/upload.tsx` renders in React Native and pulls in
 * expo-router; it cannot be imported in this runner. The WORDS it uses are
 * pure modules with their own specs (`uploadProgress.ts`, `uploadSafety.ts`,
 * `freshness.ts`); what those cannot see is whether the screen is wired to
 * them and whether anything else can reach a result. Same shape, and the
 * same reason, as `importRevalidates.test.ts`.
 *
 * THE PROPERTY BEING DEFENDED. A progress indicator makes a result screen
 * look more authoritative. Everything here exists so that the extra authority
 * is deserved: the only thing that can put "imported" on screen is the
 * server having said so.
 */

const ROOT = process.env.UPLOAD_CONFIRMED_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => {
  const full = path.join(ROOT, rel);
  assert.ok(fs.existsSync(full),
    `${ROOT} is not the repository root: no ${rel}. Set UPLOAD_CONFIRMED_SPEC_ROOT.`);
  return fs.readFileSync(full, 'utf8');
};

/** Comments stripped: these claims are about code, not about prose describing it. */
const codeOnly = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

const upload = () => read('app/upload.tsx');
const uploadCode = () => codeOnly(upload());

/* ===================================================================== T18
 * COMPLETION IS THE SERVER'S ANSWER, AND NOTHING ELSE.
 */

test('T18: the commit is still awaited, and its answer is what ends the upload', () => {
  assert.match(uploadCode(), /await csvCommit\(/);
});

test('T18: every result state is reached from a server answer or the fixture branch', () => {
  /* Each `setPhase('done')` is checked against what precedes it. The four
     legitimate reasons, all of them the server or a deliberate no-server
     branch, are:
       · `already_imported` came back on the preview  — the server answered
       · `await csvCommit(...)` resolved              — the server answered
       · the whole batch was set aside / already in   — nothing ran at all
       · the fixtures answered, with no project configured
     Anything else reaching a result is what this test exists to catch. */
  const code = uploadCode();
  const reasons = [
    /already_imported/, /await csvCommit\(/, /assembleBatch\(/, /fixtureOutcome\(/,
  ];
  let from = 0;
  let checked = 0;
  for (;;) {
    const at = code.indexOf("setPhase('done')", from);
    if (at === -1) break;
    from = at + 1;
    checked += 1;
    // The statements that led here. Generous on purpose: the point is that
    // SOMETHING server-shaped is near, not to pin an exact line.
    const before = code.slice(Math.max(0, at - 1400), at);
    assert.ok(reasons.some(r => r.test(before)),
      `a result screen at character ${at} is reached without a server answer or the `
      + 'fixture branch in sight');
  }
  assert.ok(checked >= 4, `expected the known result paths, found ${checked}`);
});

test('T18: the register is announced only after the commit resolved', () => {
  // Regression on RC-034's fix, which this change must not disturb: the
  // announcement sits on the success path, between csvCommit and the result.
  const code = uploadCode();
  const commit = code.indexOf('await csvCommit(');
  const done = code.indexOf("setPhase('done')", commit);
  assert.ok(code.slice(commit, done).includes('attendanceImported()'),
    'nothing between csvCommit and the result tells the mounted lists to refetch');
});

/* ===================================================================== T19
 * NO TIMER CAN DECLARE SUCCESS.
 */

test('T19: the only timer in the upload is the one that changes a label', () => {
  const code = uploadCode();
  const timers = [...code.matchAll(/set(?:Timeout|Interval)\s*\(([\s\S]{0,160})/g)]
    .map(m => m[1]);
  assert.ok(timers.length > 0, 'the still-working label needs its timer');
  for (const body of timers) {
    assert.match(body, /setStillWorking\(true\)/,
      `a timer in app/upload.tsx does something other than change the waiting label: ${body.slice(0, 80)}`);
  }
});

test('T19: no timer callback reaches a result state', () => {
  const code = uploadCode();
  for (const m of code.matchAll(/set(?:Timeout|Interval)\s*\(([\s\S]{0,300})/g)) {
    for (const forbidden of ['setPhase', 'setOutcome', 'setBatch(', 'setAlready']) {
      assert.ok(!m[1].includes(forbidden),
        `a timer calls ${forbidden} — a countdown reaching zero must never be an outcome`);
    }
  }
});

test('T19: the still-working flag is never read as a result', () => {
  // It may only be rendered. If anything branches on it to decide what
  // happened, it has become a clock deciding the outcome.
  const code = uploadCode();
  assert.ok(!/stillWorking\s*(&&|\?)[\s\S]{0,120}setPhase/.test(code),
    'the waiting label is being used to drive state');
});

test('T19: no numeric estimate appears in the upload screen', () => {
  // Deferred deliberately: nothing in this repository has measured the
  // import path (T-068 and V-01 are both unrun), and the documented Edge CPU
  // ceiling of 2s is an order of magnitude below the 15s that was proposed.
  const code = uploadCode();
  assert.doesNotMatch(code, /seconds? (left|remaining)|remainingSeconds|countdown|estimatedSeconds/i);
});

/* ===================================================================== T20
 * FIXTURE MODE CANNOT REPORT A SUCCESS ON A REAL ORIGIN.
 */

test('T20: the screen consults the fixture-mode guard', () => {
  assert.match(uploadCode(), /fixtureModeRefusal\(/);
});

test('T20: every branch that answers from fixtures is guarded', () => {
  /* `fixtureOutcome` and the `!isConfigured` preview branches are the three
     places a result can be invented. A guard at the door only is not enough:
     a guard one call away from the fabrication is a guard a later edit walks
     around. */
  const code = uploadCode();
  let from = 0;
  let guarded = 0;
  for (;;) {
    const at = code.indexOf('!isConfigured', from);
    if (at === -1) break;
    from = at + 1;
    const after = code.slice(at, at + 700);
    assert.ok(after.includes('fixtureRefusal'),
      `an !isConfigured branch at character ${at} can answer without checking the guard`);
    guarded += 1;
  }
  assert.ok(guarded >= 2, `expected the fixture branches to be guarded, found ${guarded}`);
});

test('T20: every place a fixture RESULT is built is guarded', () => {
  /* The branch that actually fabricates an outcome is gated on
     `!staged.preview`, not on `!isConfigured` -- so the scan above walked
     straight past it. Found by mutation: deleting the guard from the commit
     branch left every assertion green. This one looks at the fabrication
     itself, which is the thing that must never be reachable unguarded. */
  const code = uploadCode();
  let from = 0;
  let sites = 0;
  for (;;) {
    const at = code.indexOf('fixtureOutcome(', from);
    if (at === -1) break;
    from = at + 1;
    // The definition itself is not a call site.
    if (/function\s+fixtureOutcome\($/.test(code.slice(Math.max(0, at - 40), at + 15))) continue;
    sites += 1;
    const before = code.slice(Math.max(0, at - 600), at);
    assert.ok(before.includes('fixtureRefusal'),
      `a fixture result is built at character ${at} without the origin guard in front of it`);
  }
  assert.ok(sites >= 2, `expected both fixture result paths, found ${sites}`);
});

test('T20: the guard is applied before the file picker opens as well', () => {
  const code = uploadCode();
  const choose = code.indexOf('const choose = async ()');
  assert.notEqual(choose, -1, 'the pick handler has been renamed');
  const pick = code.indexOf('await pickCsvFiles()', choose);
  assert.ok(code.slice(choose, pick).includes('fixtureRefusal'),
    'a build that cannot import anything still opens the picker and reads the files');
});

test('T20: the guard reads the real origin, not a build-time flag alone', () => {
  // `isConfigured` alone is what failed: a bundle built without its settings
  // reports false and then behaves as though that were fine.
  assert.match(uploadCode(), /location\?\.hostname|location\.hostname/);
});

/* ===================================================================== T21
 * A LOST RESPONSE IS NOT "NOTHING WAS WRITTEN".
 */

test('T21: the commit failures go through commitFailureText', () => {
  assert.match(uploadCode(), /commitFailureText\(/);
});

test('T21: no commit catch hardcodes the old flat sentence', () => {
  /* The preview may still say it — it stages a `previewed` row and touches
     no attendance — and does, through previewFailureText. What must not
     survive is the COMMIT asserting it from a template literal. */
  const code = uploadCode();
  for (const m of code.matchAll(/await csvCommit\([\s\S]{0,1800}?\}\s*catch\s*\(err\)\s*\{([\s\S]{0,700}?)\n\s{4,6}\}/g)) {
    assert.ok(!/Nothing was written/.test(m[1]),
      'a commit catch still states flatly that nothing was written, which it cannot know');
  }
});

test('T21: the preview keeps its own wording, through its own helper', () => {
  assert.match(uploadCode(), /previewFailureText\(/);
});

/* ===================================================================== T22
 * REVALIDATION DOES NOT BLANK THE ATTENDANCE LIST.
 */

const attendance = () => read('app/(tabs)/attendance.tsx');

test('T22: the skeleton is still shown for a genuine first load', () => {
  assert.match(codeOnly(attendance()), /attendance\.state === 'loading'/);
});

test('T22: nothing on the screen draws a skeleton for a revalidation', () => {
  // `isRevalidating` may be rendered as a quiet mark. The moment it gates a
  // Skeleton, the register blanks every time the app regains focus, which is
  // the defect this whole change exists to avoid.
  const code = codeOnly(attendance());
  assert.ok(!/isRevalidating[\s\S]{0,200}<Skeleton/.test(code),
    'the Attendance list is skeletoned while it is being revalidated');
});

test('T22: kept data after a failed refresh is still rendered, not thrown away', () => {
  /* asyncState.ts keeps `state === 'ready'` with `error` set, and something
     has to notice that combination rather than treating any error as fatal.
     It lives in the shared rule now, and the shared component draws it, so
     both halves are asserted. Re-pointed when the indicator moved out of
     this screen into src/components/FreshnessLine.tsx; the claim is
     unchanged. */
  assert.match(codeOnly(read('src/data/freshness.ts')),
    /read\.state !== 'ready'[\s\S]{0,200}read\.error !== null/,
    'the shared rule no longer distinguishes a failed REFRESH from a failed first load');
  assert.match(codeOnly(attendance()), /<FreshnessLine\s/,
    'Attendance keeps data after a failed refresh and never says so');
});

test('T23: the screen says how fresh what it is showing is', () => {
  assert.match(codeOnly(attendance()), /<FreshnessLine\s+read=\{attendance\}/,
    'the freshness line is not given the attendance read');
});

test('T23: the freshness line distinguishes a failed refresh from a good one', () => {
  const src = codeOnly(read('src/components/FreshnessLine.tsx'));
  assert.match(src, /freshness\.kind === 'stale'/,
    'the same line is drawn whether or not the refresh failed');
  assert.match(codeOnly(read('src/data/freshness.ts')), /Couldn’t refresh/);
});

test('T23: the freshness label is re-asked as time passes', () => {
  /* Computed once off `Date.now()`, "Updated just now" freezes: a screen
     left open and untouched never re-renders. The tick moved with the line
     into the shared component; it moves a label and nothing else, which the
     next assertion holds shut. */
  const src = codeOnly(read('src/components/FreshnessLine.tsx'));
  assert.match(src, /setInterval\([\s\S]{0,80}setNow\(Date\.now\(\)\)/,
    'the freshness line is frozen at first render');
});

test('T23: that tick cannot touch anything but the clock it reads', () => {
  const src = codeOnly(read('src/components/FreshnessLine.tsx'));
  for (const m of src.matchAll(/set(?:Timeout|Interval)\s*\(([\s\S]{0,200})/g)) {
    assert.match(m[1], /setNow\(/,
      `a timer in the freshness line does something other than move the clock: ${m[1].slice(0, 70)}`);
  }
});

test('T22: useAsync is the only thing that decides loading, and it is the tested one', () => {
  const hooks = read('src/data/hooks.ts');
  assert.ok(hooks.includes("from './asyncState'"),
    'useAsync no longer uses the reducer whose rules are the tested ones');
  assert.ok(hooks.includes('isRevalidating') && hooks.includes('fetchedAt'),
    'useAsync stopped exposing what a screen needs to tell the two apart');
});

/* ===================================================================== T23
 * THE UPDATED DATA APPEARS, AND SAYS HOW FRESH IT IS.
 */

test('T23: Attendance subscribes to the register moving', () => {
  const hooks = read('src/data/hooks.ts');
  const start = hooks.indexOf('export function useAttendance(');
  assert.notEqual(start, -1);
  const body = hooks.slice(start, start + 600);
  assert.ok(body.includes('onAttendanceChanged'),
    'the Attendance tab would not hear an import at all');
});

test('T23: the import announces on that same bus', () => {
  const repo = read('src/data/repository.ts');
  const start = repo.indexOf('export function attendanceImported()');
  assert.notEqual(start, -1);
  const body = repo.slice(start, start + 300);
  assert.ok(body.includes('attendanceChanged()') && body.includes('membersChanged()'));
});
