# RosiFit — Performance & Correctness Fix: final report and deployment preparation (06-Oct-2026)

Branch `claude/loving-euler-8nz5a8`, head after this report's commit. Continues
`docs/PERFORMANCE_FIX_REPORT_2026-10-06.md` (the 14-phase closing report, commit
`c815320`) and resolves the five items it left open (§5 there). Every figure in this
document is labelled **Local/harness**, **CI** or **Production**. Nothing was deployed,
no migration was applied, no production data or setting was touched, the Supabase region
was not changed. Production was read **read-only** only to verify anchors and bodies.

**Status in one line: the branch is READY FOR CONTROLLED PRODUCTION DEPLOYMENT, staged as
in §6, pending three owner decisions listed in §8 (none of which blocks Stage A).**

---

## 1. Completed

| Step | Outcome | Evidence |
|---|---|---|
| 1. Current state | 0085–0088 present on the branch, unapplied; phases 1–13 intact. Three gaps carried from the closing report: the pager's empty page, the roster, the whole-offering recompute. | `git log c815320..HEAD`, §4 of the closing report |
| 2. Pagination | **FIXED, provably safe.** `pageAllByKey` (client and Edge) ends a read on a page shorter than a longer page of the same read. Within one read every non-final page has exactly min(asked, cap) rows, so a shorter page cannot be a capped page; a lowered cap mid-session cannot break it because the comparison is within one read. The live cap is still unreadable from SQL (T-006) and is not needed. A single short page (first page short, or an exact multiple) still asks once more: nothing inside the read distinguishes those. | `src/data/pageAllShortPage.test.ts` 16/16 (fail-first 16 red); six expected counts re-pointed on the brief's instruction, each with the reason beside it; CP-020 amended; commit `a48b750` |
| 3. Course roster | **FIXED.** The ScrollView is a FlatList: the old content is its header unchanged, the cards are its items section by section. Selection, search, filters, course picker, day strip, navigation, accessibility labels, responsive layout untouched (same `MemberCard`, same props). | `src/components/rosterWindowed.test.ts` 4/4 (fail-first 4 red); scenario B measurements in §4; commit `0e65df1` |
| 4. CSV recomputation at 5,000 | **ROOT CAUSE FOUND; COST HALVED; the rest is a redesign, reported.** Every member of an offering gets a `member_stats` row on a whole-offering commit because the absentee sweep inserts an absent row for every expected member, so every member's sessions/absences/streak/last-seen genuinely change; 0085's per-member scope is exact. Narrowing further means maintaining streaks incrementally on every attendance write — a redesign of `member_stats`, **not done** (§2). What is done: 0089 computes the whole scoped set in one pass (one window for the streak, one grouped scan for the aggregates) instead of a correlated `current_streak_for` walk per member; row-for-row identical to 0008's body. | `supabase/tests/66` 18/18 against a reference built from 0008's own body (fail-first red); timings in §4; commit `0e65df1` |
| 5. Date/time audit | **DONE; class B fixed in both tiers.** Full grep of `app/`, `src/`, `supabase/functions/`, `supabase/migrations/`; every read classified (§5). Client: period defaults, the week's rows, the calendar's today, the sample message's day, the period's instant bounds. Server: 0090 moves the last five `current_date` readers onto `business_today()`. | `src/data/businessPeriod.test.ts` 6/6 around Sunday 18:30 UTC = Monday 00:00 IST and the month turn (fail-first 6 red); `supabase/tests/67` 11/11 (fail-first red); commit `25f7be4` |
| 6. Send concurrency | **REVIEWED; default kept at 4.** See §1.1. | `supabase/functions/send-followups/send-loop.ts`, 0009 |
| 7. Full pipeline | **RUN on the committed tree.** §3. | scratchpad logs `final-*.log`, `testdb-s7b.log` |
| 8. Migration order | **VALIDATED by object inventory diff** on two fresh replays (through 0084, through 0090). §2. | scratchpad `inv-0084.txt`, `inv-0090.txt`, `inv-diff.txt` |
| 9–11. Plans | Written, **not executed**. §6, §7. | this document |

### 1.1 SEND_CONCURRENCY = 4 — reviewed, kept

