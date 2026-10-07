## SINGAPORE UNSUBSCRIBE FORWARDER (B2 of the move) — 07-Oct-2026

`requests/2026-10-07-singapore-unsubscribe-forwarder.md`. New `supabase/forwarders/unsubscribe/` (outside `supabase/functions/`, so never one of Mumbai's eleven): GET 307 / POST 308 to Mumbai's unsubscribe function with the query string byte for byte; other paths 404, other methods 405, over-long query 414, unparsable 400; no-store, no-referrer; one constant destination; no secret, env or database. NOT deployed.
FAIL-FIRST: src/data/unsubscribeForwarder.test.ts - before the module existed, 0 of 1 green: "Cannot find module '../../supabase/forwarders/unsubscribe/forward.ts'"; after, 11 of 11 green.
Covered: seven query shapes kept byte for byte (encoded characters, order, repeats, empty values, academy) on both path forms; POST press / Resubscribe / one-click to 308; eleven wrong paths 404 with no Location; five other methods 405; a destination in the query, a fragment, credentials and a foreign host cannot move the destination; 414 and 400 refuse without a Location; source reads no env/secret/client and names one address only.
GATES: `npm run check` 6 of 7 PASS (lint, typecheck, check:edge -- SKIPPED, no Deno here; it does not cover supabase/forwarders/ -- contrast, icons, functions); test:unit fails only on the 2 tests that fail identically on clean origin/main (rosterWindowed, bucketedMetrics).

## UNSUBSCRIBE PAGES ACCEPT THE MUMBAI PROJECT TOO (B1 of the move) — 07-Oct-2026

`requests/2026-10-07-unsubscribe-pages-accept-mumbai.md`. `public/unsubscribe.html` and `public/unsubscribed.html` now offer their button when `fn` is exactly Singapore's OR Mumbai's (`lbyqipunsbzkcvdrxach`) unsubscribe function, each an anchored pattern joined with `||`; all other behaviour unchanged. Not deployed; no function, schema or secret touched.
FAIL-FIRST: src/data/unsubscribeLanding.test.ts (4 appended cases) - against the pages before the change, 14 of 16 green, 2 red: "public/unsubscribe.html must offer its button for https://lbyqipunsbzkcvdrxach.supabase.co/functions/v1/unsubscribe" and "public/unsubscribe.html must accept these two functions and nothing wider"; after, 16 of 16 green.
Refused, by running each page's script: another project, a prefixed ref, a host suffix, the ref in another site's path, http, a longer path, another function, an extra query string, upper case, a `javascript:` address. No button without both halves of the pair, for either project.
GATES: unsubscribe landing + handler + token specs 57/57 (the 28 handler tests -- GET only asks, the press, RFC 8058 one-click, invalid/modified/wrong-member tokens -- unchanged). `npm run check` on 6a03c51: 6 of 7 PASS (lint, typecheck, check:edge -- SKIPPED, no Deno on this machine -- contrast 2852/2852, icons 75/75, functions); test:unit 2215/2217 with 2 failures that fail identically on clean origin/main without this change (`src/components/rosterWindowed.test.ts` "the roster is a FlatList that owns the scroll...", `src/data/bucketedMetrics.test.ts` "the bucket read goes through paged()..."). Re-run on dc60bfb: the 57 specs, typecheck and lint PASS.

## PRODUCTION DEPLOY, STAGE F: csv-import v20 AND send-followups v25 — 07-Oct-2026

On the owner's go-ahead, after the owner had set SEND_CONCURRENCY in the project's Edge Function secrets (screenshot, 07-Oct-2026), both functions were deployed to lhpzhkzbnquwjljmbylo from origin/main 6a03c51 (= PR #65, e6fe1c5), each file taken verbatim from `git show origin/main:` -- the import closure only (no deno.json, no *.test.ts): csv-import (8 files) and send-followups (12 files), verify_jwt true on both as before. Deployed 11:55 and 12:01 UTC; csv-import v18 -> v20, send-followups v23 -> v25.
VERIFIED INDEPENDENTLY of the deploying worker: every file of both deployed bundles pulled back with get_edge_function and md5-compared against origin/main -- 8 of 8 and 12 of 12 byte-identical. The deploy carries this work's changes AND main's T-041 change the previous deploys lacked (send-followups index.ts + load.ts; _shared/pageAll.ts), as the pre-deployment review said it would. Edge logs 11:40-12:05 UTC: no invocations and no boot errors; the first preview and the first batch are the owner's live smoke tests (§7.1 of the final report): a preview of last week's file identical to its last preview, a batch of ten to staff with ten rows in order, then a 100+ batch with no Throttling failure reason. The secret's value is not readable from this session; the pool reads it at each invocation (1-16, default 4).
CASES-NA: a deploy record; no code change.

## PRODUCTION APPLY: MIGRATIONS 0086, 0087, 0085, 0088, 0090, 0089 — 07-Oct-2026

On the owner's explicit go-ahead (raw SQL of all six shown first; "apply all six in order, one at a time, reporting and verifying each") the six migrations merged in PR #65 (main e6fe1c5) were applied to production lhpzhkzbnquwjljmbylo via the Supabase MCP, each verbatim from its file, one at a time, each verified read-only before the next. Ledger rows: 0086 20261007114436 · 0087 20261007114600 · 0085 20261007114704 · 0088 20261007114750 · 0090 20261007114900 · 0089 20261007115016. Every guard matched the live body it expected; no migration raised.
VERIFIED, production, read-only, after each apply:
- 0086: member_period_metrics_page is plpgsql (md5 a9a3b615, 1,397 bytes), same identity arguments, anon false / authenticated true; this week's page: 1,064 buffers, 13 ms (was 13,999 buffers, 426 ms).
- 0087: member_period_metrics_buckets exists, anon false; the seven-day bucket read equals seven page calls row for row (2,541 rows, 0 differences either way); paging past the first 1,000 rows returns the remaining 59.
- 0085: update_member (md5 1ff8772a then, after 0088, 6cb2a236 at 9,806 bytes) and commit_csv_import (ca45c093, 20,731 bytes) carry no recompute_member_stats(); the per-row expected-set call is gone; grants unchanged (commit_csv_import stays service_role-only, as before).
- 0088: business_today() present, anon false / authenticated and service_role true, = 2026-10-07; create_member, update_member, set_member_active_from, set_attendance read it and none reads current_date in a rule.
- 0090: subscription_state (a810e137), save_course, merge_member_into, is_in_course, follow_up_candidates read business_today(); only create_member still carries the word current_date, in prose; subscription_state() = active; follow_up_candidates answers (530 rows this week).
- 0089: BEFORE the apply, 0089's one-pass SELECT was compared with 0008's per-member SELECT on production rows, read-only: 1,610 live members, 0 rows differing either way. After: body 74917e12 (= harness), no current_streak_for call, grants anon false / authenticated false / service_role true, an empty scope writes 0. Whole-academy compute, read-only EXPLAIN: 362 ms, 21,937 buffers (the old SELECT: 52,846 buffers before its upsert).
- Observed, not caused by this work: 4 stored member_stats rows differ from what either body computes (stale before the apply); the next write touching those members, or a by-hand `select public.recompute_member_stats();`, corrects them.
- Security advisors after the DDL: nothing new; the two new functions carry the same SECURITY DEFINER posture as 0075's page function and are revoked from anon.
RE-PINNED, the copy-lock exemption: supabase/tests/53 pins production's update_member and commit_csv_import hashes; the four literals move to the post-apply reads (6cb2a236…/9,806 and ca45c093…/20,731, dated 07-Oct-2026). The spec stays RED on the harness replay (replayed update_member c1d122a0, 11,394 bytes) for T-120's reason -- the replayed body never matched production's -- which this re-pin records rather than hides. ISSUE_TRACKER T-014, T-015, T-144 marked applied with their ledger rows.
GATES: `npm run gate` VERDICT FAIL on the pre-existing set only (G1-G3, G6, G8); G5 PASS; G7 PASS.
CASES-NA: a production apply record, a copy-lock re-pin and tracker rows; no code change. The Edge Function deploy (Stage F) is recorded in its own entry.

## CI ROUND 1 ON PR #65: THE DENO TYPE CHECK FOUND A GENUINE DEFECT — 06-Oct-2026

PR #65 (claude/loving-euler-8nz5a8 -> main) is this branch's FIRST CI run (ci.yml triggers on push to main/dev and on pull_request only). Run 37443357842 on c912054: gate job -- guards PASS, Edge Function specs (deno test) PASS, `npm run check`: lint PASS, typecheck PASS, test:unit 2,213 (2,212 pass, 1 skipped: the dist/ check), contrast 2,852/2,852, icons 75/75, functions PASS, **check:edge FAIL**; the ratchets step skipped behind it. Baseline for comparison: the last merged PR's run (37147373800, 03-Oct) had check:edge PASS, so this is NOT pre-existing and NOT environmental: it is this branch's.
THE DEFECT, a genuine regression from phase 7 (commit 2dd66bf): supabase/functions/csv-import/load.ts used eight type names it never declared (AliasRow, MemberRow, EmailRow, StatsRow, EnrollmentRow, OfferingRow, NamedRow, Register) and index.ts imported seven of them from it; RegisterIndex lacked the staffNames index.ts destructures. Nothing local could see it: Deno is not installable on the dev box (check:edge SKIPS), node strips types, and the node spec reads the source as text. Reproduced here with a tsc stand-in over the Edge tree (paths-mapped npm: specifier): 27 errors in load.ts/index.ts, every one of them these names or their cascade; after the fix the only errors left are the two `Deno.serve` callback parameters the stand-in cannot type (Deno's own globals; the same lines were green in CI on main).
FIXED: the eight types declared and exported from the columns each read in index.ts selects (the shapes the matcher already relied on at runtime); Register and RegisterIndex carry staffNames; indexRegister passes it through. No behaviour change: types only. src/data/csvPreviewReads.test.ts, edgeFuzzyMatcher.test.ts and edgeFunctionPagedReads.test.ts 22/22; `npm run gate` VERDICT FAIL on the pre-existing set only (G1-G3, G6 the conformance warning, G8); G5 PASS; G7 PASS. check:edge itself is proven only by CI's next run.
CASES-NA: a type declaration fix with no runtime change; the existing node specs over the same module stay green and CI's check:edge is the test.

## READ-ONLY PRE-DEPLOYMENT REVIEW — 06-Oct-2026

docs/PRE_DEPLOYMENT_REVIEW_2026-10-06.md answers the owner's three decisions with evidence: 0090 APPROVE (subscription_state is read only through is_subscription_writable -- 28 policies and 16 functions in production -- written by nothing in code, does not read start_date; the only behavioural difference is the write gate closing at the academy's midnight instead of 05:30 IST on the last day of the subscription and of grace; production's row expires 2027-09-01 with 14 days' grace, so nothing observable moves for eleven months); 0089 APPLY SEPARATELY from 0085 (production's recompute_member_stats already carries p_member_ids uuid[] default null -- md5 142f926f, 1,502 bytes; 0089 alone on a 0084 replay applies and spec 66 is 18/18; the proposed order 0086, 0087, 0085, 0088, 0090, 0089 replays with an inventory identical to the filename order; 0090 without 0088 refuses); SEND_CONCURRENCY = 2 (the SES account is OUT of the sandbox by the production ledger -- 31 completed batches, 1,288 sent, 0 failed, largest 291 -- the maximum send rate still unread, T-010; the assumption is written beside the value). Every 0085/0088/0090 anchor and every 0086/0089 md5 re-read in production read-only 06-Oct-2026 09:00 UTC and present exactly once. CI has never run on this branch (ci.yml: push to main/dev and pull_request only; zero workflow runs), so the Edge Functions are NOT READY until the PR's first run is green. NOTHING DEPLOYED, APPLIED OR CHANGED IN PRODUCTION.
GATES: `npm run gate` VERDICT FAIL on the pre-existing set only (G1-G3, G6, G8); G5 PASS; G7 PASS.
CASES-NA: this commit adds a review document and this entry; no behaviour changes.

## DEPLOYMENT PREPARATION STEPS 6-12: PIPELINE, MIGRATION ORDER, PLANS, FINAL REPORT — 06-Oct-2026

docs/PERFORMANCE_FIX_FINAL_REPORT_2026-10-06.md is the final report of the brief "Finish Remaining Issues & Prepare Deployment": completed / remaining / tests / performance (every figure labelled Local/harness, CI or Production) / the date audit / the six unapplied migrations and their dependency order / the deployment plan Stages A-G (NOT executed) / the smoke-test checklist / the production verification plan / the risks and the three owner decisions / the status. NOTHING DEPLOYED, NOTHING APPLIED, NO PRODUCTION DATA OR SETTING TOUCHED. ISSUE_TRACKER T-144 updated (the remaining current_date sites closed on this branch by 0090; status still "not applied").

STEP 6: SEND_CONCURRENCY stays 4 (documented knob 1-16): client_batch_id is unique (0009) so a resend is a 409 and cannot double-send; there are no automatic retries; a suppressed address fails its recipient before any provider call; the SES rate is unread (T-010, AWS console) -- set 1 before deploying if the account is in the sandbox.
STEP 7, the full pipeline on the committed tree (Local/harness): `npm run test:unit` 2,213 of 2,213 (26 new, all passing); `npm run typecheck` PASS; `npm run lint` PASS; `npm run check` PASS exit 0; `npx expo export --platform web` PASS (6.5 MB); `npm run test:db` 1,332 PASS with exactly the 2 PRE-EXISTING failures (spec 18 is_super_admin count; spec 53 production copy-lock on update_member, moved on purpose by 0085/0088) and NO genuine failure; `npm run check:edge` SKIPPED and the Deno specs NOT RUN HERE (ENVIRONMENT LIMITATION: no Deno 2.9.7 through this box's proxy; CI runs them); `npm run gate` VERDICT FAIL on the pre-existing set only (G1-G3, G6, G8), G5 PASS, G7 PASS.
STEP 8, migration order validated by object inventory diff (tables, columns, indexes, triggers, policies, RLS, functions with body md5, function and table grants) on two fresh replays, through 0084 and through 0090: the diff is exactly 2 new functions (business_today, member_period_metrics_buckets -- both anon=false) and 13 changed bodies; NO table, column, index, trigger, policy, RLS or table-grant change. Order: 0086 -> 0087 (the client needs 0087), then 0085, 0088 -> 0090 (0090 refuses without business_today()), 0089 independent.
CASES-NA: this commit adds the final report, the tracker update and this entry; no behaviour changes.

## DEPLOYMENT PREPARATION STEP 5: THE REST OF THE DAYS ARE THE ACADEMY'S — 06-Oct-2026

docs/PERFORMANCE_FIX_REPORT_2026-10-06.md §5.4 and ISSUE_TRACKER T-144 (the current_date readers phase 11 deliberately left, and period.ts's device-day arithmetic). NOT DEPLOYED. ONE MIGRATION, NOT APPLIED: supabase/migrations/0090_the_rest_of_the_days_are_the_academys.sql -- requires 0088's business_today(). Under D-10 it merges to main only on the day it is applied.

THE AUDIT, every date/time read in app/, src/, supabase/functions/ and supabase/migrations/ (the grep list of the brief), classified and tabled in docs/PERFORMANCE_FIX_FINAL_REPORT_2026-10-06.md §5: class A (a real instant: audit and sent timestamps, freshness, relative "x minutes ago" labels, Edge Function timestamps, timestamptz columns) is correct as it is and untouched; class C (local parsing of a YYYY-MM-DD string for a label or a weekday, the calendar grid, the upload file's label, memberDate's Date.UTC probe) is safe because the same string goes in and out and untouched; class B (a business date derived from "now") is the defect class and is FIXED here, in both tiers.
CLIENT: src/data/period.ts gains businessToday(): the academy's day as a date-only Date, which currentWeek/lastWeek/lastFourWeeks/thisMonth/presetPeriod/resolvePeriod now default to (the week and month turn at 00:00 Chennai, not at the device's midnight); src/data/hooks.ts useWeekRows (the week's rows), src/components/DateTimePicker.tsx (the calendar's "today", twice), src/data/message.ts (the sample message's day) read it; src/data/repository.ts's dayBounds is businessDayBounds(from, to) -- the period's bounds as instants at Chennai's midnight and end (src/data/businessDate.ts, fixed +05:30), instead of `new Date("YYYY-MM-DDT00:00:00")`, which is the DEVICE's midnight and on a device outside India selected a different day's rows.
SERVER (0090): the five remaining current_date readers edited IN PLACE, one anchor each, every anchor read read-only in production 06-Oct-2026 and present exactly once in the live body (md5s in the migration: subscription_state 78d1e4ab, save_course a4248f1d, merge_member_into 91467511, is_in_course 871e3b16, follow_up_candidates 76d0c98a): subscription_state's active/grace window (2 anchors), save_course's effective schedule window and "saved with the course" effective_from (3), merge_member_into's enrolment-ending least(...) (1), is_in_course's live-enrolment test (1), follow_up_candidates' member_status_on(..., current_date) (1); a final guard refuses the migration if any of the five still reads current_date. delete_course and delete_member in production no longer read current_date (verified read-only) and are not touched. Column defaults in 0002 are not touched (an applied migration; they are overridden by every writing function, which now pass business_today()).
FAIL-FIRST: src/data/businessPeriod.test.ts - against a48b750 in a temporary worktree 6 of 6 red ("# pass 0 / # fail 6": businessToday is not exported); 6 of 6 green after: at 00:30 on Monday in Chennai (Sunday 18:30 UTC) the week is the new one whatever the device says, one minute earlier it is still Sunday's week, the month turns at midnight in Chennai, the presets and a resolved choice start from the same day, the default is a date-only value, a day's bounds as instants are Chennai's midnight and end under every device zone.
FAIL-FIRST: supabase/tests/67_the_rest_of_the_days_are_the_academys.sql - against the schema without 0090 (file moved aside, fresh replay) exit 3 at line 18: "FAIL  subscription_state judges active and grace by the academy's day"; with 0090, 11 of 11 green under a session clock pinned to 20:00 UTC (01:30 the next day in Chennai): a subscription expiring on the academy's today is active, yesterday's with grace is in grace, the one whose grace ended is expired; save_course picks the schedule in force on the academy's day; merge_member_into ends the stray's enrolment on the academy's day; is_in_course sees an enrolment effective on the academy's day; follow_up_candidates judges "active" on the academy's day; none of the five reads current_date.
`npm run test:db` with 0085-0090: 1,332 PASS, failures = spec 18 and spec 53 (both pre-existing) only.
GATES: `npm run gate` VERDICT FAIL on the pre-existing set only (G1-G3, G6, G8); G5 PASS; G7 PASS. `npm run typecheck` PASS, `npm run lint` PASS.
CASES-NA: the SQL side's test is a harness spec (supabase/tests/67); the client side's is src/data/businessPeriod.test.ts.

## DEPLOYMENT PREPARATION STEPS 3-4: THE ROSTER IS WINDOWED; THE RECOMPUTE IS ONE PASS — 06-Oct-2026

docs/PERFORMANCE_FIX_REPORT_2026-10-06.md §5.2 (the course roster, deferred) and §5.3 (a whole-offering commit recomputes the offering). NOT DEPLOYED. ONE MIGRATION, NOT APPLIED: supabase/migrations/0089_recompute_member_stats_in_one_pass.sql. Under D-10 it merges to main only on the day it is applied.

STEP 3, THE ROSTER (app/course/[id].tsx): the ScrollView is a FlatList whose header is the old content unchanged -- title, course picker, day strip, search, filters, selection bar, empty states -- and whose items are the cards: the live cards, the "No email" head and its cards, the "Email issues" toggle, each issue group's head and its cards, the "Inactive" head and its cards (still off-register, still unselectable), each item wearing the block's side padding and its section's gap. rosterItems() builds the items from the same scoped/joinedByDay/onDay/searched/shown chain as before; the gate that decides whether cards render at all is the same chain the header's empty states read, so "no members on this day", "no match" and the loading/error states draw exactly as they did and the cards branch is null then. Selection, search, filters, the picker, the day strip, navigation, accessibility labels and the responsive layout are untouched: every card is the same MemberCard with the same props. 12 initially, 12 per batch, window 7.
FAIL-FIRST: src/components/rosterWindowed.test.ts - against a48b750 in a temporary worktree 4 of 4 red ("# pass 0 / # fail 4": "the roster is a FlatList that owns the scroll, with the old content as its header", "the items keep the sections in order: live cards, No email, Email issues, Inactive", "every item wears the sides the block wore, and its section's gap", "the gate matches the header's own empty states, and Inactive is outside it"); 4 of 4 green after.
MEASURED (scenario B, standin on the exported bundle, Local/harness, NOT production): roster DOM nodes 11,986 (1,644 members) and 36,063 (5,000) -> 699 and 699; long tasks on open, summed, 1,590 ms / 2,899 ms -> 439 / 432 ms; a keystroke in the roster search 24-168 ms of input events -> 16-80 ms; network requests while typing 0 before and after. The DOM is bounded at 5,000 members by the window, not the roster.

STEP 4, THE RECOMPUTE (0089): WHY every member of an offering gets a row on a whole-offering commit -- the absentee sweep inserts an absent row for every expected member of that offering's sessions, so every one of their figures (sessions, absences, streak, last seen) genuinely changes; the per-member scope of 0085 is exact and cannot be narrowed further without maintaining streaks incrementally on every attendance write, which is a schema redesign and is REPORTED, not done (final report §Remaining). What is done instead: the body is ONE PASS. 0008's loop called current_streak_for(member) per member, a correlated walk of that member's rows for each of N members; 0089 computes the streak with one window (sum(present) over (partition by member order by session_date desc, id desc) -- the count of rows before the first non-present row, read as the streak) and the aggregates in one grouped scan over the same rows, scoped by p_member_ids exactly as 0085 scoped it, then the same upsert and the same return. Guarded: the migration refuses unless the live body's md5 is 142f926f13f2c64db8ca6aab9c034ea9 (1502 bytes; identical in production, read read-only 06-Oct-2026, and in the harness).
FAIL-FIRST: supabase/tests/66_recompute_member_stats_in_one_pass.sql - against the schema without 0089 (file moved aside, fresh replay) exit 3 at line 132: "FAIL  the body no longer calls current_streak_for per member (the prose may name it; the call is gone)"; with 0089, 18 of 18 green: a reference built from 0008's own body (pg_temp.recompute_reference, with current_streak_for) agrees row for row with the one-pass body over the seeded academy and over four hand-made members (a run then a miss, all present, a miss on the latest day, nothing but excused rows) and a member with no rows; the scoped call touches only its members; an empty scope writes 0 rows.
MEASURED (Local/harness, Postgres 16, NOT production): a whole-academy recompute at 1,500 members 1.2-1.3 s -> 0.39 s, at 5,000 members 4.70 s -> 1.98 s, the member_stats rows EXCEPT-equal both ways at both sizes (0 / 0 differing rows). A whole-offering commit at 5,000 members therefore still recomputes the offering, in well under half the time.
RE-POINTED, my own phase 5 spec, two lines, with the reason beside each: supabase/tests/62 -- (a) `edit_streak_calls = 1` -> `<= 1`, because the one-pass body does not call current_streak_for at all; the claim (an edit walks one member's history, not the academy's) is carried by the row count on the next line and by spec 66's scoped case. (b) A MEASUREMENT defect, found because 0089 exposed it: pg_stat_xact_user_functions is a per-backend buffer that Postgres 15+ flushes at most once a second, so a count from the PREVIOUS transaction leaks into the next one when it starts inside the same second (reproduced: a call in one transaction, then `calls = 1` read in a fresh transaction before any call). The spec read "got 2 want 1" on two of three replays once the import transaction got fast enough. Every count in the spec is now a delta against a baseline read at the top of its own transaction; the expectations (one call each) are unchanged. `npm run test:db` with 0085-0090: 1,332 PASS, failures = spec 18 (pre-existing) and spec 53 (pre-existing copy-lock on production's update_member hash) only.
GATES: `npm run gate` VERDICT FAIL on the pre-existing set only (G1-G3, G6, G8); G5 PASS; G7 PASS. `npm run typecheck` PASS, `npm run lint` PASS.
CASES-NA: the SQL side's tests are harness specs (supabase/tests/66, 62); the roster's is src/components/rosterWindowed.test.ts (source-shape, the way the phase 3 window specs are).

## DEPLOYMENT PREPARATION STEP 2: A SHORT PAGE AFTER A LONGER ONE IS THE END — 06-Oct-2026

docs/PERFORMANCE_FIX_REPORT_2026-10-06.md §5.1 (phase 10, stopped by decision; resolved here on the owner's instruction to resolve it if safe). NOT DEPLOYED. No DB change.

WHY IT IS SAFE, exactly: PostgREST answers min(asked, cap, remaining) rows. Within one read `asked` and `cap` are two fixed numbers, so every page before the last has exactly min(asked, cap) rows -- the same length whatever the cap is. A page SHORTER than another page of the same read therefore cannot be a capped page: the table ran out, and the empty request that used to prove it is not sent. A read whose pages are all one length (an exact multiple of the page, or a first page that is short) still asks once more, because nothing inside the read tells those two apart. Exact under any cap, including one lowered while the app is open: the comparison is within one read. A SINGLE short page still proves nothing (RC-041 defect 1 stays closed). The row cap itself cannot be read from SQL (T-006: no pgrst setting in rolconfig or pg_settings); the rule does not need it.

FAIL-FIRST: src/data/pageAllShortPage.test.ts - against c815320 (phase 13) 16 of 16 red for both pagers ("a full page and the 644-row page; no third request": 3 !== 2; "44 pages of 50 and the 20-row end": 46 !== 45); 16 of 16 green after -- every row returned, none twice, none skipped, no cursor asked twice, a cap below the page size, a cap equal to it, an exact multiple, a table smaller than a page, an empty table.
RE-POINTED, on the owner's instruction (Step 2: "update the affected tests to reflect the correct behavior"), each an expected COUNT with the reason written beside it and nothing else changed: src/data/pageAll.test.ts "DEFECT 1" (46 -> 45 pages: every row and no duplicate still asserted) and "the cursor is the LAST key seen" ([undefined, 10, 20, 25] -> [undefined, 10, 20]); src/data/periodMetricsPage.test.ts "the adapter turns the keyset into the RPC arguments" ([null, id(1000), id(1087)] -> [null, id(1000)]); src/data/memberRefresh.test.ts Test 4 (members requests 3 -> 2); src/data/requestBudget.test.ts (members 3 -> 2); src/data/edgeSendLoop.test.ts (3 -> 2 metrics pages). The three RC-041 specs' termination pins (`if (got.length === 0) return rows;` present, no `got.length < size`, a cap below the page size returns everything) are untouched and green. CP-020 amended in docs/registers/CANONICAL_PATTERNS.md.

WHAT CHANGED: src/data/pageAll.ts and supabase/functions/_shared/pageAll.ts -- `longest`, the longest page this read has seen; after pushing a page, `if (got.length < longest) return rows; if (got.length > longest) longest = got.length;`. Nothing else.
MEASURED (fake network, 1,644 members): one request fewer per paged read of a table bigger than a page -- members, addresses, aliases, stats, enrolments, the week's metrics and the bucket read. Members screen 25 -> 19 requests, Home 42 -> 35, Attendance 27 -> 22, Follow-ups 25 -> 19, Reports 25 -> 19, Courses 25 -> 19, member save cascade 44 -> 35 (scratchpad requestBaseline, the real data layer on the fake network). Small tables (courses, branches, configs: one short page) still cost their terminator: from inside the read nothing proves a short first page is the end.
GATES: `npm run gate` VERDICT FAIL on the pre-existing set only (G1-G3, G6, G8); G5 PASS; G7 PASS (2,213 unit tests).


## PERFORMANCE FIX PHASES 12-13: REGRESSION RUN, SCORECARD, AUDIT — 06-Oct-2026

docs/PERFORMANCE_FIX_REPORT_2026-10-06.md is the closing report: files changed, the four unapplied migrations, the before/after scorecard, the test totals, what remains (phase 10 stopped by decision -- the pager's empty-page rule is pinned by three specs as deliberate; the roster not windowed; a whole-offering commit still recomputes the offering; the other current_date readers, T-144), and a staged deployment order with smoke tests. NOTHING DEPLOYED OR APPLIED.

REGRESSION, on the final tree: `npm run test:unit` 2,187 tests green (after the phase 11 correction); `npm run test:db` 1,303 PASS with the 2 pre-existing failures (spec 18 is_super_admin count; spec 53's production copy-lock on update_member, moved on purpose by 0085/0088, re-pinned on apply); `npm run typecheck` PASS; `npm run lint` PASS; `npm run check` contrast/icons/functions PASS; `npx expo export --platform web` PASS; Edge Function Deno tests NOT RUN HERE (no Deno; CI runs them) -- UNVERIFIED locally, their claims proven under node by the three edge* node specs. `npm run gate` VERDICT FAIL on the pre-existing set only (G1-G3, G6, G8); G5 PASS; G7 PASS.
CASES-NA: this commit adds the closing report and this entry; no behaviour changes.

## CORRECTION TO PHASE 11 (06-Oct-2026): THE PHASE 11 ENTRY BELOW OVERSTATED G7

The phase 11 entry says "G7 PASS". The gate it cites (53.1 s) had G7 FAIL on three specs, which the full `npm run test:unit` run afterwards (2,187 tests, 2,184 pass) named: src/components/dayStripUploadButton.test.ts ("the screen reads the clock once" -- pinned `const todayIso = iso(new Date());`), src/components/memberInactiveFromField.test.ts ("picking Inactive fills today in" -- pinned `setInactiveFrom(iso(new Date()))`), and src/data/migrationGrants.test.ts ("EVERY function granted to authenticated is also revoked from anon DIRECTLY" -- 0087 and 0088 revoked with `revoke all ... from public, anon`, and the guard looks for `revoke execute ... from ... anon`, 0012's wording). A fourth, found by the next gate: phase 7's own src/data/edgeFuzzyMatcher.test.ts had an ABSOLUTE budget (1,000 x 5,000 under 4,000 ms) that crossed under the gate's parallel load.

FIXED in this entry's commit: 0087 and 0088 (unapplied drafts, corrected in place under D-8) now `revoke execute ... from public, anon`; the harness replays both and specs 64 (17/17) and 65 (13/13) stay green; anon still cannot execute either function. The member form's Inactive pick is `setInactiveFrom(businessTodayIso())` again (the form's once-per-render `today` stays for the other five reads). The two remaining literal pins of the device's day are re-pointed exactly as the two in the phase 11 entry were, under the same owner-approved reversal exemption and for the same requirement: dayStripUploadButton.test.ts:176 `iso\(new Date\(\)\)` -> `businessTodayIso\(\)`; memberInactiveFromField.test.ts:109 the same expression inside its regex. Nothing else in either spec changes. The matcher's timing assertion is now RELATIVE -- the loop and the prepared tier back to back on the same fixture in the same process, prepared x 2.5 < loop (measured alone ~5x; the same candidates asserted) -- so whatever the box is doing, the ratio stands.
GATES, this time read from the step's own line: `npm run gate` VERDICT FAIL on the pre-existing set only (G1-G3, G6, G8); G5 PASS; G7 PASS. `npm run typecheck` PASS, `npm run lint` PASS.

## CORRECTNESS FIX PHASE 11: A DATE IS THE ACADEMY'S DAY — 06-Oct-2026

docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md §12 (four members refused on 3 Oct 2026, 00:37-01:02 IST, "a joining date in the future cannot be recorded"); ISSUE_TRACKER T-144. NOT DEPLOYED. ONE MIGRATION, NOT APPLIED: supabase/migrations/0088_a_date_is_the_academys_day.sql -- adds public.business_today() = (now() at time zone 'Asia/Kolkata')::date and edits four functions IN PLACE, one anchor each (create_member's default joining date and its "in the future" check; update_member's v_today; set_member_active_from's check; set_attendance's check), every anchor read in production read-only 06-Oct-2026 and present exactly once in the live body. The database's TimeZone and every timestamptz stay UTC. No table, index, policy or data change. Under D-10 it merges to main only on the day it is applied.

FAIL-FIRST: supabase/tests/65_a_date_is_the_academys_day.sql - against the schema without 0088 (file moved aside, fresh replay) red at the first call, exit 3: "function public.business_today() does not exist"; with 0088, 13 of 13 green under UTC, Chennai and Los Angeles sessions, including create_member accepting business_today() as a joining date, refusing business_today() + 1, accepting business_today() - 1, and dating a member added with no date on the academy's today.
FAIL-FIRST: src/data/businessDate.test.ts - against c5a4b0e (phase 9) in a temporary worktree red ("Cannot find module './businessDate'"); 5 of 5 green after: 00:37 IST on the 3rd is the 3rd (the server said the 2nd), the transition at 18:30 UTC to the minute, UTC midnight is 05:30 the same Chennai day, month/year/leap-day ends, today/yesterday/tomorrow judged from 00:30 IST, and the same answer under four process time zones.
RE-POINTED, under the owner-approved behaviour-reversal exemption (CLAUDE.md, 01-Oct-2026; the requirement is this brief's phase 11, "default 'today' generation ... use an explicit business timezone"): src/data/memberJoinedOn.test.ts:123 and src/data/importedMemberJoinedOn.test.ts:134 pinned the Add form's and the offline import's "today" as the literal `iso(new Date())` -- the device's day, the very mechanism this phase replaces. Each diff is the expression literal inside one regex changing to `businessTodayIso()`; no assertion removed, nothing skipped, every downstream assertion preserved (105 of 105 across the ten date specs).
Existing specs kept green WITHOUT editing them: joined.test.ts, memberDate, schedule, followup, course, memberValidationToast, memberInactiveFromField; `npm run typecheck` PASS, `npm run lint` PASS.

WHAT CHANGED (client): src/data/businessDate.ts (new) -- BUSINESS_TIME_ZONE = 'Asia/Kolkata', a fixed +05:30 (no daylight saving since 1945), businessDateOf(instant) and businessTodayIso(); the day is arithmetic on the instant, so a device elsewhere, a locale, or an Intl table without the zone cannot move it. Every "today" that feeds a date-only business value now reads it: the member form (opens on today, the inactive/active-again window, the picker ceilings), the member pop-up, the member import, the attendance upload's future-file refusal, the course screen, Reports, the period filter's calendar ceiling, the follow-up rule's default day, the course roster's default day, the repository's offline joining defaults and fetchPendingSessions' "still to come" cut-off, the offering form's default start, and schedule.ts's today() -- which read the UTC day outright, so between midnight and 05:30 the timetable in force was yesterday's. Date-only values travel as YYYY-MM-DD strings end to end (the form already sent `joined_on` as text; nothing passes through a Date on the way). Edge Functions: no date-only "today" is derived server-side -- the session day and the import day come from the client -- and the server-side rules are 0088's.
DELIBERATELY NOT CHANGED, listed in T-144 for a row each: the other current_date readers (subscription window, "saved with the course" effective_from, the enrolment-ending least(...) in three delete/merge paths, is_in_course, member_status_on reads) and period.ts's week arithmetic (local Date math; identical to the academy's day on an Indian device, and a wider change than this phase).

MEASURED: the refusal is reproduced by arithmetic in the spec (3 Oct 00:37 IST = 2 Oct 19:07 UTC: the device said the 3rd, current_date said the 2nd); production's four refusals a night cannot be re-measured until 0088 is applied -- UNVERIFIED there.
GATES: `npm run gate` VERDICT FAIL on the pre-existing set only (G1-G3, G6, G8), G5 PASS, G7 PASS.
CASES-NA: the SQL side's test is a harness spec (supabase/tests/65_*.sql); the client side's is src/data/businessDate.test.ts.

## CORRECTNESS FIX PHASE 9: NO PROTECTED READ BEFORE THE SESSION IS KNOWN — 06-Oct-2026

docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md §5 (the unauthenticated fan-out: 33 x 401/403 in a day, 30 "permission denied" in one second at 18:53:41 on 3 Oct). NOT DEPLOYED. No DB change.

FAIL-FIRST: src/data/sessionGate.test.ts - against 6e0501d (phase 8) in a temporary worktree 3 of 3 red ("Cannot find module './sessionGate.ts'", and useAsync still `withTimeout(load())`); 3 of 3 green after.
Existing specs kept green WITHOUT editing them: hookInvalidation.test.ts, revalidate.test.ts, deferral.test.ts, searchDebounce.test.ts (55 together with the new file), memberRefresh, requestBudget, bucketedMetrics (the fake-network specs call the repository directly and are unaffected; the hook-level gate is open under node's unconfigured client); `npm run typecheck` PASS, `npm run lint` PASS.

WHAT CHANGED: src/data/sessionGate.ts (new) -- sessionKnown(): true once the signed-in identity has been read back from the server under RLS (currentAppUser, the question useIdentity already asks, shared with it through sharedRead so the gate costs no request of its own), false when the server says nobody is signed in or could not be asked; the answer is kept until the auth state changes (SIGNED_IN, SIGNED_OUT, USER_UPDATED -- not INITIAL_SESSION, which is the client announcing what it found at start-up, nor TOKEN_REFRESHED, the same person with a newer token). It never redirects: AdminRouteGuard and the screens' own signedOut branches keep that job, so there is no second opinion to loop against. src/data/hooks.ts useAsync -- `withTimeout(sessionKnown().then(signedIn => { if (!signedIn) throw new Error(SIGNED_OUT_MESSAGE); return load(); }))`: a reader with nobody signed in fails with "Sign in to load this." and sends nothing; the redirect lands over it. The sequence is now: start -> the session resolved (one shared identity read) -> protected reads -> screens. Loading session: readers wait on the shared read. Authenticated: readers run, once per sign-in the gate costs nothing more. Unauthenticated: no request; the guard redirects. Expiry: a refresh GoTrue refuses is reported as SIGNED_OUT, the gate forgets, the next reader (a focus return, a bus bump) asks again and stops. Fixtures mode: open.
NOT suppressed: nothing catches a 401. The requests that produced them are not sent.

MEASURED: the mechanism is proven by the spec (three readers, one identity read; a signed-out answer kept -- no retry storm; a question that cannot be asked is not a yes). The production figure (33 x 401/403 a day) is UNVERIFIED after: not deployed.
GATES: `npm run gate` VERDICT FAIL on the pre-existing set only (G1-G3, G6, G8), G5 PASS, G7 PASS.

## PERFORMANCE FIX PHASE 8: FOLLOW-UPS GO OUT FOUR AT A TIME, WITH A CLOCK ON EACH — 06-Oct-2026

docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md RC-10 (send side). NOT DEPLOYED (D-14). No DB change.

FAIL-FIRST: src/data/edgeSendLoop.test.ts - against 2dd66bf (phase 7) in a temporary worktree 5 of 5 red (the pool bound; "pooled took 5043 ms against serial 5040 ms"; a hung provider never settles; loadPeriodMetrics missing); 5 of 5 green after.
supabase/functions/send-followups/send-loop-pool.test.ts (Deno) - the pool claims for CI's `deno test`. NOT RUN HERE (no Deno on this box, see phase 7); UNVERIFIED locally. The node spec exercises the identical modules (send-loop.ts and load.ts are plain TypeScript).
Existing specs kept green WITHOUT editing them: send-loop.test.ts, load.test.ts, wording.test.ts (Deno; the loop's contract -- row before send, outcome after, a refused insert fails that recipient only, results in order, batch finalised once -- is unchanged, and `runSendLoop`'s existing five arguments are unchanged; CI runs them).

WHAT CHANGED: supabase/functions/send-followups/send-loop.ts -- runSendLoop takes an options argument {concurrency, timeoutMs}; recipients are worked by a pool of DEFAULT_SEND_CONCURRENCY = 4 workers each taking the next recipient in order (at most four between their first write and their last), results are filled by index so they keep the recipients' order, and every provider call is raced against SEND_TIMEOUT_MS = 20 s -- a provider that never answers is recorded as that recipient's failure with a sentence, never retried here (SES may have accepted it; a second copy is worse than a row that says failed). readConcurrency() reads the SEND_CONCURRENCY Edge secret (1-16, else the default). email.ts -- the SES fetch carries AbortSignal.timeout(15 s) so a hung socket is released, surfacing in send()'s existing catch as a failed recipient. load.ts -- loadPeriodMetrics(): the batch's period figures in ONE keyset-paged read of member_period_metrics_page (⌈N/1,000⌉ + 1 requests) instead of one member_period_metrics RPC per recipient; a recipient with no row keeps the zeros. index.ts -- uses both; the per-course config and wording RPCs are asked together instead of one after another.
WHY FOUR: SES's production maximum send rate is commonly 14 a second (1 in the sandbox); four recipients at ~0.3 s each is ~12 a second with the database writes around each send, under the production rate. The owner's read of the real figure is ISSUE_TRACKER T-010, still open; SEND_CONCURRENCY is the knob to match it without a deploy. Unsubscribe links, suppression (bounced, unsubscribed, complained), the row-before-send rule, idempotency (client_batch_id), the audit row and the batch counters are untouched.

MEASURED (node, fake provider at 50 ms per send, fake admin): 100 recipients serial 5,040 ms -> pooled (4) 1,269 ms (the spec's bound is < serial/3); production's 0.36-0.41 s a recipient (136 recipients 51 s, 256 -> 91 s) is UNVERIFIED after: not deployed. Expected from the same per-recipient cost: 256 recipients ~25 s. Metrics: 256 sequential RPCs -> 3 paged requests.
GATES: `npm run gate` VERDICT FAIL on the pre-existing set only (G1-G3, G6, G8), G5 PASS, G7 PASS; `npm run typecheck` PASS, `npm run lint` PASS.

## PERFORMANCE FIX PHASE 7: THE CSV PREVIEW READS ONCE AND MATCHES BY LOOKUP — 06-Oct-2026

docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md RC-10 (preview side; the commit side is phase 5). NOT DEPLOYED (D-14: no `supabase functions deploy` by any session). No DB change.

FAIL-FIRST: src/data/csvPreviewReads.test.ts - against 98fa1b1 (phase 6b) in a temporary worktree 2 of 2 red ("staffP is not started as a promise", "a row still scans every alias or member"); 2 of 2 green after.
FAIL-FIRST: src/data/edgeFuzzyMatcher.test.ts - against 98fa1b1 4 of 4 red ("prepareFuzzy is not a function"); 4 of 4 green after, including the budget: 1,000 rows x 5,000 members in under 4,000 ms.
supabase/functions/_shared/match.test.ts (Deno) - the same equivalence for CI's `deno test`. NOT RUN HERE: Deno 2.9.7 is not installed on this box and cannot be fetched through the proxy (403 on dl.deno.land, and no npm release of that version); `npm run check:edge` SKIPS loudly, as CLAUDE.md warns. The Edge tree's type check and this test are therefore CI-verified only -- UNVERIFIED locally. The node spec exercises the identical module (plain TypeScript, no Deno API).
Existing specs kept green WITHOUT editing them: edgeFunctionPagedReads.test.ts (20 -- every register read is still its own paged statement selecting its key; the pager's rules untouched), csvFormat, meetCsv.

WHAT CHANGED: supabase/functions/csv-import/index.ts -- the nine register reads (staff, aliases, members, addresses, stats, enrolments, offerings, courses, branches) are started together and awaited once; the three catalogue tables are read whole (they are a few dozen rows) instead of by the enrolments' ids after the enrolments. Per row, the alias and canonical tiers are Map lookups and the fuzzy tier reads a prepared index instead of scoring every member (`.filter` over every alias, `.filter` over every member, `similarity()` against every member, per row). supabase/functions/csv-import/load.ts (new) -- indexRegister(): the Maps and the fuzzy index, built once per request. supabase/functions/_shared/match.ts -- prepareFuzzy()/fuzzyCandidates(): every member's bigram multiset built once per request, and only members whose bigram count can reach the threshold are scored (Dice = 2c/(la+lb), c <= min(la, lb): the shorter must be at least t/(2-t) of the longer -- an exact bound, so the ids, scores and order are the loop's, which the specs assert over thousands of generated rows at three thresholds). similarity() itself is untouched.

MEASURED (node on this box, the matcher only -- the same module the Edge Function bundles; threshold 0.8, every row missing the alias and canonical tiers, the worst case):
| rows x members | per-member loop (before) | prepared (after) |
| 100 x 1,644 | 523-558 ms | 146 ms |
| 1,000 x 1,644 | 5,291-5,343 ms | 936 ms |
| 1,500 x 1,644 | - | 1,393 ms |
| 100 x 5,000 | 1,544-1,596 ms | 347 ms |
| 1,000 x 5,000 | 16,110-16,675 ms | 3,305 ms |
| 1,500 x 5,000 | - | 5,381 ms |
| 5,000 x 5,000 | - | 17,609 ms (every row fuzzy; a real file of 5,000 unmatched names against 5,000 members is not a case the preview is for) |
Round trips: the preview's sequential depth falls from ~21 (authz 2, offering, same-file, supersedes, then five paged reads one after another at ⌈N/1000⌉+1 requests each, then offerings, courses, branches, insert, audit) to ~10 (the same five before, the nine reads in parallel -- the longest is three pages -- then insert and audit). Production wall time (4.4-5.3 s a preview, flat) is UNVERIFIED: not deployed, and the function cannot be run here.
GATES: `npm run gate` VERDICT FAIL on the pre-existing set only (G1-G3, G6, G8), G5 PASS, G7 PASS; `npm run typecheck` PASS, `npm run lint` PASS.

## PERFORMANCE FIX PHASE 6b: THE OVERVIEW'S BUCKETS IN ONE READ — 06-Oct-2026

docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md RC-9/RC-2. NOT DEPLOYED. ONE MIGRATION, NOT APPLIED: supabase/migrations/0087_member_period_metrics_buckets.sql -- a NEW function, member_period_metrics_buckets(p_from date[], p_to date[], p_after text, p_limit int): the page function's aggregate for every bucket in one keyset read (one row per member per bucket, text cursor member_id:bucket, p_limit bounds rows), plpgsql behind EXECUTE ... USING as 0086. member_period_metrics and member_period_metrics_page untouched. No table, index, policy or data change; anon revoked, authenticated and service_role granted as 0075. Under D-10 it merges to main only on the day it is applied.

FAIL-FIRST: supabase/tests/64_member_period_metrics_buckets.sql - against the schema without 0087 (file moved aside, fresh replay) red at the first call, exit 3: "function public.member_period_metrics_buckets(date[], date[], unknown, integer) does not exist"; with 0087, 17 of 17 green (7 day-buckets over 1,001 members: 7,007 rows equal to seven page-function reads row for row, a cursor walk in pages of 1,000 reads every row once with no seam, p_limit bounds rows not members, mismatched arrays refused, grants as 0075).
FAIL-FIRST: src/data/bucketedMetrics.test.ts - against 69d424f (phase 6a) in a temporary worktree 4 of 4 red ("splitBuckets is not a function", "a single bucket reads the page RPC", "the bucket RPC is called by its exported name"); 4 of 4 green after.
Existing specs kept green WITHOUT editing them: memberRefresh.test.ts (13 -- "the attendance figures for a week are read once for the member list and the bars together" still counts 1 + 7 shared period reads: each bucket is still its own shared read in the member store, now SOURCED from one shared wire read rather than making a request of its own; and the wiring count of three `sharedPeriodMetrics(..., () => paged` sites), periodMetrics.test.ts and periodMetricsPage.test.ts (the three page-RPC sites unchanged; the bucket RPC is called by its exported name METRICS_BUCKETS_RPC through paged() keyed on `cursor`, which the new spec pins), requestBudget.test.ts (Home under its ceiling of 50), hookInvalidation, periodBuckets; `npm run typecheck` PASS, `npm run lint` PASS.

WHAT CHANGED: src/data/periodMetrics.ts -- METRICS_BUCKETS_RPC, BucketMetricRow, splitBuckets (deals the flat rows into every bucket asked for, in order, empty buckets present). src/data/repository.ts fetchBucketMetrics -- two or more buckets are one paged read of the bucket RPC (shared through the member store, keyed on the bucket set), dealt into the per-bucket shape the screen and bucketTotals already read; a single bucket keeps the per-period path. src/data/fakePostgrest.testkit.ts answers the bucket RPC with the same constant figures as the page RPC (a testkit, not a spec).

MEASURED (real data layer against the fake network, 1,644 members, the fake giving every member a row in every bucket -- the worst case; scratchpad requestBaseline):
| screen | before | after |
| Home cold (register + filters + 7 day buckets + notifications) | 50 requests, 24 of them metrics pages (7 x 3 + 3) | 42 requests, 16 metrics (13 bucket pages + 3 week pages) |
| Member save cascade, 5 screens mounted | 52 | 44 |
On production's data (1,659 members, ~300 attendance rows a session, sessions on about three days of seven) a week's seven buckets are ~5,000 rows: 5 full pages plus the terminating empty one, against 7 x (1 to 3) = 13 page reads before. The terminating empty page of every paged read is phase 10. Server cost of the one call, harness 5,000 members: 54,772 buffers / 68 ms for the seven buckets together, against 7 x 12,021 / 7 x 49-60 ms for seven re-planned page calls (and 7 x 158,396 before 0086).
GATES: `npm run gate` VERDICT FAIL on the pre-existing set only (G1-G3, G6, G8), G5 PASS, G7 PASS.

## PERFORMANCE FIX PHASE 6a: THE METRICS RPC PLANS WITH ITS DATES — 06-Oct-2026

docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md RC-9. NOT DEPLOYED. ONE MIGRATION, NOT APPLIED: supabase/migrations/0086_metrics_page_plans_with_its_dates.sql -- restates member_period_metrics_page (0075) in plpgsql behind `return query execute ... using`, the SELECT unchanged character for character, so every call is planned with its dates known. Same name, arguments, columns, order, SECURITY DEFINER, grants (CREATE OR REPLACE keeps the oid). Guarded on the live body being 0075's (md5 66f8af1d, 1,202 bytes -- identical in production and the replay, read-only 05-Oct-2026). No table, index, policy or grant change. Under D-10 it merges to main only on the day it is applied.

FAIL-FIRST: supabase/tests/63_metrics_page_plans_with_its_dates.sql - against the schema without 0086 (file moved aside, fresh replay, 2,000 members) red at the first assertion, exit 3: "the function reads at most half again the buffers the same SELECT reads with its dates written in" -- function 12,172 buffers, constants 176; with 0086, 14 of 14 green (function 178, constants 176).
Existing spec kept green WITHOUT editing it: 56_member_period_metrics_page.sql (15 of 15 -- the paged twin still equals the unpaged original row for row over 1,001 members).

INSPECTED BEFORE CHANGING SQL: 0075 (the only migration naming the function; derived from the live member_period_metrics, which 0086 does not touch); production read-only 05-Oct-2026: the live member_period_metrics_page is byte-identical to 0075 (md5 66f8af1d, 1,202 bytes, language sql, SECURITY DEFINER, stable); callers: fetchMembers, fetchBucketMetrics, fetchWeekRows (repository.ts) and send-followups reads the unpaged member_period_metrics (untouched).

WHY THE PLAN WAS BAD, reproduced: a SQL-language SECURITY DEFINER function is not inlined and its body is planned with the dates as parameters; with the dates unknown the planner walks attendance_member over the whole history in member order and discards every row outside the period at the join. `prepare ... ; set plan_cache_mode = force_generic_plan; explain analyze execute` of the body gives the same plan and the same buffers as the function. EXECUTE ... USING plans each call with the values in hand; the planner then reads the period's sessions first.

MEASURED (EXPLAIN (ANALYZE, BUFFERS) of `select * from member_period_metrics_page(week, null, 1000)`):
| where | before (0075) | after (0086) |
| production lhpzhkzbnquwjljmbylo, current week, read-only 05-Oct-2026 | 13,999 buffers, 426 ms | UNVERIFIED (not applied); the same SELECT with constants read 527 buffers / 23 ms in the report's measurement |
| harness 5,000 members, 785k rows, one week | 158,396 buffers, 87 ms | 12,021-12,921 buffers, 49-60 ms (the planner's own choice there is a parallel seq scan over the year; with enable_seqscan off, 278 buffers / 7.7 ms -- not forced, prod has 19k rows not 785k) |
| harness 3,000 members | 18,251 buffers, 13.4 ms | 262 buffers, 6.8 ms |
| harness 2,000 members | 12,172 buffers, 9.0 ms | 183 buffers, 5.5 ms |
| harness 1,001 members | 6,100 (the planner happened to choose the good plan) | 6,100 |
Call frequency is phase 6b (one bucketed read for the Overview's seven day buckets).
GATES: `npm run gate` VERDICT FAIL on the pre-existing set only (G1-G3, G6, G8), G5 PASS, G7 PASS.
CASES-NA: the test for this change is a harness spec (supabase/tests/63_*.sql), which G1 cannot see (T-117).

## PERFORMANCE FIX PHASE 5: A WRITE RECOMPUTES ONLY THE MEMBERS IT TOUCHED — 06-Oct-2026

docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md RC-7/RC-8; ISSUE_TRACKER T-014/T-015. NOT DEPLOYED. ONE MIGRATION, NOT APPLIED: supabase/migrations/0085_a_write_recomputes_only_the_members_it_touched.sql -- edits update_member and commit_csv_import IN PLACE (0061/0071/0073 idiom; six anchors, each guarded to match exactly once) so the recompute is scoped and the expected set is read once per commit. No table, index, policy or grant change. Under D-10 it merges to main only on the day it is applied.

FAIL-FIRST: supabase/tests/62_a_write_recomputes_only_the_members_it_touched.sql - against the schema without 0085 (the file moved aside, fresh replay) 1 red, exit 3: "expected_members_for_session was evaluated five times for a fifteen-row file, not seventeen  got 17 want 5" (the nine neutrality guards before it green, as they must be); with 0085, 21 of 21 green.
supabase/tests/52_import_recomputes_only_its_own.sql (T-014's fail-first spec, red since 18-Sep-2026: "a member in ANOTHER offering, named in no file, is not recomputed by this import  got 2026-10-05 04:33:08 want 2001-01-01") is GREEN with 0085 -- untouched, 19 of 19.
`npm run test:db` with 0085: 1,257 PASS, 2 failures, both pre-existing and neither this change's: is_super_admin count (spec 18), and 53_harness_body_matches_production's update_member hash (a copy-lock on the PRODUCTION body, red before this change because the replay already differed from production -- T-120; 0085 moves the replayed hash again, by design, and the lock is re-pinned on the day 0085 is applied, from a read taken after it, as that file instructs). Baseline before phase 1 was 1,219 PASS and 4 failures; spec 52 and the "6-Oct has not happened yet" fixture are the two that turned green (the second by the calendar).

INSPECTED BEFORE CHANGING SQL (the brief's five): migration history (0008 recompute_member_stats, 0027 update_member, 0014->0045 commit_csv_import, 0035/0057/0064/0082 the scoped callers, 0046 the backdating trigger, 0061/0071/0073 in-place edits of these bodies); current definitions in BOTH places -- production read-only 05-Oct-2026 (update_member md5 10915909 9,625 bytes, commit_csv_import md5 ff61afad 18,521 bytes = the 0044 body, 0045 never applied, T-125) and the harness replay; all callers (the csv-import Edge Function and the member form RPC); which columns depend on it (member_stats: current_streak, sessions_expected, sessions_attended, last_present_date, last_countable_date -- all functions of the member's own attendance rows, so update_member can move at most its own member's row and a commit only members with a row for its session); regression specs 52 and 62.

MEASURED (local harness, Postgres 16, seed_scale.sql, scripts/perf/investigation-2026-10-04/loadtest.sh, every write rolled back; before = 12:58-13:03 UTC 05-Oct on the same box, after = 00:20-00:23 UTC 06-Oct):
| members | commit 100 rows | commit 500 rows | commit 1,000 rows | unscoped recompute (control, unchanged function) |
| 1,500 | 1.76 s -> 1.11 s | 3.27 s -> 1.24 s | 5.36 s -> 1.21 s | 1.32-1.43 s / 0.99-1.05 s |
| 5,000 | 3.65 s -> 4.52 s | 6.12 s -> 4.76 s | 7.64 s -> 4.68 s | 2.23 s / 3.67-3.94 s |
Read with the control column: the box ran about 1.7x slower during the after run (the same untouched function took 2.2 s before and 3.7-3.9 s after). At 5,000 members the seed puts every member in ONE offering, so the sweep writes 4,900 absent rows and every member holds a row for the session -- the scoped set IS the population there, which is the "technically unavoidable" case the brief names; what the commit saved at that size is the per-row expected-set calls (1,002 -> 3 for 1,000 rows), and what remains is the sweep itself (4,900 inserts through the per-row backdating trigger and audit) and a 5,000-member recompute. At 1,500 (nearer production's 1,659) the commit is flat at ~1.2 s whatever the file size, from 1.8-5.4 s. update_member: the recompute it calls walks one member (spec 62 counts current_streak_for calls: 1), 1.8 ms scoped against 1.0-1.4 s unscoped at 1,500 -- production's 249 ms mean / 49k buffers per save (report §8) is the expected saving there and is UNVERIFIED until applied.
GATES: `npm run gate` VERDICT FAIL on the pre-existing set only (G1-G3, G6, G8), G5 PASS, G7 PASS.
CASES-NA: the test for this change is a harness spec (supabase/tests/62_*.sql), which G1 cannot see (T-117).

## PERFORMANCE FIX PHASE 4: SEARCH NARROWS AFTER A SHORT QUIET — 05-Oct-2026

docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md RC-7. NOT DEPLOYED. No DB change. No new library.

FAIL-FIRST: src/data/searchDebounce.test.ts - against e8c7d74 (phase 3) in a temporary worktree, 6 of 6 red ("Members narrows by the applied query, not the keystroke", "Attendance narrows by the applied query, not the keystroke", "the course roster narrows by the applied query but its sentences still quote what was typed", "useDebouncedQuery is exported by the hooks"); 6 of 6 green after.
FAIL-FIRST: src/data/debounce.test.ts - against e8c7d74 the module under test did not exist ("Cannot find module './debounce'", 0 of 3 ran); 3 of 3 green after.
Existing specs kept green WITHOUT editing them: memberSearch.test.ts (the matcher is unchanged -- name, code, address, alias), attendanceSearch.test.ts (`matchesAttendanceQuery(r, q)` literal kept), pickerSearch.test.ts, hookInvalidation.test.ts, windowedLists.test.ts (8).

WHAT CHANGED: src/data/debounce.ts -- `applyAfterMs(next)`: 0 for an empty or blank query (clearing the box narrows at once, no wait), else QUIET_MS = 150. src/data/hooks.ts -- `useDebouncedQuery(query)` returns the query the list is narrowed by; the box, its clear button and every sentence that quotes what was typed still read the live `query`. Members: the filter now narrows by the applied query over a per-member lower-cased search text built ONCE per register load (`searchText` Map) instead of lower-casing name, code, address and every alias of every member on every keystroke. Attendance and the course roster narrow by the applied query. Nothing is dropped: the applied query always catches up to the last keystroke after 150 ms of quiet, and a typed query that the user stops on is the query the list shows.
NOT a delay added for its own sake: the typing-time cost was the filter re-running per keystroke over 5,000 members with a list re-render each time (RC-7); the quiet window coalesces keystrokes into one narrowing and the list stays live.

MEASURED (production bundle, headless Chromium on a fast CPU, realistic stand-in at 5,000 members, scripts/perf/investigation-2026-10-04/scenarioB.js, five keys typed 150 ms apart so every key still narrows once):
| screen | per-key wall to next frame, phase 3 -> phase 4 (ms) | input event durations after (ms) | long tasks while typing |
| Members 5,000 | 16-64 event durations -> 31-40 wall / 16-32 events | 16/16/16/16/32/32/24/24 | none |
| Attendance week | 40 -> 48-52 wall / 16-24 events | 16-24 | none |
| Course roster 1,250 cards | 72-216 -> 48-443 wall / 16-392 events | 16-392 | 158/362/51 |
Reading: Members and Attendance are at the 16 ms floor per event with no long task; the course roster is still bounded by its un-windowed ScrollView (36,061 DOM nodes, phase 3 note) -- the debounce cannot hide a 1,250-card re-render, and that remains an open item for the roster (not in scope here: the sectioned screen). No network request is caused by typing on any of the three. Both themes unchanged: the search box, clear button and quoted sentences render from the live query as before.
GATES: `npm run gate` VERDICT FAIL on the pre-existing set only (G1-G3 design/tokens.json absent, G6 the scripts/conformance.mjs warning, G8), G5 PASS, G7 PASS; `npm run lint` PASS, `npm run typecheck` PASS.

## PERFORMANCE FIX PHASE 3: THE BIG LISTS ARE WINDOWED — 05-Oct-2026

docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md RC-6. NOT DEPLOYED. No DB change.

FAIL-FIRST: src/components/windowedLists.test.ts - against 1a758ca (phase 2) in a temporary worktree, 8 of 8 red ("no FlatList: the rows are all in the DOM", "MemberCard is not memo()", "the day is indexed by member once per load"); 8 of 8 green after.
Existing specs kept green WITHOUT editing them: screenHeaderPinned (the header prop stays first, `<Screen header={`), freshnessLineWiring, attendanceSearch (`matchesAttendanceQuery(r, q)` literal kept), staffResubscribeEntryPoints, resetRegisterDialog ("the marks it is gated on are the rows the strip itself drew" -- the inactive cards, which read no attendance, still take `rows={marks.data ?? []}`; the three live sections take their member's rows from the same source, indexed), memberCardAttendanceReadOnly, courseRosterRemoveMember, noEmailResolvesInPlace, bulkDeleteNoEmail (24 more).

WHAT CHANGED: Members, Follow-ups (weekly) and Attendance render through a FlatList that owns the scroll (Screen `scroll={false} pad={false}`, content padded by the new `screenBodyPadding` exactly as the ScrollView padded it); everything that scrolled above the rows scrolls as the list's header, the weekly footnote and Reach out button as its footer; rows are `memo()` components with stable handlers (no inline arrow per row). Course roster: MemberCard memoised, the day's rows indexed per member once per load (dayAttendance scanned the whole day per card), the closed picker no longer handed the whole register per card, the selection toggle stable. The roster's own ScrollView is NOT windowed (sectioned screen, left for a later change).

MEASURED (production bundle, headless Chromium on a fast CPU, realistic stand-in, scripts/perf/investigation-2026-10-04/scenarioB.js; the stand-in's clock now follows the real date):
| screen | DOM nodes before -> after | script ms | long tasks sum/max ms | first keystroke event ms |
| Members 1,644 | 29,703 -> 594 | 1,655 -> 337 | 2,565/1,435 -> 282/108 | (not captured) -> 16 |
| Members 5,000 | 90,111 -> 594 | 2,203 -> 373 | 7,073/4,055 -> 312/126 | -> 16-64 |
| Attendance week | 49,476 -> 543 | 1,197 -> 354 | 2,390/1,182 -> 192/102 | 928 -> 40 |
| Follow-ups 1,644 / 5,000 | 16,346 / 49,466 -> 615 / 595 | 777 / 1,558 -> 325 / 344 | 1,052 / 2,245 -> 190 / 304 | - |
| Course roster 411 / 1,250 cards | 11,988 / 36,063 (unchanged) | 1,316 / 2,261 -> 1,016 / 2,306 | 1,388 / 8,850 -> 1,245 / 3,056 | 824 / 7,656 -> 72 / 216 |
Both themes: /members, /attendance, /weekly rendered dark and light with the stand-in, 0 page or console errors, no horizontal overflow (scratchpad fix/shots.js).
GATES: `npm run gate` VERDICT FAIL on the pre-existing set only (G1-G3, G6, G8), G5 PASS, G7 PASS; `npm run lint` PASS, `npm run typecheck` PASS.

## PERFORMANCE FIX PHASE 2: ONE CATALOGUE, ONE NAMES READ, FLATTER CHAINS — 05-Oct-2026

docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md RC-4/RC-12. NOT DEPLOYED. No DB change.

FAIL-FIRST: src/data/requestBudget.test.ts - against 5757c48 (phase 1) in a temporary worktree, 4 of 5 red: "85 requests, budget 27" (Attendance), "54 requests, budget 50" (Home), "27 requests, budget 25" (Members), and the course day still fetched names by id; 5 of 5 green after.
Existing specs kept green WITHOUT editing them: requestSize.test.ts ("every member-scale id list is sent in chunks" -- the by-id reads labelled 'the names on this day' / 'the names on this week' stay, chunked, for a roster that fits one chunk of 150; above that the shared whole-table names read is cheaper and is taken instead), memberRefresh.test.ts (13), dataLayerBoundary, pagedReads, periodMetrics, periodMetricsPage.

WHAT CHANGED (src/data/repository.ts only): readCatalogue -- courses, offerings, branches and the timetable in ONE shape, joined while in flight through the member store, consumed by fetchCourses, fetchRules, fetchFilterOptions, fetchOfferings, fetchBranchUsage, the register, fetchPendingSessions, fetchCourseDayRows, fetchMemberWeek and fetchAttendance (each loses its own offerings -> courses/branches chain and reads the catalogue beside its main read). readNames -- members, display names and addresses, whole and paged, shared by the register, Attendance and the course day. fetchNotifications is one shared read for every mounted header.

MEASURED (real data layer, fake network, 1,644 members, scratchpad requestBaseline): Attendance week 85 -> 27 requests; Home 54 -> 50; Members 27 -> 25; Follow-ups 25 -> 25; Reports 29 -> 25; Courses tab 29 -> 25; course day: no id chunks and no offerings chain (sequential depth 5 -> 3). What remains on Home is the 24 metrics pages (phase 6) and one empty terminating page per paged read (phase 10).
GATES: `npm run gate` VERDICT FAIL on the pre-existing set only (G1-G3, G6, G8), G5 PASS, G7 PASS (unit 2,152); `npm run lint` PASS, `npm run typecheck` PASS.

## PERFORMANCE FIX PHASE 1: REFETCH ONLY THE SCREEN ON SCREEN — 05-Oct-2026

docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md RC-1/RC-2/RC-3. NOT DEPLOYED.

FAIL-FIRST: src/data/revalidate.test.ts - T8A-T8E appended; against d32e345 T8A/T8B/T8C/T8E red (4 of 5; "a stale reader on a hidden screen is deferred": asked 1 want 0 -- the registry had no notion of a screen); 5 of 5 green.
FAIL-FIRST: src/data/memberRefresh.test.ts - Tests 6-7 appended; against d32e345 Test 7 red (register read 3 times for three periods, want 1); 13 of 13 green.
FAIL-FIRST: src/data/bulkDeleteAnnouncesOnce.test.ts - against d32e345 red (member and attendance buses rung 5 and 5 for four deletions, want 1 and 1); green after.
FAIL-FIRST: src/data/deferral.test.ts - against the hook's previous behaviour (no deferral: shouldDefer modelled as always false) 1 of 6 red ("a bus bump on a hidden screen holding data is deferred"); 6 of 6 green.
Existing specs kept green WITHOUT editing them: bulkDeleteNoEmail.test.ts ("deletes through the audited
per-member path" -- the loop still says `await deleteMember(id)`; the buses are held, not bypassed),
hookInvalidation.test.ts, inFlight.test.ts, memberStore.test.ts.

MEASURED (production bundle, headless Chromium, stand-in API at 130 ms, scripts/perf/investigation-2026-10-04/scenarioA.js):
- return to the app after 13 s with Home, Courses and Reports visited: 28 requests before -> 23 after,
  every one of the 23 a Home reader (the Courses and Reports readers defer until shown); 0 within 12 s.
- cold start on Home 27 -> 26. Fake network, five screens mounted, one Save: 52 HTTP requests before and
  after (T-406 already collapsed identical URLs) but ONE register read in JavaScript instead of five.
GATES: `npm run gate` VERDICT FAIL on the pre-existing set only (G1-G3 design/tokens.json absent, G6 the
scripts/conformance.mjs warning, G8), identical to the 25-Sep and 24-Sep runs; G5 types PASS, G7 unit PASS,
`npm run lint` PASS, `npm run typecheck` PASS. `npm run test:db` baseline before this change:
1,219 PASS, 4 pre-existing failures (T-014's fail-first spec 52, the 6-Oct joining-date fixture, the
is_super_admin count, the update_member body hash); no DB change in this phase.

## MEMBER FORM: VALIDATION SAID AS A TOAST — 03-Oct-2026

`requests/2026-10-03-member-form-validation-toast.md` (CHANGE, scoped).

FAIL-FIRST: src/components/memberValidationToast.test.ts - against main (00bb6d8) 3 of 3 red, e.g. "an invalid press must flash the reason, not do nothing"; 3 of 3 green.
Existing specs kept green WITHOUT editing them: memberRefusalClears.test.ts (refusal state and clearing rules unchanged), memberInactiveFromField.test.ts (hint still names the refused date), addMemberEmail.test.ts.
Browser check (offline fixture export, /member/edit, 400x880): Add Member pressed on an empty form -> warn toast "Member name and an email address are required"; with a name only -> "Choose the course to join"; no footer line while invalid; 0 JS errors. Light-scheme emulation rendered the app's dark theme, so only the dark look was seen; the toast is the existing component.
GATES: `npm run check` ALL 7 PASS.

## ONE MEMBER CHANGE, ONE SHARED MEMBER REFRESH — 03-Oct-2026

`requests/2026-10-03-one-shared-member-refresh.md` (CHANGE, scoped). NOT DEPLOYED.

FAIL-FIRST: src/data/memberRefresh.test.ts - against main (bb371e9) 10 of 11 red, e.g. "repo.confirmMemberListed is not a function" and Test 1's member-read count 0 where 1 is required; 11 of 11 green. The one green on main ("an unrelated write during a refresh does not split the screens") is T-406's network sharing, stated as such.
NOT OBSERVED FAILING: src/data/memberStore.test.ts - covers a new module (no prior behaviour); 8 of 8 green.
Existing specs kept green WITHOUT editing them: periodMetrics.test.ts and periodMetricsPage.test.ts pin three call sites of the paged figures RPC, so each of the three keeps its own paged read and is wrapped by the shared per-period read (first draft merged them into one and turned both red).

MEASURED (real repository + supabase-js + T-406 shared fetch, fake network, 1,640 members, 60 ms
latency, pool 10; readers mounted: Home list + 7 day buckets, Courses, Members, the Add form):
- one add, pre-T-406 code: 109 reads, 66 duplicates (production logged ~110 for one add on 01-Oct)
- one add, current main: 43 reads, 0 duplicates; 4 member-list executions in JavaScript
- one add, this change: 43 reads, 0 duplicates; 1 member-list execution; new member confirmed listed
- one add, this change with T-406 switched off: 43 reads (the shared read alone)
- unrelated write during the refresh: main 44 / this change 44, 0 duplicates either way
- two adds back to back: main 83 / this change 83 (two reloads, both needed after the second write)
- create 61-62 ms, create to list visible 394-440 ms in the simulation (relative only)
GATES: `npm run check` ALL 7 PASS (test:unit 2125 tests: 2124 pass, 0 fail, 1 skipped).

CI FIX (PR 63): CI runs Node 20; supabase-js's realtime client refuses to construct there without a
WebSocket constructor (Node 22+ and browsers have one), so the 8 runtime specs in memberRefresh.test.ts
failed in CI while passing locally on Node 22.
FAIL-FIRST: src/data/memberRefresh.test.ts - under Node 20 (v20.20.2) at 36cae9d, 8 of 11 red, "Node.js detected but native WebSocket not found."; 11 of 11 green after the test kit supplies a never-called WebSocket constructor when the runtime has none. App code unchanged.
GATES: Node 20 full unit suite 2125 tests: 2124 pass, 0 fail, 1 skipped; `npm run check` (Node 22) ALL 7 PASS.

## UNSUBSCRIBE v9 DEPLOYED — 03-Oct-2026

Owner-approved. Order kept: the `/unsubscribe` page went live first (Vercel production `f0ea2a5`,
1-Oct 20:11, success), then `unsubscribe` v9 (verify_jwt=false) from `main` `ef74760`. Target verified
first: project lhpzhkzbnquwjljmbylo, latest migration 0084, unsubscribe at v8. The deployed source was
read back and is identical to main. No migration; send-followups unchanged (v23).
NOT YET RUN on production: the live smoke (open a real link -> question page, nothing written;
press Unsubscribe -> unsubscribed + audit via link). Gmail one-click: NOT VERIFIED.

## COURSE ROSTER SEARCH FINDS DISPLAY NAMES TOO — 03-Oct-2026

`requests/2026-10-01-attendance-search-display-name.md`, correction round 1. NOT DEPLOYED.
FAIL-FIRST: src/data/attendanceSearch.test.ts (appended case) - against f0ea2a5, "The input did not match the regular expression /return members\.filter\(m => matchesAttendanceQuery\(\{\s*member: m\.name, code: m\.code, aliases: m\.aliases,/"; 4 of 4 green.
Browser check (offline fixture export, /course/c2, light and dark): 10/10 PASS -- the placeholder, display name "Shazia F" finds only Shazia Begum, the code finds only Fathima Rizwan, email still works. Attendance tab search re-checked: PASS.
GATES: `npm run check` ALL 7 PASS (test:unit 2061 tests: 2060 pass, 0 fail, 1 skipped).

## OWNER-APPROVED BEHAVIOUR REVERSAL: TWO UNSUBSCRIBE SPECS RE-POINTED — 01-Oct-2026

APPROVAL: the owner, 01-Oct-2026 ("Proceed with Option 1. I explicitly approve a narrow exception
to the CLAUDE.md append-only test rule for this deliberate security behaviour reversal"), with the
exemption text the owner dictated, now in CLAUDE.md beside the copy-lock exemption.
REASON: prevent email/link scanners from unsubscribing a member through a GET of the body link
(`requests/2026-10-01-unsubscribe-get-confirms.md`). A GET now only asks; the page's Unsubscribe
press, or Gmail's RFC 8058 POST, is the opt-out.
AFFECTED EXISTING SPECS (src/data/unsubscribeHandler.test.ts), and nothing else:
- "TEST 1 body link: unsubscribe -> old link offers Resubscribe -> Resubscribe -> subscribed"
- "bounced: an opt-out is recorded over it, no Resubscribe is offered, and the button is refused"
WHAT CHANGED: in each, ONE line -- the first action, `handle(new Request(await link(A)))` -- became
the new flow: open the link (asserted to land on /unsubscribe and NOT to change the status; TEST 1
also asserts no audit row), then press Unsubscribe (`POST ... &a=unsubscribe`). EVERY downstream
assertion is preserved unchanged: the 303, the /unsubscribed target, the carried pair, the status,
the audit action and `via: link`, the old-link re-click, Resubscribe, and the bounced refusals. No
assertion removed, no `.skip`, no matcher loosened. The 13 link-scanner specs from 3ca5ddf are kept.
RESULT: unsubscribeHandler.test.ts 28 of 28 green (was 26 of 28). `npm run check` ALL 7 PASS
(test:unit 2060 tests: 2059 pass, 0 fail, 1 skipped). `deno check` unsubscribe, send-followups,
ses-feedback clean; `deno test` 26 / 0.
DB: `npm run test:db` 1202 PASS; failures only in 39, 52, 53 (pre-existing, identical on main's CI;
no DB change this round). Spec 61 46/46.
BROWSER (offline fixture export, Chromium, light and dark): 85/85 PASS -- Reach Out / Attendance /
Edit Member offer the action only for unsubscribed (never subscribed, bounced or spam-reported);
two-address choice, Other needs a note, success refreshes and the action goes; Attendance search;
the question page shows its button only for this project's function, posts e, t, a=unsubscribe,
clears the pair from the address bar, sends nothing on load, and renders in both colour schemes.
SECURITY REVIEW (code-reviewer): no GET/HEAD/OPTIONS path writes or audits; no forged or missing
token writes; requirements (1)-(7) PASS. LOW notes kept: the page's `fn` check names this project's
ref (as /unsubscribed already does); one-click is recognised by the absence of `a`, token still
required; a scanner that renders the page AND presses buttons is the accepted residual.

## ATTENDANCE SEARCH FINDS DISPLAY NAMES AND EMAIL — 01-Oct-2026

`requests/2026-10-01-attendance-search-display-name.md` (micro). NOT DEPLOYED.
FAIL-FIRST: src/data/attendanceSearch.test.ts - against 3ca5ddf, "The input did not match the regular expression /matchesAttendanceQuery\(r, q\)/"; 3 of 3 green.
Browser check (offline fixture export): 8/8 PASS, light and dark -- the placeholder, display name "Shazia F" finds only Shazia Begum, an email finds only Divya Ramesh, the code still finds the member.
GATES: `npm run check` 6 of 7 PASS; test:unit 2060 tests, 2057 pass, 2 fail, 1 skipped -- the two failures are the owner-decision-pending specs recorded in the entry below, nothing else.

## THE UNSUBSCRIBE LINK ASKS; SEND CONFIRMATIONS COUNT EACH REASON — 01-Oct-2026 (WORK IN PROGRESS)

`requests/2026-10-01-unsubscribe-get-confirms.md`. NOT DEPLOYED. NOT REVIEWED YET.

FAIL-FIRST: src/data/unsubscribeHandler.test.ts (13 appended cases) - against HEAD's unsubscribe/index.ts, 11 of 28 red, e.g. "the question, not the confirmation  + 'https://rosi-fit.vercel.app/unsubscribed' - 'https://rosi-fit.vercel.app/unsubscribe'"; all 13 green with the change.
FAIL-FIRST: src/data/exclusionSummary.test.ts - against HEAD's send/index.tsx, "The input was expected to not match the regular expression /without an address/"; 3 of 3 green.
NOT OBSERVED FAILING: src/data/unsubscribeLanding.test.ts (3 appended cases) and supabase/functions/unsubscribe/landing.test.ts (1 appended case) - pin a new page and a new landing outcome; green.

KNOWN RED, OWNER DECISION PENDING: src/data/unsubscribeHandler.test.ts "TEST 1 body link: unsubscribe -> old link offers Resubscribe -> Resubscribe -> subscribed" and "bounced: an opt-out is recorded over it, no Resubscribe is offered, and the button is refused" assert that a GET writes the opt-out -- the behaviour the owner asked to remove. Untouched (append-only); 26 of 28 green in that file.
`deno check` unsubscribe + send-followups clean; `deno test` 26 / 0. Full `npm run check`, spec 61 and browser checks NOT yet re-run for this round.

## STAFF RESUBSCRIBE ON REACH OUT AND ATTENDANCE, ONE SHARED FLOW — 01-Oct-2026

`requests/2026-10-01-staff-resubscribe-everywhere.md` (CHANGE, scoped). Reach Out (member pop-up
and send draft) and Attendance offer "Resubscribe" only for an `unsubscribed` saved address; it
opens the existing confirmation (now titled "Turn follow-ups back on for this email?", naming the
member and the address, with a chooser when there are several). One hook, `useStaffResubscribe`,
owns the dialog, the call and the toast for both screens; Edit keeps its own button and passes its
one address to the same dialog. Every path calls `staffResubscribeEmail` → RPC
`staff_resubscribe_member_email` (0084). No migration; 0084 not re-applied.

FAIL-FIRST: src/data/staffResubscribeEntryPoints.test.ts - against ed4e1d1, 4 of 6 red, e.g. "app/member/[id].tsx must use the shared hook"; 6 of 6 green.
FAIL-FIRST: src/data/staffResubscribe.test.ts (4 appended cases) - 4 of 8 red against ed4e1d1, "(0 , import_staffResubscribe2.resubscribableAddresses) is not a function"; 8 of 8 green.

Browser check (Chromium, offline fixture export, temporary fixture with one member holding two
unsubscribed addresses and one bounced; fixture reverted, `git diff src/data/mock.ts` empty):
33/33 PASS, light and dark — action shown only for the unsubscribed member on the pop-up, send draft
and Attendance; never for bounced; opening changes nothing; Confirm disabled until a source (and an
address, with two); Other needs a note; success toast; the action disappears after confirm.
NOT RUN against production from this sandbox (no route to supabase.co or vercel.app).

REVIEW ROUND (code-reviewer and copy-gate-reviewer, REQUEST CHANGES): Attendance read the whole
member list (seven paged reads) to find addresses -- it now reads only the live unsubscribed rows
(`fetchUnsubscribedAddresses`, refreshed on a member change); the "Choose which address" reason
lived only in the confirm button's label -- now shown under the addresses; the pop-up names an
unsubscribed address the panel does not; screen-reader labels on Attendance and the send draft name
the address; lexicon rows reconciled; two comments that said an opt-out cannot be undone corrected.
FAIL-FIRST: src/data/staffResubscribeEntryPoints.test.ts (2 appended cases) - against the pre-review shape, 2 of 8 red: "The input did not match the regular expression /useUnsubscribedAddresses\(forced\)/" and "... /source && !chosen && problem \?[\s\S]{0,300}testID=\"resubscribe-address-problem\"/"; 8 of 8 green.
Browser re-check after the fixes, same fixture method: 44/44 PASS, light and dark (adds: the address
reason on screen once a source is picked, Cancel writes nothing, the pop-up names the remaining
unsubscribed address after the primary is turned back on).

Production, read-only (01-Oct-2026): ledger has 0084 (20261001100132) as the latest; unsubscribe v8
(verify_jwt false) and send-followups v23 (verify_jwt true) ACTIVE; guard and carry triggers present;
`audit_log` not executable by authenticated or anon; `staff_resubscribe_member_email` SECURITY
DEFINER, authenticated yes, anon no. A DO block run as a signed-in staff user, ended by RAISE so
nothing committed: direct status PATCH refused (42501), `audit_log` call refused (42501), staff RPC on
a bounced row refused ("this address bounced; ..."), Other with no note refused. No live complained
row exists to probe; spec 61 covers it.

GATES: `npm run check` ALL 7 PASS (test:unit 2038 tests: 2037 pass, 0 fail, 1 skipped);
contrast 2852/2852; icons 75/75. Spec 61 46/46 (no DB change this round).

## 0084: CREATE OR REPLACE TRIGGER INSTEAD OF DROP + CREATE — 01-Oct-2026

Owner-approved (Option 1). The Supabase MCP connector holds any statement containing DROP for a
confirmation it cannot get here, so 0084 never reached production (pg_stat_statements: the DROP
probes recorded 0 times, the plain DDL probes recorded). The two `drop trigger if exists` +
`create trigger` pairs are now `create or replace trigger` (Postgres 14+; production 17.6, harness 16).
No other line changed; 0084 had been applied nowhere.

NOT OBSERVED FAILING: no spec added or changed - syntax-only change, re-proven by the existing specs.
Spec 61 46/46; 0084 applied twice in a row leaves exactly one of each trigger.
`npm run test:db` 1202 PASS, failures only in 39, 52, 53 (pre-existing, unchanged).
`npm run check` ALL 7 PASS; `deno check` clean; `deno test` 25 / 0.

## UNSUBSCRIBE / RESUBSCRIBE FOR BOTH THE BODY LINK AND GMAIL'S UNSUBSCRIBE — 01-Oct-2026

`requests/2026-10-01-resubscribe-recovery-and-gmail-one-click.md` (CHANGE, scoped, correction round 1
of the resubscribe button). List-Unsubscribe now carries the signed HTTPS link only (the mailto went
to a mailbox nothing reads); the opt-out no longer overwrites a spam report; the prior status comes
from the row audit every writer produces (0084 `email_status_before_opt_out`); staff can "Turn
follow-ups back on" (0084 `staff_resubscribe_member_email`, audited `communication.staff_resubscribe`
with member, address, old/new, actor, time, source, note); re-entering an opted-out or spam-reported
address arrives suppressed (0084 BEFORE INSERT trigger).

FAIL-FIRST: supabase/tests/61_email_resubscribe_recovery.sql - "function public.email_status_before_opt_out(uuid) does not exist" with 0084 removed; 29 of 29 green with the first 0084.
FAIL-FIRST: src/data/unsubscribeHandler.test.ts - 7 of 15 red against HEAD's unsubscribe/index.ts, including "spam-reported: the opt-out is confirmed and the complaint is NOT overwritten" (status went 'complained' -> 'unsubscribed'); 6 of the 7 also because HEAD read the prior status from `audit_logs` with .order(), which the fake does not model. 15 of 15 green against the changed index.ts.
FAIL-FIRST: src/data/unsubscribeToken.test.ts - the two appended cases, 2 of 13 red with the mailto restored in listUnsubscribeHeaders ("no mailto: a mail client can only reach the endpoint that writes the opt-out"); 13 of 13 green.
NOT OBSERVED FAILING: src/data/staffResubscribe.test.ts - covers a new module and a new RPC wrapper; no prior behaviour to fail against. 4 of 4 green.
NOT OBSERVED FAILING: src/data/sendSuppression.test.ts - covers suppressionReason, extracted from send-followups' inline ternary with the same three reasons; 3 of 3 green.

REVIEW ROUND (code-reviewer, permission-reviewer, copy-gate-reviewer; all REQUEST CHANGES): carry
rule now per member by created_at, complaints by address; one shared prior-status rule for the member
button and staff; an INVOKER guard refuses direct status/email/owner/undelete writes by a signed-in user;
`audit_log` revoked from `authenticated`; refusal wording and lexicon fixed.
FAIL-FIRST: supabase/tests/61_email_resubscribe_recovery.sql (appended cases) - against the first 0084 (cb192ba): 15 red, e.g. "a save of another member in between does not make the re-entered copy sendable  got unknown want unsubscribed", "a signed-in user cannot PATCH an opt-out away -- statement was ACCEPTED", "a spam report on the other course's copy is the answer for this copy too  got unknown want complained"; 46 of 46 green with the revised 0084.

GATES: `npm run check` ALL 7 PASS (test:unit 2025 / 0). `deno check` on unsubscribe, send-followups and
the shared token module clean; `deno test` 25 / 0. `npm run test:db`: every file green except 39, 52
and 53, which fail identically with 0084 removed (pre-existing, as on 30-Sep). `npm run gate` FAIL only
on the five steps red since 24-Sep (G1/G2/G3/G6/G8).

## RESUBSCRIBE: NO STORED COPY OF THE UNSUBSCRIBE LINK — 30-Sep-2026

code-reviewer H1 on `requests/2026-09-30-resubscribe-button.md`; owner: "Close it first". The signed
link can undo an opt-out now, and copies sat where staff can read them: production had it in 821 of
822 `email_messages.variables` (readable by every signed-in account) and 24 of 26 `email_events`
payloads (SES echoes List-Unsubscribe; super admin only). Fixed at both writers and in the data:
`send-loop.ts` records `storableVars(vars)` (everything but `unsubscribe_url`); `ses-feedback`
records `withoutUnsubscribeLinks(payload)`; migration **0083** removes the copies already written.

FAIL-FIRST: supabase/functions/send-followups/send-loop.test.ts - "no stored message row carries the unsubscribe link, sent or excluded" (red before storableVars); 4 of 4 green.
FAIL-FIRST: supabase/tests/60_stored_messages_keep_no_unsubscribe_link.sql - "no stored message keeps the unsubscribe link  got 1 want 0" (3 of 7 red with 0083 emptied); 7 of 7 green, idempotent.
NOT OBSERVED FAILING: src/data/unsubscribeToken.test.ts - the two appended cases cover a new export (`withoutUnsubscribeLinks`); 11 of 11 green.

GATES: `npm run check` ALL 7 PASS (test:unit 2001 / 0); `deno test` 25 / 0. `npm run gate` FAIL only
on the five steps red since 24-Sep; G7 PASS.

## RESUBSCRIBE: CODE-REVIEW FIXES — 30-Sep-2026

code-reviewer on `requests/2026-09-30-resubscribe-button.md` (REQUEST CHANGES), fixed in 8114703:
M3 a bounced or spam-reported address could come back through unsubscribe-then-Resubscribe —
`resubscribeStep` now also needs the status BEFORE the opt-out (from that opt-out's
`communication.unsubscribed` audit row) to have been usable, and the page offers the button only then
(`mayOfferResubscribe`); L5 `fn` pinned to this project's function; L6 success read from the rows the
guarded update moved; L7 `e`/`t` read before the closures that capture them; M4 the page clears the
signed pair from the address bar and history. (This entry was written with 8114703 but lost to a
blocked commit command; recorded now.)

FAIL-FIRST: supabase/functions/unsubscribe/landing.test.ts - "an address that was bounced or spam-reported before the opt-out stays off" (resubscribeStep('unsubscribed','complained') returned 'write' on the first version); 11 of 11 green.

## A MEMBER WHO UNSUBSCRIBED BY MISTAKE CAN RESUBSCRIBE — 30-Sep-2026

`requests/2026-09-30-resubscribe-button.md` (CHANGE, scoped). `/unsubscribed` shows "Did you
unsubscribe by mistake?" and a Resubscribe button when the link carried the signed pair; the button
POSTs back to `unsubscribe` with `a=resubscribe`, which puts an UNSUBSCRIBED address back to
'unknown' (only that status), audits `communication.resubscribed` as the member's own act, and
lands on the new `/resubscribed`. The confirmation no longer promises "reply ... and we will turn
them back on", which 0078 forbids anyone to do.

FAIL-FIRST: src/data/unsubscribeLanding.test.ts - "the confirmation no longer promises a reply can undo it" (4 of 9 red on the previous pages and function); 9 of 9 green.
FAIL-FIRST: src/data/auditActionCoverage.test.ts - "communication.resubscribed ... -> guessed as \"Member email address — communication resubscribed\"" (red until auditPlain.ts named it); green.
NOT OBSERVED FAILING: supabase/functions/unsubscribe/landing.test.ts - the three appended cases cover new code (`resubscribeStep`, the `undo` parameter, `/resubscribed`); 9 of 9 green under `deno test`.
Page behaviour in Chromium (--dump-dom): with the signed pair and a Supabase `fn` the form action is `.../functions/v1/unsubscribe?e=a%26b&t=x%2By&a=resubscribe`; with a foreign `fn`, or no parameters, the form stays hidden. Rendered light and dark.
NOT RUN end to end against a live function: this sandbox cannot reach supabase.co, and a real signed link needs the production secret.

GATES: `npm run check` — lint, typecheck, check:edge, contrast, icons, functions PASS; test:unit PASS
after the audit wording was added. `npm run gate` FAIL only on the five steps red since 24-Sep.

## THE UNSUBSCRIBE PAGES CARRY THE ROSIFIT BRAND — 30-Sep-2026

`requests/2026-09-30-unsubscribe-page-branded.md` (CHANGE, micro). Both pages now show the RosiFit
logo (`public/rosifit-logo.png`, a copy of `assets/rosifit-logo.png`) on the app's plum header
gradient, with the words in a card and the app's tokens for both themes. Wording unchanged.

FAIL-FIRST: src/data/unsubscribeLanding.test.ts - "public/rosifit-logo.png must ship" (1 of 5 red on the previous pages); 5 of 5 green.
Rendered in Chromium at 800 and 500 wide, light and dark. Text pairs measured and written in each
page's header (lowest 4.5:1, the pink check on its tinted circle).

GATES: `npm run check` 7/7 PASS. `npm run gate` FAIL on the same five steps as every run since
24-Sep (G1/G2/G3 no `design/tokens.json`, G6 `scripts/conformance.mjs`, G8 no `test:functional`);
none in a file this change touches.

## THREE REPORTED DEFECTS: MERGE FIGURES, COURSE-CARD EMAIL SPLIT, UNSUBSCRIBE PAGE — 30-Sep-2026

`requests/2026-09-30-merge-leaves-member-absent.md` (T-140, RC-120, round 2 of RC-118),
`requests/2026-09-30-course-card-no-email-count.md` (T-141, RC-121),
`requests/2026-09-30-unsubscribe-link-shows-html.md` (T-142, RC-122). Track C, auto mode.

FAIL-FIRST: supabase/tests/59_merge_recomputes_member_figures.sql - "attended 1, not 0 got 0 want 1" (3 of 12 red replayed without 0082; with 0082 minus its session refresh: "and no absent left over from the import's default mark got 1 want 0", 2 red); 12 of 12 green.
FAIL-FIRST: src/data/mergeRefreshesAttendance.test.ts - "the day register must be told too, or the merged-into member keeps reading Absent" (2 of 2 red pre-fix); 2 of 2 green.
FAIL-FIRST: src/data/courseCardEmailSplit.test.ts - "the inactive member and the one not yet joined are not on the course screen, and a bounce is not \"no address\"" (3 of 4 red on the pre-fix courseSummary); 4 of 4 green. `src/data/course.test.ts` unchanged, green.
FAIL-FIRST: src/data/unsubscribeLanding.test.ts - "a text/html answer is rewritten to text/plain by the platform and shows as source" (red on the pre-fix index.ts); 4 of 4 green.
NOT OBSERVED FAILING: supabase/functions/unsubscribe/landing.test.ts - new module, no prior behaviour; 6 of 6 green under `deno test`.
Pages rendered in Chromium, light and dark; a markup-bearing academy name printed as text. Rendering
found one defect in the new page itself (a top-level `var name` is `window.name`, which printed
"null" with no academy) — fixed and pinned.

GATES: `npm run check` — all 7 PASS (lint, typecheck, check:edge, test:unit **1993 pass / 0 fail**,
contrast, icons, check:functions). `npm run gate` — FAIL on G1/G2/G3 (`design/tokens.json` absent),
G6 (an unused eslint-disable in `scripts/conformance.mjs`) and G8 (no `test:functional` script):
the same five as the 24-Sep runs, none in a file this change touches; G7 now PASS.
`npm run test:db` — every file green except **39_staff_are_not_restricted, 52_import_recomputes_only_its_own,
53_harness_body_matches_production**, which fail identically with 0082 removed (pre-existing on
`main`; 53 is T-132's). `59` 12/12, `25` 16/16, `58` 5/5.
Review: copy-gate-reviewer — "not active today" renamed "not on today’s register" (it also covered
a member who joins later), lexicon row added, failure page comment corrected, a spec now pins each
page's body to the function's words; wording confirmed unchanged from `HEAD`. code-reviewer — M1: the merge also left the SESSION counts
stale (`refresh_session_counts`, which every other attendance writer calls); 0082 now refreshes each
session it touched, and `59` asserts the counts. Low findings recorded in RC-122.

## EVERY COURSE WORDING SAYS HOW TO STOP — 26-Sep-2026

`requests/2026-09-26-every-course-wording-says-how-to-stop.md` (CHANGE, scoped). `send-followups`
appends 0066's opt-out line to any wording without `{{unsubscribe_url}}` (`withUnsubscribeLine`,
`send-followups/wording.ts`), and the send-step preview does the same (`src/data/sendPreview.ts`).

FAIL-FIRST: send-followups/wording.test.ts — **1 of 12 red** with `withUnsubscribeLine` returning
the body unchanged; 12 of 12 green restored. src/data/sendPreview.test.ts — **6 of 12 red** with
the preview's append removed, and the parity case red (**2 of 12**) with the client's copy of the
line changed by one word; 12 of 12 green restored. The five earlier cases in that file (unmerged,
this PR) now expect the line at the foot — the expected value changed, no assertion was removed or
loosened.

## THE MESSAGE IS SHOWN ON THE LAST SEND STEP — 26-Sep-2026

`requests/2026-09-26-preview-before-send.md` is the binding record (CHANGE, Track B, scoped). The
send draft's confirm pop-up and the member pop-up's trigger-prompt confirm step now show the
course's stored wording filled for the first ticked member (`src/data/sendPreview.ts`, drawn by
`src/components/MessagePreview.tsx`).

FAIL-FIRST: src/data/sendPreview.test.ts — **3 of 5 red** with two defects injected
(`firstTicked` returning the first row regardless of the tick; the subject returned unfilled):
'the first TICKED member in list order, not the first in the list', 'nobody ticked is no preview
member, never the first row by default', 'every token is filled with the member's own figures and
this send's period'. The file was restored from a copy: **5 of 5 green**.

GATES: `npm run check` — lint, typecheck, check:edge, contrast, icons, check:functions PASS.
test:unit **1970 pass / 6 fail — the same 6 that fail on `main`** (message.test.ts token list,
formDropdownMenu filters); none touches this change. `audit:colors`, `audit:testids`,
`audit:columns`, `audit:deadweight`, `audit:auditactor`, `audit:boundary` OK, none new.
`audit:rules` reports 4 violations, all on pre-existing register entries (RC-047, RC-048, RC-073,
the duplicate RC-107); none names this change. DB harness N/A — no migration.

BROWSER (web export, fixtures, 420×900, both themes chosen through /appearance):
`/send?id=c1` → Send to 1 → the confirm pop-up shows "PREVIEW · DIVYA RAMESH", the subject and the
full body above Not yet / Send; `/member/1` → Reach out → Apply → Send to 2 → the confirm step
shows the same preview above the trigger. Dark and light both rendered; 0 page errors.

REVIEW ROUND (code + copy review, 26-Sep-2026). Four tokens the form preview's map fills
differently from send-followups are now filled in the SENDER's format by `sendPreview`
(last attended date, one-decimal attendance %, em dash for a trigger with no condition on, and a
stated stand-in for the per-recipient unsubscribe link); the academy name and trigger are
required, so no sample value can pass as the member's email; ConfirmDialog caps its card and lets
the preview shrink. FAIL-FIRST: 4 new cases in src/data/sendPreview.test.ts — **4 of 9 red** with
the sender-format pass removed, **9 of 9 green** restored. test:unit 1975 pass / the same 6 fail.
Browser re-run both themes, 0 page errors; at 420×520 the final Send sits at y≈415, on screen.
The form preview's own divergence is TD-055. Freeze rule checked by `git diff`: no shipped string
removed or altered.

## A COURSE SENDS ITS OWN WORDING — 26-Sep-2026

`requests/2026-09-26-send-uses-the-course-wording.md` is the binding record, and **RC-109** is the
defect: Reach out and Send communication delivered the *Gentle check-in* template's words for a
course that had saved its own. `send-followups` now renders each recipient from their course's
wording, resolved by `effective_course_message()`.

FAIL-FIRST: supabase/functions/send-followups/wording.test.ts — **3 of 5 red** with the pre-fix
behaviour injected into `wordingFor` (`return template;`): "a member of a course with its own
wording is sent the course's words", "each course keeps its own wording -- one template for one
course", "the batch records the course's wording when every recipient shares it", each
`AssertionError: Values are not equal.` The file was restored from a copy and the spec re-run:
**5 of 5 green**. After code review the snapshot rule changed (a batch that rendered more than
one wording is recorded as mixed, not as the template): the spec is now 7 cases, all green;
`deno test` over the tree: 10 passed, 0 failed. The fail-first is an INJECTED one — `wordingFor`
did not exist before the fix — and the wiring in `index.ts` has no spec (see RC-109 Prevention).

GATES: `npm run check` — lint, typecheck, check:edge (306 files, deno 2.5.6), contrast, icons,
check:functions PASS. test:unit **1965 pass / 6 fail — the same 6 on the untouched base**
(`src/data/message.test.ts` token list vs the sender's variable map, and
`the list-screen filters are untouched`); none reads a line this change touches.
DB harness: N/A — no migration, `git diff supabase/migrations supabase/tests` EMPTY.

NOT OBSERVED: the delivered email. No live send was made — the Edge Function is not deployed
until the requester says so.

## ISSUES LEAVE THE ROSTER, AND THE DROPDOWN GAINS TWO — 24-Sep-2026

`requests/2026-09-24-issues-leave-the-roster-and-two-filters.md` is the binding record, and
**RC-108** is the defect. Yesterday's section was built as a pure ADDITION: it listed the members
whose address could not be used and changed nothing above it. The academy reported the
consequence the same day — an unsubscribed member appeared TWICE, once under Email issues and
once among the members with email, where the card printed the address in the ordinary muted grey
it uses for a working one. That is a second list over the same members, which is the shape
guardrail 1 exists to prevent.

WHAT CHANGED. `emailIssueIds` returns the ids of the rows the section actually renders, and the
roster above filters them out, so the section and the exclusion read ONE derivation and cannot
disagree. The section now draws the SAME `MemberCard` the roster draws, so moving a member down
the page costs nothing: the day's attendance reading, the status pill and the tick travel with
the member. The one thing that changes is the line under the name, which names the offending
address and the app's existing word for its state (`emailStateWord` via `issueBadge`) rather
than printing it as a working address. The dropdown gained **Bounced** and **Unsubscribed**,
answered by `emailIssueFor` — the same derivation a third time, never a third reading.

DATA SOURCE: none added. No query, no migration, `git diff supabase/` **EMPTY**. `update_member`,
unsubscribe semantics, the suppression rules and the send path are all untouched — `isReachable`
is not read by any line this change adds.

FAIL-FIRST: src/data/rosterFilter.test.ts — **9 of 35 red** against the pre-change
`rosterFilter.ts`, verbatim: `Expected values to be strictly deep-equal: + actual - expected +
[] - [ 'm1' ]` for 'Bounced returns the bounced member and nobody else', because `matchesOne`
had no branch for either key. With it: 'Unsubscribed returns the opted-out member and nobody
else', 'a re-added address is still found by the filter it was suppressed under (RC-107)', 'an
opt-out outranks a bounce, so the member is under one filter only', 'they narrow while the week
is still loading', 'the counts count the same members the filter returns' (both counts came back
`undefined`), 'the two new labels round-trip like every other' (`rosterFilterKey('Bounced')`
returned `'all'`), and the two copy-locks below. The source file was restored byte-identical
afterwards and `diff` run to prove it — `git checkout --` is unsafe in a shared worktree.

FAIL-FIRST: src/data/emailIssues.test.ts — **6 red** against the pre-change tree, both source
files stashed and restored byte-identical: 'the roster above must exclude the members the issues
section has taken' (case 15), `(0 , import_emailIssues.emailIssueIds) is not a function` (cases
16, 17, 18), 'each group is addressable, so a screen check can name one' (case 19), and 'the note
comes from the shared reading, never from a string typed into the screen'.

The FOUR negative cases among the new filter specs — no address, a usable address alongside a
dead one, a spam report — passed against the pre-change file, and they passed for the WRONG
reason: a filter that matches nobody matches them too. They are kept because they pin what the
two keys must never claim, and they are named here rather than counted as red-first, which would
have been a nicer number and a false one.

AMENDED, NOT APPENDED — three assertions, stated plainly because specs here are append-only:

  1. `emailIssues.test.ts` case 15 pinned `withEmail = shown.filter(m => m.emails.length > 0)` —
     that the section was a pure addition. The owner reversed that behaviour, so the assertion is
     re-pointed at the partition that replaced it and renamed to say what it now guards. Nothing
     removed, nothing skipped, no matcher loosened; "No email" is asserted unchanged in the same
     case, and a third assertion was ADDED requiring the exclusion to read `emailIssueIds`.
  2-3. `rosterFilter.test.ts`'s two copy-locks (**T-025**, half cleared). The academy asked the
     dropdown for two options by name, so changing that list IS the intent of the work — the one
     case the append-only rule leaves open. Both now pin the whole current list, including the
     `Active`/`Inactive` pair that was already in the tree and already failing these locks before
     this change went near them: verified by stashing only `rosterFilter.ts` and observing the
     same two failures on the untouched baseline.

MEASURED THIS RUN, baseline vs changed tree:
  - `npx tsx --test src/data/emailIssues.test.ts`: **34/34 PASS** (23 → 34)
  - `npx tsx --test src/data/rosterFilter.test.ts`: **38/38 PASS** (25 → 38, 2 were red)
  - `npm run test:unit`: **1947 pass / 6 fail**, against a clean-tree baseline measured the same
    hour of **1921 / 8**. +24 tests, **two fewer failures**, none introduced. The remaining six
    are `message.test.ts` ×5 (T-025's other half) and `formDropdownMenu.test.ts:148` over
    `app/(tabs)/courses.tsx` (**T-023**) — neither file is touched by this change.
  - `npx tsc --noEmit -p tsconfig.json`: **0 errors**. One was found and fixed during the run:
    `ROSTER_FILTERS.some(f => f.key === 'complained')` is a type error because the key is not in
    the union — the guard doing its job one level above the assertion, which now checks the label.
  - `npm run check`: **6 of 7 PASS** — lint PASS, typecheck PASS, check:edge PASS, **2852/2852 contrast pairs**, **75/75 icons**,
    check:functions PASS. No new colour and no new glyph: the section reuses `dangerInk`,
    `statusSurface` and the card it already drew.
  - `npm run gate`: 7 pass / 6 fail. G1/G2/G3 are the absent `design/tokens.json`
    (TD-001/002/003), G8 an empty functional log (TD-006), G7 the six above. **G6 Lint FAIL is
    one pre-existing warning in `scripts/conformance.mjs`** — *"Unused eslint-disable directive
    (no problems were reported from 'no-await-in-loop')"* at line 222, a file this change does not
    touch. `npm run check`'s lint step passes because it does not run with `--max-warnings 0`.
    None of the six is this change's.

REVIEW ROUND — code-reviewer returned **REQUEST CHANGES** with three blocking findings, and all
three were real, all three on the path the academy actually asked for, and none of them caught by
any spec in this repository. They are recorded because the pattern in them is the interesting
part: the derivation was right and the SCREEN AROUND IT was not.

  B1 · `showPending` kept its own hand-written list of "keys that are facts about the record"
       — the three names spelled out inline. Bounced and Unsubscribed are exactly that kind of
       fact and were added to the derivation, to `matchesOne` and to the counts, and not to that
       line. Tick Unsubscribed while a week is loading or failed and the screen printed *"This
       week's register could not be loaded, so the roster is not narrowed to Unsubscribed"* over
       a roster narrowed to precisely that — and `showPending` suppresses the truthful line
       beneath it, so the false sentence was the only explanation on screen. That is RC-108's own
       defect class, a screen stating something untrue, reintroduced one line from the fix.
       FIXED by exporting `isRecordFact` from `rosterFilter.ts`, beside the union it reads, and
       pinned by three cases including one that walks `ROSTER_FILTERS` so a future key cannot be
       added without being classified.
  B2 · The section defaulted to collapsed and nothing linked the filter to it. Tick Unsubscribed:
       `withEmail` and `withoutEmail` are both empty, `shown` is not, so no empty state fires —
       the answer to "show me the unsubscribed members" was a heading, a count, and a chevron.
       FIXED: ticking either key opens the section, and a close the operator chooses outranks
       that for as long as the filter stays ticked.
  B3 · `memberSplit` read "N with email · M without", two terms that used to be the whole roster
       and no longer are. On the academy's own roster it would read *"9 with email · 0 without"*
       under a heading saying ten. FIXED with a third term, drawn only when there is one.

  Non-blocking, also fixed: the empty-state guard tested `exactly one key and it is one of two`,
  so ticking BOTH — the point of a checkbox list — fell through to a sentence naming a day, which
  the comment directly above it forbids (now `every ticked key is an email record fact`); an issue
  card carried a word and a colour but no glyph and wore the HEALTHY border (guardrail 3 — now the
  `error` glyph on the line and on each group heading, and the danger border); and `emailIssueFor`
  could pick a blank address row as `worst` at equal severity and then borrow another row's
  address to print beside it, which is a pair of facts about two different addresses (now the
  named row wins at equal severity, severity still outranking it — three cases, fail-first
  observed by reverting the tiebreak in place and restoring byte-identical).

  T-302 PAID DOWN RATHER THAN ADDED TO: the four source-reading windows in `emailIssues.test.ts`
  were character slices, the exact pattern that row names as open — a CRLF checkout spends one
  extra character per line, so the window ends on a different line on Windows than in CI. All
  four now take a LINE window through one `linesFrom` helper, which is the fix T-302 prescribes.

  ACCEPTED, NOT FIXED, and recorded so it is a decision rather than an inheritance: an unsubscribed
  member who is INACTIVE on the selected day is not surfaced by the new filters and is not in their
  counts, while the Inactive section stays on screen beside them. That is exactly how `no-email`
  has always behaved, so the two new keys are consistent with the key they sit beside rather than
  novel. Changing it means deciding whether a record fact should reach across the register
  boundary, which is a wider question than this request.

  Copy-gate-reviewer returned BLOCKED (no shell) with seven findings; five were acted on. The
  group note's three `detail` strings were written in the singular — *"This member previously
  opted out…"* — and are now drawn ONCE over a group of cards, where "This member" names nobody;
  rewritten in the plural, and the three copy-locks still pass unchanged because the pinned
  phrases survived. The opt-out note said the academy does not write again *"unless the member
  asks for it"*, a path this app does not have — `emailStatus.ts` records in as many words that no
  screen here reinstates an address. The bounced note said *"a working address"*, asserting a
  replacement works, where the product's own word is *"a different email address"*. The two
  empty-state sentences restated their own titles and made the ADDRESS the subject of a state
  `emailStateWord` assigns to the member. And `${address} · ${word}` drew a dangling separator
  when the address is the empty string the bulk import can write. Two findings were logged to
  `PRODUCT_LEXICON.md` candidates rather than fixed: `Spam Reported` is Title Case among
  sentence-case siblings and is copy-locked in three places, and `ISSUE_READING.unsubscribed.title`
  makes the address the subject — both are shipped copy and belong in a declared copy pass. The
  six email-suppression terms were added to the lexicon as PROVISIONAL rows, recorded as PAIRS:
  the short form is the heading and the filter, the long form is the word on a card.

  ONE RULE VIOLATION FIXED OUTSIDE THE REQUEST, and named rather than slipped in: the "No email"
  section's comment read *"She is separated because the follow-up rule cannot reach her"*, two
  lines above the code this change edits. The gender-neutral rule is binding, so it was fixed.
  **What was NOT fixed, and the academy should see it:** `app/course/[id].tsx:1619` is a VISIBLE
  string breaking the same rule — *"…so she is expected at the days that offering runs"* — and
  about thirty comments in that file do too. Both are logged as lexicon candidates. A one-line
  edit to a shipped string is a copy pass, not a tidy-up inside an unrelated change.

DEFINITION OF DONE — every item, or an explicit N/A with a reason.

| item | verdict |
|---|---|
| Implements the approved plan, no unrequested scope | done · one exception declared: the No email comment's gendered wording, fixed because the rule is binding |
| Every changed line traces to the request | done |
| Canonical pattern for every concern | done · guardrail 1 (one derivation feeds section, exclusion and filter), CP-011 |
| No colour literals, no magic numbers | gate: G4 PASS |
| Dead weight deleted | done · the hand-kept key list is gone, asserted by case 22 |
| Dependencies verified and pinned | N/A: none added |
| Component contributed back | N/A: no new component, `MemberCard` gained one optional prop |
| Every state looked at: empty, loading, error | done · loading and error are B1's own defect, now correct; empty is the new arm |
| Loading terminates on forced error | N/A: no new async path |
| Failure path exercised | N/A: no new write or read |
| Writes idempotent | N/A: no write |
| CHECK constraints stated by the form | N/A: no form touched |
| Multi-step writes in one transaction | N/A: no write |
| A save proved against the data | N/A: no save |
| Screen checklist per screen | **NOT DONE** — no spec renders a screen and preview-smoke-verifier is unreachable. This is the standing gap, named above |
| Both themes verified visually | **NOT DONE**, same reason. No new colour: `dangerInk`, `statusSurface`, `theme.muted` only |
| Contrast asserted | gate: 2852/2852 pairs |
| Per-theme assets | N/A: no brand asset touched |
| Five permission questions, matrix row | N/A: no role, policy or tenant surface touched |
| Deep route and API path gated | N/A: as above |
| Tenant scoping on every query | N/A: no query — the section reads the roster already loaded |
| No secret in client code or repo | done · `git diff supabase/` empty |
| Cases added, registry delta verified | done · +11 in `emailIssues.test.ts` (23 → 34), +13 in `rosterFilter.test.ts` (25 → 38) |
| All four dimensions | done · derivation, screen wiring, copy, and the negative cases named above |
| Fail-first evidence per new behaviour test | done · four separate observations, each restored byte-identical and diffed; the four passing-negative cases named honestly |
| The gate ran | done · FAIL, six classes, every one named and pre-existing |
| Module document updated | done · `emailIssues.ts` and `rosterFilter.ts` headers carry the reasoning |
| Feature register updated | no change needed — this is a correction to a feature registered on 23-Sep |
| Root-cause entry appended | done · **RC-108** |
| Limitations entry | N/A: no platform limit found |
| Decision record | N/A: nothing hard to reverse. The two accepted-not-fixed calls are recorded above |
| Changelog line | done · see below |
| Tier stated | **T0** — a correction to a shipped screen, no new surface, no pricing, legal or support change |
| Run closed out | done · two rows, one per cycle (R-019 and R-020 after the merge with `main` renumbered them; `main` had already taken R-015) |

CHANGELOG, in the language of the user: *A member who has unsubscribed or whose address has
bounced now appears only under Email issues on the course screen, not also in the list of members
with email — and the roster's Show menu can narrow to Bounced or Unsubscribed.*

WHAT IS STILL NOT PROVEN, for the fourth day running, and it is now the pattern rather than the
exception: no spec here renders a screen. "The unsubscribed member is no longer in the list above
and the count beside it dropped by one" is asserted by reading `app/course/[id].tsx` for the
three predicates and by proving the arithmetic in `emailIssues.test.ts` case 16 — not by looking.
preview-smoke-verifier remains unreachable from this environment. RC-106, RC-107 and RC-108 were
all found by a person using the app, which is three for three, and RC-108's process check says so.

---

## Gate run - 2026-10-07 - VERDICT: FAIL

Steps: 8 pass, 5 fail, 0 blocked.
Time: 45.2s total - slowest G7 Unit + pure specs (24.5s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (40ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (38ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (37ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (56ms)
- **G5 Types** - PASS (5.8s)
- **G6 Lint** - FAIL (14.4s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - PASS (24.5s)
- **G8 Functional / integration** - FAIL (94ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (46ms)
- **G10 Backward compatibility (fixtures)** - PASS (107ms)
- **G11 Wide tables are configurable** - PASS (41ms)
- **G12 Installable as an application** - PASS (61ms)
- **G13 Approved design still being built** - PASS (37ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-10-07 - VERDICT: FAIL

Steps: 8 pass, 5 fail, 0 blocked.
Time: 1m 05s total - slowest G7 Unit + pure specs (25.9s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (50ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (100ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (78ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (1.4s)
- **G5 Types** - PASS (18.7s)
- **G6 Lint** - FAIL (18.3s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - PASS (25.9s)
- **G8 Functional / integration** - FAIL (100ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (54ms)
- **G10 Backward compatibility (fixtures)** - PASS (92ms)
- **G11 Wide tables are configurable** - PASS (42ms)
- **G12 Installable as an application** - PASS (59ms)
- **G13 Approved design still being built** - PASS (42ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-10-06 - VERDICT: FAIL

Steps: 8 pass, 5 fail, 0 blocked.
Time: 1m 04s total - slowest G7 Unit + pure specs (40.0s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (71ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (50ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (55ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (78ms)
- **G5 Types** - PASS (8.7s)
- **G6 Lint** - FAIL (14.1s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - PASS (40.0s)
- **G8 Functional / integration** - FAIL (159ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (70ms)
- **G10 Backward compatibility (fixtures)** - PASS (128ms)
- **G11 Wide tables are configurable** - PASS (83ms)
- **G12 Installable as an application** - PASS (91ms)
- **G13 Approved design still being built** - PASS (66ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-10-06 - VERDICT: FAIL

Steps: 8 pass, 5 fail, 0 blocked.
Time: 1m 08s total - slowest G7 Unit + pure specs (42.2s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (124ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (61ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (114ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (187ms)
- **G5 Types** - PASS (10.2s)
- **G6 Lint** - FAIL (14.9s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - PASS (42.2s)
- **G8 Functional / integration** - FAIL (181ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (90ms)
- **G10 Backward compatibility (fixtures)** - PASS (139ms)
- **G11 Wide tables are configurable** - PASS (89ms)
- **G12 Installable as an application** - PASS (111ms)
- **G13 Approved design still being built** - PASS (77ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-10-06 - VERDICT: FAIL

Steps: 8 pass, 5 fail, 0 blocked.
Time: 1m 07s total - slowest G7 Unit + pure specs (41.0s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (143ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (130ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (132ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (166ms)
- **G5 Types** - PASS (9.7s)
- **G6 Lint** - FAIL (14.7s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - PASS (41.0s)
- **G8 Functional / integration** - FAIL (140ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (64ms)
- **G10 Backward compatibility (fixtures)** - PASS (132ms)
- **G11 Wide tables are configurable** - PASS (64ms)
- **G12 Installable as an application** - PASS (88ms)
- **G13 Approved design still being built** - PASS (57ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-10-06 - VERDICT: FAIL

Steps: 8 pass, 5 fail, 0 blocked.
Time: 1m 04s total - slowest G7 Unit + pure specs (40.0s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (69ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (54ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (53ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (91ms)
- **G5 Types** - PASS (8.1s)
- **G6 Lint** - FAIL (15.1s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - PASS (40.0s)
- **G8 Functional / integration** - FAIL (172ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (64ms)
- **G10 Backward compatibility (fixtures)** - PASS (133ms)
- **G11 Wide tables are configurable** - PASS (58ms)
- **G12 Installable as an application** - PASS (84ms)
- **G13 Approved design still being built** - PASS (53ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-10-06 - VERDICT: FAIL

Steps: 8 pass, 5 fail, 0 blocked.
Time: 1m 07s total - slowest G7 Unit + pure specs (40.9s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (74ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (53ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (56ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (100ms)
- **G5 Types** - PASS (8.9s)
- **G6 Lint** - FAIL (16.1s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - PASS (40.9s)
- **G8 Functional / integration** - FAIL (200ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (66ms)
- **G10 Backward compatibility (fixtures)** - PASS (125ms)
- **G11 Wide tables are configurable** - PASS (66ms)
- **G12 Installable as an application** - PASS (118ms)
- **G13 Approved design still being built** - PASS (58ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-10-06 - VERDICT: FAIL

Steps: 8 pass, 5 fail, 0 blocked.
Time: 1m 05s total - slowest G7 Unit + pure specs (39.1s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (59ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (67ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (50ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (86ms)
- **G5 Types** - PASS (8.1s)
- **G6 Lint** - FAIL (16.6s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - PASS (39.1s)
- **G8 Functional / integration** - FAIL (196ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (61ms)
- **G10 Backward compatibility (fixtures)** - PASS (140ms)
- **G11 Wide tables are configurable** - PASS (60ms)
- **G12 Installable as an application** - PASS (87ms)
- **G13 Approved design still being built** - PASS (53ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-10-06 - VERDICT: FAIL

Steps: 8 pass, 5 fail, 0 blocked.
Time: 57.0s total - slowest G7 Unit + pure specs (37.0s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (74ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (56ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (56ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (75ms)
- **G5 Types** - PASS (7.7s)
- **G6 Lint** - FAIL (11.4s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - PASS (37.0s)
- **G8 Functional / integration** - FAIL (141ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (63ms)
- **G10 Backward compatibility (fixtures)** - PASS (135ms)
- **G11 Wide tables are configurable** - PASS (63ms)
- **G12 Installable as an application** - PASS (83ms)
- **G13 Approved design still being built** - PASS (55ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-10-06 - VERDICT: FAIL

Steps: 8 pass, 5 fail, 0 blocked.
Time: 56.1s total - slowest G7 Unit + pure specs (37.0s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (66ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (50ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (52ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (74ms)
- **G5 Types** - PASS (7.7s)
- **G6 Lint** - FAIL (10.6s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - PASS (37.0s)
- **G8 Functional / integration** - FAIL (132ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (63ms)
- **G10 Backward compatibility (fixtures)** - PASS (165ms)
- **G11 Wide tables are configurable** - PASS (57ms)
- **G12 Installable as an application** - PASS (85ms)
- **G13 Approved design still being built** - PASS (54ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-10-06 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 58.0s total - slowest G7 Unit + pure specs (38.9s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (58ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (53ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (55ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (84ms)
- **G5 Types** - PASS (7.2s)
- **G6 Lint** - FAIL (11.0s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - FAIL (38.9s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
# Subtest: a ring is never a colour alone, and nothing expected is a dash
```

- **G8 Functional / integration** - FAIL (141ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (61ms)
- **G10 Backward compatibility (fixtures)** - PASS (159ms)
- **G11 Wide tables are configurable** - PASS (70ms)
- **G12 Installable as an application** - PASS (94ms)
- **G13 Approved design still being built** - PASS (72ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-10-06 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 53.1s total - slowest G7 Unit + pure specs (33.5s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (58ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (53ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (50ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (74ms)
- **G5 Types** - PASS (6.6s)
- **G6 Lint** - FAIL (12.3s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - FAIL (33.5s)

```
# Subtest: a failed remarks load is reported, not rendered as emptiness
ok 28 - a failed remarks load is reported, not rendered as emptiness
# Subtest: THE SEVEN CELLS SURVIVE A FAILED WEEK
ok 102 - THE SEVEN CELLS SURVIVE A FAILED WEEK
# Subtest: the banner wears the failed status, not a colour of its own
ok 110 - the banner wears the failed status, not a colour of its own
# Subtest: the roster card states a failed week rather than guessing at it
ok 112 - the roster card states a failed week rather than guessing at it
  error: 'the course screen no longer holds one todayIso for the strip'
  name: 'AssertionError'
  expected:
    import { Muted, Label, Skeleton, EmptyState, ErrorState, DeepBackground } from '../../src/components/ui';
    import { MERGE_FAILED } from '../../src/data/alias';
     * A course states a frequency; 0005 says out loud that expected attendance is
     * expected" rather than inventing a session from `frequency`. That is the
```

- **G8 Functional / integration** - FAIL (133ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (69ms)
- **G10 Backward compatibility (fixtures)** - PASS (115ms)
- **G11 Wide tables are configurable** - PASS (54ms)
- **G12 Installable as an application** - PASS (74ms)
- **G13 Approved design still being built** - PASS (48ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-10-06 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 54.8s total - slowest G7 Unit + pure specs (33.9s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (53ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (53ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (67ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (99ms)
- **G5 Types** - PASS (7.1s)
- **G6 Lint** - FAIL (13.0s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - FAIL (33.9s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
# Subtest: a ring is never a colour alone, and nothing expected is a dash
```

- **G8 Functional / integration** - FAIL (138ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (57ms)
- **G10 Backward compatibility (fixtures)** - PASS (128ms)
- **G11 Wide tables are configurable** - PASS (57ms)
- **G12 Installable as an application** - PASS (80ms)
- **G13 Approved design still being built** - PASS (57ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-10-06 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 56.7s total - slowest G7 Unit + pure specs (35.4s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (76ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (55ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (51ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (104ms)
- **G5 Types** - PASS (6.9s)
- **G6 Lint** - FAIL (13.5s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - FAIL (35.4s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
# Subtest: a ring is never a colour alone, and nothing expected is a dash
```

- **G8 Functional / integration** - FAIL (133ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (57ms)
- **G10 Backward compatibility (fixtures)** - PASS (120ms)
- **G11 Wide tables are configurable** - PASS (75ms)
- **G12 Installable as an application** - PASS (94ms)
- **G13 Approved design still being built** - PASS (52ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-10-06 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 56.2s total - slowest G7 Unit + pure specs (33.8s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (54ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (53ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (49ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (93ms)
- **G5 Types** - PASS (7.6s)
- **G6 Lint** - FAIL (14.0s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - FAIL (33.8s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
# Subtest: a ring is never a colour alone, and nothing expected is a dash
```

- **G8 Functional / integration** - FAIL (137ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (56ms)
- **G10 Backward compatibility (fixtures)** - PASS (148ms)
- **G11 Wide tables are configurable** - PASS (59ms)
- **G12 Installable as an application** - PASS (78ms)
- **G13 Approved design still being built** - PASS (53ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-10-06 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 42.2s total - slowest G7 Unit + pure specs (21.7s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (64ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (56ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (48ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (69ms)
- **G5 Types** - PASS (7.1s)
- **G6 Lint** - FAIL (12.6s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - FAIL (21.7s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
# Subtest: a ring is never a colour alone, and nothing expected is a dash
```

- **G8 Functional / integration** - FAIL (141ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (59ms)
- **G10 Backward compatibility (fixtures)** - PASS (113ms)
- **G11 Wide tables are configurable** - PASS (54ms)
- **G12 Installable as an application** - PASS (74ms)
- **G13 Approved design still being built** - PASS (49ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-10-06 - VERDICT: FAIL

Steps: 8 pass, 5 fail, 0 blocked.
Time: 58.4s total - slowest G7 Unit + pure specs (21.7s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (99ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (71ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (54ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (93ms)
- **G5 Types** - PASS (17.3s)
- **G6 Lint** - FAIL (18.2s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - PASS (21.7s)
- **G8 Functional / integration** - FAIL (164ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (68ms)
- **G10 Backward compatibility (fixtures)** - PASS (113ms)
- **G11 Wide tables are configurable** - PASS (55ms)
- **G12 Installable as an application** - PASS (78ms)
- **G13 Approved design still being built** - PASS (53ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-10-06 - VERDICT: FAIL

Steps: 8 pass, 5 fail, 0 blocked.
Time: 57.8s total - slowest G7 Unit + pure specs (20.8s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (91ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (47ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (77ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (224ms)
- **G5 Types** - PASS (18.4s)
- **G6 Lint** - FAIL (17.5s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - PASS (20.8s)
- **G8 Functional / integration** - FAIL (121ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (53ms)
- **G10 Backward compatibility (fixtures)** - PASS (108ms)
- **G11 Wide tables are configurable** - PASS (52ms)
- **G12 Installable as an application** - PASS (82ms)
- **G13 Approved design still being built** - PASS (45ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-10-05 - VERDICT: FAIL

Steps: 8 pass, 5 fail, 0 blocked.
Time: 41.1s total - slowest G7 Unit + pure specs (22.1s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (53ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (51ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (51ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (98ms)
- **G5 Types** - PASS (7.2s)
- **G6 Lint** - FAIL (11.0s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - PASS (22.1s)
- **G8 Functional / integration** - FAIL (135ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (55ms)
- **G10 Backward compatibility (fixtures)** - PASS (118ms)
- **G11 Wide tables are configurable** - PASS (55ms)
- **G12 Installable as an application** - PASS (78ms)
- **G13 Approved design still being built** - PASS (57ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-10-05 - VERDICT: FAIL

Steps: 8 pass, 5 fail, 0 blocked.
Time: 41.0s total - slowest G7 Unit + pure specs (22.6s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (53ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (50ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (51ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (71ms)
- **G5 Types** - PASS (7.0s)
- **G6 Lint** - FAIL (10.7s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - PASS (22.6s)
- **G8 Functional / integration** - FAIL (129ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (58ms)
- **G10 Backward compatibility (fixtures)** - PASS (142ms)
- **G11 Wide tables are configurable** - PASS (54ms)
- **G12 Installable as an application** - PASS (73ms)
- **G13 Approved design still being built** - PASS (48ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-10-05 - VERDICT: FAIL

Steps: 8 pass, 5 fail, 0 blocked.
Time: 37.9s total - slowest G7 Unit + pure specs (20.9s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (49ms)

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

- **G4 No hard-coded colours** - PASS (78ms)
- **G5 Types** - PASS (6.5s)
- **G6 Lint** - FAIL (9.7s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - PASS (20.9s)
- **G8 Functional / integration** - FAIL (121ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (74ms)
- **G10 Backward compatibility (fixtures)** - PASS (126ms)
- **G11 Wide tables are configurable** - PASS (52ms)
- **G12 Installable as an application** - PASS (75ms)
- **G13 Approved design still being built** - PASS (48ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-10-05 - VERDICT: FAIL

Steps: 8 pass, 5 fail, 0 blocked.
Time: 39.7s total - slowest G7 Unit + pure specs (21.8s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (52ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (49ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (50ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (72ms)
- **G5 Types** - PASS (6.7s)
- **G6 Lint** - FAIL (10.4s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - PASS (21.8s)
- **G8 Functional / integration** - FAIL (170ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (57ms)
- **G10 Backward compatibility (fixtures)** - PASS (123ms)
- **G11 Wide tables are configurable** - PASS (62ms)
- **G12 Installable as an application** - PASS (100ms)
- **G13 Approved design still being built** - PASS (56ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-25 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 29.0s total - slowest G7 Unit + pure specs (16.2s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (45ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit-T407/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (48ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit-T407/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (49ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit-T407/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (72ms)
- **G5 Types** - PASS (5.1s)
- **G6 Lint** - FAIL (7.1s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - FAIL (16.2s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (108ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (49ms)
- **G10 Backward compatibility (fixtures)** - PASS (98ms)
- **G11 Wide tables are configurable** - PASS (49ms)
- **G12 Installable as an application** - PASS (62ms)
- **G13 Approved design still being built** - PASS (44ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-24 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 24.3s total - slowest G7 Unit + pure specs (15.4s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (54ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit-T408/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (48ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit-T408/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (46ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit-T408/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (61ms)
- **G5 Types** - PASS (5.3s)
- **G6 Lint** - FAIL (2.9s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - FAIL (15.4s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (117ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (51ms)
- **G10 Backward compatibility (fixtures)** - PASS (103ms)
- **G11 Wide tables are configurable** - PASS (53ms)
- **G12 Installable as an application** - PASS (69ms)
- **G13 Approved design still being built** - PASS (45ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-25 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 27.3s total - slowest G7 Unit + pure specs (16.9s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (50ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit-T406/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (52ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit-T406/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (52ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit-T406/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (71ms)
- **G5 Types** - PASS (6.2s)
- **G6 Lint** - FAIL (3.4s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - FAIL (16.9s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (128ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (58ms)
- **G10 Backward compatibility (fixtures)** - PASS (127ms)
- **G11 Wide tables are configurable** - PASS (56ms)
- **G12 Installable as an application** - PASS (76ms)
- **G13 Approved design still being built** - PASS (49ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-25 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 32.8s total - slowest G7 Unit + pure specs (16.6s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (50ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit-T405/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (48ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit-T405/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (49ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit-T405/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (71ms)
- **G5 Types** - PASS (5.9s)
- **G6 Lint** - FAIL (9.6s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - FAIL (16.6s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (130ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (56ms)
- **G10 Backward compatibility (fixtures)** - PASS (111ms)
- **G11 Wide tables are configurable** - PASS (53ms)
- **G12 Installable as an application** - PASS (70ms)
- **G13 Approved design still being built** - PASS (50ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-10-01 - VERDICT: FAIL

Steps: 8 pass, 5 fail, 0 blocked.
Time: 38.4s total - slowest G7 Unit + pure specs (23.8s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (90ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (84ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (74ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (91ms)
- **G5 Types** - PASS (8.4s)
- **G6 Lint** - FAIL (5.1s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - PASS (23.8s)
- **G8 Functional / integration** - FAIL (250ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (79ms)
- **G10 Backward compatibility (fixtures)** - PASS (176ms)
- **G11 Wide tables are configurable** - PASS (85ms)
- **G12 Installable as an application** - PASS (123ms)
- **G13 Approved design still being built** - PASS (87ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-30 - VERDICT: FAIL

Steps: 8 pass, 5 fail, 0 blocked.
Time: 45.0s total - slowest G7 Unit + pure specs (26.9s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (69ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (74ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (68ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (115ms)
- **G5 Types** - PASS (10.9s)
- **G6 Lint** - FAIL (6.1s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - PASS (26.9s)
- **G8 Functional / integration** - FAIL (204ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (86ms)
- **G10 Backward compatibility (fixtures)** - PASS (204ms)
- **G11 Wide tables are configurable** - PASS (88ms)
- **G12 Installable as an application** - PASS (117ms)
- **G13 Approved design still being built** - PASS (68ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-30 - VERDICT: FAIL

Steps: 8 pass, 5 fail, 0 blocked.
Time: 39.2s total - slowest G7 Unit + pure specs (23.2s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (77ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (81ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (85ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (126ms)
- **G5 Types** - PASS (9.8s)
- **G6 Lint** - FAIL (5.1s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - PASS (23.2s)
- **G8 Functional / integration** - FAIL (210ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (85ms)
- **G10 Backward compatibility (fixtures)** - PASS (169ms)
- **G11 Wide tables are configurable** - PASS (77ms)
- **G12 Installable as an application** - PASS (98ms)
- **G13 Approved design still being built** - PASS (76ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-30 - VERDICT: FAIL

Steps: 8 pass, 5 fail, 0 blocked.
Time: 40.6s total - slowest G7 Unit + pure specs (24.0s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (85ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (77ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (74ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (136ms)
- **G5 Types** - PASS (9.9s)
- **G6 Lint** - FAIL (5.6s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - PASS (24.0s)
- **G8 Functional / integration** - FAIL (224ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (88ms)
- **G10 Backward compatibility (fixtures)** - PASS (160ms)
- **G11 Wide tables are configurable** - PASS (77ms)
- **G12 Installable as an application** - PASS (105ms)
- **G13 Approved design still being built** - PASS (91ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-30 - VERDICT: FAIL

Steps: 8 pass, 5 fail, 0 blocked.
Time: 29.3s total - slowest G7 Unit + pure specs (18.7s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (69ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (55ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (54ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (78ms)
- **G5 Types** - PASS (6.4s)
- **G6 Lint** - FAIL (3.4s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - PASS (18.7s)
- **G8 Functional / integration** - FAIL (134ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (56ms)
- **G10 Backward compatibility (fixtures)** - PASS (118ms)
- **G11 Wide tables are configurable** - PASS (58ms)
- **G12 Installable as an application** - PASS (81ms)
- **G13 Approved design still being built** - PASS (56ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-30 - VERDICT: FAIL

Steps: 8 pass, 5 fail, 0 blocked.
Time: 30.8s total - slowest G7 Unit + pure specs (19.7s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (65ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (53ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (46ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (69ms)
- **G5 Types** - PASS (7.0s)
- **G6 Lint** - FAIL (3.2s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - PASS (19.7s)
- **G8 Functional / integration** - FAIL (127ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (56ms)
- **G10 Backward compatibility (fixtures)** - PASS (122ms)
- **G11 Wide tables are configurable** - PASS (53ms)
- **G12 Installable as an application** - PASS (87ms)
- **G13 Approved design still being built** - PASS (52ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-24 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 26.0s total - slowest G7 Unit + pure specs (16.5s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (53ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (61ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (58ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (85ms)
- **G5 Types** - PASS (5.7s)
- **G6 Lint** - FAIL (3.1s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - FAIL (16.5s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (130ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (58ms)
- **G10 Backward compatibility (fixtures)** - PASS (115ms)
- **G11 Wide tables are configurable** - PASS (61ms)
- **G12 Installable as an application** - PASS (76ms)
- **G13 Approved design still being built** - PASS (49ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## EMAIL ISSUES — a course's unusable addresses, grouped by why, 24-Sep-2026

A visibility section on the course screen, immediately below "No email" and deliberately not
merged with it. `requests/2026-09-24-email-issues-section.md` is the binding record.

DATA SOURCE: none added. The section derives from `shown` — the array the roster above it is
already rendering, which is `enrolledIn(members, course)` narrowed by branch, by the search box
and by the reading filters. `Member.emails` and `Member.suppressedBefore` both arrive with the
single `useFollowUp` load, so there is no query per member and no second count that can drift
from the rows (guardrail 1, CP-011).

FAIL-FIRST. The module and its spec were written together, so the evidence is mutation, plus
two UI guards that were genuinely red before the section existed:

FAIL-FIRST: src/data/emailIssues.test.ts — "# fail 2" of 23 against the tree before the course
screen was touched: "the section is rendered immediately BELOW No email" and "it reads the
roster the screen is already drawing — no second query". The other 21 are the derivation and
passed from the start, which is why they are mutation-tested below rather than counted as
red-first.

MUTATION M1 — stop folding suppression history in (`status: e.status` instead of
`effectiveStatus(...)`), which is the RC-107 blind spot put back: **4 fired**, including all
three soft-deleted cases and the normalisation case.

MUTATION M3 — give an opt-out the Edit action: **1 fired**, "an opt-out offers NO action".

MUTATION M2 SURVIVED, and is recorded rather than quietly dropped. Removing the
`if (m.emails.length === 0) return undefined;` guard changed nothing: a member with no
addresses produces an empty `read`, so no usable address is found, no suppressed one either,
and the function returns undefined by the ordinary route. The guard is therefore REDUNDANT
against the current body. It is kept as an explicit statement of intent — "No email" and
"Email issues" are different sections answering different questions — and the behaviour it
describes is pinned by two tests that pass by that other route. A surviving mutant is
information about the spec, not a thing to hide.

MEASURED THIS RUN, clean tree vs changed tree:
  - `npx tsx --test src/data/emailIssues.test.ts`: **23/23 PASS**
  - email-status family (emailIssues, bouncedReentry, memberEmailStatus, memberEmailJourney):
    **79/79 PASS**
  - course / roster / attendance specs: 82/84 — the 2 failures are `rosterFilter.test.ts`,
    both in the pre-existing eight
  - `npx tsc --noEmit -p tsconfig.json`: **0 errors**
  - `npm run test:unit`: **1921 pass / 8 fail** against a clean-tree baseline of 1842 / 8 —
    the SAME EIGHT, name for name. +79 tests, +0 failures.
  - `npm run audit:all`: the same 3 pre-existing RULE COVERAGE violations
  - `npm run check:icons`: 75/75. The two new glyph names (`expand_less` / `expand_more`) are
    already this app's expand/collapse idiom in four other screens and resolve through the
    alias table; verified against the MaterialIcons glyphmap directly.
  - `git diff supabase/`: **EMPTY**. No migration, no DB spec, `update_member` untouched, and
    nothing about suppression, unsubscribe or sending was changed.

WHAT IS STILL NOT PROVEN, for the third day running: no spec here renders a screen, so "the
section appears below No email and its rows read correctly" is asserted by reading
`app/course/[id].tsx` for the order, the testIDs and the absence of any send or reinstate
control. preview-smoke-verifier remains unreachable — the network policy rejects the Vercel
preview host. This is named in RC-107's process check and has not changed.

---

## Gate run - 2026-09-24 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 25.9s total - slowest G7 Unit + pure specs (16.6s).
Application steps ran in .

> **This run was avoidable.** The tree is byte-identical to the previous gate run, so this verdict was already known. The gate verifies a TREE, not a change: corrections landing in one commit share one verification, and only the last run describes what ships. Corrections in SEPARATE commits each need their own, so every commit is independently bisectable.

- **G1 Theme artifacts in sync** - FAIL (50ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (55ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (49ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (82ms)
- **G5 Types** - PASS (5.5s)
- **G6 Lint** - FAIL (3.0s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - FAIL (16.6s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (122ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (55ms)
- **G10 Backward compatibility (fixtures)** - PASS (108ms)
- **G11 Wide tables are configurable** - PASS (59ms)
- **G12 Installable as an application** - PASS (71ms)
- **G13 Approved design still being built** - PASS (50ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-24 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 26.2s total - slowest G7 Unit + pure specs (16.7s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (51ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (51ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (51ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (70ms)
- **G5 Types** - PASS (5.7s)
- **G6 Lint** - FAIL (3.0s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - FAIL (16.7s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (163ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (56ms)
- **G10 Backward compatibility (fixtures)** - PASS (115ms)
- **G11 Wide tables are configurable** - PASS (63ms)
- **G12 Installable as an application** - PASS (87ms)
- **G13 Approved design still being built** - PASS (59ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## RC-107 — A SUPPRESSION ERASED BY REMOVE-THEN-RE-ADD, 24-Sep-2026

Found by the academy using the app, one day after RC-106 shipped: a member's opted-out address
was removed by a save and typed back in, and it was accepted. The 23-Sep re-entry check did not
stop it for three independent reasons, all of which are now closed or explained.

MEASURED ON PRODUCTION before touching anything:
  - the member held three rows: the original address `unsubscribed` (soft-deleted 22-Sep
    16:32:59), a second address (soft-deleted 23-Sep 12:04:45), and the ORIGINAL address again
    as a fresh live primary row at `unknown`, created at that same moment;
  - blast radius, by joining soft-deleted suppressed rows to live rows for the same address:
    **1 member, and it was an opt-out.** No bounced address had been re-added this way;
  - 1,249 address rows in total, of which **4** are soft-deleted — so widening the read to
    include them costs nothing.

THE DATA WAS REPAIRED FIRST, with the requester's go-ahead and the SQL shown before running:
one UPDATE setting that row back to `unsubscribed`, recorded by `member_emails`' own audit
trigger (0006). Verified after: the row reads `unsubscribed`, live unsubscribed went 6 → 7,
live bounced unchanged at 6, and the detached-suppression join now returns **0**.

FAIL-FIRST, by injection, reverted and re-verified:

FAIL-FIRST: src/data/bouncedReentry.test.ts - "not ok 21 - RC-107 · the member read must keep
reading soft-deleted rows" - restored `.is('deleted_at', null)` to the member addresses query,
which is the defect itself put back. 1 of 22 fired. That rung exists because there is NO TYPE
ERROR for this regression: `suppressedBefore` would simply go empty and every check over it
would quietly start passing.

MEASURED THIS RUN, clean tree vs changed tree:
  - `npx tsx --test src/data/bouncedReentry.test.ts`: **23/23 PASS**
  - `npx tsc --noEmit -p tsconfig.json`: **0 errors**
  - `npm run test:unit`: **1898 pass / 8 fail** against a clean-tree baseline of 1842 / 8 —
    the SAME EIGHT, name for name. One of mine failed mid-run (`memberEmailStatus.test.ts`
    still pinned the old symbol name after the rename) and was fixed, not excused.
  - `npm run gate`: **FAIL — 7 pass / 6 fail**, step for step identical to the clean-tree
    baseline. G1/G2/G3 want a missing `design/tokens.json`, G6 one pre-existing lint warning,
    G7 the eight above, G8 because `test:functional` is not a script in package.json.
  - `git diff supabase/`: **EMPTY**. No migration, no DB spec, `update_member` untouched.

WHAT IS STILL NOT PROVEN, and it is now twice in two days: no spec in this repository renders a
screen or drives the real repository against a database. "The form refuses what the database
would accept" is asserted by reading source. Both RC-106 and RC-107 were found by the academy
using the app, not by this suite. The standing answer — `preview-smoke-verifier`, the only
stage that opens the running application — has not been reachable from any session in this
run: the environment's network policy rejects the Vercel preview host, the same way it rejects
the Supabase host. That gap is named in RC-107's process check.

---

## Gate run - 2026-09-24 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 28.3s total - slowest G7 Unit + pure specs (16.4s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (55ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (52ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (49ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (63ms)
- **G5 Types** - PASS (6.1s)
- **G6 Lint** - FAIL (5.1s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (123ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (54ms)
- **G10 Backward compatibility (fixtures)** - PASS (107ms)
- **G11 Wide tables are configurable** - PASS (53ms)
- **G12 Installable as an application** - PASS (69ms)
- **G13 Approved design still being built** - PASS (48ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## A BOUNCED ADDRESS ASKS FOR A DIFFERENT ONE — 23-Sep-2026

Track B over RC-106. The academy asked for the opposite answer to the one shipped the day
before, and it is the better one: an address the mail system has already rejected is not
repaired by marking it un-rejected, so the form now REFUSES the re-entry and asks for a
different address. The Reinstate action is withdrawn;
`requests/2026-09-23-bounced-address-asks-for-a-different-one.md` records the reversal.

FAIL-FIRST, by injection, both reverted and re-verified green afterwards:

FAIL-FIRST: src/data/bouncedReentry.test.ts - "not ok 3 - it is matched the way the DATABASE
matches it, not the way a form might" - replaced `normalizeEmail(e.address) === want` with a
raw `e.address === draft`, which is the form and the database disagreeing about what "the same
address" means for a trailing space or a capital letter. 1 of 19 fired, and it is the one that
names the rule.

FAIL-FIRST: src/data/bouncedReentry.test.ts - "not ok 12 - Save is blocked while the box holds
a bounced address" - removed `&& !bouncedDraft` from the form's `valid` expression. 1 of 19
fired. That is the assertion standing between this change and the original RC-106 defect: a
form that accepts the address and then shows nothing new.

MEASURED THIS RUN, clean tree vs changed tree:
  - targeted (bouncedReentry, memberEmailStatus, memberEmailJourney): **52/52 PASS**
  - `npx tsc --noEmit -p tsconfig.json`: **0 errors**
  - `npm run test:unit`: **1894 pass / 8 fail** against a clean-tree baseline of 1842 / 8 —
    the SAME EIGHT, name for name. +52 tests, +0 failures.
  - `npm run audit:all`: the same 3 pre-existing RULE COVERAGE violations (RC-073, RC-047,
    RC-048), verified earlier as byte-identical with this branch's register entries stashed.
  - `git diff supabase/`: **EMPTY**. No migration, no DB spec, and `update_member` untouched —
    this change is entirely client-side, as the request required.
  - `supabase/tests/57_reinstate_member_email.sql` on a from-scratch replay: **16/16 PASS**.
    The RPC is unchanged and still live on production; it is simply no longer called.

WHAT IS PROVEN, AND WHAT IS NOT. The rule, the wording and the form's wiring are pinned —
`bouncedReentry.test.ts` reads `app/member/edit.tsx` for the branch it takes, the inline block
it renders and the absence of any Reinstate control, the way this project's other specs do.
Nothing here RENDERS the form: there is no component harness in this repository, so "the ⓘ
block appears under the field" is asserted structurally, not visually. Opening the running app
remains the only proof of that, and the Vercel preview on PR #37 is where it would be done.

---

## Gate run - 2026-09-24 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 29.5s total - slowest G7 Unit + pure specs (16.4s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (53ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (53ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (56ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (79ms)
- **G5 Types** - PASS (6.0s)
- **G6 Lint** - FAIL (6.4s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (125ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (55ms)
- **G10 Backward compatibility (fixtures)** - PASS (114ms)
- **G11 Wide tables are configurable** - PASS (56ms)
- **G12 Installable as an application** - PASS (71ms)
- **G13 Approved design still being built** - PASS (52ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-23 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 37.1s total - slowest G7 Unit + pure specs (20.4s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (61ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (63ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (64ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (92ms)
- **G5 Types** - PASS (8.3s)
- **G6 Lint** - FAIL (7.4s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - FAIL (20.4s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (152ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (73ms)
- **G10 Backward compatibility (fixtures)** - PASS (143ms)
- **G11 Wide tables are configurable** - PASS (77ms)
- **G12 Installable as an application** - PASS (97ms)
- **G13 Approved design still being built** - PASS (63ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## FAIL-FIRST — import decisions, 22-Sep-2026

FAIL-FIRST: src/data/importDecisions.test.ts - run against the module carrying the pre-fix `autoDecisions` copied verbatim from app/upload.tsx: 11/18 failing — the three decision cases ("two namesakes already on the register: the upload does not create a third" et al.: `add_as_new` !== `skip`), the held-names and wording cases (empty placeholders), and the three wiring cases (screen still held its private copy, no `upload-ambiguous` note, `c.ambiguous` still counted). After the fix: 18/18.

---

## PRODUCTION APPLY — 0078, 22-Sep-2026 19:57 UTC

The Supabase connector was completed mid-session, so the migration this repository had prepared
was applied and verified against the live project rather than left at the boundary. Everything
below was observed against `lhpzhkzbnquwjljmbylo` ("Rosifit", ap-southeast-1, Postgres
17.6.1.166, ACTIVE_HEALTHY). No member's email address is reproduced here: production PII does
not belong in a repository, and an earlier draft of this entry was refused for exactly that.

APPLIED: `apply_migration` returned success. Ledger row **`20260922195737` /
`reinstate_member_email`**, recorded by the tool itself — a timestamp version, not the literal
`0078`, which is what SETUP.md requires. `supabase db push` was NOT used (SETUP.md:75: the local
ledger has no overlap with the remote one, so a push would replay from `0001`).

VERIFIED AFTER APPLYING, by querying production rather than trusting the success flag:
  function exists = 1 · `anon` execute = **false** · `authenticated` execute = **true** ·
  SECURITY DEFINER = true · deployed body refuses 'unsubscribed' = true · refuses 'complained'
  = true · clears only `<> 'bounced'` = true · writes the audit row = true ·
  **`update_member` still present and still 9958 bytes — unchanged by this apply.**

LIVE GATE TEST, without touching a member's record. The function was called on production
through a `pg_temp` probe with (a) a uuid matching no row and (b) a real suppressed row id.
Both returned verbatim:

    REFUSED: only a signed-in, active user can reinstate an address [42501]

The connector is not a signed-in app user, so the auth gate fires before the status checks —
which is why probing a real row was safe. Re-read afterwards: that row's status is unchanged,
the counts are unchanged, and `audit_logs` holds **0** `member_email.reinstated` rows. The
status refusals themselves remain proven by EXECUTION in 57_reinstate_member_email.sql (16/16),
against a body identical to the deployed one.

### THE OUTSTANDING READ IS DONE, and it confirms the diagnosis

`update_member`'s live body was read. Its `exists` branch is
`set is_primary = v_first, updated_at = now()` — `status` is not in that SET. Piece 3 of RC-106
is confirmed against production rather than derived from source; T-400's caveat on it is
discharged. The body is still divergent from the repo (9,958 live vs 11,213 replayed), which is
untouched here and remains T-120/T-400's.

### A CORRECTION TO THE DIAGNOSIS, about the reported member specifically

The defect is real and confirmed. **The reported member's own case was not the one diagnosed.**
Production holds two rows for her: the original address, `unsubscribed`, soft-deleted
2026-09-22 16:32:59 UTC; and a second, different address, `unknown`, primary and live, created
at that same moment. She was given a DIFFERENT address, not the same one retyped — so it fell
outside `v_wanted`, the opt-out was soft-deleted and the new address inserted cleanly. That
save WORKED, about an hour before the question was asked. The screenshot was the state before
it: one unsubscribed address, filtered out by `repository.ts:302`, drawn as "No usable email".
Pieces 1 and 2 exactly; piece 3 was never reached for her.

MEASURED IMPACT, rather than inferred: 1,223 `unknown`, 9 `valid`, 6 `unsubscribed`,
6 `bounced`, 0 `complained`. **Twelve live members** read as having no address at all. Six
become fixable from Edit once the app deploys; six correctly do not, and the app will now name
which is which.

NOT DONE: the app itself is not deployed. The migration is live; the client that uses it is on
`claude/relaxed-ride-0g6u4p` and unmerged. Until it ships, the twelve still read as "No usable
email" and no Reinstate button exists — the function has no caller yet.

---

## Gate run - 2026-09-22 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 26.3s total - slowest G7 Unit + pure specs (16.4s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (53ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (51ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (51ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (75ms)
- **G5 Types** - PASS (5.7s)
- **G6 Lint** - FAIL (3.5s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (136ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (57ms)
- **G10 Backward compatibility (fixtures)** - PASS (128ms)
- **G11 Wide tables are configurable** - PASS (59ms)
- **G12 Installable as an application** - PASS (78ms)
- **G13 Approved design still being built** - PASS (59ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## COMPLETION RUN — RC-106 taken through to the DB/apply boundary, 22-Sep-2026

A second pass over the shipped fix (commit `4557595`): review the migration, correct the one
policy it got wrong, re-verify, and take it as far towards production as this environment
allows. What follows is only what was actually observed in this run.

### The correction: `complained` is no longer reinstatable

The shipped `0078` allowed `complained -> unknown`. That was a policy INVENTED BY THE BUG FIX
and nothing in the product had asked for it — before this change `send-followups` had no
complaint rule at all (`index.ts:233-234` refuses only bounced and unsubscribed), so a
complained address was simply **sendable**. The line now drawn is whose act the suppression
was: a BOUNCE is the mail system reporting a dead address (the academy's to correct), while a
COMPLAINT and an OPT-OUT are both the member's own click (not the academy's to undo).

`complained` stays SUPPRESSED — that half is the conservative fix and is unchanged. Only the
lifting was withdrawn. Narrowed in `0078`, `emailStatus.ts` (`suppressionLiftable`), and the
two specs written alongside them.

MUTATION-TESTED IN BOTH DIRECTIONS, because a narrowing that cannot be observed failing is not
a rule:
  - restore `|| status === 'complained'` to `suppressionLiftable` → **4 assertions fire**
    across both JS specs;
  - let `emailUsable` accept `'bounced'` (the original defect, re-injected) → **5 fire**,
    including `THE ORIGINAL BUG: the whole reported journey, step by step`.
  Both reverted and re-verified green afterwards.

FAIL-FIRST: src/data/memberEmailJourney.test.ts - "# fail 5" of 9, incl. "THE ORIGINAL BUG: the whole reported journey, step by step" - injected `|| e.status === 'bounced'` into `emailUsable` (the original defect, put back). The other four that fired were
"B - a BOUNCED address stays visible, is not sendable, and offers Reinstate", "B - after an
explicit Reinstate, the same member becomes reachable", "the four states are distinguishable
from one another, in both directions", "an unrelated save can never be what un-suppresses an
address", and "THE ORIGINAL BUG: the whole reported journey, step by step". Injection reverted
and the file re-run green (9/9). A second injection - restoring `|| status === 'complained'`
to `suppressionLiftable` - fired 2 more of its cases ("C(ii)" and the four-states table), and
2 in memberEmailStatus.test.ts, for 4 across both specs.

FAIL-FIRST: supabase/tests/57_reinstate_member_email.sql - "ERROR: FAIL a spam complaint is REFUSED, in its own words -- it is the member's click, not the academy's mistake -- statement was ACCEPTED and should not have been" - the pre-narrowing function injected back into 0078 (complaint refusal removed, guard widened to `not in ('bounced','complained')`) and the harness replayed from scratch.

HOW THAT EVIDENCE CAME TO BE TAKEN, recorded because the process nearly failed here. The
migration was narrowed BEFORE the spec was rewritten, so that ordering produced no observed
failure at all - and the first draft of this summary CLAIMED one anyway ("run against the
pre-narrowing 0078 still in the tree"). It had not been. The injection above was then actually
performed to make the claim true. A fail-first line nobody watched fail is the exact thing
these lines exist to prevent, and writing one is worse than writing none.

Injection reverted, harness replayed again, 16/16 PASS. The
soft-delete case was moved onto its own bounced member in the same edit - hung on the
complained address it would now have passed for the WRONG REASON, and a test that cannot fail
for the reason it names is not a test.

### New: the journey spec

`src/data/memberEmailJourney.test.ts`, 9 cases. Walks ONE member through all four address
states and the single legal transition, then replays the reported journey step by step. It
drives `flagged` + `recipientSplit` — the send's own recipient split, not a copy of it
(CP-011) — so "the send recognises it" is asserted against the real decision, not a stand-in.

WHAT IT DOES NOT PROVE, stated rather than implied: it renders no screen and calls no
database. `src/data/repository.ts` cannot be imported under `node --test` at all (it reaches
react-native transitively, which esbuild will not transform), which is why no spec in this
project imports it. The RPC's own behaviour is proven separately against a real Postgres.

### Measured this run

| Check | Result |
|---|---|
| `supabase/tests/57_reinstate_member_email.sql` on a from-scratch replay | **16/16 PASS** |
| `db/harness/reset.sh` (every migration, 0078 included) | **exit 0** |
| `supabase/tests/47_unsubscribe_and_ses_feedback.sql` (opt-out protection) | **17/17 PASS**, incl. "a permanent bounce does not overwrite a member's own opt-out" |
| targeted JS (status, journey, grants, audit coverage, audit wording, unsubscribe token, followup) | **80/80 PASS** |
| `npx tsc --noEmit -p tsconfig.json` | **0 errors** |
| `npm run test:unit` | **1865 pass / 8 fail** vs clean-tree baseline **1842 / 8** — the same eight, name for name |
| `npm run gate` | **FAIL — 7 pass / 6 fail**, step for step IDENTICAL to the clean-tree baseline |

The six gate failures are all infrastructure and all pre-existing: G1/G2/G3 cannot find
`design/tokens.json`, G6 carries one pre-existing lint warning, G7 is the eight unit failures
above, and G8 fails because **`test:functional` is not a script in `package.json` at all**.
None was introduced here and none is this defect's.

### NOT DONE, and it is the honest headline

**The migration has NOT been applied to production.** Not deferred by choice — blocked by the
environment, verified three ways: no credentials anywhere (`env`, `~/.supabase`, `~/.netrc`,
no `.env`), `supabase projects list` → `LegacyPlatformAuthRequiredError`, and the agent proxy
rejecting the host outright: `connect_rejected  lhpzhkzbnquwjljmbylo.supabase.co:443`. The
production Supabase project was never contacted in this run, for reading or for writing.

Consequently **no production verification was performed**, and none is claimed. The apply
commands, the safety argument, the post-apply read-only checks and the standing
`update_member` body read are written up in `supabase/APPLY_0078.md` for whoever holds access.

The full `bash db/harness/test.sh` again did not complete — it replays every migration once
per spec file, ~45 times. The targeted replay above is what was observed.

---

## FAIL-FIRST — a suppressed address is invisible (RC-106), 22-Sep-2026

Spec: `src/data/memberEmailStatus.test.ts`, 22 cases. Run against the PRE-FIX tree first; the
whole file was watched failing before a line of the fix was written.

FAIL-FIRST: src/data/memberEmailStatus.test.ts — **17 of 20 failing** against the pre-fix tree.
`hasEmailOnFile` did not exist; a bounced, unsubscribed and complained address each answered
`isReachable` **true** (the read had already stripped them, so the predicate never saw one);
`repository.ts` still carried `if (e.status === 'bounced' || e.status === 'unsubscribed') continue;`;
the Edit form named no suppressed state and offered no reinstatement; the card still said
"No usable email"; and `supabase/migrations/0078_reinstate_member_email.sql` did not exist.
After the fix: **22/22 pass** (the file grew by two cases while the copy-lock moved to the
shared wording module).

NOT OBSERVED FAILING, and said rather than left silent — two of the twenty passed vacuously
pre-fix and are not evidence from that run:
  - "a member holding one dead address and one live one is still reachable" — passed because the
    pre-fix predicate tested only that an address was non-blank, which the live one satisfied.
    It is a real assertion post-fix (it stops `isReachable` being narrowed to the primary) and
    was mutation-tested: `emails.every` in place of `emails.some` → fails.
  - "the card copy is about the member, never gendered" — its anchor string did not exist
    pre-fix, so the slice it searched was meaningless. Re-pointed at `src/data/emailStatus.ts`,
    where the wording now lives, and mutation-tested: "she" in the state words → fails.

THREE RUNGS FIRED ON THIS CHANGE, each catching a real defect in it:
  - `src/data/migrationGrants.test.ts` — 0078 revoked from `public, anon` in one statement, which
    the guard does not accept: Supabase grants EXECUTE to `anon` DIRECTLY on every new public
    function, so `anon` needs naming in its own `revoke` (0012 exists for this; RC-042, RC-052).
  - `src/data/memberEmailStatus.test.ts`'s own "every address record the repository builds carries
    its status" — found **three** writers building one without it (both offline writers and the
    bulk-import writer). Absent reads as usable, so each was a silent un-suppression.
  - `src/data/auditActionCoverage.test.ts` — `member_email.reinstated` had no written wording, so
    it would have reached the academy owner as a prettified code.

BASELINES MEASURED, because nothing on this tree is green and a delta is worthless without
them. Every figure below was taken in this session, clean tree vs. changed tree:

  - `npm run test:unit`, clean tree: **1842 pass / 8 fail**. With this change:
    **1864 pass / 8 fail** — the SAME EIGHT, name for name (a `courses.tsx` filter spec,
    message tokens ×5, recipient options ×2). None is in a file this change touches.
  - `npm run gate`, clean tree: **7 pass / 6 fail / 0 blocked**. With this change: **identical**,
    step for step — G1/G2/G3 cannot find `design/tokens.json`, G6 Lint carries one pre-existing
    warning, G7 is the eight above, and G8 fails because `test:functional` is not a script in
    `package.json` at all. Six infrastructure gaps, none of them this defect's.
  - `db/harness/reset.sh`: every migration replays from scratch, **0078 included, exit 0**.
  - `supabase/tests/57_reinstate_member_email.sql` against that fresh replay: **15/15 PASS**,
    including the opt-out refusal and the audit row naming the actor.

  HONEST GAP: the FULL `bash db/harness/test.sh` did not complete in the time available on this
  machine — it replays every migration once per spec file, ~45 times. Four attempts stopped at
  different points (465, 547, 768 and 884 assertions). The clean-tree run that got furthest read
  **884 pass / 12 fail**; every failure seen in every changed-tree run was already in that list.
  The twelfth is `53_harness_body_matches_production.sql` failing on **`update_member`** —
  T-120's production drift pinned as a test, and the direct reason this change adds a function
  rather than restating that body. What is NOT claimed: a completed full-suite run on the
  changed tree. The targeted replay above is what was actually observed.

---

## Gate run - 2026-09-22 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 29.1s total - slowest G7 Unit + pure specs (16.2s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (70ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (49ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (50ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (68ms)
- **G5 Types** - PASS (6.2s)
- **G6 Lint** - FAIL (5.9s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - FAIL (16.2s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (126ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (59ms)
- **G10 Backward compatibility (fixtures)** - PASS (121ms)
- **G11 Wide tables are configurable** - PASS (56ms)
- **G12 Installable as an application** - PASS (74ms)
- **G13 Approved design still being built** - PASS (49ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-22 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 28.4s total - slowest G7 Unit + pure specs (17.7s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (54ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (53ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (50ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (75ms)
- **G5 Types** - PASS (6.3s)
- **G6 Lint** - FAIL (3.6s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - FAIL (17.7s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (128ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (59ms)
- **G10 Backward compatibility (fixtures)** - PASS (120ms)
- **G11 Wide tables are configurable** - PASS (61ms)
- **G12 Installable as an application** - PASS (79ms)
- **G13 Approved design still being built** - PASS (50ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## FAIL-FIRST — data freshness change, 22-Sep-2026

Observed in this session, in the order the specs were written. Mutation = the defect was injected
into the source, the spec run, the source restored.

FAIL-FIRST: src/data/asyncState.test.ts - run before the module existed: `Cannot find module './asyncState'`, 1/1 failing; later, the C-1 reducer case ("a retry keeps the error") was written against a reducer that cleared it
FAIL-FIRST: src/data/revalidate.test.ts - run before the module existed: `Cannot find module './revalidate'`, 1/1 failing; mutation: `busy` guard removed → "a read with a fetch already open is NOT restarted" fails
FAIL-FIRST: src/data/hookInvalidation.test.ts - first run: T13 useOfferingEditor failed (version passed inline, not as the 5th argument); mutations: onMembersChanged dropped from useBucketMetrics → T8 fails; version folded back into deps → "every pre-existing subscriber now revalidates" fails
FAIL-FIRST: src/data/dataRefreshWiring.test.ts - first run: "it never reloads the page" failed because the assertion matched the module's own prose; tightened to read code only
FAIL-FIRST: src/data/uploadServerConfirmed.test.ts - mutations: timer calls setPhase('done') → 2 fail; commit catch restored to "Nothing was written." → 1 fails; Attendance skeletons on revalidation → 1 fails; fixture guard removed from commit branch → 0 fails (escaped), spec strengthened, then → 1 fails; batch fixture guard removed → 1 fails; freshness tick frozen → 2 fail
FAIL-FIRST: src/data/freshness.test.ts - 2 copy-locks failed when the stale wording changed to "Last updated … · Couldn’t refresh" and were re-pointed (string literal only)
FAIL-FIRST: src/data/freshnessLineWiring.test.ts - its predecessor (staleBannerWiring.test.ts, deleted with the app-wide banner) caught 5/5 injected mutations: reads stop reporting, wrong condition reported, banner unmounted, retry ignores write-in-flight, banner always rendered. The per-screen successor was mutation-tested on: Attendance stops using the shared rule → 2 fail; the rule stops seeing ready+error → 1 fails
NOT OBSERVED FAILING: src/data/uploadSafety.test.ts - module and spec were written together and the first run passed; not mutation-tested
NOT OBSERVED FAILING: src/data/uploadProgress.test.ts - module and spec were written together and the first run passed; the "leave this screen open" copy-lock was re-pointed in the same edit as the copy

FAIL-FIRST: supabase/functions/send-followups/load.test.ts - 4 of 5 failed, "AssertionError: Values are not equal: a failed members read must throw" and "every member row must be loaded" (1001 expected, 1000 received), against readAll reverted to one unchunked request whose error is discarded; restored 5 passed 0 failed, Deno 2.9.7, 19-Sep-2026

## Gate run - 2026-09-19 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 32.6s total - slowest G7 Unit + pure specs (18.9s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (75ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\fb715c00-8d4a-469c-b0bb-76890c10c5c0\scratchpad\wt-C\design\tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (68ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\fb715c00-8d4a-469c-b0bb-76890c10c5c0\scratchpad\wt-C\design\tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (68ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\fb715c00-8d4a-469c-b0bb-76890c10c5c0\scratchpad\wt-C\design\tokens.json'
```

- **G4 No hard-coded colours** - PASS (90ms)
- **G5 Types** - PASS (7.7s)
- **G6 Lint** - FAIL (4.3s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - FAIL (18.9s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (587ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (125ms)
- **G10 Backward compatibility (fixtures)** - PASS (216ms)
- **G11 Wide tables are configurable** - PASS (127ms)
- **G12 Installable as an application** - PASS (179ms)
- **G13 Approved design still being built** - PASS (115ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-18 - VERDICT: FAIL

Steps: 6 pass, 4 fail, 3 blocked.
Time: 46m 13s total - slowest G5 Types (46m 09s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (72ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\fb715c00-8d4a-469c-b0bb-76890c10c5c0\scratchpad\wt-C\design\tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (71ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\fb715c00-8d4a-469c-b0bb-76890c10c5c0\scratchpad\wt-C\design\tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (69ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\fb715c00-8d4a-469c-b0bb-76890c10c5c0\scratchpad\wt-C\design\tokens.json'
```

- **G4 No hard-coded colours** - PASS (132ms)
- **G5 Types** - FAIL (46m 09s)

```
timed out after 15 minutes
```

- **G6 Lint** - BLOCKED (-) - prerequisite G5 did not pass
- **G7 Unit + pure specs** - BLOCKED (-) - prerequisite G5 did not pass
- **G8 Functional / integration** - BLOCKED (-) - prerequisite G5 did not pass
- **G9 Automation addressability** - PASS (888ms)
- **G10 Backward compatibility (fixtures)** - PASS (1.0s)
- **G11 Wide tables are configurable** - PASS (679ms)
- **G12 Installable as an application** - PASS (738ms)
- **G13 Approved design still being built** - PASS (191ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-22 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 27.8s total - slowest G7 Unit + pure specs (17.2s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (52ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (50ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (49ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (69ms)
- **G5 Types** - PASS (6.2s)
- **G6 Lint** - FAIL (3.6s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - FAIL (17.2s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (176ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (58ms)
- **G10 Backward compatibility (fixtures)** - PASS (120ms)
- **G11 Wide tables are configurable** - PASS (59ms)
- **G12 Installable as an application** - PASS (82ms)
- **G13 Approved design still being built** - PASS (61ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-22 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 22.2s total - slowest G7 Unit + pure specs (13.9s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (44ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (45ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (42ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (60ms)
- **G5 Types** - PASS (4.9s)
- **G6 Lint** - FAIL (2.8s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - FAIL (13.9s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (112ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (50ms)
- **G10 Backward compatibility (fixtures)** - PASS (100ms)
- **G11 Wide tables are configurable** - PASS (48ms)
- **G12 Installable as an application** - PASS (63ms)
- **G13 Approved design still being built** - PASS (43ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-22 - VERDICT: FAIL

Steps: 6 pass, 7 fail, 0 blocked.
Time: 22.8s total - slowest G7 Unit + pure specs (14.1s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (47ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (47ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (38ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - FAIL (56ms)

```
BLOCKED [HARDCODED COLOUR] - 1 new violation(s):
```

- **G5 Types** - PASS (5.4s)
- **G6 Lint** - FAIL (2.6s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - FAIL (14.1s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (121ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (48ms)
- **G10 Backward compatibility (fixtures)** - PASS (93ms)
- **G11 Wide tables are configurable** - PASS (48ms)
- **G12 Installable as an application** - PASS (63ms)
- **G13 Approved design still being built** - PASS (47ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-22 - VERDICT: FAIL

Steps: 6 pass, 7 fail, 0 blocked.
Time: 34.8s total - slowest G7 Unit + pure specs (14.3s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (94ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (51ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (63ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - FAIL (232ms)

```
BLOCKED [HARDCODED COLOUR] - 1 new violation(s):
```

- **G5 Types** - PASS (12.9s)
- **G6 Lint** - FAIL (6.8s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - FAIL (14.3s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (101ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (43ms)
- **G10 Backward compatibility (fixtures)** - PASS (85ms)
- **G11 Wide tables are configurable** - PASS (50ms)
- **G12 Installable as an application** - PASS (65ms)
- **G13 Approved design still being built** - PASS (40ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-19 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 22.3s total - slowest G7 Unit + pure specs (13.8s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (49ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (45ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (44ms)

```
Error: ENOENT: no such file or directory, open '/home/user/RosiFit/design/tokens.json'
```

- **G4 No hard-coded colours** - PASS (66ms)
- **G5 Types** - PASS (5.1s)
- **G6 Lint** - FAIL (2.7s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - FAIL (13.8s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (111ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (49ms)
- **G10 Backward compatibility (fixtures)** - PASS (106ms)
- **G11 Wide tables are configurable** - PASS (49ms)
- **G12 Installable as an application** - PASS (67ms)
- **G13 Approved design still being built** - PASS (47ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-18 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 22.2s total - slowest G7 Unit + pure specs (10.4s).
Application steps ran in .

> **This run was avoidable.** The tree is byte-identical to the previous gate run, so this verdict was already known. The gate verifies a TREE, not a change: corrections landing in one commit share one verification, and only the last run describes what ships. Corrections in SEPARATE commits each need their own, so every commit is independently bisectable.

- **G1 Theme artifacts in sync** - FAIL (65ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\fb715c00-8d4a-469c-b0bb-76890c10c5c0\scratchpad\wt-C\design\tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (66ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\fb715c00-8d4a-469c-b0bb-76890c10c5c0\scratchpad\wt-C\design\tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (66ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\fb715c00-8d4a-469c-b0bb-76890c10c5c0\scratchpad\wt-C\design\tokens.json'
```

- **G4 No hard-coded colours** - PASS (122ms)
- **G5 Types** - PASS (7.4s)
- **G6 Lint** - FAIL (3.3s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - FAIL (10.4s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (341ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (94ms)
- **G10 Backward compatibility (fixtures)** - PASS (127ms)
- **G11 Wide tables are configurable** - PASS (86ms)
- **G12 Installable as an application** - PASS (169ms)
- **G13 Approved design still being built** - PASS (89ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-18 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 25.1s total - slowest G7 Unit + pure specs (11.3s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (69ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\fb715c00-8d4a-469c-b0bb-76890c10c5c0\scratchpad\wt-C\design\tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (77ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\fb715c00-8d4a-469c-b0bb-76890c10c5c0\scratchpad\wt-C\design\tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (64ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\fb715c00-8d4a-469c-b0bb-76890c10c5c0\scratchpad\wt-C\design\tokens.json'
```

- **G4 No hard-coded colours** - PASS (124ms)
- **G5 Types** - PASS (8.3s)
- **G6 Lint** - FAIL (4.2s)

```
✖ 1 problem (0 errors, 1 warning)
  0 errors and 1 warning potentially fixable with the `--fix` option.
```

- **G7 Unit + pure specs** - FAIL (11.3s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (407ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (85ms)
- **G10 Backward compatibility (fixtures)** - PASS (119ms)
- **G11 Wide tables are configurable** - PASS (81ms)
- **G12 Installable as an application** - PASS (202ms)
- **G13 Approved design still being built** - PASS (67ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-18 - VERDICT: FAIL

Steps: 7 pass, 5 fail, 1 blocked.
Time: 30.7s total - slowest G7 Unit + pure specs (18.9s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (72ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\8e6f5436-1f5e-4f1b-a16c-bd0c1b94d0cf\scratchpad\wt-main\design\tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (65ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\8e6f5436-1f5e-4f1b-a16c-bd0c1b94d0cf\scratchpad\wt-main\design\tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (68ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\8e6f5436-1f5e-4f1b-a16c-bd0c1b94d0cf\scratchpad\wt-main\design\tokens.json'
```

- **G4 No hard-coded colours** - PASS (137ms)
- **G5 Types** - PASS (10.0s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" in . - not fetched from the registry on purpose. Run `npm install` in . (provides eslint), or state why this class is unverified.
- **G7 Unit + pure specs** - FAIL (18.9s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (514ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (125ms)
- **G10 Backward compatibility (fixtures)** - PASS (192ms)
- **G11 Wide tables are configurable** - PASS (140ms)
- **G12 Installable as an application** - PASS (319ms)
- **G13 Approved design still being built** - PASS (110ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-18 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 43.2s total - slowest G5 Types (23.6s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (93ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\fb715c00-8d4a-469c-b0bb-76890c10c5c0\scratchpad\wt-C\design\tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (96ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\fb715c00-8d4a-469c-b0bb-76890c10c5c0\scratchpad\wt-C\design\tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (86ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\fb715c00-8d4a-469c-b0bb-76890c10c5c0\scratchpad\wt-C\design\tokens.json'
```

- **G4 No hard-coded colours** - PASS (183ms)
- **G5 Types** - PASS (23.6s)
- **G6 Lint** - FAIL (1.5s)

```
  21:5  error  Parsing error: Unexpected token <
  12:62  error  Parsing error: Unexpected token StatusKey
  3:48  error  Parsing error: Unexpected token Href
  17:27  error  Parsing error: Unexpected token ReportRow
  13:68  error  Parsing error: Unexpected token Member
  3:26  error  Parsing error: Unexpected token Href
  13:35  error  Parsing error: Unexpected token PeriodChoice
  15:6  error  Parsing error: Unexpected token Filter
  12:71  error  Parsing error: Unexpected token !
  35:3  error  Parsing error: Unexpected token as
  7:37  error  Parsing error: Unexpected token ThemeMode
  15:30  error  Parsing error: Unexpected token PeriodChoice
  15:55  error  Parsing error: Unexpected token BranchUsage
  30:12  error  Parsing error: Unexpected token <
  13:62  error  Parsing error: Unexpected token StatusKey
```

- **G7 Unit + pure specs** - FAIL (16.8s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (341ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (98ms)
- **G10 Backward compatibility (fixtures)** - PASS (141ms)
- **G11 Wide tables are configurable** - PASS (92ms)
- **G12 Installable as an application** - PASS (177ms)
- **G13 Approved design still being built** - PASS (86ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-18 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 22.3s total - slowest G7 Unit + pure specs (12.4s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (67ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\fb715c00-8d4a-469c-b0bb-76890c10c5c0\scratchpad\wt-C\design\tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (63ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\fb715c00-8d4a-469c-b0bb-76890c10c5c0\scratchpad\wt-C\design\tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (61ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\fb715c00-8d4a-469c-b0bb-76890c10c5c0\scratchpad\wt-C\design\tokens.json'
```

- **G4 No hard-coded colours** - PASS (122ms)
- **G5 Types** - PASS (7.8s)
- **G6 Lint** - FAIL (843ms)

```
  21:5  error  Parsing error: Unexpected token <
  12:62  error  Parsing error: Unexpected token StatusKey
  3:48  error  Parsing error: Unexpected token Href
  17:27  error  Parsing error: Unexpected token ReportRow
  13:68  error  Parsing error: Unexpected token Member
  3:26  error  Parsing error: Unexpected token Href
  13:35  error  Parsing error: Unexpected token PeriodChoice
  15:6  error  Parsing error: Unexpected token Filter
  12:71  error  Parsing error: Unexpected token !
  35:3  error  Parsing error: Unexpected token as
  7:37  error  Parsing error: Unexpected token ThemeMode
  15:30  error  Parsing error: Unexpected token PeriodChoice
  15:55  error  Parsing error: Unexpected token BranchUsage
  30:12  error  Parsing error: Unexpected token <
  13:62  error  Parsing error: Unexpected token StatusKey
```

- **G7 Unit + pure specs** - FAIL (12.4s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (349ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (95ms)
- **G10 Backward compatibility (fixtures)** - PASS (142ms)
- **G11 Wide tables are configurable** - PASS (98ms)
- **G12 Installable as an application** - PASS (158ms)
- **G13 Approved design still being built** - PASS (77ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-18 - VERDICT: FAIL

Steps: 7 pass, 6 fail, 0 blocked.
Time: 38.4s total - slowest G7 Unit + pure specs (15.5s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (72ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\fb715c00-8d4a-469c-b0bb-76890c10c5c0\scratchpad\wt-C\design\tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (68ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\fb715c00-8d4a-469c-b0bb-76890c10c5c0\scratchpad\wt-C\design\tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (70ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\fb715c00-8d4a-469c-b0bb-76890c10c5c0\scratchpad\wt-C\design\tokens.json'
```

- **G4 No hard-coded colours** - PASS (175ms)
- **G5 Types** - PASS (13.5s)
- **G6 Lint** - FAIL (8.0s)

```
  21:5  error  Parsing error: Unexpected token <
  12:62  error  Parsing error: Unexpected token StatusKey
  3:48  error  Parsing error: Unexpected token Href
  17:27  error  Parsing error: Unexpected token ReportRow
  13:68  error  Parsing error: Unexpected token Member
  3:26  error  Parsing error: Unexpected token Href
  13:35  error  Parsing error: Unexpected token PeriodChoice
  15:6  error  Parsing error: Unexpected token Filter
  12:71  error  Parsing error: Unexpected token !
  35:3  error  Parsing error: Unexpected token as
  7:37  error  Parsing error: Unexpected token ThemeMode
  15:30  error  Parsing error: Unexpected token PeriodChoice
  15:55  error  Parsing error: Unexpected token BranchUsage
  30:12  error  Parsing error: Unexpected token <
  13:62  error  Parsing error: Unexpected token StatusKey
```

- **G7 Unit + pure specs** - FAIL (15.5s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (386ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (96ms)
- **G10 Backward compatibility (fixtures)** - PASS (146ms)
- **G11 Wide tables are configurable** - PASS (100ms)
- **G12 Installable as an application** - PASS (165ms)
- **G13 Approved design still being built** - PASS (78ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-18 - VERDICT: FAIL

Steps: 7 pass, 5 fail, 1 blocked.
Time: 1m 01s total - slowest G7 Unit + pure specs (28.8s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (224ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\8e6f5436-1f5e-4f1b-a16c-bd0c1b94d0cf\scratchpad\wt-main\design\tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (209ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\8e6f5436-1f5e-4f1b-a16c-bd0c1b94d0cf\scratchpad\wt-main\design\tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (270ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\8e6f5436-1f5e-4f1b-a16c-bd0c1b94d0cf\scratchpad\wt-main\design\tokens.json'
```

- **G4 No hard-coded colours** - PASS (455ms)
- **G5 Types** - PASS (27.9s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" in . - not fetched from the registry on purpose. Run `npm install` in . (provides eslint), or state why this class is unverified. - **143 consecutive runs**: a verdict that never changes is not a signal; make this class runnable or accept it in writing
- **G7 Unit + pure specs** - FAIL (28.8s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (1.2s)

```
exit 1
```

- **G9 Automation addressability** - PASS (261ms)
- **G10 Backward compatibility (fixtures)** - PASS (402ms)
- **G11 Wide tables are configurable** - PASS (241ms)
- **G12 Installable as an application** - PASS (306ms)
- **G13 Approved design still being built** - PASS (209ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-18 - VERDICT: FAIL

Steps: 7 pass, 5 fail, 1 blocked.
Time: 58.0s total - slowest G5 Types (27.7s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (219ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\8e6f5436-1f5e-4f1b-a16c-bd0c1b94d0cf\scratchpad\wt-main\design\tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (205ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\8e6f5436-1f5e-4f1b-a16c-bd0c1b94d0cf\scratchpad\wt-main\design\tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (201ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\8e6f5436-1f5e-4f1b-a16c-bd0c1b94d0cf\scratchpad\wt-main\design\tokens.json'
```

- **G4 No hard-coded colours** - PASS (319ms)
- **G5 Types** - PASS (27.7s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" in . - not fetched from the registry on purpose. Run `npm install` in . (provides eslint), or state why this class is unverified. - **142 consecutive runs**: a verdict that never changes is not a signal; make this class runnable or accept it in writing
- **G7 Unit + pure specs** - FAIL (26.6s)
Steps: 7 pass, 6 fail, 0 blocked.
Time: 1m 12s total - slowest G7 Unit + pure specs (34.1s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (220ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\fb715c00-8d4a-469c-b0bb-76890c10c5c0\scratchpad\wt-C\design\tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (264ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\fb715c00-8d4a-469c-b0bb-76890c10c5c0\scratchpad\wt-C\design\tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (306ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\fb715c00-8d4a-469c-b0bb-76890c10c5c0\scratchpad\wt-C\design\tokens.json'
```

- **G4 No hard-coded colours** - PASS (357ms)
- **G5 Types** - PASS (29.7s)
- **G6 Lint** - FAIL (3.9s)

```
  21:5  error  Parsing error: Unexpected token <
  12:62  error  Parsing error: Unexpected token StatusKey
  3:48  error  Parsing error: Unexpected token Href
  17:27  error  Parsing error: Unexpected token ReportRow
  13:68  error  Parsing error: Unexpected token Member
  3:26  error  Parsing error: Unexpected token Href
  13:35  error  Parsing error: Unexpected token PeriodChoice
  15:6  error  Parsing error: Unexpected token Filter
  12:71  error  Parsing error: Unexpected token !
  35:3  error  Parsing error: Unexpected token as
  7:37  error  Parsing error: Unexpected token ThemeMode
  15:30  error  Parsing error: Unexpected token PeriodChoice
  15:55  error  Parsing error: Unexpected token BranchUsage
  30:12  error  Parsing error: Unexpected token <
  13:62  error  Parsing error: Unexpected token StatusKey
```

- **G7 Unit + pure specs** - FAIL (34.1s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (1.2s)
- **G8 Functional / integration** - FAIL (1.5s)

```
exit 1
```

- **G9 Automation addressability** - PASS (256ms)
- **G10 Backward compatibility (fixtures)** - PASS (396ms)
- **G11 Wide tables are configurable** - PASS (250ms)
- **G12 Installable as an application** - PASS (325ms)
- **G13 Approved design still being built** - PASS (229ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-18 - VERDICT: FAIL

Steps: 7 pass, 5 fail, 1 blocked.
Time: 58.4s total - slowest G5 Types (27.3s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (227ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\8e6f5436-1f5e-4f1b-a16c-bd0c1b94d0cf\scratchpad\wt-main\design\tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (248ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\8e6f5436-1f5e-4f1b-a16c-bd0c1b94d0cf\scratchpad\wt-main\design\tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (237ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\8e6f5436-1f5e-4f1b-a16c-bd0c1b94d0cf\scratchpad\wt-main\design\tokens.json'
```

- **G4 No hard-coded colours** - PASS (323ms)
- **G5 Types** - PASS (27.3s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" in . - not fetched from the registry on purpose. Run `npm install` in . (provides eslint), or state why this class is unverified. - **141 consecutive runs**: a verdict that never changes is not a signal; make this class runnable or accept it in writing
- **G7 Unit + pure specs** - FAIL (27.0s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (1.4s)

```
exit 1
```

- **G9 Automation addressability** - PASS (300ms)
- **G10 Backward compatibility (fixtures)** - PASS (489ms)
- **G11 Wide tables are configurable** - PASS (281ms)
- **G12 Installable as an application** - PASS (336ms)
- **G13 Approved design still being built** - PASS (237ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-18 - VERDICT: FAIL

Steps: 7 pass, 5 fail, 1 blocked.
Time: 56.0s total - slowest G7 Unit + pure specs (27.9s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (205ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\8e6f5436-1f5e-4f1b-a16c-bd0c1b94d0cf\scratchpad\wt-main\design\tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (197ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\8e6f5436-1f5e-4f1b-a16c-bd0c1b94d0cf\scratchpad\wt-main\design\tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (202ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\AppData\Local\Temp\claude\C--Users-shazi-Downloads-RosiFit-Custom-App-RosiFit\8e6f5436-1f5e-4f1b-a16c-bd0c1b94d0cf\scratchpad\wt-main\design\tokens.json'
```

- **G4 No hard-coded colours** - PASS (306ms)
- **G5 Types** - PASS (24.0s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" in . - not fetched from the registry on purpose. Run `npm install` in . (provides eslint), or state why this class is unverified. - **140 consecutive runs**: a verdict that never changes is not a signal; make this class runnable or accept it in writing
- **G7 Unit + pure specs** - FAIL (27.9s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (1.6s)

```
exit 1
```

- **G9 Automation addressability** - PASS (261ms)
- **G10 Backward compatibility (fixtures)** - PASS (416ms)
- **G11 Wide tables are configurable** - PASS (246ms)
- **G12 Installable as an application** - PASS (360ms)
- **G13 Approved design still being built** - PASS (269ms)
- **G9 Automation addressability** - PASS (272ms)
- **G10 Backward compatibility (fixtures)** - PASS (414ms)
- **G11 Wide tables are configurable** - PASS (244ms)
- **G12 Installable as an application** - PASS (325ms)
- **G13 Approved design still being built** - PASS (253ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-16 - VERDICT: FAIL

Steps: 7 pass, 5 fail, 1 blocked.
Time: 22.2s total - slowest G7 Unit + pure specs (14.1s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (96ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (86ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (85ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G4 No hard-coded colours** - PASS (120ms)
- **G5 Types** - PASS (6.5s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" in . - not fetched from the registry on purpose. Run `npm install` in . (provides eslint), or state why this class is unverified. - **138 consecutive runs**: a verdict that never changes is not a signal; make this class runnable or accept it in writing
- **G7 Unit + pure specs** - FAIL (14.1s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (527ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (100ms)
- **G10 Backward compatibility (fixtures)** - PASS (162ms)
- **G11 Wide tables are configurable** - PASS (100ms)
- **G12 Installable as an application** - PASS (127ms)
- **G13 Approved design still being built** - PASS (110ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-17 - VERDICT: FAIL

Steps: 7 pass, 5 fail, 1 blocked.
Time: 18.7s total - slowest G7 Unit + pure specs (10.9s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (101ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (97ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (107ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G4 No hard-coded colours** - PASS (126ms)
- **G5 Types** - PASS (6.2s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" in . - not fetched from the registry on purpose. Run `npm install` in . (provides eslint), or state why this class is unverified. - **139 consecutive runs**: a verdict that never changes is not a signal; make this class runnable or accept it in writing
- **G7 Unit + pure specs** - FAIL (10.9s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (459ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (104ms)
- **G10 Backward compatibility (fixtures)** - PASS (168ms)
- **G11 Wide tables are configurable** - PASS (100ms)
- **G12 Installable as an application** - PASS (128ms)
- **G13 Approved design still being built** - PASS (95ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-12 - VERDICT: FAIL

Steps: 6 pass, 5 fail, 1 blocked.
Time: 18.7s total - slowest G7 Unit + pure specs (10.5s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (63ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (60ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (63ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G4 No hard-coded colours** - PASS (82ms)
- **G5 Types** - PASS (7.2s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" in . - not fetched from the registry on purpose. Run `npm install` in . (provides eslint), or state why this class is unverified. - **136 consecutive runs**: a verdict that never changes is not a signal; make this class runnable or accept it in writing
- **G7 Unit + pure specs** - FAIL (10.5s)

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

- **G8 Functional / integration** - FAIL (367ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (85ms)
- **G10 Backward compatibility (fixtures)** - PASS (135ms)
- **G11 Wide tables are configurable** - PASS (84ms)
- **G12 Installable as an application** - PASS (100ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---

## Gate run - 2026-09-16 - VERDICT: FAIL

Steps: 6 pass, 5 fail, 1 blocked.
Time: 19.4s total - slowest G7 Unit + pure specs (12.5s).
Application steps ran in .

- **G1 Theme artifacts in sync** - FAIL (86ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G2 Contrast (all tokens, both themes)** - FAIL (82ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G3 Theme assets present per theme** - FAIL (83ms)

```
Error: ENOENT: no such file or directory, open 'C:\Users\shazi\Downloads\RosiFit Custom App\RosiFit\design\tokens.json'
```

- **G4 No hard-coded colours** - PASS (110ms)
- **G5 Types** - PASS (5.8s)
- **G6 Lint** - BLOCKED (-) - no local "eslint" in . - not fetched from the registry on purpose. Run `npm install` in . (provides eslint), or state why this class is unverified. - **137 consecutive runs**: a verdict that never changes is not a signal; make this class runnable or accept it in writing
- **G7 Unit + pure specs** - FAIL (12.5s)

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
ok 181 - a form asked for a record answers a failed read
# Subtest: a record asked for and not found is said, not treated as Add
ok 182 - a record asked for and not found is said, not treated as Add
# Subtest: a failed save survives the collapse — it is drawn outside both branches
ok 195 - a failed save survives the collapse — it is drawn outside both branches
  error: `app/(tabs)/courses.tsx: a list screen's filter was flattened into a form's menu. The request scoped the filters out by saying "only inside forms and dialogs"`
```

- **G8 Functional / integration** - FAIL (332ms)

```
exit 1
```

- **G9 Automation addressability** - PASS (73ms)
- **G10 Backward compatibility (fixtures)** - PASS (114ms)
- **G11 Wide tables are configurable** - PASS (73ms)
- **G12 Installable as an application** - PASS (124ms)

_Merge blocked. Every FAIL above must resolve. No partial merges._

---
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
client diff — the verdict on main is recorded in RC-043's row). **Applied to production 12-Sep-2026 13:43 UTC on the owner's "go"** (ledger row
20260912134313): ACL read back with no anon entry, INVOKER, STABLE, one overload; the real
function answers Prenatal Tue 8 Sep `runs = true` and no other cell in any course's week moved. No run-log row:
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

FAIL-FIRST: src/data/requestSize.test.ts - 9 cases, new file, RC-045. Run 16-Sep-2026 against
the pre-fix tree (pageAll.ts and repository.ts as at HEAD 5e361de): 9 of 9 failed - two on the
missing MAX_IDS_PER_REQUEST constant, five on `inChunks is not a function`, and the two call-site
rungs naming `src/data/repository.ts` and the read labelled 'the names on this day'. 9 of 9 after
the fix. Full output, plus the live measurement the chunk size is argued from:
.evidence/request-size-fail-first.txt. Test 7 was corrected once before it had ever been green -
its fake counted one entry per build() call and pageAllByKey builds a fresh query per PAGE, so
requests and pages were the same number; it now counts distinct chunks. No assertion removed or
loosened. The RC-039 rungs it sits beside were re-run unchanged and pass: pageAll.test.ts and
pagedReads.test.ts - 28 of 28 (an earlier line here also named courseDay.test.ts, which does
not exist - tsx ignores a path that matches nothing, so it contributed no cases).

FULL SUITE, 16-Sep-2026: npm run test:unit - 1596 of 1603 pass, 7 fail. The 7 are NOT from this
change and were failing before it: "the list-screen filters are untouched"
(src/components/formDropdownMenu.test.ts), "the row is a live picker on the Edit form, and it is
labelled Active from" (src/data/memberJoinedOn.test.ts), and five token-list cases
(src/data/message.test.ts). They belong to a CONCURRENT session's uncommitted work in this shared
worktree - app/course/[id].tsx, src/data/inactiveFrom.*, supabase/migrations/0072 - whose own
request file is requests/2026-09-16-inactive-at-the-bottom-and-active-from.md. Their failure
messages quote the member Edit form's DateField and the message token map; this change touches
only src/data/pageAll.ts and four read helpers in src/data/repository.ts, neither of which any of
the three specs reads for the failing assertions. typecheck clean. check:contrast 2852/2852.
check:icons 75/75.

NOT RUN: npm run gate, and no browser walk. The fix is in the data layer and the app's live data
needs a signed-in session (mobile + PIN through the auth-login Edge Function) that this session
did not have - so the defect and the fix are evidenced by the live request-size measurement in
.evidence/request-size-fail-first.txt rather than by driving the UI. DB harness - N/A: no
migration, no schema surface.
## T-043 · 0079 RLS helpers once per statement · 24-Sep-2026 · RC-053
FAIL-FIRST: supabase/tests/58_rls_rules_by_role.sql - "no policy calls a helper bare" failed
naming all 62 policies on a harness replayed WITHOUT 0079 (psql run WITHOUT ON_ERROR_STOP so
the rest of the file still ran); passes at 0 with it.
UNCHANGED RULES: the file's other 26 behavioural assertions (per-role visibility of every
seeded table incl. admin-or-self / admin-only / delete shapes; UPDATE, INSERT WITH CHECK and
DELETE per role; app_users self-update; audit_remarks author check; suspended subscription)
passed 26/26 on the pre-0079 tree and 26/26 after it. After 0079 the whole file is 28/28
under test.sh (ON_ERROR_STOP): +1 catalogue, +1 policy count = 62.
EQUIVALENCE, now executable: 0079's $verify$ un-wraps every "( SELECT f() AS f)" and compares
with a pre-image taken in the same run; it raises on any difference. Observed firing on two
injected defects, then restored: is_active_app_user -> is_super_admin in courses_read
("not equivalent ... courses.courses_read"), and the 'previewed' literal dropped from
csv_imports_insert ("... csv_imports.csv_imports_insert").
DB HARNESS: bash db/harness/test.sh - THERE ARE FAILURES, the SAME set before and after
(pre-existing, Gate 2): diff of per-file FAIL/ERROR lines is empty; the only new file, 58,
has no FAIL or ERROR. PASS count 901 -> 929 (+28 = file 58). Postgres 16 harness vs 17.6
production is T-124, open.
PARITY: production pg_policies fingerprint = harness fingerprint (62, md5 4d21e86e...), read
24-Sep-2026; 0079 refuses to run against any other.
NOT RUN: npm run check / gate - no src/ or app/ change on this branch.

## T-405 · shared identity read · 25-Sep-2026 · RC-076
FAIL-FIRST (behaviour): cold start of the production bundle against a local HTTP/2 stand-in, unmodified main,
3 runs: 10 app_users reads, strictly serial (each starts ~4 ms after the previous ends), 1,828-1,836 ms first
request -> last response. After: 2 parallel reads, 706-723 ms. Same with an expired token: 11 -> 2 reads,
2,241-2,245 -> 916-947 ms.
FAIL-FIRST: src/data/sharedRead.test.ts - "Cannot find module './sharedRead'" (new module); 9/9 after.
The race case ("a read that settles AFTER a newer one began cannot clear the newer one") was mutation-checked:
removing the current===entry guard makes it fail; restored.
UNIT: 1981 tests, 6 fail - the SAME 6 as clean main. check: lint, typecheck, contrast, icons, functions, edge PASS.
GATE: FAIL on the same pre-existing set as main (G1-G3 T-034, G6 scripts/conformance.mjs warning, G7, G8).
REVIEW: code-reviewer APPROVE; its findings applied (race + clock tests, unused force option removed, cast removed).
NOT RUN: a production cold start. Ships on merge; verify in edge_logs.

## T-406 · shared reads at the client's fetch · 25-Sep-2026 · RC-077
FAIL-FIRST: src/lib/sharedFetch.test.ts - "Cannot find module './sharedFetch'" (new module); 17/17 after.
Each fix mutation-checked (removing it fails exactly its test): settle-time clear on write; in-flight joins
bounded by age; body-failure drop (entryCount 0); sweep of expired entries; sign-out clear.
BEHAVIOUR (production bundle vs local HTTP/2 stand-in, 200 ms replies, 3 runs): cold start 34 -> 26 requests,
1,828-1,835 -> 692-713 ms first request -> last response; cold start + 3 tab switches 54 -> 31 requests, every
remaining request distinct. Window measured at 2 / 5 / 12 s: 45 / 31 / 31 requests; 5 s shipped.
UNIT: 1989 tests, 6 fail - the SAME 6 as clean main. check: lint, typecheck, contrast, icons, functions, edge PASS.
GATE: FAIL on the same pre-existing set as main (G1-G3 T-034, G6 scripts/conformance.mjs warning, G7, G8).
REVIEW: code-reviewer twice. Round 1 REQUEST CHANGES (hung-request join, body-failure entry, false freshness claim,
unbounded map, vacuous test) - all fixed. Round 2 REQUEST CHANGES (evidence cited but not in tree, weak
body-failure assertion, 12 s-only tests, two overstated comments) - all fixed in this commit.
NOT RUN: production. Ships on merge; verify requests per URL per session-minute in edge_logs.

## T-408 · csv-import pinned beside the database · 24-Sep-2026
FAIL-FIRST: src/data/functionRegion.test.ts - "csv-import is sent to ap-southeast-1, next to the database"
failed against the neutral functionTarget (actual forceFunctionRegion: null, expected 'ap-southeast-1');
the other 3 cases passed. After the change: 4/4.
UNIT: 1976 tests, 6 fail - the SAME 6 fail on clean main (list-screen filters x1, token list x5 - Gate 2
rows T-022/T-023/T-025); this branch adds 4 passing tests and no failure.
typecheck PASS · lint PASS · check:contrast/icons/functions/edge PASS.
GATE: FAIL - G1/G2/G3 (T-034), G6 (warning in scripts/conformance.mjs, untouched), G7 (the 6 above), G8 -
the same set as the previous gate run on main; nothing new.
NOT RUN: a live call. The network proxy blocks *.supabase.co from this session, and no import can be driven
without a signed-in session. Runtime region is unverified until real imports run after deploy.


## T-407 · JavaScript per screen · 25-Sep-2026 · RC-078
FAIL-FIRST: src/components/iconImports.test.ts - "no screen imports the @expo/vector-icons barrel" failed on
main (Icon.tsx imported the barrel); 2/2 after. src/pwa/deployment.test.ts - the T-407 route-chunk case failed
on main's containment rule (Home's chunk read as a new build); passes after. src/pwa/chunkRecovery.test.ts -
the wiring cases failed before the boundary existed; 10/10 after. The in-flight wait, the 60 s window and the
read-back on the note were each mutation-checked: removing one fails exactly its test.
BROWSER (production build, Members chunk deleted, 404): before - a blank page, 0 reloads. After - 1 reload,
then "This screen could not be loaded. Check the connection and try again." on theme.bg, dark and light.
BEHAVIOUR: compressed JS per screen 702 -> 467 KB (Home, Attendance, Members); brotli 544 -> 370 KB.
Lighthouse mobile LCP Home 5.07 -> 3.95 s, Members 7.30 -> 5.80 s. Owner targets (< 250 KB, LCP < 2.5 s)
NOT met - the shared entry is ~281 KB gzip on its own (RUN_app-feels-slow.md, Fix 4).
UNIT: 1987 tests, 6 fail - the SAME 6 as clean main. typecheck PASS · lint PASS.
GATE: FAIL on the same pre-existing set as main (G1-G3 T-034, G6 scripts/conformance.mjs warning, G7 the 6
above, G8).
REVIEW: code-reviewer twice. Round 1 REQUEST CHANGES (no boundary for chunk failures, loop-guard stamp mismatch,
docs/pinning, weak icon test) - fixed. Round 2 REQUEST CHANGES (reload ignored in-flight writes, once-per-tab
flag never cleared, storage-failure loop, boundary unthemed, "Nothing was changed" promise, classifier breadth,
sw cache not bumped, weak stamp test, perf-script docs and fallback size) - all fixed in this commit.
NOT RUN: production. Ships on merge; the first deployment after it is the real chunk-miss test.
