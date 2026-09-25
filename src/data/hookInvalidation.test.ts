import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * T8–T17: EVERY READ HEARS THE WRITES THAT MOVE IT.
 *
 * Run: npx tsx --test src/data/hookInvalidation.test.ts
 *
 * THE DEFECT CLASS. RC-034: *"On uploading attendance csv file the data is
 * reflecting on members card only after refresh."* Its root cause was not a
 * cache — *"Not a caching bug: nothing stale was stored. Nobody was told to
 * ask again."* It was fixed for the member cards and the register, and the
 * same fault was left standing on a dozen other reads: a hook with no
 * subscription keeps whatever it read on mount until something remounts it.
 *
 * WHY ON THE SOURCE. `hooks.ts` imports React and `repository.ts`, which
 * pulls in the Supabase client and AsyncStorage — none of which resolves in
 * this runner. Same constraint, and same answer, as
 * `importRevalidates.test.ts`.
 *
 * WHAT EACH CASE ASSERTS is the whole chain, in the terms the audit set out:
 *
 *   mutation signal  ->  the hook subscribes to THAT signal
 *                    ->  the version it yields is a REVALIDATION key
 *                    ->  so the fetch re-runs and the new data is displayed
 *                        WITHOUT the screen blanking (asyncState.ts holds
 *                        that half).
 *
 * The middle claim is the one that is easy to lose: a version folded into
 * `deps` instead of into `revalidateKey` still refetches, but blanks the
 * screen while it does — which is the defect this whole change exists to
 * remove. So every case checks both.
 */

const ROOT = process.env.HOOK_INVALIDATION_SPEC_ROOT ?? process.cwd();
const HOOKS = path.join(ROOT, 'src/data/hooks.ts');

assert.ok(fs.existsSync(HOOKS),
  `${ROOT} is not the repository root: no src/data/hooks.ts. Set HOOK_INVALIDATION_SPEC_ROOT.`);
const source = fs.readFileSync(HOOKS, 'utf8');

/** The body of an exported hook, up to the closing brace in column one. */
function bodyOf(name: string): string {
  const start = source.indexOf(`export function ${name}(`);
  assert.notEqual(start, -1, `${name} is no longer exported from hooks.ts`);
  const open = source.indexOf('{', start);
  const end = source.slice(open).search(/[\r\n]\}/);
  assert.notEqual(end, -1, `${name} has no closing brace`);
  return source.slice(open, open + end);
}

/** The buses a hook subscribes to, however it spells the subscription. */
function busesOf(name: string): string[] {
  // COMMENTS STRIPPED. `busesOf` used to match `onXChanged` anywhere in the
  // body, so a bus merely DISCUSSED in a comment counted as subscribed —
  // an assertion partly about prose. The claim is about the code.
  const body = bodyOf(name)
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  return [...new Set([...body.matchAll(/\bon([A-Z]\w*?)Changed\b/g)].map(m => `on${m[1]}Changed`))]
    .sort();
}

/**
 * One case per hook: the buses it must hear, and why those and not others.
 * Written out rather than derived, because the POINT is that somebody
 * verified each one against what the fetch actually reads.
 */
const CASES: { id: string; hook: string; buses: string[]; because: string }[] = [
  { id: 'T8', hook: 'useBucketMetrics',
    buses: ['onAttendanceChanged', 'onMembersChanged'],
    because: 'member_period_metrics is attendance per member, and these bars sit on the '
      + 'Overview beside a ring that already refetches — so an import left the two '
      + 'disagreeing on one screen' },
  { id: 'T9', hook: 'useWeekRows',
    buses: ['onAttendanceChanged', 'onMembersChanged'],
    because: 'the same metric as useBucketMetrics over four fixed weeks' },
  { id: 'T10', hook: 'usePendingSessions',
    buses: ['onAttendanceChanged', 'onCoursesChanged', 'onHolidaysChanged'],
    because: 'an import completes the very day this list says is AWAITING a file; the '
      + 'timetable is what creates the session in the first place; and a holiday rewrites '
      + "the `status = 'scheduled'` this read filters on (0007 apply_holiday / remove_holiday)" },
  { id: 'T11', hook: 'useFilterOptions',
    buses: ['onBranchesChanged', 'onCoursesChanged'],
    because: 'it reads branch names and course names, and nothing else' },
  { id: 'T12', hook: 'useMonthSessions',
    buses: ['onAttendanceChanged', 'onCoursesChanged', 'onHolidaysChanged'],
    because: 'sessions.status moves on an import, on a timetable change, and on a holiday '
      + 'applied or lifted (0007, 0017)' },
  { id: 'T13', hook: 'useOfferingEditor',
    buses: ['onBranchesChanged', 'onCoursesChanged'],
    because: 'createOffering and setOfferingSchedule announce on the course bus, and a new '
      + 'branch has to reach the branch picker' },
  { id: 'T14', hook: 'useAudit',
    buses: ['onAttendanceChanged', 'onBranchesChanged', 'onCoursesChanged',
            'onHolidaysChanged', 'onMembersChanged', 'onRulesChanged', 'onSentChanged',
            'onStaffChanged'],
    because: 'audit_logs records every write, so this list is dated by every write — the '
      + 'one read where naming them all is the accurate answer. audit_app_users (0004:107) '
      + 'is why the staff bus belongs in it; leaving it out made the enumeration false' },
  { id: 'T15', hook: 'useNotifications',
    buses: ['onAttendanceChanged', 'onCoursesChanged', 'onHolidaysChanged',
            'onSentChanged', 'onStaffChanged'],
    because: 'FOUR kinds, not three: days awaiting a file (so the same three buses '
      + 'usePendingSessions needs), the recent email batches, and OPEN PIN-RESET REQUESTS '
      + '— answering one from the staff list left the tray asking for it forever' },
  { id: 'T16', hook: 'useStaff',
    buses: ['onStaffChanged'],
    because: 'staff writes are Edge Functions through api.ts, which announces nothing — so '
      + 'repository.ts grew the bus and the call sites ring it' },
  { id: 'T17', hook: 'useCourseMessage',
    buses: ['onCoursesChanged'],
    because: 'saveCourse and saveCourseTrigger are what write the effective message' },
];

