FAIL-FIRST: src/data/meetCsv.test.ts - observed failing against the parser it replaces. The
pre-fix parser read `lines[0]` as the header and captured no meta; restoring exactly that
produced 6 failures from 23, headed by the one that matters:

    not ok 1 - a REAL export with a preamble is read, not refused
    not ok 2 - the preamble lines are counted, not silently swallowed
    not ok 4 - a preamble row is never mistaken for a member
    not ok 5 - the meeting code is captured, because it is the only evidence of WHICH meeting
    not ok 6 - created and ended times are captured verbatim
    not ok 8 - an unquoted timestamp split across commas is rejoined, not truncated
    # pass 17  # fail 6

not ok 1 is the shipped defect, not a hypothetical: a genuine Google Meet export was refused
with "that file has no Full Name column", so the reader was wrong and the message blamed the
file. not ok 4 is the one that would have corrupted an import rather than blocking it --
"Meeting code" read in as a member's name.

FAIL-FIRST: src/theme/hue.test.ts - this spec caught its defect DURING development, and the
failure was reproduced afterwards by restoring it (taking the modulo before the round instead
of after):

    not ok 10 - every hue it returns is inside 0..359, which is what the generator takes
    # pass 9  # fail 1

A red one point off pure has a true hue of 359.765, which rounded UP to 360 -- a position
check-contrast.ts never measures, because the sweep it verifies is 0..359.

FAIL-FIRST: src/data/report.test.ts - the arithmetic it covers replaced hardcoded arrays, so
the two defects a re-implementation would most plausibly carry were injected instead: averaging
each group's member percentages rather than summing expected and attended, and returning 0 for
a group where nothing was expected. 6 failures from 14:

    not ok 2 - the Courses scope groups and SUMS, it does not average percentages
    not ok 4 - groups come back in a stable, name-sorted order
    not ok 5 - nothing expected is null, NEVER zero per cent
    not ok 6 - a group where nobody was expected is null too
    not ok 7 - one expected member rescues a group from null
    not ok 9 - the total of an empty set is null, not a division by zero
    # pass 8  # fail 6

not ok 5 is the one that misleads a reader of the report: a course with no sessions this month
and a course everybody skipped are different facts, and 0% states the second about the first.

FAIL-FIRST: src/data/distribution.test.ts - the arithmetic was extracted verbatim from the
dashboard's render body, so it could not fail as-found; the two defects the spec exists to hold
were injected instead - dropping the Math.max clamp on `missed`, and dropping the not-expected
segment. 5 failures from 10:

    not ok 3 - a REDUCED schedule counts as not-expected, never as missed
    not ok 5 - a reduced schedule AND an absence are counted separately
    not ok 6 - attending more than expected is an extra, never a negative miss
    not ok 7 - one extra does not cancel another member's real absence
    not ok 8 - a member expected at nothing is entirely not-expected
    # pass 5  # fail 5

not ok 3 is the consequential one: a member on a 4-day override reads as a 6-day member who
skipped twice, and gets chased for two sessions she was never due at. not ok 7 is the quieter
one - one member's extra attendance cancelling another's real absence, so the academy's total
misses are under-reported.

All four specs pass with the injected defects reverted: 113/113 across the suite.

---

GATE VERDICT UNCHANGED BY THIS BRANCH. The run below is FAIL, and was FAIL on main before any
of this work: "6 pass, 4 fail, 1 blocked" on 2026-09-02 and the same on 2026-09-03. Every one of
those five is a structural gap in the repo, not a regression from these commits, and each was
checked rather than assumed:

  * G1/G2/G3 (theme artifacts, tokens in sync, theme assets per theme) - all three open
    design/tokens.json, which has NEVER been committed: `git log --all -- design/tokens.json`
    returns nothing. The 2026-09-02 run failed the same way, with a Windows path in the error.
  * G6 (Lint) - BLOCKED. eslint is not a dependency; `grep -c eslint package.json` is 0. The
    gate refuses to fetch it from the registry on purpose, so this class stays unverified.
  * G8 (Functional / integration) - runs `npm run test:functional`, which is not a script in
    package.json ("Missing script"). Nothing to execute, so nothing can pass.