- **Idempotency:** `email_batches.client_batch_id text not null unique` (0009). A client resend of the same batch is refused with 409 and cannot double-send. Inside one batch each recipient is one `email_messages` row written before the send, so a crash mid-pool leaves rows in `pending`, never a second send of a delivered one.
- **Retries:** none are automatic. A provider failure marks that recipient `failed`; the batch completes `completed_with_failures`. There is no retry loop that could amplify under concurrency.
- **Failure isolation:** the pool (`runSendLoop`, bounded at 1–16 by `readConcurrency`) settles every recipient independently; one rejection does not cancel the others; results are written in recipient order.
- **Suppression:** `ses-feedback` marks bounced/complained addresses and `member_emails_carry_suppression` keeps a re-added address suppressed; a suppressed address fails its recipient with the suppression reason before any provider call.
- **SES rate:** unread (T-010 — an AWS-console read the owner must do; nothing in the repo or database holds it). 4 in flight is well under the commonly documented 14/s production rate and equal to a sandbox account's 1/s only in burst, not in sustained rate. **If the account is in the SES sandbox or has a 1/s rate, set `SEND_CONCURRENCY=1` before deploying `send-followups`.** The default stays 4 and is a documented knob; not increased.

---

## 2. Remaining

| # | Item | Status | Why not done here |
|---|---|---|---|
| R1 | Incremental `member_stats` (streak maintained per attendance write, so a 5,000-member commit does not recompute 5,000) | **STILL OPEN — product/architecture decision** | A schema redesign (a per-member running streak column plus trigger logic on every attendance insert/update/delete and on the absentee sweep). Hard rule 9 (no broad architectural changes) and the brief's Step 4 instruction ("If this requires a significant schema redesign, stop and report"). 0089 halves the cost instead. |
| R2 | The absentee sweep's per-row trigger calls (~4,900 `attendance_backdates_membership` calls on a 5,000-member commit) | STILL OPEN | Not in this brief; a set-based sweep is its own change. |
| R3 | Spec 53 (copy-lock on production's `update_member` hash) | STILL OPEN until the apply day | 0085 and 0088 move the replayed body on purpose; re-pin from a post-apply read (§6 Stage D). |
| R4 | The fifteen divergent bodies (T-120) | STILL OPEN | Out of scope; 0085/0088/0090 edit theirs in place, guarded. |
| R5 | SES rate (T-010) | NEEDS OWNER READ | AWS console only. |
| R6 | Edge Function Deno tests locally | ENVIRONMENT LIMITATION | Deno 2.9.7 cannot be fetched through this box's proxy (403 on dl.deno.land); CI runs them. The same modules are proven under node by `edgeFuzzyMatcher`, `edgeSendLoop`, `csvPreviewReads`, `pageAllShortPage`. |
| R7 | Pre-existing gate failures G1–G3 (`design/tokens.json` absent), G6 (one conformance warning), G8 | PRE-EXISTING | Identical on every run since 24-Sep; unrelated to this work. |
| R8 | `app/audit.tsx` export file name uses the device's date (cosmetic, class C) | left | A file name, not a business value. |

---

## 3. Tests — the full pipeline on the committed tree (Local/harness unless stated)

| Check | Result | Classification |
|---|---|---|
| `npm run test:unit` | **2,213 tests, 2,213 pass** (2,187 before this brief; +26 new) | newly passing: 26 (pageAllShortPage 16, rosterWindowed 4, businessPeriod 6) |
| `npm run typecheck` | PASS | — |
| `npm run lint` | PASS | — |
| `npm run check` (typecheck + contrast + icons + functions + unit) | PASS, exit 0 | — |
| `npx expo export --platform web` | PASS, 6.5 MB `dist/` | — |
| `npm run test:db` (fresh replay of 0001–0090 before every spec) | **1,332 PASS; 2 failures** | newly passing: specs 66 (18), 67 (11), 62's two re-pointed lines. **Pre-existing failures (2):** spec 18 `is_super_admin` count; spec 53 production copy-lock on `update_member` (moved on purpose by 0085/0088). **Genuine failures: none.** |
| `npm run check:edge` (Deno) | **SKIPPED** — no Deno on this box | environment limitation; CI-only |
| Edge Function Deno specs | **NOT RUN HERE** | environment limitation; CI-only (`denoland/setup-deno` 2.9.7) |
| `npm run gate` | VERDICT FAIL on the pre-existing set only (G1–G3, G6, G8); **G5 PASS, G7 PASS** on every commit of this brief | pre-existing |

**Spec 62's flake, found and fixed in this brief:** `pg_stat_xact_user_functions` is a
per-backend buffer that Postgres 15+ flushes to the collector at most once a second, so a
count from the previous transaction leaks into the next one when it starts within the same
second (reproduced in isolation: a call in one transaction, then `calls = 1` read in a fresh
transaction before any call). Once 0089 made the import transaction fast enough, spec 62 read
"got 2 want 1" on two of three replays. Every count in the spec is now a delta against a
baseline read at the top of its own transaction; the expectations (one call each) are
unchanged. This is a measurement defect in my own phase 5 spec, not a behaviour change.

**Test files touched, and under which rule:**
- New: `src/data/pageAllShortPage.test.ts`, `src/components/rosterWindowed.test.ts`,
  `src/data/businessPeriod.test.ts`, `supabase/tests/66`, `supabase/tests/67`.
- Re-pointed on the brief's Step 2 instruction ("Update the affected tests to reflect the
  correct behavior"), each a count only, with the reason beside it: `pageAll.test.ts` (46→45
  pages; cursor list), `periodMetricsPage.test.ts` (cursor list), `memberRefresh.test.ts` and
  `requestBudget.test.ts` (members 3→2 requests), `edgeSendLoop.test.ts` (3→2 metrics pages).
  No assertion removed, nothing skipped, no matcher loosened; the three RC-041 termination pins
  stay as written and green.