for (const c of CASES) {
  test(`${c.id}: ${c.hook} hears exactly ${c.buses.join(' + ')}`, () => {
    assert.deepEqual(busesOf(c.hook), c.buses,
      `${c.hook} must hear ${c.buses.join(' + ')} — ${c.because}`);
  });

  test(`${c.id}: ${c.hook}'s version is a REVALIDATION key, not a dependency`, () => {
    // A version in `deps` refetches AND blanks the screen. The whole change
    // is that these two are no longer the same event.
    const body = bodyOf(c.hook);
    /* POSITIONAL, and it has to be. The first version of this matched
       `useAsync(…, version)` — "version is the last argument" — which
       `useAsync(fn, [x], forced, version)` satisfies with version sitting in
       the TAG slot, four arguments in. That is precisely the confusion the
       assertion was written to catch, and it could not see it. The signature
       is (load, deps, forced, tag, revalidateKey), so the version must be
       the FIFTH argument, with a tag (or `undefined`) fourth. */
    assert.match(body, /,\s*forced\s*,\s*(?:undefined|'[a-z]+')\s*,\s*version\s*\)/,
      `${c.hook} does not pass its version as the fifth argument (the revalidateKey `
      + 'slot), so it is either in `tag` or in `deps` — and in `deps` a write elsewhere '
      + 'in the app still blanks this screen');
    assert.doesNotMatch(body, /\[[^\]]*\bversion\b[^\]]*\]\s*,\s*forced/,
      `${c.hook} still folds version into deps`);
  });
}

/* --------------------------------- the hooks that already had a bus, kept */

test('the hooks fixed by RC-034 still hear their buses', () => {
  // Regression: this change moved every one of them from `deps` to
  // `revalidateKey`, and a move is exactly where a subscription gets dropped.
  for (const [hook, bus] of [
    ['useMembers', 'onMembersChanged'],
    ['useCourses', 'onCoursesChanged'],
    ['useAttendance', 'onAttendanceChanged'],
    ['useCourseWeekDays', 'onAttendanceChanged'],
    ['useCourseDay', 'onAttendanceChanged'],
    ['useMemberWeek', 'onAttendanceChanged'],
    ['useHolidays', 'onHolidaysChanged'],
    ['useRemarks', 'onRemarksChanged'],
    ['useBranchUsage', 'onBranchesChanged'],
    ['useSentForPeriod', 'onSentChanged'],
    ['useRules', 'onRulesChanged'],
  ] as const) {
    assert.ok(busesOf(hook).includes(bus), `${hook} lost ${bus}`);
  }
});

test('every pre-existing subscriber now revalidates instead of blanking', () => {
  for (const hook of [
    'useMembers', 'useCourses', 'useAttendance', 'useCourseWeekDays', 'useCourseDay',
    'useMemberWeek', 'useHolidays', 'useRemarks', 'useBranchUsage', 'useSentForPeriod',
    'useRules', 'useFollowUp',
  ]) {
    assert.doesNotMatch(bodyOf(hook), /\[[^\]]*\bversion\b[^\]]*\]\s*,\s*forced/,
      `${hook} still folds its version into deps, so a write elsewhere blanks this screen`);
  }
});

/* ------------------------- the two the audit listed that must NOT subscribe */

test('useSenders is deliberately not subscribed: it reads no server state at all', () => {
  // fetchSenders returns the SENDERS constant. There is nothing to be stale
  // about, and a subscription would be to an event that can never fire.
  assert.deepEqual(busesOf('useSenders'), []);
});

test('useTemplates is deliberately not subscribed: its only writer is unreachable', () => {
  // setTemplateActive is the sole writer of email_templates and nothing in
  // app/ or src/ calls it. Verified before deciding, not assumed.
  assert.deepEqual(busesOf('useTemplates'), []);
  const repo = fs.readFileSync(path.join(ROOT, 'src/data/repository.ts'), 'utf8');
  assert.ok(repo.includes('export async function setTemplateActive'),
    'setTemplateActive has moved — re-verify whether a template editor now exists, '
    + 'and if it does, give it a bus and subscribe useTemplates to it');
});

/* ------------------------------------------- the new bus is a real bus */

test('T16: the staff bus is shaped like every other bus in repository.ts', () => {
  const repo = fs.readFileSync(path.join(ROOT, 'src/data/repository.ts'), 'utf8');
  assert.ok(repo.includes('export function onStaffChanged(listener: () => void): () => void'),
    'onStaffChanged must subscribe and hand back an unsubscribe, like its neighbours');
  assert.ok(repo.includes('export function staffChanged()'),
    'nothing can ring the bus');
});

test('T16: the staff writes actually ring it', () => {
  // A bus nobody rings is the same defect as no bus. staff/add is the one
  // that cannot be covered by a call-site retry() at all — it is a dialog
  // over the list it changes.
  const add = fs.readFileSync(path.join(ROOT, 'app/staff/add.tsx'), 'utf8');
  const index = fs.readFileSync(path.join(ROOT, 'app/staff/index.tsx'), 'utf8');
  assert.ok(add.includes('staffChanged()'),
    'creating a staff member from the dialog leaves the list underneath unchanged');
  assert.ok(index.split('staffChanged()').length - 1 >= 3,
    're-enable, PIN issue and remove must each announce');
});
