## RC-044 — a day uploaded off the timetable and then reset offers the upload again (12-Sep-2026)

**The requester's words:** *"when i upload a file on day when its not scheduled then since for
that day attendance was upload hen we should be able to reset aattendance and show that upload
again button right"*. Traced end to end before anything was written: upload, tick, Reset and
"Upload again" all work on an unscheduled day; the RESET is where it broke — the day fell back to
`runs`, which read the timetable alone, and drew a dash over a session the Attendance tab still
listed as awaiting. Production case: Prenatal, Tue 8 Sep (timetabled Mon/Wed/Fri).

**Fix:** `0070_ad_hoc_day_runs_after_reset.sql` — `course_week_day_status.runs` is the timetable
OR a live scheduled/completed session on the date. `create or replace`, same signature, ACL
preserved. No client change: `dayStatusKey` already maps `runs && !uploaded` to `awaiting`.

```
FAIL-FIRST: supabase/tests/49_ad_hoc_day_runs_after_reset.sql — against migrations 0001..0069
            (0070 absent), 3 of 16 FAIL, all on the ad-hoc Saturday's `runs` ("got false want
            true"; "got 5 want 6"; Salem-scoped "got false want true"). 16 of 16 after 0070.
            Full output: .evidence/0070-ad-hoc-day-runs-fail-first.txt
bash db/harness/test.sh          49: 16/16 · 48: 24/24 · 15 failures elsewhere, their names
                                 compared as sorted sets against main's CI db-harness log
                                 (run 34692694007, commit 02e6a93): IDENTICAL. None added,
                                 none removed.
npm run typecheck                clean
unit suite                       1570 cases · 6 FAIL — the same six as RC-043's row
                                 (formDropdownMenu 1, message 5); neither file imports
                                 anything this change touched (comments only in two .ts files)
npm run check:contrast           pass  ·  npm run check:icons  pass
production, READ-ONLY            0070's body run as a SELECT for Prenatal's week of 7 Sep:
                                 Tue 8 Sep runs false → TRUE, every other day unchanged.
                                 .evidence/0070-prenatal-8-sep-read-only-rehearsal-prod.txt
```