- Re-pointed in my own phase 5 spec 62: `edit_streak_calls = 1` → `<= 1` (0089 does not call
  `current_streak_for`; the claim is carried by the row count and spec 66), plus the
  measurement fix above.

---

## 4. Performance (before → after)

| Scenario | Before | After | Where measured |
|---|---:|---:|---|
| Requests per paged read of a table bigger than a page | N+1 pages (empty terminator) | N pages | fake network (Local) |
| Members screen requests | 25 | 19 | fake network (Local) |
| Home requests | 42 | 35 | fake network (Local) |
| Attendance requests | 27 | 22 | fake network (Local) |
| Follow-ups / Reports / Courses requests | 25 each | 19 each | fake network (Local) |
| Member save cascade requests | 44 | 35 | fake network (Local) |
| Course roster DOM nodes, 1,644 / 5,000 members | 11,986 / 36,063 | **699 / 699** | stand-in bundle, scenario B (Local) |
| Roster long tasks on open, summed, 1,644 / 5,000 | 1,590 / 2,899 ms | 439 / 432 ms | stand-in (Local) |
| Roster keystroke input events | 24–168 ms | 16–80 ms | stand-in (Local) |
| Network requests while typing, any screen | 0 | 0 | stand-in (Local) |
| Whole-academy `recompute_member_stats`, 1,500 members | 1.2–1.3 s | **0.39 s** | harness Postgres 16 (Local) |
| Whole-academy `recompute_member_stats`, 5,000 members | 4.70 s | **1.98 s** | harness Postgres 16 (Local) |
| `member_stats` rows after 0089 vs 0008's body | — | EXCEPT-equal both ways, 0 / 0 rows differ at 1,500 and 5,000 | harness (Local) |
| Member-stats recalculation, 1,000-row commit at 1,500 members (closing report) | 5.36 s | 1.21 s before 0089; the offering-sized recompute inside it is now ~3× cheaper | harness (Local) |

**Production: nothing above is a production figure.** The closing report's before figures
for `update_member` (249 ms mean, 49k buffers) and the metrics RPC (426 ms / 13,999 buffers)
are production's and are re-measured only after Stages A, B and D (§7). Hard rule 7.

---

## 5. The date/time audit (Step 5)