What this branch DID verify, on this machine:
  * npm run check green - 113 unit assertions (57 added here), 2836/2836 contrast pairs,
    75/75 canvas icons.
  * npm run audit:all clean, with three ratchets PAID DOWN rather than baselined:
    hardcoded colours 13 -> 11 in app/, test ids 26 -> 24 in app/.
  * bash db/harness/test.sh - Postgres 16 IS available in this session, so the DB harness ran
    for the first time (TD-010's remaining half is closed on this machine). 215 assertions pass.
    0019 and 0020 both apply cleanly, and the two specs added here pass in full:
    13_branch_add_remove.sql 11/11 and 14_delete_course.sql 16/16.

    TWO specs fail, and BOTH are pre-existing. Proved rather than assumed: with 0019, 0020,
    13_* and 14_* moved out of the tree, the harness fails identically, at the same line
    numbers, on main's schema alone.
      - 09_grants.sql - "authenticated holds exactly the table privileges 0002-0010 intended"
        wants holidays [INSERT,SELECT,UPDATE] and gets [DELETE,INSERT,SELECT,UPDATE]. 0017
        added that DELETE grant deliberately, so the SPEC is stale against a later migration.
        Neither is touched here: test files are append-only, and 0017 is applied.
      - 11_holiday_delete.sql - errors at its own setup, before any assertion runs
        ("duplicate key value violates unique constraint sessions_unique_live").
  * Every screen changed was driven in a real browser in BOTH themes: the simplified dashboard,
    the courses branch filter, the reports export (downloaded and its CSV content read), the
    upload session map against three real Meet-shaped files, and all four hex-input paths.

One earlier claim in this session was WRONG and is corrected here: a low-contrast reading of
1.12:1 on stack screen titles in dark mode was an artefact of a verification script walking up
to an ancestor container instead of the painted header. Pixel sampling of the header shows
#0C0409 in dark and #FBF8FA in light, identical with and without a change I had begun making,
so app/_layout.tsx was left exactly as it was. There was no contrast defect.

---

FAIL-FIRST: src/data/schedule.test.ts - observed failing against the implementation it replaces
before it was trusted. The two call sites in repository.ts each carried their own inline copy of
the schedule-window arithmetic; both were re-injected into src/data/schedule.ts - `effective_to
<= onDate` (an exclusive end, which is what an inline `to < today` guard becomes once the row is
closed at `new_start - 1`) and a bare `out.set(...)` with no comparison (last row wins, which is
what a plain overwrite loop does). From 10 cases that produced 2 failures and 8 still-passing:

    not ok 3 - a version ENDING today is still in force -- both ends are inclusive
    not ok 8 - row order does not decide the answer
    # pass 8  # fail 2

Both defects were reverted; 10/10 pass and 32/32 across all spec files. The first failure is the
one worth naming: an exclusive end leaves the CHANGEOVER DAY covered by neither version, so on
the day a schedule changes every member is expected at nothing and nothing errors.

NOT OBSERVED FAILING: supabase/tests/12_offering_schedule.sql - 17 assertions on 0018
(set_offering_schedule exists at all, weekday sorting and de-duplication, the staff refusal,
versioning and the closure date, the same-day correction, the completed-session guard from both
sides plus the day-after boundary its error message promises, empty and out-of-range weekdays,
and that offering_schedules STILL has no direct write policy). It has never been run: no docker,
no psql, no postgres binary on this machine (TD-010's remaining half), so `bash db/harness/
test.sh` cannot start. It will first execute in CI. The same remains true of 10_add_member.sql
and 11_holiday_delete.sql from the parallel sessions.

0018 IS NOT APPLIED. It is committed as a file. The live schema is 0001-0015; set_offering_schedule
is absent from it, confirmed by a read-only PostgREST probe from a parallel session. Applying it
is the repo owner's decision, and CLAUDE.md's rule stands: the live Supabase project is never an
automated target without explicit instruction.

---

## Gate run - 2026-09-03 - VERDICT: FAIL

Steps: 6 pass, 4 fail, 1 blocked.

- **G1 Theme artifacts in sync** - FAIL

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS
- **G5 Types** - PASS
- **G6 Lint** - BLOCKED - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - PASS
- **G8 Functional / integration** - FAIL

```
exit 1
```

- **G9 Automation addressability** - PASS
- **G10 Backward compatibility (fixtures)** - PASS
- **G11 Wide tables are configurable** - PASS

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-03 - VERDICT: FAIL

Steps: 6 pass, 4 fail, 1 blocked.

- **G1 Theme artifacts in sync** - FAIL

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS
- **G5 Types** - PASS
- **G6 Lint** - BLOCKED - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - PASS
- **G8 Functional / integration** - FAIL

```
exit 1
```

- **G9 Automation addressability** - PASS
- **G10 Backward compatibility (fixtures)** - PASS
- **G11 Wide tables are configurable** - PASS

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-02 - VERDICT: FAIL

Steps: 6 pass, 4 fail, 1 blocked.

- **G1 Theme artifacts in sync** - FAIL

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G3 Theme assets present per theme** - FAIL

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G4 No hard-coded colours** - PASS
- **G5 Types** - PASS
- **G6 Lint** - BLOCKED - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - PASS
- **G8 Functional / integration** - FAIL

```
exit 1
```

- **G9 Automation addressability** - PASS
- **G10 Backward compatibility (fixtures)** - PASS
- **G11 Wide tables are configurable** - PASS

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

FAIL-FIRST: src/data/holiday.test.ts - observed failing against injected defects before it was
trusted. Two changes to src/data/holiday.ts - `if (!to) return { from, to: '' }` (an empty end
date becoming an OPEN-ENDED range instead of a one-day closure) and `return holiday.branch ===
branch` (dropping the `branch === null` arm, which inverts the widest closure the product has
into the narrowest) - produced, from 12 cases, 3 failures and 9 still-passing:

    not ok 1 - an empty end date is a ONE-DAY closure, not an open-ended one
    not ok 7 - both ends of the range are INCLUSIVE
    not ok 8 - branch null means EVERY branch, never none
    # pass 9  # fail 3

Both defects were reverted and all 12 pass; 22/22 across both spec files.

NOT OBSERVED FAILING: supabase/tests/11_holiday_delete.sql - 18 assertions on 0017 (insert marks,
range edit re-marks, delete restores, completed and cancelled untouched, the BEFORE DELETE
ordering clearing sessions.holiday_id ahead of the foreign key, the audit trail, and that
apply_holiday/remove_holiday are still NOT executable by `authenticated`). It has never been
run: there is no docker, no psql and no postgres server binary on this machine (TD-010's
remaining half), so `bash db/harness/test.sh` cannot start. It will first execute in CI. The
same is true of supabase/tests/10_add_member.sql from the parallel session.

Gate G8 Functional / integration still FAILs on a missing `test:functional` script (TD-006) -
which remains the one step that would have caught RC-008, and would catch a delete button whose
migration is unapplied (TD-013).

---

## Gate run - 2026-09-02 - VERDICT: FAIL

Steps: 6 pass, 4 fail, 1 blocked.

- **G1 Theme artifacts in sync** - FAIL

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G3 Theme assets present per theme** - FAIL

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G4 No hard-coded colours** - PASS
- **G5 Types** - PASS
- **G6 Lint** - BLOCKED - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - PASS
- **G8 Functional / integration** - FAIL

```
exit 1
```

- **G9 Automation addressability** - PASS
- **G10 Backward compatibility (fixtures)** - PASS
- **G11 Wide tables are configurable** - PASS

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

FAIL-FIRST: src/data/attendance.test.ts - observed failing against an injected defect before it was trusted.
Removing the `if (d > new Date()) continue` guard and setting `expected: true` unconditionally in
attendanceFixture produced, from 10 cases, 2 real failures and 8 still-passing:

    not ok 2 - no row is dated in the future
      error: '2026-09-11 is in the future'
    not ok 3 - an absent row is always expected - the table's own invariant
      expected: false / actual: true
    # pass 8  # fail 2

The defect was reverted and all 10 pass. G7 Unit + pure specs moves FAIL -> PASS with this file;
`npm run test:unit` is now part of `npm run check`.

Still failing, all pre-existing and none touched by this change: G1/G2/G3 want design/tokens.json,
which this app does not have (its measured palette is src/theme/tokens.ts, verified by
`npm run check:contrast` - 2800/2800 pairs). G8 runs `npm run test:functional`, a script that does
not exist. G6 has no local eslint.

---

## Gate run - 2026-09-02 - VERDICT: FAIL

Steps: 6 pass, 4 fail, 1 blocked.

- **G1 Theme artifacts in sync** - FAIL

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G3 Theme assets present per theme** - FAIL

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G4 No hard-coded colours** - PASS
- **G5 Types** - PASS
- **G6 Lint** - BLOCKED - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - PASS
- **G8 Functional / integration** - FAIL

```
exit 1
```

- **G9 Automation addressability** - PASS
- **G10 Backward compatibility (fixtures)** - PASS
- **G11 Wide tables are configurable** - PASS

_Merge blocked. Every FAIL above must resolve. No partial merges._

---


## Gate run - 2026-09-02 - VERDICT: FAIL

Steps: 6 pass, 4 fail, 1 blocked.

- **G1 Theme artifacts in sync** - FAIL

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G3 Theme assets present per theme** - FAIL

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G4 No hard-coded colours** - PASS
- **G5 Types** - PASS
- **G6 Lint** - BLOCKED - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - PASS
- **G8 Functional / integration** - FAIL

```
exit 1
```

- **G9 Automation addressability** - PASS
- **G10 Backward compatibility (fixtures)** - PASS
- **G11 Wide tables are configurable** - PASS

_Merge blocked. Every FAIL above must resolve. No partial merges._

---
# Test summary

_Newest run first. Append-only: never overwrite a prior run._

---

## Gate run - 2026-09-02 - VERDICT: FAIL

Steps: 5 pass, 5 fail, 1 blocked.

- **G1 Theme artifacts in sync** - FAIL

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS
- **G5 Types** - PASS
- **G6 Lint** - BLOCKED - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL

```
exit 1
```

- **G8 Functional / integration** - FAIL

```
exit 1
```

- **G9 Automation addressability** - PASS
- **G10 Backward compatibility (fixtures)** - PASS
- **G11 Wide tables are configurable** - PASS

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-02 - VERDICT: FAIL

Steps: 5 pass, 5 fail, 1 blocked.

- **G1 Theme artifacts in sync** - FAIL

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS
- **G5 Types** - PASS
- **G6 Lint** - BLOCKED - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL

```
exit 1
```

- **G8 Functional / integration** - FAIL

```
exit 1
```

- **G9 Automation addressability** - PASS
- **G10 Backward compatibility (fixtures)** - PASS
- **G11 Wide tables are configurable** - PASS

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-02 - VERDICT: FAIL

Steps: 5 pass, 5 fail, 1 blocked.

- **G1 Theme artifacts in sync** - FAIL

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G3 Theme assets present per theme** - FAIL

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G4 No hard-coded colours** - PASS
- **G5 Types** - PASS
- **G6 Lint** - BLOCKED - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL

```
exit 1
```

- **G8 Functional / integration** - FAIL

```
exit 1
```

- **G9 Automation addressability** - PASS
- **G10 Backward compatibility (fixtures)** - PASS
- **G11 Wide tables are configurable** - PASS

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