**NOT run:** the browser (no client line changed; the strip's `awaiting` press is already held by
`src/components/dayStripUploadButton.test.ts`); `npm run gate` (not re-run for a comment-only
client diff — the verdict on main is recorded in RC-043's row). **NOT applied to production:**
the raw SQL is shown to the owner and waits for the go-ahead CLAUDE.md requires. No run-log row:
no run was opened when the work began, and a duration typed in afterwards is the recalled number
`docs/registers/RUN_LOG.md` forbids.

## RC-043 — the upload died at 1,000 members; csv-import now pages every growing table (12-Sep-2026)

**Found in the live function log, not by reasoning.** Six `POST | 500 | csv-import` between
03:47 and 04:10 UTC, each with `TypeError: Cannot read properties of undefined (reading
'full_name')` at the candidate lookup. Live members had passed 1,000 at 03:40 UTC (935 → 1,041,
one wrong-course batch); the function's `members` read was a bare `.select()` on the service-role
client and came back one page short; the alias table (744 rows) did not, so two names in the
three files ("Ruby nancy", "saranya ramasamy") pointed at members the map no longer held.

**The files were never the problem.** All three parse under the real `parseMeetCsv`: BOM, CRLF,
four preamble lines, 25 + 19 + 30 rows, one day, no future date, every name 2–120 characters.
`.evidence/`-grade check run under node against the actual uploads.

**Fix:** `supabase/functions/_shared/pageAll.ts` (the client pager's contract, verbatim: order
by a selected unique key, anchor on `key > last`, end ONLY on an empty page, throw on any page
error); five reads in the preview go through it and select their key; the non-null assertion on
the lookup becomes an `HttpError` that names the member. `npx tsc --noEmit --ignoreConfig
--strict` on the new pager: clean.

```
src/data/edgeFunctionPagedReads.test.ts   16 of 16 after · 8 of 16 before (below)
npm run typecheck                          clean
npm run check:contrast                     2852/2852
npm run check:icons                        75/75
unit suite                                 1570 cases · 6 FAIL — the SAME six on the untouched
                                           tree (git stash, re-run): formDropdownMenu 1,
                                           message 5. Not this change's files.
npm run gate                               6 pass · 5 fail · 1 blocked — verdict identical to the
                                           two previous runs on main; no class moved.
```

**NOT run:** the DB harness (no migration, no schema surface — N/A); the browser (the change is
server-side, and the fixtures build never calls the function); the function in Deno (no `deno`
on this machine — the pager is exercised under node by the spec, and index.ts's edit is five
call sites and one guard, read twice). **DEPLOYED 12-Sep-2026 10:56 UTC, on the owner's word:** `csv-import` version 17 on
`lhpzhkzbnquwjljmbylo`, `verify_jwt` unchanged (true). Read back from the platform: the bundle
carries all seven files, `_shared/pageAll.ts` included, and the entrypoint imports it. The
deployed source is the repo's, which also carries the two copy commits landed since version 16
("the canonical name" for "her canonical name", and `splitByCourse`'s other-course names). A
live probe from this machine is refused by its network policy (CONNECT 403 to the project
host), so the first real upload is the live check; the function log is where it shows.

FAIL-FIRST: src/data/edgeFunctionPagedReads.test.ts - 16 cases, new file. Run on 12-Sep-2026 against HEAD fd887ed's csv-import/index.ts with the new shared pager already on disk: 8 of 16 failed, and they are exactly the claims this change makes - the function does not import the pager, all five growing-table reads (members, member_aliases, member_emails, member_stats, member_enrollments) are unpaged and select no key, and the candidate lookup is the bare non-null assertion. One more (14, "both pagers end a read only on an empty page") failed for a spec defect - it found `.range(` in the CLIENT pager's own comments - and was corrected to read code rather than prose before the fix went in; the remaining 7 pass in both trees as they must: the five pager behaviour cases run the new file directly, and the two cross-pager agreement cases assert lines that were already true. 16 of 16 after. Full output: .evidence/edge-paged-reads-fail-first.txt.

## RC-042 CLOSED — the function default privilege restored (12-Sep-2026)

Owner-approved. Migration `0069`.

**The first draft would not have worked, and the harness said so.** It revoked
`from anon, authenticated` and stopped; rehearsal came back with
`audit_remarks_immutable` still anon-executable:

```
{=X/postgres, postgres=X/postgres, service_role=X/postgres}
```

The leading `=X` with no grantee is PUBLIC, and `anon` is a member of PUBLIC. All thirteen
functions carry BOTH a PUBLIC grant and a direct one. **That is the 0067 defect pointing the
other way** — 0067 revoked PUBLIC and left the direct grant; this draft revoked the direct grant
and left PUBLIC. Applied to production as drafted, it would have read like a fix and changed
nothing.

**After, verified in production:**

```
pg_default_acl  postgres / public / functions   {postgres=X, service_role=X}
trigger fns reachable by anon or authenticated  0
non-extension fns reachable by anon             0
authenticated keeps week_bounds / normalize_email / metrics / 0067   all true
```

**Nothing broke, and the trigger question is proved rather than reasoned.** Dozens of suite cases
insert and update rows, firing every one of the nine revoked trigger functions, and they pass —
PostgreSQL does not check EXECUTE against the statement's role to fire a trigger. Functional
smoke against production: 7 day-status rows, 892 metrics rows, 287 follow-up candidates,
`week_bounds` and `normalize_email` both correct.

```
DB suite   before 0069   725 PASS / 10 FAIL
           after  0069   732 PASS /  9 FAIL
```

The one that went green is **"no trigger function is executable by anon or authenticated"** — red
on `main` with no diagnosis until 0067's own defect led to its cause.

**A correction carried into both registers rather than left standing:** RC-042 and
`migrationGrants.test.ts` said a `create or replace` would "silently re-acquire the grant". That
is wrong — PostgreSQL preserves a function's ACL across CREATE OR REPLACE. The exposure was new
functions and drop-and-recreate. Still real (0067 was new), but overstating a security finding is
the easier mistake to leave uncorrected.

Unit unchanged: 1554 tests, 1548 pass, 6 fail — the same 6.

---

## Gate run - 2026-09-12 - VERDICT: FAIL

Steps: 6 pass, 5 fail, 1 blocked.
Time: 19.9s total - slowest G7 Unit + pure specs (13.5s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (52ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (48ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (52ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (67ms)
- **G5 Types** - PASS (5.7s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" in . - not fetched from the registry on purpose. Run `npm install` in . (provides eslint), or state why this class is unverified. - **135 consecutive runs**: a verdict that never changes is not a signal; make this class runnable or accept it in writing
- **G7 Unit + pure specs** - FAIL (13.5s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: THE SEVEN CELLS SURVIVE A FAILED WEEK
ok 102 - THE SEVEN CELLS SURVIVE A FAILED WEEK
# Subtest: the banner wears the failed status, not a colour of its own
ok 110 - the banner wears the failed status, not a colour of its own
# Subtest: the roster card states a failed week rather than guessing at it
ok 112 - the roster card states a failed week rather than guessing at it
# Subtest: a form asked for a record answers a failed read
ok 180 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 181 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 194 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (120ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (52ms)
- **G10 Backward compatibility (fixtures)** - PASS (116ms)
- **G11 Wide tables are configurable** - PASS (54ms)
- **G12 Installable as an application** - PASS (70ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

FAIL-FIRST: src/data/migrationGrants.test.ts - written AFTER the defect it guards reached production, which is stated rather than dressed up; it fails on the real 0067 text with the revoke removed.

## 0067 SHIPPED A DEFECT, AND THE VERIFICATION STEP CAUGHT IT (12-Sep-2026)

Applied to production, then verified per CLAUDE.md. The ACL read:

```
proacl: {postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres}
has_function_privilege('anon', ...) = TRUE
```

`revoke all ... from public` does not remove a DIRECT grant, and Supabase makes one on every new
public function. Migration 0012 is named `harden_function_security_direct_grants` and says so in
its header; 0067 was written against 0011's pattern and never read it.

**`supabase/tests/48` asserts exactly this and PASSED.** The harness grants all functions to anon
in its own shim, so the grant being revoked never existed locally and the assertion had nothing to
find. An assertion that passes for the wrong reason is worse than no assertion — it reads like
proof. Now KL-008.

Fixed by `0068`, verified in production:

```
proacl: {postgres=X/postgres, authenticated=X/postgres, service_role=X/postgres}
anon=false  authenticated=true  service_role=true  secdef=false  volatility=stable
```

Exposure: about four minutes. SECURITY INVOKER, so an anon caller was still bound by RLS on all
three tables — seven rows of zeroes, no counts. Stated rather than minimised: the migration claimed
something untrue.

**The wider finding, which is not this change's.** `pg_default_acl` for `postgres` / `public` /
functions currently reads `{postgres=X, anon=X, authenticated=X, service_role=X}`. Migration 0025's
`alter default privileges ... revoke execute on functions from anon, authenticated` is no longer in
force. Every function created from now on is anon-executable by default; 23 existing ones are safe
only by accident of when they were created; three SECURITY DEFINER trigger functions are
anon-executable right now, which is what the pre-existing failing spec on main reports. **Not fixed
here** — restoring a schema-wide default privilege is its own decision. RC-042.

Suite after 0068: **725 PASS / 10 FAIL**, the same 10 as the baseline. Unit: 1554 tests, 1548 pass,
6 fail — the same 6.

---

## Gate run - 2026-09-12 - VERDICT: FAIL

Steps: 6 pass, 5 fail, 1 blocked.
Time: 30.6s total - slowest G7 Unit + pure specs (16.4s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (65ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (62ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (64ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (86ms)
- **G5 Types** - PASS (13.3s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" in . - not fetched from the registry on purpose. Run `npm install` in . (provides eslint), or state why this class is unverified. - **134 consecutive runs**: a verdict that never changes is not a signal; make this class runnable or accept it in writing
- **G7 Unit + pure specs** - FAIL (16.4s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: THE SEVEN CELLS SURVIVE A FAILED WEEK
ok 102 - THE SEVEN CELLS SURVIVE A FAILED WEEK
# Subtest: the banner wears the failed status, not a colour of its own
ok 110 - the banner wears the failed status, not a colour of its own
# Subtest: the roster card states a failed week rather than guessing at it
ok 112 - the roster card states a failed week rather than guessing at it
# Subtest: a form asked for a record answers a failed read
ok 180 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 181 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 194 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (148ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (69ms)
- **G10 Backward compatibility (fixtures)** - PASS (143ms)
- **G11 Wide tables are configurable** - PASS (65ms)
- **G12 Installable as an application** - PASS (87ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

FAIL-FIRST: supabase/tests/48_course_week_day_status.sql - 32 assertions, each of the five defects it names put into the migration and caught by name.
FAIL-FIRST: src/data/courseWeekDays.test.ts - four mutations, all caught; and case 2 was found passing while never running its own long-week branch.
FAIL-FIRST: .harness/course-week-strip.mjs - 4 of 23 browser checks RED on the first run, against a screen every source assertion had passed.

## FAIL-FIRST — Phase B, the course week aggregated in Postgres (11-Sep-2026)

**The browser found what source could not.** `.harness/course-week-strip.mjs` opens the real
export on fixtures and watches the strip. First run: **4 of 23 red** — zero day cells and no
retry banner on a failed week, on a screen whose twelve source assertions were all green.

The cause was not the strip. `?state=error` forces EVERY read on a screen, the course record
included, so the screen's own `if (courses.state === 'error')` guard rendered instead and the
strip was never reached. **Phase A's Task 3 had therefore never been visible to a reviewer
either** — on fixtures or anywhere else. `useAsync` now accepts a targeted form,
`?state=error:week`, which forces one named read and leaves the guards in front of it out of
the way. After that: **23 of 23 green**, and the state is reviewable by a person for the first
time.

It also found a real defect in the finished work: the legend above the strip named four
states and not the fifth, so a failed week showed a pink marker with nothing explaining it —
colour alone, which guardrail 3 exists to stop. `Load failed` now joins the legend while it is
on screen, and the browser check asserts it.

```
ok    SEVEN DAY CELLS ARE DRAWN — 7 cells
ok    A FAILED WEEK STILL DRAWS ITS SEVEN DAYS — 7 cells
ok    and EVERY ONE of them says Load failed — Mon 7 SEP, Load failed
ok    none of them says "Awaiting upload" — the bug this whole change is about
ok    THE LEGEND NAMES the failed state while the week is failed
ok    IT SAYS EXACTLY WHAT WAS ASKED FOR — Couldn't load attendance. Tap to retry.
ok    THE BANNER IS ACTUALLY PAINTED, not hidden behind the cards below it — sampled at 36,414
ok    the banner is still fully on screen at 400px — x=16 w=368
ALL PASS (c1)
```

**The SQL suite, rehearsed in the local harness** — which CLAUDE.md says is the whole of the
pre-flight. `reset.sh` drops the database and replays all 67 migrations before every test file.

```
BEFORE (no 0067, no test 48)     693 PASS   10 FAIL
AFTER  (0067 + test 48)          725 PASS   10 FAIL
                                 +32 pass, THE SAME 10 failures
```

The ten are byte-identical to the baseline and to what CI reports on `main` at `5b30efe`. This
change contains no SQL beyond the new function and its own test file.

**The 32 new assertions were all green on their first run, which is not evidence.** Each of the
five defects the file names was put INTO the migration and the suite re-run
(`.evidence/0067-mutation-check.txt`):

```
DEFECT 2 — uploaded computed as present_count > 0
  FAIL  TUESDAY IS UPLOADED, and everybody was absent  got false want true
DEFECT 1 — an inner join, so a day with no records is ABSENT from the answer
  FAIL  SEVEN ROWS, one per day, whatever the data does  got 3 want 7
DEFECT 3 — 'extra' stops counting as present
  FAIL  EXTRA COUNTS AS PRESENT  got 1 want 2
DEFECT 4 — soft-deleted records counted, so a RESET day still reads uploaded
  FAIL  THURSDAY WAS RESET: its records are soft-deleted  got true want false
DEFECT 6 — SECURITY DEFINER instead of INVOKER
  FAIL  SECURITY INVOKER  got true want false
```

**And against real data, read-only, before any apply.** The function's body run as a plain
SELECT against production with General's id and `2026-09-07`: the four days that reported
"Awaiting upload" come back `uploaded: true`, and 280 present + 893 absent = **1,173**, exactly
General's week and exactly what the Phase A keyset replay recovered
(`.evidence/0067-production-preview.txt`).

**`src/data/courseWeekDays.test.ts`** — 8 cases over the TypeScript half, four mutations, all
caught. One is recorded rather than quietly fixed: the long-week case passed on its first run
**while never executing** — `week().slice(0, 8)` on a seven-element array is a no-op.

---

## FAIL-FIRST — the truncation hardening (11-Sep-2026)

FAIL-FIRST: src/data/dayLoad.test.ts - 8 of 8 red against the derivation as it stood before this change (four mutations, each caught by name).
FAIL-FIRST: src/components/courseWeekLoadFailed.test.ts - 9 of 11 red against the pre-change screen at 5b30efe.
FAIL-FIRST: src/data/dataLayerBoundary.test.ts - red before the guard, before the npm wiring, and again with the rule mutated.

Three spec files are new in this change. A test never observed failing is not
evidence that it can fail, so each was run against a tree in which the thing it
asserts is not true. Full transcripts are in `.evidence/`.

**FAIL-FIRST: src/data/dayLoad.test.ts** — 8 cases over the rule RC-039 broke:
"not uploaded" is a claim only a completed read may make. The module is new, so
there is no earlier tree to run it against; the proof is four mutations, each
putting an older behaviour back.
`.evidence/dayload-fail-first.txt`

```
MUTATION 1 — the derivation exactly as it stood before this change:
    export function dayLoad(read, hasRows) { return hasRows ? 'uploaded' : 'not-uploaded'; }
  not ok 1 - THE DEFECT: a FAILED read never reads as a day nobody uploaded
  not ok 2 - a read still in flight is not a day nobody uploaded either

MUTATION 2 — a failed day is DRAWN as an awaiting one (case 'failed' -> 'awaiting')
  not ok 1 - THE DEFECT: a FAILED read never reads as a day nobody uploaded
  not ok 6 - the four states are exhaustive, and no two of them draw the same
  not ok 8 - THE UPLOAD BUTTON FALLS OUT OF THE MAPPING, with no clause of its own

MUTATION 3 — a loading day is given a business word instead of a blank one
  not ok 2 - a read still in flight is not a day nobody uploaded either
  not ok 6 - the four states are exhaustive, and no two of them draw the same
  not ok 8 - THE UPLOAD BUTTON FALLS OUT OF THE MAPPING, with no clause of its own

MUTATION 4 — Load failed is given the awaiting colour, word and icon (guardrail 3)
  not ok 7 - LOAD FAILED CARRIES ITS OWN WORD AND ITS OWN ICON (guardrail 3)
```

**FAIL-FIRST: src/components/courseWeekLoadFailed.test.ts** — 11 cases over what
the course screen does with that rule. Run against the PRE-CHANGE screen
(`5b30efe`) through `COURSE_WEEK_FAILED_SPEC_ROOT`: **9 of 11 red.**
`.evidence/course-week-failed-fail-first.txt`

```
not ok 1  - THE SEVEN CELLS SURVIVE A FAILED WEEK
ok     2  - the strip still shows a skeleton while the week is in flight
not ok 3  - the derivation is the specced one, not a second copy of it
not ok 4  - the day status is read from that derivation too
ok     5  - a day the app could not read is never offered an upload
not ok 6  - THE RETRY SAYS EXACTLY WHAT WAS ASKED FOR
not ok 7  - and the sentence is never retyped as a second literal
not ok 8  - the whole banner is the press, and it retries the read
not ok 9  - the banner wears the failed status, not a colour of its own
not ok 10 - the technical reason is still on screen, under the sentence
not ok 11 - the roster card states a failed week rather than guessing at it
# pass 2  # fail 9
```

The two that already passed are honest passes, and are named rather than
hidden: the skeleton branch was already correct, and the upload press was
already gated on a status key a failed day does not wear — because a failed day
had no key at all, the strip having rendered nothing at all on an error.

**FAIL-FIRST: src/data/dataLayerBoundary.test.ts** — 6 cases over "a Supabase
query may only be written in src/data/". Recorded live while it was built:
before the guard script existed, 1–3 red; after the guard but before the npm
wiring and `eslint.config.mjs`, 2 red. Then the rule itself was mutated, to show
the spec tests the RULE and not the file's existence.
`.evidence/boundary-fail-first.txt`

```
after the guard, before the wiring:
  not ok 4 - the guard is wired into a command somebody actually runs
  not ok 6 - the same rule is written for ESLint, for whenever it is installed here

MUTATION — the pattern drops the receiver, so `.from(` matches Array.from too
  not ok 1 - THE BOUNDARY HOLDS: no Supabase query is written outside src/data/
  not ok 2 - the guard insists on the RECEIVER, because `.from(` is not a query
```

**The two MODIFIED spec files, for completeness.**
`src/data/pagedReads.test.ts` against the pre-change tree: **8 of 9 red**
(`.evidence/paged-reads-fail-first.txt`). `src/data/pageAll.test.ts`: its 12
keyset cases were written before the helper existed and recorded 12/12 red
(`.evidence/keyset-paging-fail-first.txt`); the 7 cases added for `readBounded`
and `guardUntruncated` were written alongside their implementation, which is
said plainly rather than dressed up, and are proved instead by four mutations,
every one caught (`.evidence/pageall-mutation-check.txt`).

**And the guard catching a real violation.** A Supabase read added to
`app/course/[id].tsx` and then removed:
`.evidence/boundary-guard-catches-it.txt`

```
$ node scripts/audits/check-data-layer-boundary.mjs
  FAIL  app/course/[id].tsx:158  const leak = supabase.from('attendance_records').select('id');
  125 files outside src/data/ scanned; 1 Supabase query found there.
  exit status: 1
... violation removed ...
  125 files outside src/data/ scanned; 0 Supabase queries found there.
  exit status: 0
```

---

## Gate run - 2026-09-11 - VERDICT: FAIL

Steps: 6 pass, 5 fail, 1 blocked.
Time: 22.3s total - slowest G7 Unit + pure specs (15.0s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (55ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (58ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (56ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (78ms)
- **G5 Types** - PASS (6.6s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" in . - not fetched from the registry on purpose. Run `npm install` in . (provides eslint), or state why this class is unverified. - **133 consecutive runs**: a verdict that never changes is not a signal; make this class runnable or accept it in writing
- **G7 Unit + pure specs** - FAIL (15.0s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: THE SEVEN CELLS SURVIVE A FAILED WEEK
ok 102 - THE SEVEN CELLS SURVIVE A FAILED WEEK
# Subtest: the banner wears the failed status, not a colour of its own
ok 110 - the banner wears the failed status, not a colour of its own
# Subtest: the roster card states a failed week rather than guessing at it
ok 112 - the roster card states a failed week rather than guessing at it
# Subtest: a form asked for a record answers a failed read
ok 180 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 181 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 194 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (151ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (64ms)
- **G10 Backward compatibility (fixtures)** - PASS (130ms)
- **G11 Wide tables are configurable** - PASS (62ms)
- **G12 Installable as an application** - PASS (79ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## CI became real, and the typecheck blocker is gone (11-Sep-2026)

**GitHub Actions is getting runners again.** Every run since 09-Sep had failed in four seconds
with `duration_ms: 0` and no logs. Run 84 on pull request 15 ran the gate job for **37 seconds**
and produced a real log. That changes the standing verdict: the failures are now this
repository's to fix, not an entitlement problem to report.

**What it failed on, and it was never the tooltip.** `npm run check` stops at its first step:

```
src/data/message.test.ts(35,31): error TS2345
  Property 'followUpTrigger' is missing in type '{ member; courseName; branchName;
  academyName; periodFrom; periodTo; }' but required in type 'MessageContext'.
```

Fifteen of them, every one a call to the same `ctx()` fixture helper. `MessageContext` gained a
required `followUpTrigger` when the course's trigger became a token, and the fixture was never
given one. FIXED HERE, in one place: `ctx()` now supplies `followUpTrigger: 4` — `SAMPLE_TRIGGER`,
the value `save_course` defaults `p_threshold` to — and its return type is annotated, so the next
required field fails on one line instead of at fifteen call sites. One inline context in "a value
containing a token is not substituted again" gets the same completion.

**No spec was overwritten to do it.** Nothing is asserted about the trigger before or after; this
is a fixture being completed so the file compiles against a type that changed under it. `typecheck`
now reports **0 errors**, where main reports 15.

### What still blocks `npm run check`, and why it is not mine to decide

`test:unit` is the second step, and six specs fail there — the same six that fail on `main`. Five
are one unfinished piece of work: a `follow_up_trigger` token was added to the message system and
the specs that pin the token list, the chip labels and the everyday/More split were never updated
with it.

| Spec | What it says | The decision it needs |
|---|---|---|
| the token list IS the sender's variable map | the list and the map disagree by one entry | which side is right |
| every token carries a short chip label | *"Follow-up trigger is too long to sit in a chip row"* — 17 characters against a 16 limit | what to call it in a chip |
| the everyday seven are a SUBSET | `14 !== 13` | whether the trigger is an everyday token |
| the six behind the More chip still fill | the same count, from the other side | the same decision |
| every token the subject row hides is still reachable | the same count again | the same decision |

The sixth is separate: `formDropdownMenu.test.ts` → *"a list screen's filter was flattened into a
form's menu"* in `app/(tabs)/courses.tsx`.

Every one of these is a product decision about someone else's feature — what a chip is called, and
which row it sits in. Guessing at them inside a tooltip change would be widening this pull request
into work nobody asked for, on copy nobody has approved. They are named here, with the exact
assertion and the exact number, so whoever owns that feature can close them in minutes.

---

## Gate run - 2026-09-11 - VERDICT: FAIL

Steps: 6 pass, 5 fail, 1 blocked.
Time: 23.0s total - slowest G7 Unit + pure specs (15.7s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (57ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (57ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (55ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (84ms)
- **G5 Types** - PASS (6.6s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" in . - not fetched from the registry on purpose. Run `npm install` in . (provides eslint), or state why this class is unverified. - **132 consecutive runs**: a verdict that never changes is not a signal; make this class runnable or accept it in writing
- **G7 Unit + pure specs** - FAIL (15.7s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: THE SEVEN CELLS SURVIVE A FAILED WEEK
ok 102 - THE SEVEN CELLS SURVIVE A FAILED WEEK
# Subtest: the banner wears the failed status, not a colour of its own
ok 110 - the banner wears the failed status, not a colour of its own
# Subtest: the roster card states a failed week rather than guessing at it
ok 112 - the roster card states a failed week rather than guessing at it
# Subtest: a form asked for a record answers a failed read
ok 180 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 181 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 194 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (148ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (62ms)
- **G10 Backward compatibility (fixtures)** - PASS (127ms)
- **G11 Wide tables are configurable** - PASS (60ms)
- **G12 Installable as an application** - PASS (78ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## FAIL-FIRST — the Reset tooltip (11-Sep-2026)

Requested: *"On reset button add a tooltip as this will be enable only after first upload of
attendance file."* Transcript: `.evidence/reset-tooltip-fail-first.txt`.

FAIL-FIRST: `src/components/resetTooltip.test.ts` is new, 12 assertions, run against **the code
that shipped** rather than an injected defect — the merge of pull request 13 exported to a
temporary root and read through the spec's own `RESET_TOOLTIP_SPEC_ROOT` override. 11 of 12
failed.

**And the first run found a hole in the spec, exactly as the last one did.** Claim 5, "`why` is
null exactly when the button works", PASSED against a tree that has no `why` expression at all:
asked of the whole file, its regex `/:\s*null;/` matched some unrelated ternary hundreds of lines
away. It now slices the `why` expression out first and asks only of that. Against the pre-fix tree
it then fails with the other ten. Two runs, two false passes caught this way; the practice is
earning its keep.

The one assertion that passes on both trees is "the other reason is still there" — it guards the
existing *tick the members whose marks to clear first* wording against being lost while the second
reason was added. It is a guard, not evidence, and is counted as neither.

FAIL-FIRST: `src/components/tooltipReveal.test.ts` is new, 10 assertions over the pure show/hide
rule. The defect it pins cannot be seen on a desktop and is total on a phone: a touch fires
`pointerenter` and `pointerleave` milliseconds apart, so a tooltip written as one boolean flickers
and is gone before it can be read. Reducing the state machine to that single boolean — `hidden`
and `hover` only, with `tap` folded into `hover` — fails 4 of 10, among them "A TAP SURVIVES THE
POINTER LEAVING".

CASES: +22 passing (1,468 → 1,490), 0 new failures. The same 6 specs fail as on `main`, in the
course-list filter and the message token map, untouched by this change. Contrast 2,842/2,842,
icons 75/75, `audit:all` green across all nine sweeps.

OBSERVED IN A BROWSER, and it changed the design twice. The gap recorded here on the first pass —
"nothing was exercised in a browser" — is now closed: `npm run export` serves the real web build on
fixtures, so the course screen is reachable with no sign-in and no production data, and
`.harness/reset-tooltip.mjs` drives Chromium against it. Full transcript in
`.evidence/reset-tooltip-browser.txt`.

**Three defects, and all twelve source assertions passed through every one of them.**

| What was wrong | How it presented | What a source spec saw |
|---|---|---|
| `maxWidth` on an absolutely positioned box is capped by its containing block, which is the wrapper | the bubble was **82px wide and 178px tall** — the sentence as a column of broken words | present, correct, green |
| every RN Web `View` carries `position: relative` AND `z-index: 0`, so nothing inside the row can rise above a later sibling of an ancestor | the bubble was **entirely behind the first member card** | present, 240px, inside the window, green |
| the check walked up from the wrong element, and `course-day-add-*` is the *"Upload again"* button on a day that HAS marks | the check blamed the app for saying the right thing | n/a |

The second one is the instructive one. Three z-index changes were tried — the bubble to 20, the
wrapper to 30, the row to 5 — and every one was a no-op. It is fixed structurally instead, by
hanging the bubble ABOVE the control where document order carries it, and all three z-index
changes were then removed. Recorded as KL-007, with the ancestry dump.

The occlusion was found by LOOKING at a screenshot. The check that can now see it samples the same
pixel with the bubble up and with it down: presence, size and viewport containment are all
satisfied by an element painted completely behind another one.

NOT OBSERVED: the live project. The browser run is against fixtures, which is the right place for
a layout claim and says nothing about production data. Nothing here reads or writes attendance.

---

## Gate run - 2026-09-11 - VERDICT: FAIL

Steps: 6 pass, 5 fail, 1 blocked.
Time: 21.1s total - slowest G7 Unit + pure specs (14.3s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (57ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (56ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (52ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (76ms)
- **G5 Types** - PASS (6.1s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" in . - not fetched from the registry on purpose. Run `npm install` in . (provides eslint), or state why this class is unverified. - **131 consecutive runs**: a verdict that never changes is not a signal; make this class runnable or accept it in writing
- **G7 Unit + pure specs** - FAIL (14.3s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: a form asked for a record answers a failed read
ok 169 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 170 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 183 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
  name: 'AssertionError'
  expected: true
# Subtest: a ring is never a colour alone, and nothing expected is a dash
ok 300 - a ring is never a colour alone, and nothing expected is a dash
# Subtest: a failed reset keeps the dialog open, carrying the reason
ok 337 - a failed reset keeps the dialog open, carrying the reason
```

- **G8 Functional / integration** - FAIL (153ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (57ms)
- **G10 Backward compatibility (fixtures)** - PASS (130ms)
- **G11 Wide tables are configurable** - PASS (62ms)
- **G12 Installable as an application** - PASS (77ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-11 - VERDICT: FAIL

Steps: 6 pass, 5 fail, 1 blocked.
Time: 21.5s total - slowest G7 Unit + pure specs (14.2s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (61ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (56ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (58ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (77ms)
- **G5 Types** - PASS (6.6s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" in . - not fetched from the registry on purpose. Run `npm install` in . (provides eslint), or state why this class is unverified. - **130 consecutive runs**: a verdict that never changes is not a signal; make this class runnable or accept it in writing
- **G7 Unit + pure specs** - FAIL (14.2s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: a form asked for a record answers a failed read
ok 169 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 170 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 183 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
  name: 'AssertionError'
  expected: true
# Subtest: a ring is never a colour alone, and nothing expected is a dash
ok 300 - a ring is never a colour alone, and nothing expected is a dash
# Subtest: a failed reset keeps the dialog open, carrying the reason
ok 337 - a failed reset keeps the dialog open, carrying the reason
```

- **G8 Functional / integration** - FAIL (135ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (59ms)
- **G10 Backward compatibility (fixtures)** - PASS (123ms)
- **G11 Wide tables are configurable** - PASS (57ms)
- **G12 Installable as an application** - PASS (76ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-11 - VERDICT: FAIL

Steps: 5 pass, 5 fail, 1 blocked.
Time: 20.8s total - slowest G7 Unit + pure specs (14.0s).

- **G1 Theme artifacts in sync** - FAIL (57ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (54ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (49ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (72ms)
- **G5 Types** - PASS (6.2s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL (14.0s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: a form asked for a record answers a failed read
ok 169 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 170 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 183 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
  name: 'AssertionError'
  expected: true
# Subtest: a ring is never a colour alone, and nothing expected is a dash
ok 300 - a ring is never a colour alone, and nothing expected is a dash
# Subtest: a failed reset keeps the dialog open, carrying the reason
ok 337 - a failed reset keeps the dialog open, carrying the reason
```

- **G8 Functional / integration** - FAIL (134ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (61ms)
- **G10 Backward compatibility (fixtures)** - PASS (131ms)
- **G11 Wide tables are configurable** - PASS (55ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate baseline for 11-Sep-2026 — read the run below against THIS

FAIL, and step-for-step the same FAIL `main` already carries. Unchanged from the baseline recorded
under 10-Sep, which explains each step: G1/G2/G3 call a framework-seed contrast script that reads
`design/tokens.json`, a file this app has never had (its own gate, `scripts/check-contrast.ts`,
passes 2,842/2,842 including every pair the tooltip bubble draws); G6 is BLOCKED for want of a
local eslint; G7/G8 are the six specs already red on `main`, in the course-list filter and the
message token map, neither of which this change touches.

This change contributes **+22 passing specs and 0 new failures** (1,468 → 1,490 passing, 6 → 6
failing), with `audit:all` green across all nine sweeps.

---

## Gate run - 2026-09-11 - VERDICT: FAIL

Steps: 5 pass, 5 fail, 1 blocked.
Time: 21.2s total - slowest G7 Unit + pure specs (14.1s).

- **G1 Theme artifacts in sync** - FAIL (55ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (50ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (68ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (75ms)
- **G5 Types** - PASS (6.5s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL (14.1s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: a form asked for a record answers a failed read
ok 169 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 170 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 183 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
  name: 'AssertionError'
  expected: true
# Subtest: a ring is never a colour alone, and nothing expected is a dash
ok 300 - a ring is never a colour alone, and nothing expected is a dash
# Subtest: a failed reset keeps the dialog open, carrying the reason
ok 337 - a failed reset keeps the dialog open, carrying the reason
```

- **G8 Functional / integration** - FAIL (137ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (58ms)
- **G10 Backward compatibility (fixtures)** - PASS (124ms)
- **G11 Wide tables are configurable** - PASS (56ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## FAIL-FIRST — the week's attendance, and the tab you are on (10-Sep-2026)

Requested twice: attendance uploaded for four days read **Awaiting upload** on the course
screen while the Overview showed 24% for the same course and week — *"I just have tested the
same and the bug still open"*; and, separately, *"the Attendance tab is selected, but the
selected state is not visually clear to the end user."*

Full transcript of every run below: `.evidence/attendance-week-row-cap-fail-first.txt`.

FAIL-FIRST: `src/data/pagedReads.test.ts` is new, 4 assertions, and it was run twice against
a reconstructed defect. Reverting the `attendance_records` read to the single unpaged request
that shipped → 1 of 4 failed, naming the file, the line and the table: *"src/data/repository.ts:2184
reads attendance_records without pageAll()."* Restoring the paging but deleting its `.order('id')`
→ a different 1 of 4 failed: *"a range() into an unordered result is an OFFSET into nothing."*
Both green again on restore. This is the rung that stops the class returning, so it mattered
that each half of it can fail on its own.

FAIL-FIRST: `src/data/pageAll.test.ts` is new, 9 assertions. `pageAll` reduced to a single
request — which is precisely what `fetchAttendance` did before the fix — failed 5 of 9,
including "a table LARGER than one page comes back whole" and "a page that FAILS is returned
as a failure, never as a short answer". The 4 that still passed are the small-table and
constant cases, which the defect never touched.

FAIL-FIRST: `src/components/shellTabSelected.test.ts` is new, 7 assertions, and this one was
run against **the code that actually shipped** rather than an injected defect — `HEAD~1`
exported to a temporary root and read through the spec's own `SHELL_TAB_SPEC_ROOT` override.
5 of 7 failed.

**And the first run of it found a hole in the spec itself, which is the reason for running
these at all.** Claim 4, "the selected tab is never colour alone", PASSED against the pre-fix
tree — a tree that had no filled ground on the tab at all. It passed because the assertion
searched the whole of `AppShell.tsx` and found the string on `NavPill`, a different control
two hundred lines below that has always had it. A whole-file search is a claim about the file;
every claim in that spec is about one row of it. The spec now slices the header row out first
(`tabRow()`), and against the pre-fix tree claim 4 fails with the other four. The negative
assertion — that the old inline clause has not come back — is deliberately still asked of the
whole file, because a copy of it hoisted into a helper one line above the row is the same
defect.

Claim 7, "the underline does not change height with the state", passes on both trees. It was
already true and is a guard against a regression, not evidence of one. Said here rather than
quietly counted among the five.

FAILFIRST-NA: `src/data/access.test.ts` gained 7 assertions rather than being a new file, so
the guard does not ask for evidence — but they were run against the pre-fix rule anyway, since
`tabActive` is where the defect actually lived. "a COURSE DETAIL lights Attendance and
Attendance ALONE" and "exactly ONE tab is ever lit" are the two the shipped expression could
not satisfy: it answered `true` for every tab on `/course/...` and `false` for every tab on
`/member/...`.

VERIFIED AGAINST PRODUCTION'S OWN ROWS, 11-Sep-2026, read-only. The three requests the fixed
`fetchAttendance` now makes were replayed as SQL over the nine session ids of that week
(`order by id limit 1000 offset 0 / 1000 / 2000`):

| | |
|---|---|
| Rows returned by the three pages | 2,220 |
| Distinct among them | 2,220 — no page repeats a row |
| Rows that exist | 2,220 — no page skips a row |
| Size of page 3 | 220 — short, so the loop ends there and asks no fourth |
| General's rows recovered | 881, which is 61 + 259 + 276 + 285 |

881 is Monday through Thursday, the four days that read "Awaiting upload". The unique
`.order()` is doing exactly the job it is there for: with it the three pages partition the
week exactly, and without it the same three offsets over an unordered scan have no such
guarantee. This is the claim the fix rests on and it is now measured rather than argued.

NOT OBSERVED: the round trip in a browser. The partition is proved; the client loop and the
rendered day strip are not. The Vercel preview for the pull request built and is Ready, but
the app is behind mobile + PIN sign-in, and `docs/registers/TEST_ACCOUNTS.md` records that the
only account in existence is a real person's real credential on the only live project there
is, never to be used as a test account. So that last step belongs to a human holding that
credential: open General for 7–13 Sep 2026 and read the four days. Said here rather than
counted as done.

---

## Gate baseline for 10-Sep-2026 — read the run below against THIS

The gate run recorded below is FAIL, and **every one of its failures is also a failure on
`main` with this change stashed**. Both verdicts were taken on the same tree, minutes apart,
and they are step-for-step identical. Stating that here rather than leaving the reader to
infer it, because "the gate went red on the change that landed" is exactly the wrong
conclusion to draw from an unqualified FAIL.

| Step | Why it fails | Mine? |
|---|---|---|
| G1 · G2 · G3 | The runner calls `scripts/check-contrast.mjs`, a framework-seed script that reads `design/tokens.json`. This app has no such file — its tokens are TypeScript, and its real contrast gate is `scripts/check-contrast.ts`, which passes **2,842/2,842 pairs** including every pair this change draws. A seed script the app never adopted, blocking on a file the app never had. | No |
| G6 | BLOCKED — no local `eslint`. Unchanged. | No |
| G7 · G8 | Six specs: one on the course-list filter shape (`formDropdownMenu.test.ts`) and five on the message token map. Pre-existing, and in areas this change does not touch. The same six fail on `main`. | No |

What this change contributes to the suite: **+34 passing specs, 0 new failures** (1,441 → 1,468
passing, 6 → 6 failing). `npm run audit:all` is green with no new violations in any of its nine
sweeps.

The six red specs and the seed-script mismatch are real debt and are somebody's next piece of
work. They are not this one, and pretending otherwise by quietly re-baselining them would hide
them.

---

## Gate run - 2026-09-10 - VERDICT: FAIL

Steps: 5 pass, 5 fail, 1 blocked.
Time: 19.5s total - slowest G7 Unit + pure specs (12.9s).

- **G1 Theme artifacts in sync** - FAIL (49ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (49ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (47ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (68ms)
- **G5 Types** - PASS (6.0s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL (12.9s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: a form asked for a record answers a failed read
ok 169 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 170 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 183 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
  name: 'AssertionError'
  expected: true
# Subtest: a ring is never a colour alone, and nothing expected is a dash
ok 300 - a ring is never a colour alone, and nothing expected is a dash
# Subtest: a failed reset keeps the dialog open, carrying the reason
ok 337 - a failed reset keeps the dialog open, carrying the reason
```

- **G8 Functional / integration** - FAIL (133ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (58ms)
- **G10 Backward compatibility (fixtures)** - PASS (112ms)
- **G11 Wide tables are configurable** - PASS (53ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## FAIL-FIRST — SES feedback and unsubscribe (09-Sep-2026)

Requested: close the two code-side gaps AWS asked about for production access
(support case 178876518600723) — nothing wrote `bounced`/`complained`, and no
email carried a way to opt out.

`src/data/unsubscribeToken.test.ts` is new, 9 assertions. It was run against
three injected defects, each reverted afterwards and the file confirmed
unchanged by `git diff`. The whole point of the spec is that a member_emails
id ALONE must never opt anybody out, so the first defect is the one that
matters:

FAIL-FIRST: `unsubscribeTokenValid` reduced to `return Boolean(memberEmailId)`
— the signature not checked at all, which is a working attack: walk UUIDs and
opt out any of 687 live addresses. 4 of 9 failed —
  · a token minted for one id does not verify against another
  · a tampered token is refused
  · a token minted under a different secret is refused
  · a missing token, id or secret is refused rather than waved through
The other 5 passed, which is the honest shape of it: a broken check still
validates a correct token. Only the negatives can catch this.

FAIL-FIRST: `base64url()` reduced to plain `btoa()`. 1 of 9 failed — "the token
is base64url: no +, / or = to be mangled in a query string". This is the defect
that would have shipped links that work in a test and break in a mail client.

FAIL-FIRST: `constantTimeEquals` reduced to comparing the first character. 1 of
9 failed — "constantTimeEquals answers the same as === for equal and unequal
strings". Timing is not observable from a unit test, so the spec pins the
answer rather than the timing, and this is what that buys.

Restored: 9 of 9 pass.

`src/data/message.test.ts` gained 4 assertions (appended, nothing rewritten).

FAIL-FIRST: `unsubscribe_url` removed from `variables()` in `src/data/message.ts`
— the state the tree was actually in before this change, so this is a revert
rather than an injection. 3 of the 4 failed —
  · {{unsubscribe_url}} is a token the sender fills, not a stray
  · the preview resolves it rather than leaving braces in the wording
  · the template 0066 writes previews clean, line and all
The consequence on screen: an academy adding the unsubscribe line to a course's
own wording is warned it is a token the sender cannot fill, while the sender
fills it perfectly well. Restored: all 4 pass.

`supabase/tests/47_unsubscribe_and_ses_feedback.sql` is new, 17 assertions, run
on the harness against PostgreSQL 16 with every migration replayed from
scratch. Its fail-first is structural rather than injected, and was run: with
`0065` and `0066` moved out of the tree and the database rebuilt, the spec
stops at its first assertion with

    ERROR: function public.audit_log_anon(unknown, unknown, unknown, jsonb,
    jsonb) does not exist

The harness runs psql with `ON_ERROR_STOP=1`, so that is literally all that is
observed — the run halts there and the remaining 16 assertions are never
reached. Stated that way deliberately: "the other assertions would also have
failed" is a reasonable belief and is not an observation, and 8 of them name a
function that does not exist while the template assertions read a placeholder
`0066` had not yet written.

NOT OBSERVED FAILING: the two Edge Functions themselves have no local test
harness — there is no Deno on this machine and `tsconfig.json` excludes
`supabase/`, so `ses-feedback` and `unsubscribe` are covered only by the pure
helper above and by the SQL spec. Their request handling has never been
executed. That is the honest gap, and it is why the deploy checklist treats the
first real SNS notification and the first real link click as the verification,
not as a formality.

---

## Gate run - 2026-09-10 - VERDICT: FAIL

Steps: 5 pass, 5 fail, 1 blocked.
Time: 19.5s total - slowest G7 Unit + pure specs (13.0s).

- **G1 Theme artifacts in sync** - FAIL (50ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (47ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (50ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (64ms)
- **G5 Types** - PASS (5.9s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL (13.0s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: a form asked for a record answers a failed read
ok 169 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 170 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 183 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
  name: 'AssertionError'
  expected: true
# Subtest: a ring is never a colour alone, and nothing expected is a dash
ok 300 - a ring is never a colour alone, and nothing expected is a dash
# Subtest: a failed reset keeps the dialog open, carrying the reason
ok 337 - a failed reset keeps the dialog open, carrying the reason
```

- **G8 Functional / integration** - FAIL (122ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (47ms)
- **G10 Backward compatibility (fixtures)** - PASS (109ms)
- **G11 Wide tables are configurable** - PASS (54ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-10 - VERDICT: FAIL

Steps: 5 pass, 5 fail, 1 blocked.
Time: 18.2s total - slowest G7 Unit + pure specs (12.3s).

- **G1 Theme artifacts in sync** - FAIL (47ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (41ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (41ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (63ms)
- **G5 Types** - PASS (5.4s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL (12.3s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: a form asked for a record answers a failed read
ok 169 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 170 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 183 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
  name: 'AssertionError'
  expected: true
# Subtest: a ring is never a colour alone, and nothing expected is a dash
ok 300 - a ring is never a colour alone, and nothing expected is a dash
# Subtest: a failed reset keeps the dialog open, carrying the reason
ok 337 - a failed reset keeps the dialog open, carrying the reason
```

- **G8 Functional / integration** - FAIL (121ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (46ms)
- **G10 Backward compatibility (fixtures)** - PASS (106ms)
- **G11 Wide tables are configurable** - PASS (51ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## FAIL-FIRST — dd-mmm-yyyy is the one date format (09-Sep-2026)

Requested: "we shall go with dd-mmm-yyyy format as its easier to understand
month for both bulk import in template and also under reports and also update
it in app and also in template and give same as info beside date field as that
or if they enter date in any format convert that to dd-mmm-yyyy."

FAIL-FIRST: the old strict-ISO reader was put back inside validateStatusRows
(a local `oldReadDate` doing exactly what the two column checks used to do) and
src/data/statusImport.test.ts run against it — 35 pass, 4 FAIL:

  - every unambiguous shape a person might type reaches the same day
  - an all-numeric date is handed back with the fix in it, never guessed at
  - a report sent back exactly as exported still changes nothing
  - the report uploaded untouched changes nothing at all  (the EXISTING spec)

The fourth is the one worth reading: with the export writing dd-mmm-yyyy and
the reader demanding ISO, the commonest upload in the app — the report sent
back untouched — reports every row as an edit. The two halves are genuinely
coupled and the spec suite proves it. Source restored: 39 pass, 0 fail.

FAIL-FIRST: src/data/memberDate.test.ts is new, 23 assertions, and two of them
caught my own wrong claims before anything shipped. '10-Octobre-2026' IS read
(the first three letters are matched, and no other month begins "Oct");
Portuguese 'Setembro' is NOT (it begins "Set"). The spec now states that rule
exactly rather than claiming a language competence the module does not have.

COPY-LOCKS RE-POINTED — six, exact-string locks kept, only the literals moved:
three in reportSheets.test.ts (the exported Active from / Inactive from cells)
and three in statusImport.test.ts (the change list the import screen shows).
One spec TITLE changed with them: "both dates are exported ISO, because the
file is read back in" → "...exported in ONE shape...". The claim it protects is
that both ends of the window are written the same way and read back to the same
day; ISO was the shape that satisfied it, never the point. The comment in the
spec says so.

ONE ASSERTION RE-POINTED THAT IS NOT A COPY-LOCK, and it is flagged rather than
buried. "a mistyped date is refused with the cell quoted back" asserted that
`inactiveFrom: '1 October 2026'` is BLOCKED, under the rule "only YYYY-MM-DD".
The requester replaced that rule, so the spec was pinning the behaviour this
change exists to remove. The claim the test is named for is untouched and is
now carried by '10/10/2026', which is still unreadable and still refused; the
new behaviour is pinned by the three appended specs above. The re-point is
documented in place, in the test file, next to the assertion.

NOT CHANGED, deliberately:
  - The member TEMPLATE has no date column and none was added. Every member the
    create path imports joins on the day it is imported and the info sheet
    already says so. There is nothing there to reformat.
  - activeFromProblem / inactiveFromProblem still say "write it as YYYY-MM-DD".
    Neither can be reached with a non-ISO value any more: the form feeds them a
    calendar pick and the import now normalises before calling them. Touching
    them would mean making them read dd-mmm-yyyy too, and they compare dates as
    ISO strings — a half-conversion there is a wrong comparison, not a nicer
    message.
  - dateInWords ("1 October 2026") is prose inside sentences, not a date field,
    and is already unambiguous.

DEFECT FOUND AND NOT FIXED HERE (reported separately): a member whose leaving
date is in the FUTURE exports with Status "Active" — `memberDetailSheet` reads
status on the day and is right to — and re-uploading that untouched report
reads the status column as an edit, sets them active and clears the date. It
predates this change, is independent of the date format, and is documented in a
comment in statusImport.test.ts rather than pinned by a passing spec named
after a bug.

GATE: FAIL, identically to clean main — G8 fails on
`app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's
menu`, which is the same single failure the branch carried before this change.
Unit suite 1428 pass / 6 fail, all six the pre-existing baseline
(formDropdownMenu + five message.test.ts `followUpTrigger` typing failures).
Contrast 2842/2842, icons 75/75.

## FAIL-FIRST — the No email section's own bar (09-Sep-2026)

Reported from a screenshot: no ticking, no select/deselect, no bulk delete on
the No email section. All three had shipped — but ticking was behind a "Select"
toggle in the screen header, and the bar carrying the delete sat above the
WITH-email cards. From the No email section there was nothing to see, so the
feature may as well not have shipped. Placement was the whole defect.

FAIL-FIRST: re-gating the No email cards on `selectMode` (the shipped
behaviour) fails "those cards are tickable without hunting for the header
toggle" — 16 pass, 1 fail. Restored: 17 pass.

MOVED, NOT DUPLICATED: three assertions in bulkDeleteNoEmail.test.ts were
re-pointed from `course-selection-delete` to `course-noemail-delete`. The
control left the roster-wide bar, where it read as a delete over "3 of 5
selected" while only ever acting on the addressless ones. A new assertion pins
that it is gone from there, so there is one of it.

ALREADY DONE, RE-VERIFIED, not rebuilt: the reset half of the same message.
The button is gated on `noMarks || noneTicked`, so it comes alive only once a
file has been uploaded AND members are ticked; it sends `[...selected]`; and
the dead-button label says which of the two reasons it is dead. resetRegister
Dialog.test.ts 17/17.

## FAIL-FIRST — deleting a course takes its members (0064, 09-Sep-2026)

FAIL-FIRST: supabase/tests/14_delete_course.sql failed the moment 0064 was
rehearsed — "her stats are recomputed" got NULL, want 0 — because the member it
asserted about is now removed with the course. That assertion pinned the
promise 0047 made and the requester has now withdrawn, so it is amended to pin
the new contract (her stats row goes with her), exactly as the same file was
amended for 0047. The file documents both amendments in place.

FAIL-FIRST: supabase/tests/46 — NEW, 11/11, written to defend the line I drew
rather than the instruction as literally worded. Two of its assertions caught
my own fixture errors first: member_enrollments carries an exclusion constraint
on (member_id, daterange) so a member cannot hold two live enrolments, and
purge_member audits as `member.hard_deleted` with the note under
metadata->>'note', not as `member.purged`.

FAIL-FIRST: courseDeletion.test.ts — restoring the old sentence ("N members are
enrolled." and nothing about what happens to them) fails five assertions: the
two re-pointed copy-locks and the three new branch tests. 9 pass, 5 fail.
Restored: 14 pass.

COPY-LOCKS RE-POINTED: two in courseDeletion.test.ts. The dialog now has to say
what happens TO the members because the deletion now removes them; changing
that copy is the intent of the work. Exact-string locks kept, strings changed.

## FAIL-FIRST — "7 failed" on an upload that edited 4 (09-Sep-2026)

Reported with the file and two screenshots: 3 updated, 786 already correct,
7 FAILED, on an export where four members had been edited. Six of the seven
were rows nobody had touched.

Root cause: validateStatusRows refused an ambiguous name BEFORE asking whether
the row wanted anything. The file is the whole register, so it carries every
duplicate name the academy has on every upload — three Anithas, two Johns, two
vishnu priyas = exactly the seven. The one refusal that mattered (row 291,
John, genuinely un-resolvable) was buried among six that did not.

FAIL-FIRST (A), the reported behaviour: `asksNothing = false` restored, so every
duplicate row is refused. Four of the seven new assertions fail — "an untouched
duplicate row is left alone", "every untouched duplicate is quiet", "the quiet
ones do not count against the file", "an untouched row does not make a later
real edit look like a duplicate". 32 pass, 4 fail.

FAIL-FIRST (B), MY OWN FIRST FIX, which was wrong and is worth recording: I
first wrote `found.every(...)`, requiring all candidates to agree. Verified
against the real 796-row file it still reported 7 failures — because an
untouched row carries the values of the member it came from and matches THAT
one only: three Anithas have three different joining dates, so Anitha #1's row
is a change measured against #2. Corrected to `found.some(...)`: matching one
candidate exactly is enough, because it means the register already agrees with
what the file says. With `every` restored, three assertions fail. 33 pass,
3 fail.

Restored: 36 pass. Against the reported file: {unchanged: 792, ready: 3,
blocked: 1} — Ashish, Rahul Verma and Sam updated, and the single failure is
row 291 John, which is the only row that genuinely cannot be resolved.

NO MIGRATION NEEDED. bulk_set_member_dates keeps its own ambiguity refusal and
is right to: only rows the client marked `ready` are ever sent, so every row
the server sees is asking for a change, and refusing an ambiguous one of those
is correct.

## FAIL-FIRST — the reported 794-member upload (09-Sep-2026)

Reported with the real file: a 794-member members report, an Inactive from date
typed against two members, uploaded. Two defects, one behind the other.

FAIL-FIRST (1): the file was refused outright — "A file may carry at most 500
members; this one has 794." Reproduced by running the real export through the
real parser: 794 rows, and the ceiling was MEMBER_IMPORT_MAX_ROWS, the member
TEMPLATE's guard against a runaway file creating thousands of people. This file
is the academy's own register sent back, so its natural size is however many
members the academy has. Fixed with STATUS_IMPORT_MAX_ROWS = 5000. Re-run: 794
rows parse.

FAIL-FIRST (2), and the worse one: with the ceiling lifted, BOTH edits were
still silently discarded — the two rows came back "unchanged". Proved on the
real file before the fix: verdicts {unchanged: 792, blocked: 7}, ready: 0.
Root cause in wantedPair: the rule was "an inactive date with NO STATUS beside
it means inactive from that day", and memberDetailSheet writes a Status on
every row, so on a real export there is never no status beside it. The exported
"Active" won and the typed date was dropped. The one gesture the button exists
for was the one it could not do.

Fixed by reading WHICH CELL WAS EDITED against the record. Re-run on the real
file: {unchanged: 792, ready: 2} — exactly John (row 289) and Sam (row 565),
each "Inactive from: Not on record -> 2026-10-10, Status: Active -> Inactive".

FAIL-FIRST (3): the seven new assertions in statusImport.test.ts were run
against the OLD rule restored in place. Exactly the two that describe the
reported bug failed — "a leaving date typed into an untouched exported row is
obeyed" and "and it shows up as a real change" — 27 pass, 2 fail. The other
five describe behaviour that was already correct and pass under both rules,
which is what they should do. Restored: 29 pass.

supabase/tests/44_typed_leaving_date_is_an_instruction.sql — NEW, 8/8. The same
three cases server-side, because 0062 has to resolve them identically to
wantedPair or the two halves disagree about one file.

## FAIL-FIRST — the harness could not fail (09-Sep-2026)

FAIL-FIRST: db/harness/reset.sh — injected a deliberately-wrong expectation into
0061 so the migration would raise. `npm run test:db` reported the ordinary run
and exited 0. Root cause: `$PG -f "$f" && echo "ok"` — bash's errexit explicitly
exempts a command on the LEFT of `&&`, so a failing migration was skipped and the
rebuild went on to print "database rebuilt." Every "rehearsed against the
harness" claim in this repo was therefore weaker than it read: a broken migration
passed the pre-flight check silently. Fixed to an explicit if/else that exits 1.
Re-tested with the same injection: "MIGRATION FAILED", exit 1.

FAIL-FIRST: the fix immediately exposed a real one. 0055_purge_every_member could
NOT be replayed from scratch — its section-3 post-condition asserts that
sessions, courses, offerings, imports, batches and app_users are all non-empty
afterwards, which reads correctly on production (where all six had rows) and
raises on a fresh database where all six are empty before and after. So the
harness had never actually completed a full clean replay. Fixed by capturing a
before-snapshot and comparing against it, so the check still catches a real
destruction and no longer fires on an empty database. ASSERTION ONLY — no schema
statement, no delete, no grant, and nothing 0055 did to any database changed.

FAIL-FIRST: supabase/migrations/0061 — its own guard proved by injection. With
'her name is needed' changed to a string not present, it raised
"0061: create_member(...) does not contain the string this migration expects"
and rolled back. Restored, it applies and all eleven substitutions land.

## FAIL-FIRST — reset acts on the selection; bulk delete on the no-email list (09-Sep-2026)

FAIL-FIRST: supabase/tests/43_reset_only_the_selected_members.sql — NEW, and it
found a defect in its own first run: written asserting raw row counts, it failed
"the mark beside it survives" (got 2, want 1) because reset_day_attendance
SOFT-deletes. The function was right and the spec was wrong; the spec now reads
live rows and additionally pins that both rows survive as soft-deleted, which is
the thing about this function a reader would otherwise get wrong. 13/13.

FAIL-FIRST: reset_day_attendance had NO DB spec at all before this — not for
0056 and not for 0057. Found while rehearsing. It is the most destructive
control on the course screen and nothing asserted what it cleared.

COPY-LOCKS RE-POINTED, attendanceReset.test.ts: four resetWarning strings and
three resetOutcome shapes. `deleted` left ResetOutcome entirely because deleting
left the reset; the day now only reads "awaiting a file again" when the reset
actually empties it. One string / one shape per assertion, none removed, none
loosened, no skip.

WITHDRAWN, not skipped — resetRegisterDialog.test.ts: five assertions about the
dialog's delete-ticking (opens on the roster's selection, drops addressed
members, select-all, hands over the ticked, names other days). The requester
moved that half out of the dialog, so the behaviour they pinned no longer
exists. They are deleted with a note saying so, and what replaced them is
asserted in bulkDeleteNoEmail.test.ts. `.skip` was tried first and reverted: a
skipped test reads as a pause, and nothing is coming back.

SUPERSEDED AND REWRITTEN — resetRegisterDialog.test.ts: the reset button was
pinned as HIDDEN on an empty day; it is drawn-and-disabled, and its gate moved
to the selection. Re-pointed to the new rule rather than dropped.

## FAIL-FIRST — the one-button Bulk Import (09-Sep-2026)

FAIL-FIRST: src/data/importKind.test.ts — defect injected: the fallback that
sends every unrecognisable workbook to the CREATE path changed from
`return 'members'` to `return 'dates'`. Three assertions fire, and they are the
three that guard the requester's named risk ("it should not break the existing
bulk import members feature"): "an empty workbook falls to the create path,
not to dates", "a workbook of nothing recognisable falls to the create path",
"a sheet named Member details with no date column is not the dates file" —
11 pass, 3 fail. Reverted, 14 pass.

FAIL-FIRST: src/components/bulkImportOneButton.test.ts — defect injected: a
second bulk import button added back to the workspace header. Assertion 1,
"there is exactly one bulk import button on the workspace", fails — 19 pass,
1 fail. Reverted, 20 pass.

FAIL-FIRST: src/components/bulkImportOneButton.test.ts — defect injected: the
`if (which === 'dates')` guard removed, so every chosen file goes down the
dates path and the template stops creating members. Assertion 8, "the dates
branch is the only thing that can divert a file from it", fails — 19 pass,
1 fail. Reverted, 20 pass.

NOT OBSERVED FAILING: supabase/migrations/0060 — no spec is edited by it and
none needed re-pointing: supabase/tests/41 matches these refusals on the
fragments 'future', 'inactive' and 'register', all of which survive the
rewrite. Spec 41 passes before and after, which is the point — the refusals
still fire on the same rows, in de-gendered words.

COPY-LOCKS RE-POINTED: confirmEmphasis.test.ts and
courseRosterRemoveMember.test.ts pinned the delete-confirm title "…and her
records?"; de-gendering that title is the intent of the work, so both are
re-pointed at "…and every record?". The diff is one string literal in each —
no assertion removed, none loosened, no skip.

## FAIL-FIRST — src/components/bulkImportInactive.test.ts

FAIL-FIRST: src/components/bulkImportInactive.test.ts — run against the
pre-change tree (this session's changes stashed) the whole file errors:
`ENOENT: no such file or directory, open '.../app/member/import-inactive.tsx'`
— 0 pass, 1 fail. The screen it specifies did not exist.

FAIL-FIRST: src/components/bulkImportInactive.test.ts — defect injected into
the built tree, pointing the second button at the CREATE importer
(`'event_busy', '/member/import-inactive'` → `'/member/import'`): assertion 2,
"it opens its own route, never the member importer", fails — 22 pass, 1 fail.
Reverted, 23 pass. So the spec fails for the reason it claims to guard, not
only because a file is absent.

FAIL-FIRST: supabase/tests/42_bulk_set_member_dates.sql — already failing on
main before 0059: "FAIL the refusal names the OTHER importer -- the one that
does create members", the file aborting at that assertion after 3 passes.
With 0059 replayed on a fresh harness the spec runs to the end, 24/24.

FAIL-FIRST: src/data/auditRemovedSubject.test.ts - 10 of 10, new file. All ten observed
  failing against the pre-fix tree (`npx tsx --test src/data/auditRemovedSubject.test.ts`
  -> `# pass 0 / # fail 10`), which is the honest count for this defect: nothing in
  auditPlain.ts read a removal's metadata at all, so the name, the title, the value
  columns, the counts, the category and the searchable purge note were each absent
  rather than wrong. Sample: "a deleted member is named from the entry that removed
  her" failed on `subject` being null with `metadata.name` holding "Sumathi".

FAIL-FIRST: src/data/auditActionCoverage.test.ts - 2 of 5, new file, and the two that
  failed are the ones that matter. "every action lands under one of the seven chips"
  passed (the default sends anything unknown to Settings, which is why nothing ever
  looked broken), and "no action the backend can emit reaches the screen as a code"
  passed too - `prettify` strips the dots. What failed was the noun-glued check, with
  twelve actions named against the migration that emits each:
    attendance.day_reset (0056) -> "Course - attendance day reset"
    member.hard_deleted (0051)  -> "Member - member hard deleted"
    course.hard_deleted (0047)  -> "Course - course hard deleted"
    branch.hard_deleted, member_email.hard_deleted (0053), attendance.marked,
    attendance.session_created (0035), csv_import.overrode_register (0037),
    csv_import.member_in_other_course, meeting_group.created (0039),
    auth.recovery_pin_set, auth.staff_deleted (Edge Functions)
  and "an upload, an attendance mark and a deletion are filed where they happened",
  on `categoryOf('attendance.day_reset', 'course')` returning 'courses'. That check
  was then rewritten to the stronger property (`hasPlainTitle` - was the wording
  STATED or guessed), which also catches csv_import.previewed -> "Csv import
  previewed" and member_import_run.hard_deleted, neither of which the dot-and-noun
  heuristics could see.

NOT RE-RUN AFTER THE FIX: at the requester's explicit instruction mid-run - "after
  completing implementation report as done do not verify and test" - the suite, the
  typecheck, the browser pass and the gate were NOT run against the fixed tree. The
  fail-first evidence above was captured before that instruction arrived and stands;
  the green half of the usual pair is missing by decision, not by omission, and this
  line is here so nobody reads its absence as a pass.

FAIL-FIRST: src/data/importRevalidates.test.ts - 2 of 2, new file. Both observed
  failing against the pre-fix tree (HEAD src/data/repository.ts and app/upload.tsx
  checked out to a scratch root, IMPORT_REVALIDATE_SPEC_ROOT pointed at it): "the
  import announcement revalidates the register AND the member figures" failed with
  `export function attendanceImported() is not in the file`, and "a committed CSV
  import announces itself" with `nothing between csvCommit and the result screen
  tells the member list to refetch, so the cards keep what they read before the
  upload`. Against the fixed tree, 2 pass 0 fail.

FAIL-FIRST: src/data/auditGroups.test.ts - 3 of 15 failed with the grouping key loosened
  to "any entries sharing an instant and an actor", i.e. with the requirement that the
  database itself recorded an import (member.bulk_imported / csv_import.completed) removed:
  "WITHOUT the summary row nothing groups", "ordinary changes are untouched and keep their
  place", and "the group sits where its first entry sat". Those are exactly the three that
  stop the screen inventing an act that never took place. The other twelve passed with the
  defect in, which is correct - they assert what a REAL group must contain, and a group that
  forms too eagerly still contains it. Defect reverted, all 15 pass.

## Fail-first evidence, 08-Sep-2026 (defect injected into the source, spec run, source restored, spec re-run green)
FAIL-FIRST: src/data/importCourseScope.test.ts - 12 cases, new file. 7 of 12
observed failing against the pre-fix tree (csv-import resolving a name against
every member in the academy): "the matcher imports the course-scope rule",
"the kind of a row is decided from the candidates in THIS course only", "a
candidate from another course is offered after the ones from this course",
"the names that collided with another course come back from the preview", "the
client knows the field exists", "the result screen names them rather than
counting them", and "the note says which course, so the collision can be acted
on". Sample: `app/upload.tsx does not name the rows that collided with another
course's member`. The 5 that passed are the pure-rule cases over splitByCourse,
were then observed separately: with splitByCourse's own disqualifying clause
neutered (`if (false) elsewhere.push(id)`), cases 1 and 4 fail -- "a member
enrolled in another course is not a candidate for this one" and "the
requester's case: one name, two courses, and only this course's member is
offered". Cases 2, 3 and 5 pass under that injection BY DESIGN: they assert
that a member of THIS course, a member of no course, and candidate order are
all left alone, which is precisely what the fix must not break. Injection
reverted; 12/12 on the fixed tree.


FAIL-FIRST: src/data/courseDeletion.test.ts - with "attendance record" misspelt in courseDeletion.ts, 5 of 10 fail (the numbered warning, the singulars, the no-records clause, the uncounted fallback, the toast); restored -> 10 pass 0 fail
FAIL-FIRST: src/data/memberRemoval.test.ts - with "removed" and "attendance record" misspelt in memberRemoval.ts, 8 of 14 fail (the named toast, singular/zero kept, already-gone, offline, the non-Error throw, the single-word first name); restored -> 14 pass 0 fail

FAIL-FIRST: src/components/auditRemarksColumn.test.ts - 7 of 7 failed against a tree
  rebuilt from HEAD (git show HEAD:app/audit.tsx, HEAD:src/data/repository.ts, and 0044
  deliberately absent), driven through the spec’s own REMARKS_COLUMN_SPEC_ROOT. Remarks
  was not a column, the standalone section was still mounted, the composer was not keyed
  to a row, addRemark took no entry, the repository neither sent nor read audit_log_id,
  nothing reported a remarks load failure, and the migration did not exist.

FAIL-FIRST: src/data/auditMinimalCreation.test.ts - 3 of 10 failed with the summary
  disabled (toPlain returning "changes" and "hiddenCount: 0" instead of "shown"): “a member
  added prints her name and nothing else” (got 6 fields, wanted 1), “her email arrives on
  its own entry” (got 3, wanted 2), and “the search still reaches a value the row does not
  print” (the note was still on display, so the row was not summarising at all). The other
  seven passed BY DESIGN - they assert the summary must NOT reach an update, a delete, an
  unmapped entity, or empty a row, and disabling it cannot break those. Defect reverted and
  all 10 pass.

<!-- MULTIPLE CSV FILES FOR ONE COURSE ON ONE DAY
     (requests/2026-09-07-multiple-files-same-course-same-day.md).
     Same four FAILs and one BLOCKED this repo has carried since 02-Sep-2026,
     every one a MISSING RUNNER, none caused by this change: G1/G2/G3 want
     design/tokens.json (TD-001..TD-003), G6 wants eslint (TD-004), G8 wants
     test:functional (TD-006). Substitute rungs: test:unit 937/937,
     2840/2840 contrast, 75/75 icons, audit:testids and audit:colors with no
     new violations.

     DATABASE: every migration replayed from scratch against a fresh
     PostgreSQL 16.14 and the whole spec suite run against it, twice -- once
     with this change and once with it stripped out -- and diffed. 548
     assertions pass. Eleven specs fail byte-identically in BOTH runs and
     belong to other sessions' work in flight in this tree. `npm run
     typecheck` is red on src/data/joined.test.ts:109, also another
     session's. -->

FAIL-FIRST: supabase/tests/34_multiple_files_same_day.sql - 23 assertions, new
file. Replayed on a fresh PostgreSQL 16.14 against a migration set with 0044's
three instance clauses stripped out (0042 semantics restored inside 0045):
assertion 3 fails -- "a second call on the same meeting link reverts nobody --
got 2 want 0". Those 2 are the morning class's attendees, put back to absent by
the evening class's file on the same Meet link, which is the defect itself.
23/23 on the changed tree. The suite was run twice, with and without the
change, and diffed: exactly one spec's result moves, and it is this one.
Evidence: `.evidence/multiple-files-same-course-same-day-fail-first.txt`.

FAIL-FIRST: src/components/multipleFilesSameDay.test.ts - 16 cases, new file.
12 of 16 observed failing against a reconstructed pre-change tree (HEAD's
csv-import and app/course/[id].tsx, with 0042 standing in for 0044): cases
1-5, 7, 8 and 11-15. The 4 that pass in BOTH trees do so on purpose -- 6 holds
the meeting-code scoping 0042 already had, 9 the file-fingerprint guard, 10
that `supersedes` leaves the preview as information rather than a refusal, and
16 that an uploaded day keeps its status icon. Each is something this change
must NOT break, so passing before and after is the point. 16/16 on the changed
tree. Case 15 also depends on a peer session's `&& d.canUpload`, absent at
HEAD.

NOT OBSERVED FAILING: src/components/memberInactiveFromField.test.ts,
src/data/inactiveFrom.test.ts, src/data/joined.test.ts,
src/data/memberJoinedOn.test.ts, src/data/uploadOutcome.test.ts,
src/data/uploadWindow.test.ts - written by other sessions working in this
shared tree and swept into this commit at the owner's request. Their pre-fix
states were not reconstructed here, and whatever evidence their authors hold
is not mine to report as if I had seen it.


<!-- AWAITING UPLOAD BUTTON ON EACH DAY (requests/2026-09-07-awaiting-upload-button-on-each-day.md).
     Same four FAILs and one BLOCKED this repo has carried since 02-Sep-2026, every
     one a MISSING RUNNER, none caused by this change: G1/G2/G3 want
     design/tokens.json (TD-001..TD-003), G6 wants eslint (TD-004), G8 wants
     test:functional (TD-006). Substitute rungs: typecheck clean, 2840/2840
     contrast, 75/75 icons; the unit suite carries 2 FAILs in
     src/components/tableScroll.test.ts that belong to a peer session's
     in-flight table-scroll work in this shared tree, not to this change --
     they fail identically with app/course/[id].tsx restored to its
     pre-change snapshot. audit:testids is BLOCKED on two baseline entries
     (forgot-pin.tsx|4, help.tsx|1) paid down by peer work and not yet
     regenerated; the two new Pressables here both carry testIDs.

     BROWSER: fixtures export driven by Playwright at 1440/768/375, dark and
     light -- .evidence/awaiting-upload-button-on-each-day-browser.txt. -->

FAIL-FIRST: src/components/dayStripUploadButton.test.ts - 11 cases, new file.
7 of 11 observed failing on a snapshot of app/course/[id].tsx taken from the
working tree immediately before the change (2, 3, 4, 5, 6, 8, 10). Test 8 fails
on the snapshot BY CONSTRUCTION -- an absent button counts as "not a sibling"
rather than slicing to -1 and passing vacuously, which an earlier draft did.
Tests 1, 7, 9, 11 pass in BOTH trees on purpose: they hold the cell, the
never-literal status word, the select press and the absent clock. 11/11 on
the changed tree. Full output:
`.evidence/awaiting-upload-button-on-each-day-fail-first.txt`.

<!-- 0038: REPOINT EIGHT PRODUCTION COURSES OFF THE UNVERIFIED DOMAINS.
     Same four FAILs and one BLOCKED this repo has carried since 02-Sep-2026,
     every one a MISSING RUNNER, none caused by this change: G1/G2/G3 want
     `design/tokens.json` (ADR 001, TD-001..TD-003); G6 wants eslint (TD-004);
     G8 wants `test:functional` (TD-006). Substitute rungs green -- typecheck
     clean, unit specs pass, 2840/2840 contrast, 75/75 icons.

     NOT OBSERVED FAILING: supabase/tests/30_verified_course_senders.sql -
     `psql` is absent on this machine, so `db/harness/test.sh` cannot run at
     all and NO .sql spec in this repo can be executed here. Stated as the
     honest negative rather than dressed up.

     What WAS verified, and it is the substantive part: the guard predicate
     0038 refuses to apply on was run READ-ONLY against the live project over
     the same 8 probe values the spec uses. 4 CAUGHT (both retired fixture
     addresses, both look-alike domains), 4 PASSED (both verified addresses,
     the `Name <addr>` display form, the spaced `Name < addr >` form).
     Writing that spec is what caught the guard's FIRST version, which used a
     bare CONTAINS and waved through support@getfit.rosifit.com.example.net --
     a different domain that contains a verified one.

     The production data state driving all of this was measured, not assumed:
     9 courses configured, 8 on addresses SES will refuse. See TD-016. -->

FAIL-FIRST: src/data/courseFromAddress.test.ts - 3 cases appended, guarding the
class of defect 0038 cleans up. With SENDERS restored to the fixture addresses
that were live until 418629b, 2 of the 3 fail ("every address the picker offers
is under a VERIFIED domain", "no retired fixture address is still on offer").
The third passes in BOTH states, correctly and on purpose: it asserts that
support@rosifit.com is SHAPE-VALID and would be handed straight to SES, which
is a fact about the retired address itself and is why the eight rows needed a
migration rather than a code-side catch. 12/12 pass on the fixed tree.
Full output: `.evidence/picker-verified-domain-fail-first.txt`.

<!-- SEND-TEST SEED (supabase/seed_send_test.sql + teardown, TEST_ACCOUNTS.md).
     Same four FAILs and one BLOCKED carried since 02-Sep-2026, all missing
     runners, none caused by this change: G1/G2/G3 want design/tokens.json
     (TD-001..TD-003), G6 wants eslint (TD-004), G8 wants test:functional
     (TD-006). Substitute rungs green -- typecheck clean, unit specs pass,
     2840/2840 contrast, 75/75 icons.

     NOT RUN, and this is the whole point of the entry: NEITHER SQL SCRIPT IN
     THIS CHANGE HAS BEEN EXECUTED ANYWHERE. psql is absent on this machine so
     the harness cannot run them, and the production write they describe was
     REFUSED at the tool boundary. They are reviewed text, not applied state.
     Production is unchanged by this commit: every member still holds the
     address she held before it, and Yoga 2 still sends from the rosifit
     address.

     Carried forward for a human: two customer records hold real personal
     gmail addresses, which breaches TEST_ACCOUNTS.md rule 1 today. A send
     against production right now reaches a person who never asked for it.
     Recorded beside the destination table in that register. -->

<!-- FOLLOW-UP SEND TEST SEED (supabase/seed_followup_test.sql + teardown).
     Same four FAILs and one BLOCKED carried since 02-Sep-2026, all missing
     runners, none caused by this change (TD-001..004, TD-006). Substitute
     rungs green: typecheck clean, unit specs pass, 2840/2840 contrast,
     75/75 icons.

     NOT RUN. Neither script has been executed anywhere. psql is absent on
     this machine so the harness cannot run them, and the production write
     was REFUSED at the tool boundary. Production is unchanged: Shazia still
     has one absence and a streak of 1, and UniqBotz Infotech still has no
     email and no enrolment.

     What WAS verified, read-only against production, is the arithmetic the
     seed depends on. Shazia is absent 2026-09-04 and present 09-02 and
     08-31, so current_streak_for -- which counts the run before the most
     recent PRESENT -- puts her at 1. Four more absences after 09-02 take her
     to exactly 5, which is why the seed writes four and not five. Postnatal
     is weekly_enabled threshold 1; Prenatal is consecutive_enabled
     threshold 4. So the two members are flagged by DIFFERENT rules and one
     send exercises both halves of effective_follow_up_config.

     MIGRATION NUMBER COLLISION, carried for a human: 0038 is used TWICE --
     0038_repoint_stale_course_senders.sql (mine, already APPLIED to the live
     project under that name) and 0038_staff_write_access.sql from a parallel
     session in this shared worktree. Not resolved here because renumbering
     an applied migration is wrong and the other file is not mine to move. -->

FAIL-FIRST: src/pwa/manifest.test.ts - all 7 cases observed failing, by
  injecting each defect the spec claims to catch and reverting. Full transcript:
  .evidence/pwa-fail-first.txt. Eleven injections, eleven named failures:

    manifest loses its maskable icon        -> "the icon set covers what installability actually requires"
    manifest drops to display:browser       -> "the manifest carries every member an install depends on"
    an icon declares a size it is not       -> "every icon the manifest names exists, and is the size it claims"
    manifest points at a missing icon       -> "/icon-180.png is named in the manifest but ... does not exist"
    theme_color drifts off the token        -> "the built page and the manifest disagree about theme_color"
    root document loses the manifest link   -> "no manifest link"
    root document stops registering the SW  -> "the worker is never registered"
    a colour literal returns to the head    -> "theme-color must come from the token module"
    worker intercepts cross-origin requests -> "cross-origin requests must pass through"
    worker intercepts writes                -> "a write must never be intercepted"
    worker adds skipWaiting()               -> "no skipWaiting(): a new build activates on next launch"

  Two of these were ALSO observed failing for real, before any injection: the
  skipWaiting guard fired on the worker's own explanatory comment (narrowed to
  match the call), and the theme-color case failed while the tag still carried
  a hex literal -- which is what npm run audit:colors blocked on, and why the
  tag now reads ACCENTS instead. The spec also fails wholesale against the
  pre-change tree (ENOENT on public/manifest.webmanifest).

<!-- INSTALLABLE PWA (requests/2026-09-07-installable-pwa.md, RUN_installable-pwa.md).
     THIS note heads the run below it; the 0038 note above belongs to the run
     that was newest before this one.

     Same four FAILs and one BLOCKED this repo has carried since 02-Sep-2026,
     every one a MISSING RUNNER, none caused by this change: G1/G2/G3 want
     design/tokens.json (ADR 001, TD-001..TD-003); G6 wants eslint (TD-004);
     G8 wants test:functional (TD-006) and its log is empty, exactly as TD-006
     describes. Substitute rungs green: typecheck clean, 663 unit specs pass
     (7 of them new), 2840/2840 contrast, 75/75 icons, G4 no hard-coded
     colours PASS -- which this change had to earn, the theme-color meta tag
     now reading ACCENTS rather than restating the hex.

     G8 IS THE ONE CLASS THIS CHANGE ACTUALLY EXERCISED. The gate cannot run
     it, so it was run by hand and the evidence is committed:
     .evidence/pwa-installability.txt -- 15/15 checks in Chromium against the
     built dist/, covering the manifest as Chromium itself parses it, the
     worker activating and taking control, an offline navigation to the start
     URL and to an unvisited route, and the guardrail that a cross-origin API
     request is NOT served from cache offline.

     NOT FIXED, AND NOT CAUSED HERE: React #418 fires on 7 of the 8 primary
     routes in both themes. Proven pre-existing by exporting a second build
     with app/+html.tsx removed and driving the same 16 route/theme
     combinations -- byte-identical failures. TD-043; a /bug of its own.

     ALSO NOT MINE: npm run audit:testids is BLOCKED on app/forgot-pin.tsx
     (scores 2 against a baseline of 4). Reproduced with this change's only
     app/ file removed from the tree. A file this change never touched, in a
     worktree several sessions share. -->

NOT OBSERVED FAILING: src/components/reportsPeriodFilter.test.ts,
  src/components/memberCardAttendanceReadOnly.test.ts, src/data/sessionRestore.test.ts -
  written by PARALLEL SESSIONS in this shared worktree, and committed here by a
  different session on the repo owner's instruction to commit all outstanding
  work. Their pre-change state cannot be reconstructed without reverting files
  those sessions may still be writing to, so no fail-first run was attempted.
  Recorded as the honest negative rather than dressed up as evidence this
  session does not have. All three PASS on the tree as committed (7, 7 and 18
  cases); whichever session authored each one owns its fail-first record.

<!-- COMMIT-ALL SWEEP, 07-Sep-2026. This run covers the whole working tree at
     the moment the repo owner asked for every outstanding change to be
     committed to main: six features built by parallel sessions plus the PWA
     work, landed as seven commits that share THIS gate run.

     Same four FAILs and one BLOCKED this repo has carried since 02-Sep-2026,
     every one a MISSING RUNNER, none caused by any change in the sweep:
     G1/G2/G3 want design/tokens.json (ADR 001, TD-001..TD-003); G6 wants
     eslint (TD-004); G8 wants test:functional (TD-006).

     Substitute rungs, run on the combined tree immediately before committing:
     typecheck clean (tsc --noEmit, both projects), 663 unit specs pass with 0
     failures, 2840/2840 contrast pairs, 75/75 icons, G4 no hard-coded colours
     PASS, G9 addressability PASS, G11 wide tables PASS.

     NOT OBSERVED, and stated rather than implied: none of the .sql specs in
     supabase/tests/ were executed. This machine has no PostgreSQL 16, so
     db/harness/test.sh cannot run at all (TD-010, TD-033) -- which means
     0038, 0039 and 0041 and their specs are committed UNREHEARSED. They are
     also unapplied. Committing a migration is not applying one, and none of
     them has been near production.

     REVIEW STATE: this session verified that the tree typechecks, that every
     spec passes and that each file maps to a request file in requests/. It
     did NOT design, review or hand-test the six features it did not build.
     The commit messages say which session's work each one is. -->

## Gate run - 2026-09-07 - VERDICT: FAIL

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

## Gate run - 2026-09-09 - VERDICT: FAIL

Steps: 5 pass, 5 fail, 1 blocked.
Time: 19.6s total - slowest G7 Unit + pure specs (12.9s).

- **G1 Theme artifacts in sync** - FAIL (53ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (53ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (52ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (70ms)
- **G5 Types** - PASS (6.1s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL (12.9s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: a form asked for a record answers a failed read
ok 169 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 170 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 183 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
  name: 'AssertionError'
  expected: true
# Subtest: a ring is never a colour alone, and nothing expected is a dash
ok 300 - a ring is never a colour alone, and nothing expected is a dash
# Subtest: a failed reset keeps the dialog open, carrying the reason
ok 337 - a failed reset keeps the dialog open, carrying the reason
```

- **G8 Functional / integration** - FAIL (124ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (54ms)
- **G10 Backward compatibility (fixtures)** - PASS (118ms)
- **G11 Wide tables are configurable** - PASS (55ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-09 - VERDICT: FAIL

Steps: 5 pass, 5 fail, 1 blocked.
Time: 19.2s total - slowest G7 Unit + pure specs (12.8s).

- **G1 Theme artifacts in sync** - FAIL (50ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (52ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (51ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (74ms)
- **G5 Types** - PASS (5.8s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL (12.8s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: a form asked for a record answers a failed read
ok 169 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 170 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 183 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
  name: 'AssertionError'
  expected: true
# Subtest: a ring is never a colour alone, and nothing expected is a dash
ok 300 - a ring is never a colour alone, and nothing expected is a dash
# Subtest: a failed reset keeps the dialog open, carrying the reason
ok 337 - a failed reset keeps the dialog open, carrying the reason
```

- **G8 Functional / integration** - FAIL (128ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (58ms)
- **G10 Backward compatibility (fixtures)** - PASS (119ms)
- **G11 Wide tables are configurable** - PASS (53ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-09 - VERDICT: FAIL

Steps: 4 pass, 3 fail, 4 blocked.
Time: 468ms total - slowest G10 Backward compatibility (fixtures) (116ms).

- **G1 Theme artifacts in sync** - FAIL (58ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (52ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (52ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (69ms)
- **G5 Types** - BLOCKED (-) - no local "tsc" - not fetched from the registry on purpose. Run `npm install` (provides typescript), or state why this class is unverified.
- **G6 Lint** - BLOCKED (-) - prerequisite G5 did not pass
- **G7 Unit + pure specs** - BLOCKED (-) - prerequisite G5 did not pass
- **G8 Functional / integration** - BLOCKED (-) - prerequisite G5 did not pass
- **G9 Automation addressability** - PASS (63ms)
- **G10 Backward compatibility (fixtures)** - PASS (116ms)
- **G11 Wide tables are configurable** - PASS (55ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-09 - VERDICT: FAIL

Steps: 5 pass, 5 fail, 1 blocked.
Time: 17.9s total - slowest G7 Unit + pure specs (11.8s).

- **G1 Theme artifacts in sync** - FAIL (44ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (43ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (45ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (60ms)
- **G5 Types** - PASS (5.5s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL (11.8s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: a form asked for a record answers a failed read
ok 169 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 170 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 183 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
  name: 'AssertionError'
  expected: true
# Subtest: a ring is never a colour alone, and nothing expected is a dash
ok 300 - a ring is never a colour alone, and nothing expected is a dash
# Subtest: a failed reset keeps the dialog open, carrying the reason
ok 337 - a failed reset keeps the dialog open, carrying the reason
```

- **G8 Functional / integration** - FAIL (107ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (49ms)
- **G10 Backward compatibility (fixtures)** - PASS (100ms)
- **G11 Wide tables are configurable** - PASS (48ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-09 - VERDICT: FAIL

Steps: 5 pass, 5 fail, 1 blocked.
Time: 18.9s total - slowest G7 Unit + pure specs (12.4s).

- **G1 Theme artifacts in sync** - FAIL (49ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (53ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (48ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (65ms)
- **G5 Types** - PASS (6.0s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL (12.4s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: a form asked for a record answers a failed read
ok 169 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 170 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 183 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
  name: 'AssertionError'
  expected: true
# Subtest: a ring is never a colour alone, and nothing expected is a dash
ok 300 - a ring is never a colour alone, and nothing expected is a dash
# Subtest: a failed reset keeps the dialog open, carrying the reason
ok 337 - a failed reset keeps the dialog open, carrying the reason
```

- **G8 Functional / integration** - FAIL (130ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (51ms)
- **G10 Backward compatibility (fixtures)** - PASS (118ms)
- **G11 Wide tables are configurable** - PASS (55ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-09 - VERDICT: FAIL

Steps: 5 pass, 5 fail, 1 blocked.
Time: 18.9s total - slowest G7 Unit + pure specs (12.1s).

- **G1 Theme artifacts in sync** - FAIL (53ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (52ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (46ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (63ms)
- **G5 Types** - PASS (6.3s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL (12.1s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: a form asked for a record answers a failed read
ok 164 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 165 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 178 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
  name: 'AssertionError'
  expected: true
# Subtest: a ring is never a colour alone, and nothing expected is a dash
ok 295 - a ring is never a colour alone, and nothing expected is a dash
# Subtest: a failed reset keeps the dialog open, carrying the reason
ok 332 - a failed reset keeps the dialog open, carrying the reason
```

- **G8 Functional / integration** - FAIL (119ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (53ms)
- **G10 Backward compatibility (fixtures)** - PASS (108ms)
- **G11 Wide tables are configurable** - PASS (50ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-09 - VERDICT: FAIL

Steps: 5 pass, 5 fail, 1 blocked.
Time: 19.1s total - slowest G7 Unit + pure specs (12.1s).

- **G1 Theme artifacts in sync** - FAIL (47ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (44ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (47ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (61ms)
- **G5 Types** - PASS (6.4s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL (12.1s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: a form asked for a record answers a failed read
ok 164 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 165 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 178 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
  name: 'AssertionError'
  expected: true
# Subtest: a ring is never a colour alone, and nothing expected is a dash
ok 295 - a ring is never a colour alone, and nothing expected is a dash
# Subtest: a failed reset keeps the dialog open, carrying the reason
ok 332 - a failed reset keeps the dialog open, carrying the reason
```

- **G8 Functional / integration** - FAIL (125ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (51ms)
- **G10 Backward compatibility (fixtures)** - PASS (109ms)
- **G11 Wide tables are configurable** - PASS (49ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-09 - VERDICT: FAIL

Steps: 5 pass, 5 fail, 1 blocked.
Time: 18.6s total - slowest G7 Unit + pure specs (12.2s).

- **G1 Theme artifacts in sync** - FAIL (54ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (51ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (50ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (64ms)
- **G5 Types** - PASS (5.9s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL (12.2s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: a form asked for a record answers a failed read
ok 164 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 165 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 178 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
  name: 'AssertionError'
  expected: true
# Subtest: a ring is never a colour alone, and nothing expected is a dash
ok 295 - a ring is never a colour alone, and nothing expected is a dash
# Subtest: a failed reset keeps the dialog open, carrying the reason
ok 332 - a failed reset keeps the dialog open, carrying the reason
```

- **G8 Functional / integration** - FAIL (114ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (51ms)
- **G10 Backward compatibility (fixtures)** - PASS (118ms)
- **G11 Wide tables are configurable** - PASS (52ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-09 - VERDICT: FAIL

Steps: 5 pass, 5 fail, 1 blocked.
Time: 33.2s total - slowest G7 Unit + pure specs (17.0s).

- **G1 Theme artifacts in sync** - FAIL (143ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (71ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (114ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (150ms)
- **G5 Types** - PASS (15.1s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL (17.0s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: a form asked for a record answers a failed read
ok 150 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 151 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 164 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
  name: 'AssertionError'
  expected: true
# Subtest: a ring is never a colour alone, and nothing expected is a dash
ok 281 - a ring is never a colour alone, and nothing expected is a dash
# Subtest: a failed reset keeps the dialog open, carrying the reason
ok 318 - a failed reset keeps the dialog open, carrying the reason
```

- **G8 Functional / integration** - FAIL (170ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (69ms)
- **G10 Backward compatibility (fixtures)** - PASS (150ms)
- **G11 Wide tables are configurable** - PASS (74ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-09 - VERDICT: FAIL

Steps: 5 pass, 5 fail, 1 blocked.
Time: 34.2s total - slowest G5 Types (16.7s).

- **G1 Theme artifacts in sync** - FAIL (135ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (68ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (123ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (332ms)
- **G5 Types** - PASS (16.7s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL (16.2s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: a form asked for a record answers a failed read
ok 150 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 151 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 164 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
  name: 'AssertionError'
  expected: true
# Subtest: a ring is never a colour alone, and nothing expected is a dash
ok 281 - a ring is never a colour alone, and nothing expected is a dash
# Subtest: a failed reset keeps the dialog open, carrying the reason
ok 318 - a failed reset keeps the dialog open, carrying the reason
```

- **G8 Functional / integration** - FAIL (181ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (71ms)
- **G10 Backward compatibility (fixtures)** - PASS (142ms)
- **G11 Wide tables are configurable** - PASS (81ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-09 - VERDICT: FAIL

Steps: 5 pass, 5 fail, 1 blocked.
Time: 17.8s total - slowest G7 Unit + pure specs (11.6s).

- **G1 Theme artifacts in sync** - FAIL (46ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (40ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (40ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (62ms)
- **G5 Types** - PASS (5.6s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL (11.6s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: a form asked for a record answers a failed read
ok 150 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 151 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 164 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
  name: 'AssertionError'
  expected: true
# Subtest: a ring is never a colour alone, and nothing expected is a dash
ok 281 - a ring is never a colour alone, and nothing expected is a dash
# Subtest: a failed reset keeps the dialog open, carrying the reason
ok 318 - a failed reset keeps the dialog open, carrying the reason
```

- **G8 Functional / integration** - FAIL (115ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (51ms)
- **G10 Backward compatibility (fixtures)** - PASS (106ms)
- **G11 Wide tables are configurable** - PASS (50ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-09 - VERDICT: FAIL

Steps: 5 pass, 5 fail, 1 blocked.
Time: 27.7s total - slowest G5 Types (14.4s).

- **G1 Theme artifacts in sync** - FAIL (47ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (54ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (42ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (79ms)
- **G5 Types** - PASS (14.4s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL (12.5s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: a form asked for a record answers a failed read
ok 138 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 139 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 152 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
  name: 'AssertionError'
  expected: true
# Subtest: a ring is never a colour alone, and nothing expected is a dash
ok 269 - a ring is never a colour alone, and nothing expected is a dash
  error: 'the reset button must be gated on the day actually holding marks'
  name: 'AssertionError'
```

- **G8 Functional / integration** - FAIL (119ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (53ms)
- **G10 Backward compatibility (fixtures)** - PASS (106ms)
- **G11 Wide tables are configurable** - PASS (59ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-09 - VERDICT: FAIL

Steps: 5 pass, 5 fail, 1 blocked.
Time: 19.5s total - slowest G7 Unit + pure specs (12.5s).

- **G1 Theme artifacts in sync** - FAIL (59ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (54ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (52ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (66ms)
- **G5 Types** - PASS (6.4s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL (12.5s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: a form asked for a record answers a failed read
ok 138 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 139 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 152 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
  name: 'AssertionError'
  expected: true
# Subtest: a ring is never a colour alone, and nothing expected is a dash
ok 269 - a ring is never a colour alone, and nothing expected is a dash
  error: 'the reset button must be gated on the day actually holding marks'
  name: 'AssertionError'
```

- **G8 Functional / integration** - FAIL (124ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (57ms)
- **G10 Backward compatibility (fixtures)** - PASS (115ms)
- **G11 Wide tables are configurable** - PASS (53ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-09 - VERDICT: FAIL

Steps: 5 pass, 5 fail, 1 blocked.
Time: 18.9s total - slowest G7 Unit + pure specs (12.4s).

- **G1 Theme artifacts in sync** - FAIL (52ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (47ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (45ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (62ms)
- **G5 Types** - PASS (5.8s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL (12.4s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: the re-uploaded export reads as agreement, not as a failed import
ok 51 - the re-uploaded export reads as agreement, not as a failed import
# Subtest: a form asked for a record answers a failed read
ok 141 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 142 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 155 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
  name: 'AssertionError'
  expected: true
# Subtest: a ring is never a colour alone, and nothing expected is a dash
ok 272 - a ring is never a colour alone, and nothing expected is a dash
```

- **G8 Functional / integration** - FAIL (137ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (56ms)
- **G10 Backward compatibility (fixtures)** - PASS (121ms)
- **G11 Wide tables are configurable** - PASS (54ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-09 - VERDICT: FAIL

Steps: 5 pass, 5 fail, 1 blocked.
Time: 20.3s total - slowest G7 Unit + pure specs (13.3s).

- **G1 Theme artifacts in sync** - FAIL (50ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (47ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (48ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (70ms)
- **G5 Types** - PASS (6.4s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" - not fetched from the registry on purpose. Run `npm install` (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL (13.3s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: the re-uploaded export reads as agreement, not as a failed import
ok 51 - the re-uploaded export reads as agreement, not as a failed import
# Subtest: a form asked for a record answers a failed read
ok 141 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 142 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 155 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
  name: 'AssertionError'
  expected: true
# Subtest: a ring is never a colour alone, and nothing expected is a dash
ok 272 - a ring is never a colour alone, and nothing expected is a dash
```

- **G8 Functional / integration** - FAIL (122ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (55ms)
- **G10 Backward compatibility (fixtures)** - PASS (121ms)
- **G11 Wide tables are configurable** - PASS (52ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-08 - VERDICT: FAIL

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

## Gate run - 2026-09-08 - VERDICT: FAIL

Steps: 4 pass, 4 fail, 3 blocked.

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
- **G5 Types** - FAIL

```
app/course/[id].tsx(19,39): error TS2307: Cannot find module '../../src/components/ResetAttendanceDialog' or its corresponding type declarations.
app/course/[id].tsx(1037,20): error TS7006: Parameter 'ticked' implicitly has an 'any' type.
```

- **G6 Lint** - BLOCKED - prerequisite G5 did not pass
- **G7 Unit + pure specs** - BLOCKED - prerequisite G5 did not pass
- **G8 Functional / integration** - BLOCKED - prerequisite G5 did not pass
- **G9 Automation addressability** - PASS
- **G10 Backward compatibility (fixtures)** - PASS
- **G11 Wide tables are configurable** - PASS

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-08 - VERDICT: FAIL

Steps: 4 pass, 4 fail, 3 blocked.

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
- **G5 Types** - FAIL

```
app/staff/pin.tsx(66,36): error TS2304: Cannot find name 'APP_LINK'.
app/staff/pin.tsx(67,32): error TS2304: Cannot find name 'APP_LINK'.
app/staff/pin.tsx(73,64): error TS2304: Cannot find name 'APP_LINK'.
```

- **G6 Lint** - BLOCKED - prerequisite G5 did not pass
- **G7 Unit + pure specs** - BLOCKED - prerequisite G5 did not pass
- **G8 Functional / integration** - BLOCKED - prerequisite G5 did not pass
- **G9 Automation addressability** - PASS
- **G10 Backward compatibility (fixtures)** - PASS
- **G11 Wide tables are configurable** - PASS

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-08 - VERDICT: FAIL

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

## Gate run - 2026-09-08 - VERDICT: FAIL

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

## Gate run - 2026-09-08 - VERDICT: FAIL

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

## Gate run - 2026-09-08 - VERDICT: FAIL

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

## Gate run - 2026-09-07 - VERDICT: FAIL

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

## Gate run - 2026-09-07 - VERDICT: FAIL

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

## Gate run - 2026-09-07 - VERDICT: FAIL

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

## Gate run - 2026-09-07 - VERDICT: FAIL

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

## Gate run - 2026-09-07 - VERDICT: FAIL

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

## Gate run - 2026-09-07 - VERDICT: FAIL

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

## Gate run - 2026-09-07 - VERDICT: FAIL

Steps: 2 pass, 8 fail, 1 blocked.

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
exit 3221225794
```

- **G8 Functional / integration** - FAIL

```
exit 3221225794
```

- **G9 Automation addressability** - FAIL

```
exit 3221225794
```

- **G10 Backward compatibility (fixtures)** - FAIL

```
exit 3221225794
```

- **G11 Wide tables are configurable** - FAIL

```
exit 3221225794
```


_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-07 - VERDICT: FAIL

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

## Gate run - 2026-09-07 - VERDICT: FAIL

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

## Gate run - 2026-09-07 - VERDICT: FAIL

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

## Gate run - 2026-09-07 - VERDICT: FAIL

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

## Gate run - 2026-09-07 - VERDICT: FAIL

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

## Gate run - 2026-09-07 - VERDICT: FAIL

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

## Gate run - 2026-09-07 - VERDICT: FAIL

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

## Gate run - 2026-09-07 - VERDICT: FAIL

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

## Gate run - 2026-09-07 - VERDICT: FAIL

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

## Gate run - 2026-09-07 - VERDICT: FAIL

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

## Gate run - 2026-09-07 - VERDICT: FAIL

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

> **THE WORK OF FOUR CONCURRENT SESSIONS, COMMITTED AND PUSHED** -- 07-Sep-2026.
> The four FAILs and one BLOCKED above are the SAME ones this repo has carried
> since 02-Sep-2026, and each is a MISSING RUNNER, not a failing check: G1/G2/G3
> want `design/tokens.json`, which this app has never had (its measured tokens
> live in `src/theme/tokens.ts`); G6 wants a local eslint that is deliberately
> not fetched; G8 wants a `test:functional` script that does not exist here.
> Nothing in this series touched any of them.
>
> WHAT DID RUN, against this exact tree: `npm run check` -- `tsc --noEmit` over
> app and scripts, 615 unit specs (0 fail), 2840/2840 contrast pairs, 75/75
> canvas icons.
>
> ONE gate run covers the SEVEN commits of this series. The gate reads the
> WORKING TREE, not the index, so re-running it once per commit over one
> unchanged tree would record the same verdict seven times and prove nothing
> further. The six commits after the first therefore carry `LEDGER-NA:` naming
> this run, rather than padding the ledger with copies of it.

FAIL-FIRST: src/components/openingFocus.test.ts - replayed against HEAD (b6bd904)
via OPENING_FOCUS_SPEC_ROOT. 5 of 10 fail there: not ok 2 the shared field can be
told to take the caret; not ok 3 every screen with an input names its first one;
not ok 4 only the first field of a form autofocuses; not ok 5 the picker search box
takes the caret in both its hosts; not ok 10 all three layers ask the shared rule
rather than blurring on sight. 11/11 on the change. Confirmed in Chromium off
document.activeElement, 24/24 route x theme checks.
Evidence: .evidence/autofocus-first-input-fail-first.txt

FAIL-FIRST: src/components/keypadGrid.test.ts - against the pre-fix tree, not ok 7
"both keypads draw from this module, so they cannot drift apart" - "app/index.tsx:
the keypad does not import src/components/keypadGrid." And the arithmetic over the
values that shipped (key width 31.5%, row gap 10): columnsThatFit === 2 for both the
sign-in card and the set-pin Screen at 360px, three keys needing a row of >= 363.64px.
Measured in Chromium off boundingBox: Enter PIN rows=2/2/2/2/2/2 at 360 and 390px;
Change PIN the same, with the PIN boxes drawn over the pad by +37px and +21px.
POST: rows=3/3/3/3 at 320/360/390/412, both themes, nothing overlapping.
Evidence: .evidence/pin-keypad-two-per-row-fail-first.txt

FAIL-FIRST: src/data/pinReturn.test.ts - the module it pins (afterPinChange,
src/data/nav.ts) is NEW, so the spec could not fail by import. The defect itself was
observed instead, in Chromium against the pre-fix build: arriving at set-pin with no
back entry and completing the PIN landed on /set-pin - stuck, exactly as reported -
while Profile to Change My PIN returned to /profile before AND after, which is why
only first login stuck. POST: ?for=first lands on the dashboard.
Evidence: .evidence/pin-keypad-two-per-row-fail-first.txt (NAVIGATION)

FAIL-FIRST: src/components/addMemberBranchDefault.test.ts - against app/member/edit.tsx
at HEAD (418629b): not ok 2 a single branch option is the default; not ok 3 the default
never overwrites a branch already chosen. 2 of 4 fail; test 4 guards that the row stays
a picker and passes on both sides on purpose. 4/4 on the change.
Evidence: .evidence/add-member-form-defaults-fail-first.txt

FAIL-FIRST: src/components/addMemberDraftCommit.test.ts - same replay: not ok 2 leaving
the field commits the draft, on both rows. 1 of 4 fail; tests 3 and 4 are the regression
guards (blur is not a laxer way in than + Add; + Add and Enter still work) and hold on
both sides. 4/4 on the change.
Evidence: .evidence/add-member-form-defaults-fail-first.txt

FAIL-FIRST: src/components/addMemberStatusShown.test.ts - against HEAD's Add form via
ADD_MEMBER_STATUS_SPEC_ROOT, 4 of 6 fail: not ok 2 the Add form shows a status, and it is
Active; not ok 3 the Add block is gated on the ADD state, not on a missing record; not ok 4
the Add toggle cannot write the column; not ok 6 one source for the Active words. Test 5
guards the Edit form's own pick and passes before and after by design. 6/6 on the change.
Evidence: .evidence/add-member-status-toggle-fail-first.txt

FAIL-FIRST: src/components/memberRefusalClears.test.ts - against the PRE-CHANGE form
(MEMBER_REFUSAL_SPEC_ROOT over HEAD:app/member/edit.tsx), 4 of 7 fail: not ok 2 typing in
the display-name box clears the refusal; not ok 3 committing a display name clears it;
not ok 4 removing one clears it; not ok 5 only a refusal ABOUT a display name is cleared.
Cases 6 and 7 are the guard half and pass on both sides. 7/7 on the change.
Evidence: .evidence/display-name-refusal-fail-first.txt

NOT OBSERVED FAILING: src/data/refusalCase.test.ts - sentenceOpening and
src/data/refusalCase.ts did not exist before this change, so there was no module for the
spec to fail against. Six of its ten cases pin what must NOT change (the quoted name keeps
its case, an already-written sentence is untouched, twice is the same as once, a message
opening on a quote or a digit comes back as it was). The banner itself was not rendered in
a browser: it appears only when a write RPC refuses, and the offline createMember path
never refuses a duplicate display name, so no build reachable from this machine can
provoke it. 10/10 pass.
Evidence: .evidence/display-name-refusal-fail-first.txt

FAIL-FIRST: src/data/reachOut.test.ts - reachOut.ts and its spec were written together, so
there is no pre-change tree in which the spec merely fails to import; recording that would
prove nothing about the assertions. It was run against a MUTANT instead - the module copied
to a scratch root with the one defect the third label exists to prevent, a flagged member
nobody has written to reading "Rule is met, Email sent". not ok 3 - a flagged member nobody
has written to does NOT read "Email sent", actual 'Rule is met, Email sent', expected 'Rule
is met, Email not sent yet'. That is RC-017 one layer up: the app claiming SENT for an email
it never sent. 8/9 with the mutant, 9/9 on the real module.
Evidence: .evidence/reach-out-label-and-warning-fail-first.txt

FAIL-FIRST: src/data/dayAttendance.test.ts - the five defect injections already recorded in
this ledger for src/data/dayAttendance.ts are this spec's fail-first: canAbsent made
unconditional (10/13), the future guard removed (12/13), her own days ignored (12/13),
`expected` taken from the schedule over a recorded row, and the row lookup ignoring which
member it belongs to.
Evidence: .evidence/attendance-chips-fail-first.txt

FAIL-FIRST: src/components/seedGateDeps.test.ts - already recorded in this ledger: replayed
against the pre-fix tree (working tree at 1c3d45b with app/course/edit.tsx's dependency
array put back to its pre-fix form, no `recordPending`) via SEED_GATE_SPEC_ROOT.
Evidence: .evidence/seed-gate-deps-fail-first.txt

NOT OBSERVED FAILING: the live PIN-reset notification read was proved against the LIVE
project rather than a spec - PostgREST answered the shipped selector with PGRST201
("Could not embed because more than one relationship was found for 'pin_reset_requests'
and 'app_users'"), which is a PLANNING failure, before RLS and before the grant, so it
failed identically for the academy admin and the bell never rang for a locked-out staff
member. With the FK named the same query reaches the grant check (42501 under the anon key,
which 0034 revokes on purpose). No migration, policy, grant or Edge Function changed.
Evidence: .evidence/pin-reset-notification-embed-fail-first.txt

---

## Gate run - 2026-09-07 - VERDICT: FAIL

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

> **THE UPLOAD ASKS BEFORE IT REPLACES A REGISTER** -- request
> `requests/2026-09-07-upload-override-confirm.md`, ADR 027. The four FAILs and
> one BLOCKED above are the SAME ones this repo has carried since 02-Sep-2026,
> and each is a MISSING RUNNER, not a failing check: G1/G2/G3 want
> `design/tokens.json`, which RosiFit does not have because colour lives in
> `src/theme/tokens.ts` (ADR 001, TD-001..TD-003); G6 wants eslint, not
> installed (TD-004); G8 wants a `test:functional` script, which does not exist
> (TD-006).
>
> Substitute rungs, all green for this change: `npm run check` -- typecheck
> clean, 615/615 unit specs (7 new, `src/data/uploadOverride.test.ts`),
> 2840/2840 contrast pairs, 75/75 icons -- plus `audit:colors`, `audit:testids`,
> `audit:rules`, `audit:columns`, `audit:deadweight` and `audit:auditactor`, no
> new violations.
>
> FAIL-FIRST: `.evidence/upload-override-fail-first.txt` -- 3 of the 7 specs
> fail against the behaviour that shipped (`importAsk` stubbed to ignore
> `supersedes`, which is what the screen did: a day that already held a register
> was never asked about, only said out loud after it had been replaced).
>
> DRIVEN IN A BROWSER, both themes, five cases:
> `.evidence/upload-override-confirm-browser.txt`. An `expo export` build in
> fixtures mode (`EXPO_NO_DOTENV=1`), themes forced through the app's own
> preference key rather than `prefers-color-scheme` -- the mode defaults to
> `dark` and is read from storage, so emulating the OS hint alone runs the
> "both themes" check twice on the same theme. Cases: (A) a re-upload for a day
> that already has a register, (B) 3 Sep opened with a 21 Aug file for a day
> that has one -- the requester's own case, one dialog carrying both facts,
> (C) a clash with no register, which renders round 3's wording byte for byte,
> (D) an ordinary import, which still asks nothing at all, and (E) confirming
> the override, which imports for the FILE's day. No page errors in any of them.
>
> CONTRAST MEASURED ON THE LIVE DOM with every background layer composited: a
> status panel is a 13% tint of its own ink, so reading the first
> non-transparent layer and ignoring its alpha measures a colour nothing on
> screen shows. Every text node of the new confirmation passes in both themes
> (4.91-15.71 light, 4.91-18.17 dark). The same measurement found FIVE
> PRE-EXISTING pairs below 4.5:1 on the untouched result panel -- status ink on
> its own tint, a class `scripts/check-contrast.ts` does not sweep. Confirmed at
> token level, logged as **TD-036**, and deliberately not fixed here: it moves
> shipped inks used by every status panel in the app.
>
> DATABASE: `0037_import_override.sql` re-issues `commit_csv_import` from 0026
> so "override" is true, with `supabase/tests/29_import_override.sql`
> (**28 assertions** after the review pass). **NEITHER HAS BEEN RUN.** There is no `psql` and no
> PostgreSQL 16 on this machine, so `bash db/harness/test.sh` cannot execute --
> the constraint standing since 0032. The migration is NOT APPLIED and
> `csv-import` is still not deployed: until both land, the dialog's ask is
> correct and the override is the partial one 0026 performs. **TD-035.**

---

## Gate run - 2026-09-07 - VERDICT: FAIL

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

## Gate run - 2026-09-07 - VERDICT: FAIL

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

<!-- The four FAILs and the one BLOCKED below are the SAME four and one this
     repo has carried since 02-Sep-2026, and every one of them is a missing
     runner, not a failing check: G1/G2/G3 want `design/tokens.json`, which
     RosiFit does not have because colour lives in `src/theme/tokens.ts`
     (ADR 001, TD-001..TD-003); G6 wants eslint, which is not installed
     (TD-004); G8 wants a `test:functional` script, which does not exist
     (TD-006). The substitute rungs ran green for this change:
     `npm run check` -- typecheck clean, 542/542 unit, 2840/2840 contrast
     pairs, 75/75 icons -- plus `audit:colors` and `audit:testids`, no new
     violations. Recorded as a verdict, not passed off as one. -->

## Gate run - 2026-09-06 - VERDICT: FAIL

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

<!-- EDIT COURSE OPENED BLANK — the wait RC-021 added to the seeding effect was
     never lifted, because the effect's dependency array did not carry what
     that wait reads (RC-025). The four FAILs and one BLOCKED below are the
     SAME ones this repo has carried since 02-Sep-2026, and each is a MISSING
     RUNNER, not a failing check: G1/G2/G3 want `design/tokens.json`, which
     RosiFit does not have because colour lives in `src/theme/tokens.ts`
     (ADR 001, TD-001..TD-003); G6 wants eslint, not installed (TD-004); G8
     wants a `test:functional` script, which does not exist (TD-006).

     Substitute rungs, all green for this change: `npm run check` --
     typecheck clean, 615/615 unit specs (3 new, `seedGateDeps.test.ts`),
     2840/2840 contrast pairs, 75/75 icons -- plus `audit:colors`,
     `audit:testids` and `audit:rules`, no new violations.

     UNUSUALLY FOR A UI FIX, THIS ONE WAS WATCHED IN A BROWSER, because a
     dependency array is not a claim source-reading can settle: the spec
     proves the shape, only a render proves the behaviour. Both themes, an
     `expo export` build in fixtures mode, /course/edit?id=c1 -- and the
     fixtures as they stand DO NOT exhibit the defect, because every fixture
     read resolves inside one task and React commits them together. It was
     reproduced by injecting 400ms into the fixture member fetch alone, which
     is what two Supabase round-trips do to the same ordering: pre-fix, a
     blank name over "Choose a branch"; post-fix, "Prenatal Flow /
     Coimbatore / Mon,Wed,Fri / 3 weekly". The injection was reverted and
     `src/data/repository.ts` verified byte-identical afterwards.
     `.evidence/seed-gate-deps-fail-first.txt` carries both halves.

     NO DATABASE CHANGE, and nothing in this change reaches an Edge Function
     or a migration; `db/harness/test.sh` was not run and did not need to be.
     Recorded as a verdict, not passed off as one. -->

FAIL-FIRST: src/components/seedGateDeps.test.ts - "a seeding effect can be
re-run by everything it bails on" fails against the pre-fix tree: `app/course
/edit.tsx: the seeding effect waits on \`courses.state\` (reached through
\`recordPending\`), and neither is in its dependency array.` Replayed with
SEED_GATE_SPEC_ROOT against a copy of app/ and src/ whose dependency array is
put back to its pre-fix form. The first draft of this spec PASSED against that
same tree -- its regexes were built inside template literals and had lost
their backslashes -- which is why it now scans with plain string operations
and blanks comments first, so no prose can satisfy it. Full output:
`.evidence/seed-gate-deps-fail-first.txt`.

## Gate run - 2026-09-07 - VERDICT: FAIL

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

## Gate run - 2026-09-07 - VERDICT: FAIL

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

## Gate run - 2026-09-07 - VERDICT: FAIL

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

## Gate run - 2026-09-07 - VERDICT: FAIL

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

<!-- A COURSE SENDS FROM ITS OWN CONFIGURED ADDRESS (course_communication
     .from_email now reaches SES). The four FAILs and one BLOCKED below are
     the SAME ones this repo has carried since 02-Sep-2026, and each is a
     MISSING RUNNER, not a failing check: G1/G2/G3 want `design/tokens.json`,
     which RosiFit does not have because colour lives in `src/theme/tokens.ts`
     (ADR 001, TD-001..TD-003); G6 wants eslint, not installed (TD-004); G8
     wants a `test:functional` script, which does not exist (TD-006).

     Substitute rungs, all green for this change: `npm run check` --
     typecheck clean, 597/597 unit specs (9 new, `courseFromAddress.test.ts`),
     2840/2840 contrast pairs, 75/75 icons -- plus `audit:colors` and
     `audit:testids`, no new violations.

     NOT COVERED BY ANY RUNG, and stated rather than implied:
     `supabase/tests/28_message_from_email.sql` HAS NEVER BEEN EXECUTED.
     `psql` is absent on this machine, so `db/harness/test.sh` cannot run at
     all, and migration `0036` has been applied nowhere. The Edge Function
     change is proven only through the pure rule it delegates to
     (`chooseFromAddress`), never end to end against a database.
     Recorded as a verdict, not passed off as one. -->

FAIL-FIRST: src/data/courseFromAddress.test.ts - 7 of its 9 assertions fail
against the pre-fix behaviour, reconstructed by injecting the original defect
into `chooseFromAddress` (an unconditional early return of the deployment
default, which is precisely what `send-followups` did). The 2 that still pass
are the two fallback cases, where falling back IS the right answer -- which is
what makes the other 7 evidence rather than a spec that fails at anything.
Full output: `.evidence/course-sender-fail-first.txt`.

## Gate run - 2026-09-07 - VERDICT: FAIL

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

## Gate run - 2026-09-06 - VERDICT: FAIL

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

## Gate run - 2026-09-06 - VERDICT: FAIL

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

## Gate run - 2026-09-06 - VERDICT: FAIL

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

## Gate run - 2026-09-06 - VERDICT: FAIL

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

## Gate run - 2026-09-06 - VERDICT: FAIL

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


### Fail-first - src/data/dayAttendance.test.ts (new this run)

Five injected defects, each reverted; the clean module is 13/13 green before and after. Each
injection is a plausible way to write this module, not an invented defect: three of them are the
version somebody would write first. Full transcript in `.evidence/attendance-chips-fail-first.txt`.

```
FAIL-FIRST: src/data/dayAttendance.ts - `canAbsent` is unconditional, so the chip offers a
write that absent_must_be_expected (0008) will refuse. Produced: not ok 5 - a day the course
does not run offers Present only, with the reason; not ok 8 - her OWN days override the
offering; not ok 9 - a recorded row is the server's own answer about expectation. 10/13.

FAIL-FIRST: src/data/dayAttendance.ts - the future guard removed, so a class that has not
happened can be marked. Produced: not ok 6 - a date still to come offers neither, and says
why. 12/13.

FAIL-FIRST: src/data/dayAttendance.ts - her OWN days ignored, so the offering's schedule
decides for everybody. Produced: not ok 8 - her OWN days override the offering the way
member_schedules override offering_schedules. 12/13.

FAIL-FIRST: src/data/dayAttendance.ts - `expected` taken from the schedule even when a ROW
says otherwise. Produced: not ok 9 - a recorded row is the server's own answer about
expectation, not the schedule. 12/13.

FAIL-FIRST: src/data/dayAttendance.ts - the row lookup ignores which member it belongs to.
Produced: not ok 10 - another member's row is never read as hers. 12/13.
```

**NOT OBSERVED FAILING: `supabase/tests/27_set_attendance.sql` (24 assertions) has never been
run.** This machine has no PostgreSQL 16, so `db/harness/` cannot replay the migrations and
`0035_set_attendance.sql` has been rehearsed nowhere — the same standing gap that left 0031
unrehearsed. The file is written and reviewed; it is not evidence yet, and it is not counted as
any. **0035 is not applied to production either** (TD-033), so the RPC does not exist there and
the app says so in words rather than reporting a save it did not make.

**What WAS observed, in the built page** (`expo export` + a scratchpad Playwright driver, both
themes, 07-Sep-2026): the three chips render with the right word, icon and per-theme ink; the
DOM carries `role="radio"` with a real `aria-checked` and `aria-disabled` (KL-002's workaround);
Space operates a focused chip (KL-003's); clicking Absent moves the chip only after the write
resolves and the toast names the fixtures mode; the week strip above re-reads with it; a past
Tuesday offers Present only and stores `extra`, with the reason in the Absent chip's label; a
future day offers nothing and a forced click on it changes nothing; Tab reaches card → status →
edit → the one usable chip, each with a focus ring; at 320 / 360 / 768 pt all three chips sit on
one line with no word clipped and no horizontal page scroll; the last card's chips clear the
bottom bar at 320x720. The touch target measures 68x44 with the drawn pill still 68x30 — see
KL-004, which this change found by measuring it.

Registry delta, verified against the files: `src/data/dayAttendance.test.ts` new at 13. Suite
600 -> 613 at the moment this change was measured; it has since read 615, because a concurrent
session is working in this same tree and added its own cases. The delta this change owns is +13.

---

### Fail-first - RC-023, the course wording bounds (new this run)

The wiring spec was replayed against the REAL pre-fix tree (HEAD 31f64cf), not an
injection: 4 of its 5 cases fail on the shipped code that produced the report. The
bounds spec was reconstructed by injection, since the functions did not exist before.
Full transcript in `.evidence/course-wording-bounds.txt`.

```
FAIL-FIRST: src/data/courseWordingGate.test.ts - run with COURSE_WORDING_SPEC_ROOT
pointed at app/course/edit.tsx and src/data/repository.ts exported from HEAD 31f64cf.
Produced: not ok 2 - the course form refuses to OFFER a save the database will refuse;
not ok 3 - the form measures the override, not the words on screen;
not ok 4 - the reason is stated where the person is typing AND at the button;
not ok 5 - a constraint that still fires is answered in words, not in Postgres.
1 of 5 passed (the tree-exists guard). 5/5 after the fix.

FAIL-FIRST: src/data/message.test.ts - wordingProblem() and courseNameProblem()
forced to `return null`, which is exactly what the form did before this change:
validate nothing. Produced 7 failures, each "did not match /subject/i" (or
/message/i, /course name/i) against Input: 'null' - 26, 28, 29, 30, 32, 33, 34.
Injection reverted; 35/35 green.

NOT OBSERVED FAILING: the dialog in a browser, either theme. No browser driver in
this project and adding one for a bug fix is an unrequested dependency. Stated as a
limit, not a pass - see .evidence/course-wording-bounds.txt section 3.
```

Registry delta, verified against the files: `src/data/message.test.ts` 25 -> 35
(+10), `src/data/courseWordingGate.test.ts` new at 5. Suite 501 -> 516.

---

### Fail-first - src/components/pickerSearch.test.ts (new this run)

Three injected defects, each reverted; the clean module is 9/9 green before and after.
Injections 1 and 2 are not invented defects - each restores the expression that actually
shipped. Full transcript in `.evidence/picker-search-and-key.txt`.

```
FAIL-FIRST: src/components/pickerSearch.test.ts - `pickerMatches` ignores `option.search`,
which is the shipped label-only filter. Produced: not ok 2 - an email address matches,
which is the whole ask; not ok 3 - the address is what tells two same-named members apart;
not ok 4 - case and surrounding space do not decide the answer. 6/9.

FAIL-FIRST: src/components/pickerSearch.test.ts - `pickerKey` returns `option.label`, which
is the shipped `key={o.label}` (RC-024). Produced: not ok 7 - two members sharing a name are
two different rows; not ok 8 - a row keyed by its member id does not move when the list is
filtered; not ok 9 - labels with no identity of their own still key uniquely. 6/9.

FAIL-FIRST: src/components/pickerSearch.test.ts - the `q === ''` early return removed.
Produced NOTHING: 9/9 still green. `label.includes('')` is true for every row, so the suite
cannot distinguish the guarded version from the unguarded one. Recorded as the honest limit
of that test's reach - the guard is kept for intent, not for behaviour.
```

NOT OBSERVED FAILING: the picker rendered in a browser, either theme. No browser driver in
this project and adding one for a correction is an unrequested dependency. The row's new
second line reuses the token pair the row's meta text already uses on the same surface, so
it adds no new pair for check-contrast to measure. Stated as a limit, not a pass -
see `.evidence/picker-search-and-key.txt` section 4.

Registry delta, verified against the files: `src/components/pickerSearch.test.ts` new at 9.
Suite 528 -> 537 at the moment this change was measured. The total has since read 542: a
concurrent session is working in this same tree and added its own cases. The delta this change
owns is +9, and that is the number verified against the file.

---

### Fail-first - src/components/chipScroll.test.ts (new this run)

Run against three injected defects, each reverted; the clean module is 9/9 green before and
after. Full transcript in `.evidence/token-chips-arrows.txt`.

```
FAIL-FIRST: src/components/chipScroll.test.ts - `measured()` forced to return true, so an
unmeasured width of 0 counts as a real measurement (TD-021's mistake, pointed the other way).
Produced: not ok 1 - an unmeasured row has no arrows (true !== false), and
not ok 2 - a nonsense measurement is treated as no measurement.

FAIL-FIRST: src/components/chipScroll.test.ts - `chipStep` reduced to a plain
`viewportWidth - CHIP_OVERLAP` with no floor. Produced: not ok 7 - a narrow row still
advances by a useful amount (12 !== 30, a 12px move per tap on a 160px row). This defect
does NOT fail test 9; stated because it is the honest limit of that test's reach.

FAIL-FIRST: src/components/chipScroll.test.ts - `nextChipOffset` returned unclamped.
Produced: not ok 8 - the arrows clamp to the row rather than running off it, and
not ok 9 - tapping right reaches the last chip, at every width (width 240 stops short:
960 !== 930).
```

---

## Gate run - 2026-09-05 - VERDICT: FAIL

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
- **G7 Unit + pure specs** - PASS
- **G8 Functional / integration** - FAIL

```
exit 1
```

- **G9 Automation addressability** - FAIL

```
BLOCKED [TEST ID COVERAGE] - 1 new violation(s):
BLOCKED [TEST ID COVERAGE] - 1 baselined item(s) now pass but are still listed:
```

- **G10 Backward compatibility (fixtures)** - PASS
- **G11 Wide tables are configurable** - PASS

_Merge blocked. Every FAIL above must resolve. No partial merges._

SUPERSEDED SAME DAY -- READ THIS FIRST. Everything in the note below describes a change the
owner rejected within the hour and that is now fully reverted: an unrecognised number goes to
the registration screen, unconditionally, as it did before. The fail-first evidence and the
amended spec recorded below are therefore evidence about code that is no longer in the tree.
The note is kept rather than deleted because the gate run it describes is real, and because
RC-019 points at it. What SHIPPED from that run instead: the "This academy is already
registered" notice removed from the registration form, and a staff member tapping Forgot PIN
now gets her own screen instead of the super admin's security questions. 405 unit cases pass.

UNKNOWN NUMBER NO LONGER REACHES REGISTRATION (Track C, RC-019,
requests/2026-09-06-unknown-number-sent-to-registration.md).

G9 IS A NEW FAILURE AND IT IS NOT MINE. The verdict moved from 6 pass / 4 fail / 1 blocked to
5 / 5 / 1, and the whole delta is G9 Automation addressability, blocked two-sidedly on
`src/components/Sheet.tsx` (6 known gaps in the baseline, 8 now). That file is a PEER SESSION'S
STAGED, UNCOMMITTED work -- `M ` in the index, 112 insertions, and I have not touched it. I did
not regenerate the baseline: doing so would bless another session's debt under my name and
close the two-sided check that is the point of the ratchet. It clears when that session tags
its two new interactive elements, or when it regenerates the baseline itself. My own files add
no testid gap; the hardcoded-colour ratchet is "none new" on both directories.

The other four are the same accepted-unverifiable classes as every run on this repo -- G1/G2/G3
no design/tokens.json (TD-001/002/003), G6 BLOCKED no eslint (TD-004), G8 FAIL on an empty log,
no test:functional (TD-006). None is touched by this change.

363 unit cases pass (26 in signin.test.ts), 2840/2840 contrast pairs, 75/75 icons, G5 types
PASS. The 363 is a verdict on the COMBINATION -- several sessions' uncommitted work is in this
tree -- not on this change alone.

FAIL-FIRST: src/data/signin.test.ts -- 'an unrecognised number is sent to the ADMIN once the
academy exists' and 'an auth-lookup that does not send the field is treated as CLOSED' were both
observed FAILING (24/26) against the one-input `continueDestination`, which returned 'register'
for both. Reconstructed WITHOUT git: signin.ts copied to the scratchpad, the mapping reverted in
place, the specs run, the file copied back, and `diff` run against the copy to prove the restore
was byte-identical -- the shared worktree makes `git checkout --` unsafe for a baseline.

AMENDED, NOT APPENDED: 'an unrecognised number goes to registration' is the one existing spec
this change rewrites, because the owner reversed the behaviour it asserted. It now reads 'WHILE
SETUP IS STILL OPEN' and asserts `continueDestination(false, true) === 'register'`. Stated
plainly because test files here are append-only by rule, and this is the exception being taken.

NOT VERIFIED VISUALLY. The new sentence on the sign-in screen was not looked at in either theme:
every .harness script hard-codes Linux paths and playwright is not installed on this machine. It
uses no new colour -- the existing error branch of the status box, whose ink is measured in both
themes -- so contrast is proven by measurement, not by eye. Weaker than looking, and honest.


---

## Gate run - 2026-09-06 - VERDICT: FAIL

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

## Gate run - 2026-09-06 - VERDICT: FAIL

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

**Reading this run** (requests/2026-09-06-course-wording-preview-first.md -- the Wording for
this course card on Add / Edit course opens on its preview; Edit reveals the editor):

The four FAILs and the BLOCKED are the same accepted-unverifiable classes as every run on this
repo -- G1/G2/G3 no design/tokens.json (TD-001/002/003), G6 BLOCKED no eslint (TD-004), G8 FAIL
on an empty log, no test:functional (TD-006). None is touched by this change. Contrast is
proven the way this repo proves it: `npm run check` -- 2840/2840 pairs, 75/75 icons, 482 unit
specs, types PASS. audit:testids and audit:colors report no new violation.

No spec added (CASES-NA in the commit): the change is one boolean of screen state in
app/course/edit.tsx with no rule in src/data/. The behaviour was walked on the BUILT page in
both themes -- closed shows preview + Edit only; Edit shows Subject, chips, Message, chips;
Done keeps the typed words and the preview shows them; Reset appears once overridden; Tab from
Reset lands on the control and Enter opens it. Recorded in
.evidence/course-wording-preview-first.txt.

---

FAIL-FIRST: src/components/overviewGrid.test.ts -- run against the tree at 2b4c516, before
app/(tabs)/index.tsx changed and before AttendanceRings.tsx existed: 4 of 5 specs failed (the
grid, the rings import, the old marks still present, the ring component missing). Full TAP in
.evidence/overview-grid-fail-first.txt. Green on the changed tree.

## Gate run - 2026-09-06 - VERDICT: FAIL

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

## Gate run - 2026-09-06 - VERDICT: FAIL

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

## Gate run - 2026-09-06 - VERDICT: FAIL

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

## Gate run - 2026-09-06 - VERDICT: FAIL

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

## Gate run - 2026-09-06 - VERDICT: FAIL

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

## Gate run - 2026-09-06 - VERDICT: FAIL

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

## Gate run - 2026-09-06 - VERDICT: FAIL

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

## Gate run - 2026-09-06 - VERDICT: FAIL

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

## Gate run - 2026-09-06 - VERDICT: FAIL

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

## Gate run - 2026-09-06 - VERDICT: FAIL

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

## Gate run - 2026-09-05 - VERDICT: FAIL

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

MEMBER DAY CHIPS SHOW THE DAYS IN FORCE (Track C, RC-020,
requests/2026-09-06-member-day-chips-not-selected.md).

This report is the 6/4/1 run above it, NOT the 5/5/1 report at the top of this file. Two
sessions prepended to TEST_SUMMARY.md within a minute of each other in the shared worktree and
the newer of the two ended up underneath; the file is out of chronological order at the top and
the runs are told apart by their step counts. Nothing was lost.

The four FAILs are the accepted-unverifiable classes every run on this repo carries -- G1/G2/G3
no design/tokens.json (TD-001/002/003), G6 BLOCKED no eslint (TD-004), G8 FAIL on an empty log,
no test:functional (TD-006). None is touched by this change. G9 is back to PASS.

373 unit cases pass (11 in memberDays.test.ts, 5 of them new), 2840/2840 contrast pairs,
75/75 icons, G5 types PASS, npm run audit:all clean -- six audits, no new violations. The 373 is
a verdict on the COMBINATION: several sessions' uncommitted work is in this tree, not this
change alone.

FAIL-FIRST: src/data/memberDays.test.ts -- the five `openingDays` cases were written and run
BEFORE the function existed and were observed failing 5/11 against the tree, with
`'(0 , import_memberDays2.openingDays) is not a function'`. That is a thin fail-first and it is
worth saying why rather than dressing it up: the defect did not live in a pure module at all. It
lived in the wiring -- a row cleared by a picker and refilled only by a CHANGED key, and a
`Member` record that carried no `weekdays` for the edit form to open from. This repo has no
component renderer (`npm run test:unit` is `tsx --test src/**/*.test.ts`, pure modules only), so
neither half of the root cause is reachable by a unit test. What the new cases DO pin is the rule
the wiring now delegates to, which is why the rule was extracted rather than written inline again.

NOT OBSERVED FAILING, and unverified here: both halves in the running app. The add-form path
(re-pick the course already showing -> the row goes blank and stays blank) and the edit-form path
(open a member with days of her own -> her chips fill; Save without touching anything -> her
member_schedules row survives) were reasoned from the code and the migrations (0006, 0027), not
executed. `.harness/*.mjs` drives Playwright from a Linux sandbox path (`/opt/pw-browsers/...`)
and neither Playwright nor Puppeteer is installed on this machine. The edit-form half is the one
that mattered most and is the one least proven: the claim that Save on an untouched Edit form
used to end her override is read off `update_member` (0027, `if p_weekdays is null then ... end
the override`) plus `memberWeekdays([], ...) === null`, and it deserves a run against a real
member before anyone relies on it.

Also unverified: `member_schedules` now joins `fetchMembers`. Its RLS read policy is the same
`is_active_app_user()` the members table already passes (0006), so no new grant is needed, and
the query was not run against the live project -- no automated target, per CLAUDE.md.

---


---

## Gate run - 2026-09-05 - VERDICT: FAIL

Steps: 4 pass, 4 fail, 3 blocked.

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
- **G5 Types** - FAIL

```
src/data/repository.ts(1699,11): error TS2741: Property 'weekdays' is missing in type '{ id: string; code: string; name: string; course: string; branch: string; aliases: string[]; joined: string; emails: { address: string; primary: boolean; }[]; status: "active"; expected: number; attended: number; missed: number; streak: number; last: string; }' but required in type 'Member'.
src/data/repository.ts(1776,20): error TS2345: Argument of type '{ id: string; code: string; name: string; course: string; branch: string; aliases: string[]; emails: { address: string; primary: true; }[]; status: "active"; expected: number; attended: number; missed: number; streak: number; last: string; joined: string; }' is not assignable to parameter of type 'Member'.
  Property 'weekdays' is missing in type '{ id: string; code: string; name: string; course: string; branch: string; aliases: string[]; emails: { address: string; primary: true; }[]; status: "active"; expected: number; attended: number; missed: number; streak: number; last: string; joined: string; }' but required in type 'Member'.
```

- **G6 Lint** - BLOCKED - prerequisite G5 did not pass
- **G7 Unit + pure specs** - BLOCKED - prerequisite G5 did not pass
- **G8 Functional / integration** - BLOCKED - prerequisite G5 did not pass
- **G9 Automation addressability** - PASS
- **G10 Backward compatibility (fixtures)** - PASS
- **G11 Wide tables are configurable** - PASS

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-05 - VERDICT: FAIL

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
- **G7 Unit + pure specs** - PASS
- **G8 Functional / integration** - FAIL

```
exit 1
```

- **G9 Automation addressability** - FAIL

```
BLOCKED [TEST ID COVERAGE] - 1 new violation(s):
BLOCKED [TEST ID COVERAGE] - 1 baselined item(s) now pass but are still listed:
```

- **G10 Backward compatibility (fixtures)** - PASS
- **G11 Wide tables are configurable** - PASS

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-05 - VERDICT: FAIL

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
- **G7 Unit + pure specs** - PASS
- **G8 Functional / integration** - FAIL

```
exit 1
```

- **G9 Automation addressability** - FAIL

```
BLOCKED [TEST ID COVERAGE] - 1 new violation(s):
BLOCKED [TEST ID COVERAGE] - 1 baselined item(s) now pass but are still listed:
```

- **G10 Backward compatibility (fixtures)** - PASS
- **G11 Wide tables are configurable** - PASS

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-04 - VERDICT: FAIL

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

TAP-TO-INSERT DETAIL CHIPS (ADR 011, Track E -> Track B). Same five accepted-unverifiable
classes as every run on this repo -- G1/G2/G3 no design/tokens.json (ADR 001, TD-001/002/003),
G6 BLOCKED no eslint (TD-004), G8 FAIL on an empty log, no test:functional (TD-006). None is
touched by this change.

316 unit (305 + 11 appended to message.test.ts), 2840/2840 contrast, 75/75 icons, audit:all
clean, G5 types PASS.

READ THIS BEFORE TRUSTING THE NUMBER. The working tree at gate time ALSO CONTAINED ANOTHER
SESSION'S UNCOMMITTED WORK -- app/course/[id].tsx, app/member/edit.tsx, src/data/repository.ts
and requests/2026-09-05-park-unresolved-upload-rows.md, none of them mine and none of them in
my commit. This is the shared worktree behaving as it does. So the 316 is a verdict on the
COMBINATION, not on this change in isolation, and it cannot be decomposed after the fact. The
files I did commit were diff-reviewed line by line (B6) and carry only lines that trace to
requests/2026-09-05-insert-a-detail-chips.md.

NOT OBSERVED FAILING: the chip ROW itself -- src/components/TokenChips.tsx. It is new surface
with no prior behaviour, so there is no pre-change state in which a test of it could fail. What
IS covered, and was written to be, is the part with edge cases: insertToken's cursor, spacing,
selection-replacement, append-on-no-focus and out-of-range handling, plus the assertion that
every chip inserts a token the Edge Function can actually fill -- a chip that inserted an
unbuildable token would send literal braces to every member of the course. Rendering the row is
the part no rung here can reach (TD-006, G8).

DESIGN PASS, recorded because VISUAL?=yes obliged it:
  States      the chips are static content of a section that only renders in the LOADED state;
              empty/loading/error/offline/permission-denied unchanged and unreachable for them.
  Both themes semantic tokens only -- theme.surface, theme.lineStrong, theme.fg, theme.dim.
              Mirrors the frequency-day chips in the same form, minus the selected state.
  Strings     one explainer line + 13 chip labels. Every other string on the screen frozen.
  Permissions unchanged -- already inside the super-admin course form, and save_course (0030)
              restates the check server-side.
  Keyboard    each chip is a Pressable with accessibilityRole=button and an accessibilityLabel
              carrying the FULL phrase ("Add to the subject: her first name"), not the clipped
              chip text. They sit in visual order between the field and the preview.

The 44pt height is TAP_MIN and is not negotiable, which is what made one-row-per-field a real
cost rather than a free choice -- the alternative, a single shared row targeting whichever
field was touched last, was rejected in ADR 011 for carrying hidden state.

---

## Gate run - 2026-09-05 - VERDICT: FAIL

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

## Gate run - 2026-09-05 - VERDICT: FAIL

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

## Gate run - 2026-09-05 - VERDICT: FAIL

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

## Gate run - 2026-09-05 - VERDICT: FAIL

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

## Gate run - 2026-09-05 - VERDICT: FAIL

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

## Gate run - 2026-09-05 - VERDICT: FAIL

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

## Gate run - 2026-09-05 - VERDICT: FAIL

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

## Gate run - 2026-09-05 - VERDICT: FAIL

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

## Gate run - 2026-09-05 - VERDICT: FAIL

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

## Gate run - 2026-09-05 - VERDICT: FAIL

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

## Gate run - 2026-09-05 - VERDICT: FAIL

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

## Gate run - 2026-09-05 - VERDICT: FAIL

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

## Gate run - 2026-09-05 - VERDICT: FAIL

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

## Gate run - 2026-09-05 - VERDICT: FAIL

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


REGISTRATION IS ONE FORM (Track B, requests/2026-09-06-register-form-single-page.md).
Same five accepted-unverifiable classes as every run on this repo -- G1/G2/G3 no
design/tokens.json (ADR 001, TD-001/002/003), G6 BLOCKED no eslint (TD-004), G8
FAIL on an empty log, no test:functional (TD-006). None is touched by this change,
and the counts are identical to the last committed run: 6 pass, 4 fail, 1 blocked.

328 unit cases pass, 2840/2840 contrast pairs, 75/75 icons, audit:all clean
(testid and hardcoded-colour ratchets both "none new"), G5 types PASS.

READ THIS BEFORE TRUSTING THE NUMBER. The working tree at gate time ALSO CONTAINED
ANOTHER SESSION'S UNCOMMITTED WORK -- app/course/[id].tsx, app/member/edit.tsx,
src/data/alias.ts, src/data/alias.test.ts, src/data/repository.ts and
requests/2026-09-05-park-unresolved-upload-rows.md, none of them mine and none of
them in my commit. The shared worktree behaving as it does. So 328 is a verdict on
the COMBINATION, not on this change alone -- the previous run recorded 316 and the
12 new cases are that session's, not this one's. This file itself carries TWO gate
reports added since the last commit; only one of them is mine, and they are
byte-identical, so I cannot say which. The files I DID commit were diff-reviewed
line by line (B6) and carry only lines that trace to the request file.

TESTS ADDED: NONE, and that is a real gap stated rather than papered over. The
form's validity predicate is computed inside the render body of app/register.tsx,
where -- in this repo's own words about signin.ts -- "a claim computed inside a
render body is one nobody can test". It was inline before this change and it is
inline after; merging three step-predicates into one did not make it reachable.
Extracting it to src/data/ with specs is the right fix and is NOT in the request,
so it is flagged for the requester rather than done unasked.

NOT VERIFIED VISUALLY. The Definition of Done asks for both themes looked at, and
.harness/allroutes.mjs is the tool for it -- but every .harness script hard-codes
Linux paths (/opt/node22, /opt/pw-browsers) and playwright is not installed here,
so none of them runs on this Windows machine. What stands in for the eye is
measurement, not assumption: the one new colour is theme.danger, which
check-contrast.ts measures against every surface in BOTH themes (2840/2840), and
the hardcoded-colour ratchet confirms no literal was introduced. That is a weaker
claim than looking, and it is the honest one.

---

## Gate run - 2026-09-04 - VERDICT: FAIL

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

## Gate run - 2026-09-04 - VERDICT: FAIL

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

## Gate run - 2026-09-04 - VERDICT: FAIL

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

## Gate run - 2026-09-04 - VERDICT: FAIL

Steps: 4 pass, 4 fail, 3 blocked.

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
- **G5 Types** - FAIL

```
app/(tabs)/attendance.tsx(215,41): error TS2345: Argument of type 'string' is not assignable to parameter of type '"/upload" | "/audit" | "/(tabs)/weekly" | RelativePathString | ExternalPathString | "/appearance" | `/appearance?${string}` | `/appearance#${string}` | `/audit?${string}` | ... 137 more ... | { ...; }'.
app/(tabs)/attendance.tsx(226,41): error TS2345: Argument of type 'string' is not assignable to parameter of type '"/upload" | "/audit" | "/(tabs)/weekly" | RelativePathString | ExternalPathString | "/appearance" | `/appearance?${string}` | `/appearance#${string}` | `/audit?${string}` | ... 137 more ... | { ...; }'.
app/(tabs)/attendance.tsx(240,39): error TS2345: Argument of type 'string' is not assignable to parameter of type '"/upload" | "/audit" | "/(tabs)/weekly" | RelativePathString | ExternalPathString | "/appearance" | `/appearance?${string}` | `/appearance#${string}` | `/audit?${string}` | ... 137 more ... | { ...; }'.
app/(tabs)/members.tsx(107,39): error TS2345: Argument of type 'string' is not assignable to parameter of type '"/upload" | "/audit" | "/(tabs)/weekly" | RelativePathString | ExternalPathString | "/appearance" | `/appearance?${string}` | `/appear
... (truncated)
```

- **G6 Lint** - BLOCKED - prerequisite G5 did not pass
- **G7 Unit + pure specs** - BLOCKED - prerequisite G5 did not pass
- **G8 Functional / integration** - BLOCKED - prerequisite G5 did not pass
- **G9 Automation addressability** - PASS
- **G10 Backward compatibility (fixtures)** - PASS
- **G11 Wide tables are configurable** - PASS

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-04 - VERDICT: FAIL

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

## Gate run - 2026-09-04 - VERDICT: FAIL

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

## Gate run - 2026-09-04 - VERDICT: FAIL

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

## Gate run - 2026-09-04 - VERDICT: FAIL

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

## Gate run - 2026-09-04 - VERDICT: FAIL

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

## Gate run - 2026-09-04 - VERDICT: FAIL

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

## Gate run - 2026-09-04 - VERDICT: FAIL

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

RETIRING THE MEMBER CODE: this verdict is the SAME verdict the run above it recorded, on the
same four steps, and none of them is this change. G1/G2/G3 fail on a missing `design/tokens.json`
that this repository deliberately does not have (DECISION_LOG 003-005); G8 fails because no
`test:functional` script exists (DECISION_LOG 009); G6 is blocked for want of a local eslint
(DECISION_LOG 007). Compare the two reports line for line -- every step that reports on code
this change touched is PASS, and G5 Types, G7 Unit and G10 Backward compatibility (fixtures) are
the three that would have caught it if the Member type, the eight fixtures or the token map had
gone out of step.

What was verified directly, and is not in the gate:
  npm run check  -- 229 unit assertions, 2840/2840 contrast pairs, 75/75 icons
  npm run audit:all -- six audits, no new violations; COLUMN CONTROL and DEAD WEIGHT still clean

What was NOT verified, and must be before 0026 is applied anywhere:
  bash db/harness/test.sh -- this machine has neither psql nor Docker, which is exactly the
  situation ADR 005 was written for: CI runs the harness against services: postgres:16, and that
  run is the rehearsal. 0026 and supabase/tests/20_no_member_code.sql have never been executed.

---
FAIL-FIRST: src/data/meetCsv.test.ts (REAL_FILE) - observed failing against the tree, on the
genuine export rather than on a fixture. This is the SECOND time this parser was wrong about the
same file, and the first fix is why:

That fix was written against `*,Meeting code: gzj-yhru-ehp` -- copied from a SPREADSHEET VIEW of
the export, where Excel shows the bullet in column A and the text in column B because it splits on
whitespace for display. The bytes are one quoted cell:

    "*     Meeting code: gzj-yhru-ehp"

so a pattern anchored at the label matched nothing. Running the actual file:

    meta.code : null      created : null      ended : null      date : null

The rows parsed, so nothing looked broken -- and the upload's Process button is disabled without a
date, so the import could not be started at all. A fixture that passed and a parser that failed.

The fixture is now reconstructed from the file itself, BOM and CRLF included, so it cannot be
"fixed" against a picture of a file again. Also fixed: the UTF-8 BOM was left in the first cell,
which is harmless while the table starts on line 5 and fatal for an export whose header is line 1
-- "Full Name" would fail to match on an invisible character and the message would blame the file.

FAIL-FIRST: src/data/meetCsv.test.ts (the real export shape) and supabase/tests/18_import_session.sql
- both were observed failing against the tree BEFORE the fix, and the first failure was found by
running the parser against a REAL Google Meet export rather than against a fixture I wrote.

The file:

    *,Meet
    *,Meeting code: gzj-yhru-ehp
    *,Created on 2026-08-31 20:12:56
    *,Ended on 2026-08-31 20:15:25
    Full Name,First Seen,Time in Call
    RosiFit,2026-08-31 20:12:56,00:00:32
    UniqBotz Info,2026-08-31 20:12:58,00:02:28

Parsed against the old reader:

    rows      : [{"full_name":"RosiFit",...},{"full_name":"UniqBotz Info",...}]
    skipped   : 4
    meta.code : null
    created   : null
    ended     : null
    date      : null

THE ROWS PARSED, so nothing looked broken. readMeta took cells[0] as the label and cells[1..] as
the value, which only fits `Meeting code,abc-defg-hij`. A real export writes ONE cell -- "Meeting
code: gzj-yhru-ehp" -- behind a `*` marker, so the file's only evidence of WHICH meeting it came
from and WHEN was silently discarded. The session could not be derived from the file at all, which
is the whole mechanism this change rests on.

The value is matched by PREFIX, not by splitting on ':', and there is a case pinning why:
"Created on 2026-08-31 20:12:56" split at its first colon yields the time 12:56 and a date ending
in 20.

18_import_session.sql failed against 0023 on the assertion that matters most:

    FAIL  a session the schedule does not cover expects EVERYONE ENROLLED, not nobody
          got 'schedule' want 'all_enrolled'
    FAIL  both enrolled members were due -- this is the number that used to be 0
          got 0 want 2

That is the defect stated exactly: attendance "recorded" for a class that counted for nobody.

ALSO OBSERVED, my own bug rather than the product's: three assertions first errored with "column
reference status is ambiguous" -- attendance_records and sessions both have one and I joined them
without qualifying. Fixed in the spec, not in the product.

NOT OBSERVED FAILING: rosterScope (src/data/course.test.ts, 8 new cases) - the helper is new and
every case passed on its first run. It was not written for a defect already in the tree; it was
written because the change that needed it INTRODUCED the exposure. The chevron on a course card
opens /members?courseName=…, and the members screen renders that value as its heading and inside
"Nobody is enrolled in X". Without resolution against the academy's own course list, any link
could have put any string in the app's mouth, spoken as fact.

Driven in a browser against the exported build, since "what does the heading say" is only
answerable there:

  ?courseId=c1&courseName=Prenatal%20Flow  -> Prenatal Flow | 3 members in this course
  ?courseName=prenatal%20flow              -> Prenatal Flow | 3 members in this course
  ?courseName=Advanced%20Wizardry          -> Members | 8 members · 3 branches · 4 courses
  ?courseName=All%20courses                -> Members | 8 members · 3 branches · 4 courses
  ?courseName=<script>alert(1)</script>    -> Members | 8 members · 3 branches · 4 courses
  (no parameter)                           -> Members | 8 members · 3 branches · 4 courses

The lowercase case matters as much as the refusals: the ACADEMY'S spelling is rendered, never the
caller's, so a hand-edited URL cannot restyle a course name in the heading.

The "All courses" case is a hole the first version had. fetchFilterOptions heads its option list
with that literal for the picker, so ?courseName=All courses resolved to it and produced an empty
roster under a heading naming a course nobody teaches. The screen slices the head off before
asking; the case pins WHY, so deleting the slice fails here rather than in production.

NOT OBSERVED FAILING: src/data/uploadScope.test.ts - scopeSessions is new and all 13 cases passed
on their first run. The behaviour it replaces was not a wrong computation but an ABSENT one:
app/upload.tsx read `const sessions = pending.data ?? []` and offered every session awaiting a
file in the academy, whatever screen had opened it. There was no branch to fail.

Verified instead by driving all six shapes against the exported build, which is where "did the
narrowing happen" is actually answerable:

  /upload                              -> 2 sessions, picker      (academy-wide, unchanged)
  /upload?courseId=c1                  -> straight to step 2      (c1 has one pending session)
  /upload?courseId=c1&date=2026-08-22  -> straight to step 2      (preselected)
  /upload?courseId=c1&date=2026-08-19  -> "That session is no longer waiting for a file"
  /upload?courseId=c9                  -> "No session for this course is waiting for a file."
  /upload?courseId=c1&date=undefined   -> the course scope, date ignored
  then "Change" on step 2              -> back to /upload, full picker

THE TWO CASES THAT MATTER are refusals, and both are asserted rather than merely observed:

  - a scope matching nothing does NOT widen back to every session. She tapped "Upload this
    session" about ONE session; handing her twelve others as though that were the answer is how
    the wrong file reaches the wrong class.
  - two sessions of one course on one day (two branches) are NOT resolved to the first. Silently
    taking one would attach Coimbatore's register to Chennai.

'?date=undefined' is asserted because that is literally what `${maybeDate}` produces from a
missing value; filtering on it would empty the list and blame the sessions.

NOT OBSERVED FAILING: src/data/nav.test.ts - safeBackTarget was written after the defect it
serves was reproduced in a BROWSER, and every case passed on its first run. The defect itself was
observed, twice, against the exported build:

  BEFORE: course detail -> "Weekly review" -> back  ==>  http://127.0.0.1:8100/
  AFTER : course detail -> "Weekly review" -> back  ==>  http://127.0.0.1:8100/course/c1

The first is Overview, not the course the person opened Weekly review from. Weekly lives inside
the tab group (the canvas keeps the academy header and nav pill on it), and navigating to a screen
in a Tabs navigator switches the focused tab rather than pushing -- so router.back() pops to the
FIRST tab. Nothing in the code says so; only running it does.

The refusal cases are the substance, and one of them was also driven in the browser:

  /weekly?from=https%3A%2F%2Fevil.example  ->  back  ==>  http://127.0.0.1:8100/courses

`from` is a URL parameter on a control whose whole promise is "you will end up where you were", so
an unvalidated one is an open redirect wearing an arrow icon. //host and /\host are asserted
separately from the absolute-URL case because both START WITH A SLASH and would otherwise read as
in-app paths.

FAIL-FIRST: scripts/audits/check-audit-attribution.test.sh - the gate it tests was observed
failing and passing by hand before the cases were written: reverting send-followups' one call
site from audit_log_as back to audit_log made `npm run audit:auditactor` exit 1 naming that file,
and restoring it returned "OK ... 0 unattributed". The cases reproduce exactly that, plus the
three the hand check could not cover:

  - an auth.* action inside a NON-exempt function is still blocked, so a post-session function
    cannot borrow the pre-session exemption by naming its action 'auth.something'
  - the three exempt functions are counted AS exempt rather than folded into the clean count
  - an EMPTY tree reports "0 attributed" rather than silence

That last one is the reason the file asserts on output and not only on exit codes. A gate that
guards a silent defect is silent when it breaks: one stray character in its regex and it passes
everything forever, cheerfully reporting "0 unattributed" about a tree it never read. Exit code 0
is indistinguishable between "clean" and "scanned nothing".

FAIL-FIRST: supabase/tests/17_audit_actor.sql - observed failing against the tree BEFORE 0023,
which is the defect itself rather than an injected one. Every assertion naming audit_log_as failed
with

    ERROR:  function public.audit_log_as(unknown, unknown, unknown, unknown) does not exist

and the two assertions that PIN the old behaviour passed then and pass now, which is the point of
their being there:

    PASS  audit_log() through service_role still records NO actor -- the defect, unchanged
    PASS  and still labels it anon, which is what an unauthenticated request would carry (= anon)

The defect was reproduced first, in one statement on the harness, before any code was written:

    begin; set local role service_role;
    select public.audit_log('communication.batch_sent','email_batch','b1'); commit;
    -->  actor_app_user_id | actor_kind |          action
         ------------------+------------+--------------------------

## Gate run - 2026-09-04 - VERDICT: FAIL

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

## Gate run - 2026-09-04 - VERDICT: FAIL

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

## Gate run - 2026-09-04 - VERDICT: FAIL

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

## Gate run - 2026-09-04 - VERDICT: FAIL

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

## Gate run - 2026-09-04 - VERDICT: FAIL

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

## Gate run - 2026-09-03 - VERDICT: FAIL

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
- **G7 Unit + pure specs** - PASS
- **G8 Functional / integration** - FAIL

```
exit 1
```

- **G9 Automation addressability** - FAIL

```
BLOCKED [TEST ID COVERAGE] - 1 new violation(s):
BLOCKED [TEST ID COVERAGE] - 1 baselined item(s) now pass but are still listed:
```

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
                           | anon       | communication.batch_sent

A null actor with kind 'anon' -- the label an UNAUTHENTICATED request carries -- for a batch of
emails a named super admin sent. That query is what turned "the spec says attribute actions" into
a defect with a reproduction.

ALSO OBSERVED, and the reason the fix stops where it does: the same probe run as `authenticated`
with a JWT claim set records the actor correctly (branch.insert, super_admin, "Client Admin"), so
the row triggers were never broken and only the service-role path needed the actor passing in.

FAIL-FIRST: src/data/signin.test.ts - the spec failed on its FIRST run, against my own first
cut of groupPhone. That version stripped non-digits and took the first ten, so a number pasted
whole from a contact card -- "+91 80563 29742", beside a field already labelled +91 -- shifted
two places and became "91805 63297". A plausible ten-digit number belonging to nobody, with
nothing on screen to say it was wrong.

    not ok 4 - punctuation and spaces are dropped, never counted
      error: |-
        Expected values to be strictly equal:
        + actual - expected
        + '91805 63297'
        - '80563 29742'

Captured verbatim in .evidence/signin-fail-first.txt. The fix strips a leading 91 or 0 only when
the input is LONGER than ten digits, so '91234 56789' -- a real number that begins 91 -- keeps
all ten. Both halves of that are asserted, because stripping unconditionally would have eaten
two of somebody's real digits and passed the original case.

NOT OBSERVED FAILING: needsRegistration - the routing predicate was written after the defect
above and every case passed on its first run. Its negative cases are the substance: auth-login's
generic refusal, a lockout, a disabled account and a network error must all NOT route to
registration, since treating the generic refusal as "unknown number" would rebuild the
enumeration oracle the function is built to deny.

FAIL-FIRST: src/data/message.test.ts - run against a SINGLE-brace filler, which is the defect
the course form's preview caught the first time it rendered. The stored templates use
{{double_brace}} tokens because that is what send-followups/index.ts renders; a single-brace
filler matched the INNER braces and turned "{{first_name}}" into "{Divya}", then flagged five of
the seeded template's own tokens as unknown.

    not ok 2  - the name splits to a first name
    not ok 3  - the figures are the member's own
    not ok 4  - attendance is a percentage of what was EXPECTED
    not ok 5  - nothing expected is an em dash, never 0%
    not ok 8  - a value containing a token is not substituted again
    not ok 9  - the same token repeated is filled every time
    not ok 13 - SINGLE braces are not tokens - the sender only reads double
    # pass 7  # fail 7

FAIL-FIRST: src/data/recipients.test.ts - run with the exclusion half dropped, which is the
C-76 defect in its purest form: a draft that lists only who it WILL reach reads as complete
while it silently skips somebody the rule named.

    not ok 2 - a member with NO address is excluded and kept, not dropped
    not ok 3 - the two halves account for EVERY flagged member
    # pass 5  # fail 2

Writing that spec also surfaced a require cycle the typechecker could not see: importing mock's
hasEmail as a VALUE into followup.ts closed a loop -- mock imports isEligible and attendancePct
from followup and calls both in its module body, so it ran before they existed and threw at
load. Type imports are erased, which is why the cycle had never bitten. Both revert clean:
156/156.

NOT OBSERVED FAILING: supabase/tests/15_course_communication.sql (17 assertions) and
16_save_course.sql (18) are new against migrations that did not exist before them, so there is
no prior implementation to observe failing. They were written against the running harness and
each was seen to fail while being written -- the type mismatch on sessions_per_week and the
`set local` outside a transaction both showed up that way -- but that is a spec being corrected,
not a defect being caught, and it is recorded as the weaker thing it is.

09_grants.sql now fails in a THIRD way, and this one is caused here: it is a whitelist scoped to
"0002-0010" and course_communication (0021) is outside it, so the table reads as want[none]. The
new table's grants are asserted in 15_course_communication.sql instead, because test files are
append-only and repairing the whitelist means editing an existing spec. Worth the repo owner's
decision rather than mine.

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

FAIL-FIRST: src/data/course.test.ts - the two defects this spec exists to hold were injected
and observed. Counting a member with no address as needing follow-up, and letting the follow-up
sentence outrank "no weekdays":

    not ok 5 - a member with NO ADDRESS is never counted as needing follow-up
    not ok 9 - NO WEEKDAYS outranks the follow-up sentence entirely
    # pass 12  # fail 2

not ok 5 is C-76: she is over the threshold and cannot be emailed, so counting her promises a
send with nowhere to go. not ok 9 is the worse one -- a course with no weekdays expects nothing
of anyone, so no absence can be counted and it sits outside the engine entirely; reporting
"nobody needs follow-up" there is true and deeply misleading. Both revert to 14/14.

FAIL-FIRST: src/data/report.test.ts (bar geometry) - run against the naive implementation the
cases exist to rule out: every bar filling the track, and a count written into every segment
however narrow.

    not ok 16 - the bar LENGTH is the scheduled count, which is what its legend claims
    not ok 17 - the split inside a bar is that row's attendance
    not ok 20 - a count is written inside a segment only when it fits
    not ok 22 - the widest row fills the track exactly, never overflows it
    # pass 18  # fail 4

not ok 16 is the one the legend promises out loud: "Bar length = sessions scheduled". A full-
width bar per row makes a 4-session course look like a 40-session one, which is the whole
comparison the screen exists for. Reverted, 22/22.

NOT OBSERVED FAILING: the shell's two-tab row and the Attendance workspace card carry no unit
specs of their own -- they are layout, and this repository has no renderer in its test program.
Both were verified by SCREENSHOT in a browser instead, in both themes, against the design
prototype driven side by side. That is weaker than a spec and is recorded as such rather than
counted as green.

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


---

## 05-Sep-2026 — Continue validates the mobile number
`requests/2026-09-05-mobile-number-not-validated.md` · Track C · RC-015

**FAIL-FIRST** — `src/data/signin.test.ts`, run against the pre-fix tree
(`npx tsx --test src/data/signin.test.ts`), captured in
`.evidence/continue-validation-fail-first.txt`:

```
not ok 20 - a recognised number goes to the PIN screen, never straight in
not ok 21 - an unrecognised number goes to registration
not ok 22 - a lookup that did not answer STAYS on the number screen
```

`(0 , import_signin.continueDestination) is not a function` — the decision the
screen was making inline did not exist as anything a test could reach, which
is the reason it could be wrong without anybody noticing.

**PASS after the fix** — 22/22 in that file; `npm run check` green end to end:
typecheck · 266 unit cases · 2,840/2,840 contrast pairs · 75/75 icons.

**NOT OBSERVED FAILING** — the server half. `supabase/functions/auth-lookup/`
is new, has no JS test path (Deno, deployed separately), and **is not deployed**,
so nothing has exercised it against a real `app_users` row. Its behaviour is
proven only by reading. That is a real gap, not a formality: the three JS cases
prove what the screen does with an answer, not that the answer is right.

**DB harness — N/A.** No migration. `auth-lookup` reads `app_users.phone_e164`,
a column `auth-login` already reads; nothing about the schema changes.

---

## Edit opened the Add form — RC-021 (06-Sep-2026)

Request: `requests/2026-09-06-edit-member-opens-add-form.md` (BUG, correction round 2 —
RC-012 was the same words, twelve days earlier).

**FAIL-FIRST** — `src/components/editDialog.test.ts`, the final spec replayed against the
pre-fix tree (`git archive HEAD` = 8b16230, unpatched), captured in
`.evidence/edit-opens-add-fail-first.txt`:

```
not ok 2 - Add-vs-Edit is decided by the route, never by the lookup result
not ok 3 - a form asked for a record answers loading before it renders
not ok 4 - a form asked for a record answers a failed read
not ok 5 - a record asked for and not found is said, not treated as Add
not ok 6 - the create path is unreachable once a record id was asked for
# tests 6 · pass 1 · fail 5
```

Each failure names `app/member/edit.tsx` — the assertions stop at the first file in the sweep
list, so the two sibling forms are behind it rather than clean.

**PASS after the fix** — 6/6 in that file; `npm run check` green end to end: typecheck ·
428 unit cases (422 before, +6) · 2,840/2,840 contrast pairs · 75/75 icons.

**WALKED IN THE RUNNING APP** — `expo export --platform web`, served static, driven in
Chromium at 420×900 in **both themes**, asserting on the DOM rather than pixels:

```
[dark|light] /member/edit?id=…&state=loading  -> "Edit member · Fetching her record", no Save
[dark|light] /member/edit?id=…&state=error    -> "Edit member", Try again offered
[dark|light] /member/edit?id=not-a-member     -> "That member is not on the register…"
[dark|light] /member/edit                     -> "Welcome a new member" · "Add Member"
[dark|light] /course/edit?id=…&state=loading  -> "Edit course" over a skeleton
[dark|light] /course/edit                     -> "Add a course"
[dark|light] /offering/edit?offeringId=gone   -> not "Add an offering"
```

**FOUND WHILE VERIFYING, NOT FIXED HERE** — every route in the export raises React #418
(hydration text mismatch) on load, including `/(tabs)` and other screens this change never
touched. Measured 3/3 loads on the **pre-fix** build in `dist/` (07:28) and 3/3 on the fixed
build, on identical URLs — pre-existing and app-wide, not introduced here. It contradicts
CP-015, so it is logged as TD-027 rather than folded into a bug fix that did not cause it.

**DB harness — N/A.** No migration; no schema surface. Three screens and one spec.

FAIL-FIRST: src/components/screenHeaderPinned.test.ts - run against the unchanged tree on 07-Sep-2026: 8 of 9 assertions failed (Screen had no header slot; every tabbed screen had its ScreenHeader as the first child of a bare <Screen>; the course bar sat inside the course page ScrollView). The 9th, the no-sticky-mechanism guard, passed as it should. 9 of 9 after the change.

FAIL-FIRST: src/components/dialogDismiss.test.ts - run against the unchanged tree on 07-Sep-2026 (with only the `confirm-scrim` testID pre-added to the old backdrop, so ConfirmDialog's claim is observed on its merits rather than dying at the lookup): 5 of 17 failed - the five claims this change adds (form backdrop acts on press; announced as a control; labelled as a way out; no responder claim; confirm backdrop acts on press). The other 12 pass in both trees as they must: no container acts on a press, neither backdrop was ever pointer-transparent, the header close still closes, Cancel stands, both pickers still close on their backdrop. Seven reviewer-found side doors replayed as mutations of the changed tree, each reddening exactly one test. 17 of 17 after. Full output: `.evidence/dialogs-close-only-on-close-control-fail-first.txt`. Browser: `.evidence/dialogs-close-only-on-close-control-browser.txt` - the FormDialog import-help pop-up (state-closed, no router history to fake a pass), both themes, backdrop pressed twice and left open, × closes; the calendar panel still closes on its backdrop. NOT browser-driven: ConfirmDialog's inert backdrop (every host needs signed-in data), and the press-does-not-reach-the-live-screen claim - both held by the spec and the read of react-native-web's responder system only.


FAIL-FIRST: src/data/importedMemberJoinedOn.test.ts - run against the unchanged tree on 08-Sep-2026: 2 of 8 failed, and each named the migration actually in force rather than a file the spec had pinned - "0026_retire_member_code.sql: create_member must store v_from -- the raw p_joined_on is null for every bulk-imported member, so her record says 'not recorded' while her enrolment says today", and "an audit entry saying joined_on: null beside a record dated today is a third answer to the same question". The other 6 pass in both trees as they must: the coalesce is where it always was, the future-date refusal already measured v_from, the client already sends no joining date, offline already dates her today, and commit_csv_import already dates a member by the session that names her (RC-033). 8 of 8 after 0049_imported_member_joins_on_the_upload_date.sql. npm run check green end to end: typecheck . 1,014 unit cases (1,006 before, +8) . 2,840/2,840 contrast pairs . 75/75 icons.

**DB harness - NOT RUN, and this change is a migration.** `bash db/harness/test.sh` fails at `reset.sh: line 9: psql: command not found` - TD-050, ADR 005, the same wall 0047 and 0048 are behind. So `supabase/tests/38_imported_member_joined_on.sql` (8 assertions: her record, her enrolment and the audit entry all read back and compared to EACH OTHER, a named date still stored as named, a future date still refused) has never executed anywhere, exactly as 22_bulk_import_members.sql had never executed when it was asserting the truth nobody had read (RC-014). That is why the same claim is duplicated into the node spec above, which runs on every commit. **0049 was applied to production on 08-Sep-2026** on the owner's go-ahead, with ADR 007's rolled-back rehearsal standing in for the harness: the live function proven identical to 0026 first, then the migration plus a real null-dated `create_member` call inside a transaction that was rolled back (joined_on, effective_from and the audit entry all 2026-09-08), then applied, then re-proven on the live function and rolled back again. No bulk import was run against the academy. `.evidence/imported-member-joins-on-the-upload-date-prod.txt`.
FAIL-FIRST: src/data/signOutConfirm.test.ts - 6 cases, new file. Run on 08-Sep-2026 against a
tree rebuilt from HEAD (`git show HEAD:'app/(tabs)/more.tsx'`, `HEAD:app/profile.tsx`, with the
unchanged session.ts and the new signOutPrompt.ts alongside, via SIGN_OUT_CONFIRM_SPEC_ROOT):
4 of 6 failed - "BOTH sign-out controls ask first", "the question is ONE question, held in one
file", "a revocation in flight cannot be tapped a second time", and "a revocation that failed
does not pretend the session ended". The other 2 pass in both trees as they must: the
looking-at-a-real-tree guard, and "the automatic sign-outs are not asked about" - session.ts is
untouched by this change and that case exists to keep it that way (a disabled account must
never be offered "Stay signed in"). 6 of 6 after. npm run check green end to end: typecheck .
1,035 unit cases (1,029 before, +6) . 2,840/2,840 contrast pairs . 75/75 icons. audit:all green,
no new violations in any of the six.

Browser: `.evidence/confirm-before-sign-out-browser.txt` - the real `expo export` build, served
static, both screens x both themes. Each: the question is absent before the tap, present after
it with the shared body wording, "Stay signed in" closes it and leaves the URL where it was,
and the confirm still reaches the sign-in screen (`/`) - a confirmation that quietly stopped
sign-out working would pass every other check. Theme flip is seeded through the STORED
preference, not prefers-color-scheme: ThemeProvider defaults to 'dark' and only 'system'
consults the media query (CP-016), so emulateMedia alone measured dark twice - caught and
corrected mid-verification. Measured light: ground rgb(244,238,242), card #FFF, title ink
rgb(28,10,23). Dark: ground rgb(8,4,10), card rgb(23,10,20), title white. Keyboard (CP-22,
A-10), More/light: the Sign out row is tab stop 13 with the accessible name "Sign out", and the
open question cycles between its two buttons only.

**NOT exercised in the browser: the failed-revocation path.** The export runs on fixtures, where
`signOut()` returns early because no project is configured, so the catch is unreachable there.
It is held by the source assertion above and by reading `supabase.auth.signOut`, not by a walk -
stated rather than implied.

**DB harness - N/A.** No migration, no schema surface. Two screens, one copy module, one spec.

FAIL-FIRST: src/data/uploadBatch.test.ts - 26 cases, new file. Run on 08-Sep-2026 against HEAD f6e0c1a's src/data/uploadBatch.ts, the pre-merge module that set every same-day file aside: 11 of 26 failed, and they are exactly the claims this change makes - two files for one day are ONE group (planBatch returned no groups and two set-asides), the group names both files in pick order, a same-day pair sets nothing aside, days keep first-appearance order, a single file is a group of one, a set-aside never joins a group, and the five mergedFileName / mergedNote cases (neither function existed). The other 15 pass in both trees as they must: the two remaining refusals (no date, future date) and their pick order, today allowed, the batch ask's singular/plural and its 'other 0 files' guard, the confirm and note wording, and batchHeading's three shapes - none of those functions moved. 26 of 26 after. Full output: .evidence/upload-batch-merge-fail-first.txt. NOT run: the full suite, npm run gate, and the browser - on the requester's instruction ("dont test", "fast forward"); typecheck clean for the changed files. Requester's own case reconstructed by reading: two Meet exports 4:48:06 and 4:48:17 PM, different codes, both Tue 8 Sep, Postnatal · Main - previously both refused with 'upload the one you want', now one register for the day fed by both.

NOT OBSERVED FAILING: src/data/memberWeek.test.ts - written by a peer session (requests/2026-09-08-her-week-and-the-run.md) and swept into this commit on the repo owner's instruction, 08-Sep-2026. This session ran it once against the changed tree only (see the pass count in the commit message); it was not run against the pre-change tree here, and whatever fail-first that session observed is recorded in its own request file, not vouched for by this one.
NOT OBSERVED FAILING: src/data/streak.test.ts - same provenance and same caveat as memberWeek.test.ts above: peer session's spec, run once here against the changed tree, not observed failing by this session.