Grep over `app/`, `src/`, `supabase/functions/`, `supabase/migrations/` (tests excluded) on
the committed tree: `new Date()` 33, `Date.now()` 31, `current_date` 72 (all in applied
migrations 0002–0084 or in 0088/0090's anchors and guards), `now()` 131, `toISOString` 30,
`toLocaleDateString` 9, `toLocaleTimeString` 1, `toLocaleString` 4, `getTimezoneOffset` 0;
`businessToday*` 56 and `business_today` 22 readers after the fix.

| Class | Meaning | Sites | Action |
|---|---|---|---|
| **A — timestamp** | a real instant; correct in any zone | `created_at`/`updated_at`/`sent_at`/`audit_log.at` defaults and writes (`now()`), freshness and "x minutes ago" labels (`Date.now()`, `whenText`), Edge Function timestamps and batch ids, `members_updated_at`-style triggers, the upload's `created` time, the audit export's `toLocaleString` labels | **none** — correct |
| **B — business date** | a calendar day derived from "now" that drives a rule or a default | *client:* period presets `currentWeek/lastWeek/lastFourWeeks/thisMonth/presetPeriod/resolvePeriod`, `useWeekRows`, the calendar's "today" (`DateTimePicker`, twice), the sample message's day (`message.ts`), `repository.ts` `dayBounds` (was the DEVICE's midnight); *server:* `subscription_state` (2 anchors), `save_course` (3), `merge_member_into` (1), `is_in_course` (1), `follow_up_candidates` (1) | **FIXED** — `businessToday()` / `businessDayBounds()` on the client (Asia/Kolkata, fixed +05:30), 0090 on the server (`business_today()`). Phase 11 had already fixed joining dates, the inactive/active-again window, schedules, the attendance upload and `create_member`/`update_member`/`set_member_active_from`/`set_attendance`. |
| **C — safe** | a YYYY-MM-DD string parsed locally for a label or a weekday, and formatted back; the same string goes in and out | `parseISO`/`iso` round trips for labels, `weekday` of a day string, `monthGrid`, `memberDate`'s `Date.UTC` probe, `audit.tsx`'s export file name, `toLocaleDateString` labels of a day string | **none** — a local Date built from a day string at local midnight formats back to the same day in every zone (no DST in the zones that matter; the probe is UTC) |

`delete_course` and `delete_member` in production no longer read `current_date` (verified
read-only); the column defaults in 0002 are an applied migration and are overridden by every
writing function, which now pass `business_today()`.

Tests around IST midnight: `src/data/businessPeriod.test.ts` (Sunday 18:29 UTC vs 18:30 UTC:
last week's vs this week's Monday; 30-Sep 18:30 UTC is 1-Oct in Chennai; a day's instant
bounds under four device zones); `supabase/tests/67` with the session clock pinned to 20:00
UTC (01:30 the next day in Chennai) across all five functions; the earlier `businessDate.test.ts`
(5) and spec 65 (13) still green.

---

## 6. Database — the six unapplied migrations and their order (Step 8)

Object inventory (tables, columns, indexes, triggers, policies, RLS, functions with body md5,
function grants, table grants) on two fresh replays, through 0084 and through 0090. **The diff
is exactly the intended set:** two new functions, thirteen changed function bodies, **no table,
column, index, trigger, policy, RLS or table-grant change**, and both new functions
`anon=false, authenticated=true, service_role=true` (`recompute_member_stats` stays
`authenticated=false`).

| Migration | Kind | Objects | Depends on | Harness guard |
|---|---|---|---|---|
| 0085 | in-place edits, anchors matched exactly once | `update_member`, `commit_csv_import` | none | each anchor present exactly once in the live body |
| 0086 | `create or replace`, md5-guarded | `member_period_metrics_page` (sql → plpgsql, plans with its dates) | none | live body md5 |
| 0087 | new function | `member_period_metrics_buckets` | none (the **client** needs it) | — |
| 0088 | new function + in-place edits | `business_today` (new); `create_member`, `set_attendance`, `set_member_active_from`, `update_member` | none | anchors exactly once |
| 0089 | `create or replace`, md5-guarded | `recompute_member_stats` | none | live body md5 `142f926f…` (identical prod/harness) |
| 0090 | in-place edits | `subscription_state`, `save_course`, `merge_member_into`, `is_in_course`, `follow_up_candidates` | **0088** (`business_today()` must exist; the migration refuses otherwise) | anchors exactly once; final guard: none of the five still reads `current_date` |

Dependency order: **0086 → 0087** (metrics; the client's bucket read needs 0087), then
**0085**, **0088 → 0090**, **0089** — 0089 is independent of all others and may go anywhere
after review. None builds an index or adds a constraint over existing rows, so the harness
replay is the whole pre-flight; each is a function body change that takes effect on the next
call and is reversible by re-running the previous body from the ledger.

Spec 53's copy-lock (production's `update_member` hash) stays red until re-pinned from a
post-apply read (Stage D).

---

## 7. Production deployment plan (Step 9) — NOT EXECUTED

Rules in force for every stage: show the requester the raw SQL of the migration and wait for
an explicit go-ahead; apply one at a time; report the result before starting the next; no
Supabase branches; D-10: a migration merges to `main` only on the day it is applied; D-14: no
`supabase functions deploy` until each deployed function is diffed against the repo.

| Stage | Action | Verify before the next stage |
|---|---|---|
| **A** | Apply **0086** (`member_period_metrics_page`). Pre-check: the live body md5 matches the guard (the migration refuses otherwise). | `explain (analyze, buffers) select * from member_period_metrics_page('<Mon>','<Sun>', null, 1000)` under 1,000 buffers (was 13,999); one member card's figures equal the Reports screen's for the same week. |
| **B** | Apply **0087** (`member_period_metrics_buckets`). | `select count(*) from member_period_metrics_buckets(array[...7 days], array[...], null, 1000)` equals the sum of seven `member_period_metrics_page` calls; `has_function_privilege('anon', ..., 'execute')` is false. |
| **C** | Deploy the **client bundle** (`npx expo export --platform web`, 6.5 MB). | The checklist in §7.1 (auth, members, attendance, roster, follow-ups, CSV, dates). Cold start on Home ≤ 35 requests; 0 × 401 in the edge logs over a day; both themes. |
| **D** | Apply **0085** (scoped recompute). Then re-pin spec 53 from a post-apply read of `update_member` (and again after 0088), ledger the row. | One CSV commit of a real file: result counts unchanged; `member_stats.updated_at` moved only for that offering's members; `pg_stat_statements` mean for `commit_csv_import` and `update_member` well under 353 / 249 ms. |
| **E** | Apply **0088** (`business_today` + four rules), then **0090** (the five readers), then **0089** (one-pass recompute; may also be applied at D). Each with its own go-ahead. | `select business_today()` between 18:30 and 24:00 UTC is tomorrow's UTC date; add a member with today's date at 00:00–05:30 IST — accepted; `select subscription_state()` at that hour reports the academy's day; after 0089 one whole-academy `recompute_member_stats()` under 1 s (was ~1.3 s/1,000 members in the harness; production figure recorded here) and `member_stats` unchanged row-for-row (`except` both ways against a pre-apply snapshot). |
| **F** | Deploy the **Edge Functions**: `csv-import`, `send-followups` (set `SEND_CONCURRENCY` only if the SES rate read says 4 is wrong). Diff each deployed function against the repo first (D-14). | A preview of last week's file: identical rows and counts to the previous preview; function time under 2 s. A batch of ten to staff addresses: ten rows, ten sends, results in order; a batch of 100 well under 60 s with no SES throttling in the logs. |
| **G** | Smoke tests (§7.1) end to end, then the production performance verification (§7.2); post-release watch at +1 h and +24 h. | All of §7.1 green; §7.2 figures recorded in the final report's §4 as **Production**. |

If any stage's verification fails: stop; the previous body is in the migration ledger and the
previous client bundle is the previous deploy; do not continue to the next stage.

### 7.1 Production smoke-test checklist (Step 10) — after Stage C, again after G

- **Auth:** sign in with PIN; a wrong PIN is refused; sign out; a protected screen opened
  signed-out shows no data and makes no data request (0 × 401 in the logs).
- **Members:** list opens at the full register with no long task; search by name, alias and
  email returns the same rows as before; a member card's figures equal Reports' for the week;
  add a member (today's date, by the academy's day), edit the course, edit own days, mark
  inactive and active again with dates; the follow-up count on Home equals the weekly list.
- **Attendance:** the day strip, upload a known file (identical counts to its last upload),
  set a mark, reset a day, inactive members at the bottom and unselectable.
- **Course roster:** open a 300+ member course; scroll to the end (every card present, in
  section order: live, No email, Email issues, Inactive); type in search (no stall); filters
  and the course picker; select cards, open the send sheet; day strip changes the register;
  both themes; phone width.
- **Follow-ups:** the weekly list equals Home's count; a batch of ten to staff; results in
  order; a resend of the same batch id is refused (409); a suppressed address is reported, not sent.
- **CSV:** preview of last week's file (same rows, same decisions as before); commit; member
  counts and `member_stats` only for that offering's members; a second upload of the same
  file writes nothing and answers with what the earlier import did ("nothing to update").
- **Dates around IST midnight (run one evening between 18:30 and 24:00 UTC):** add a member
  with today's date — accepted; the Home week is this week's; the Reports period defaults to
  the academy's day; a subscription expiring today reads active; `business_today()` and the
  app agree.

### 7.2 Production performance verification plan (Step 11)

| Metric | Target | How | After stage |
|---|---|---|---|
| `member_period_metrics_page` buffers (one week) | < 1,000 (was 13,999) | `explain (analyze, buffers)` | A |
| Cold start on Home, requests | ≤ 35 (was 40–47) | DevTools network, one cold load | C |
| Members / Attendance / Follow-ups / roster DOM nodes at the full register | < 1,000 each (was 29,703 / 49,476 / 16,346 / 11,986) | `document.querySelectorAll('*').length` after open | C |
| Search keystroke, any list | no long task > 50 ms | Performance panel | C |
| `update_member` mean | < 50 ms (was 249 ms) | `pg_stat_statements` over a day | D |
| `commit_csv_import` of a real file | < 50% of the previous mean (353 ms per row-batch) | `pg_stat_statements` | D |
| Whole-academy `recompute_member_stats()` | < 1 s at ~1,200 members | timed call, off-hours | E |
| `csv-import` preview wall time | < 2 s | function logs | F |
| `send-followups`, 100 recipients | < 60 s, no throttling | function logs | F |
| Joining-date refusals at 18:30–24:00 UTC | 0 over a week (were ~4 a night) | audit log | E |

Every figure recorded here as **Production** the day it is read; nothing in §4 is replaced by
a harness figure.

---

## 8. Risks and decisions needing the owner

1. **NEEDS DECISION — `subscription_state` on the academy's day (0090).** A subscription
   expiring today was "active" until UTC midnight and will be active until IST midnight (five
   and a half hours earlier in UTC terms, the same calendar day for the academy). Grace is
   judged the same way. This is the documented intent (T-144) but it is a billing-adjacent
   rule, so it is called out for an explicit yes before Stage E.
2. **NEEDS DECISION — ship 0089 at Stage D or Stage E.** It is independent and guarded; the
   only question is whether to take the recompute change and the scoping change on the same
   day (fewer apply days) or separately (one variable at a time).
3. **NEEDS DECISION — `SEND_CONCURRENCY`.** Keep 4 (default) unless the SES console (T-010)
   shows a sandbox account or a rate below 4/s; then set 1 before Stage F.
4. **Risk — production bodies differ from the harness (T-120, 15 functions).** Mitigated:
   every in-place migration refuses unless its anchor is present exactly once in the live body,
   and every restated body is md5-guarded; all anchors and md5s were read in production on
   06-Oct-2026. A production edit of any of those functions between now and the apply day makes
   the migration refuse, loudly, with no change made.
5. **Risk — spec 53 red until re-pinned** (expected; Stage D).
6. **Risk — the Deno specs are CI-only.** The two Edge Functions' node twins are green; CI
   must be green before Stage F.
7. **Risk — the re-pointed counts.** Six specs' expected request/page counts changed on the
   brief's instruction; the termination pins that protect against reading a capped page as the
   end are unchanged and green. If the owner would rather keep the empty terminator, revert
   commit `a48b750` alone; nothing else depends on it.
8. **Hard rule 8 observed:** no completed phase was rewritten; the only edits to earlier work
   are the pager (Step 2, on instruction), spec 62's measurement defect (a concrete correctness
   problem, §3), and the five Step 5 readers phase 11 had listed for later.

---

## 9. Status

- **FIXED:** pagination's empty terminating page (Step 2); the course roster's unbounded DOM
  (Step 3); the whole-academy recompute's per-member walk (Step 4, 0089); every class-B
  date read in both tiers (Step 5, 0090); spec 62's flake.
- **STILL OPEN:** incremental `member_stats` maintenance (R1, a redesign); the sweep's
  per-row triggers (R2); T-120's divergent bodies (R4); spec 53 until the apply day (R3).
- **NEEDS MY DECISION (the owner's):** §8 items 1–3.
- **READY FOR DEPLOYMENT:** the client bundle and all six migrations, **staged A → G as in
  §7**, under CLAUDE.md's apply rules. Stage A can begin on the owner's go-ahead without any
  of the §8 decisions; Stage E needs decision 1; Stage F needs decision 3.
- **NOT READY FOR DEPLOYMENT:** nothing on the branch is blocked, but **do not deploy the
  client before 0087 is applied** (the Overview's period bars read
  `member_period_metrics_buckets`), and **do not apply 0090 before 0088**.

**The branch is safe to proceed to controlled production deployment, in the stated order,
with the three decisions above taken at their stage.** Nothing has been deployed or applied.
