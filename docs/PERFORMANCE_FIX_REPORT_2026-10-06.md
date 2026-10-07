# RosiFit — Master Performance & Correctness Fix: closing report (06-Oct-2026)

Branch `claude/loving-euler-8nz5a8`, twelve commits after the investigation
(`docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md`). **Nothing here is
deployed or applied anywhere.** Production was read, read-only, four times
(function bodies, the metrics plan, row counts, role config); it was never
written. Every claim below names its measurement; a claim that could not be
measured is marked **UNVERIFIED**.

## 1. Files changed (63 since d32e345)

Data layer, `src/data/`
- `hooks.ts` — useAsync defers a revalidation for a screen nobody is looking at (phase 1); waits for the session gate before any protected read (phase 9); `useDebouncedQuery` (phase 4).
- `revalidate.ts` — a revalidator can say it is not on screen and be deferred (phase 1).
- `deferral.ts` (new) — the one rule for deferring, pure (phase 1).
- `repository.ts` — one shared catalogue read, one shared names read, flatter chains (phase 2); one announcement per bulk delete (phase 1); the Overview's buckets as one read (phase 6b); the academy's day for offline defaults and the pending-sessions cut-off (phase 11).
- `periodMetrics.ts` — `METRICS_BUCKETS_RPC`, `splitBuckets` (phase 6b).
- `debounce.ts` (new) — the quiet window (phase 4).
- `sessionGate.ts` (new) — no protected read before the session is known (phase 9).
- `businessDate.ts` (new) — the academy's day, Asia/Kolkata (phase 11).
- `schedule.ts`, `followup.ts`, `course.ts` — "today" is the academy's day (phase 11).
- `fakePostgrest.testkit.ts` — answers the bucket RPC (testkit, not a spec).

Screens, `app/` and `src/components/`
- `(tabs)/members.tsx`, `(tabs)/weekly.tsx`, `(tabs)/attendance.tsx` — windowed lists, memoised rows, debounced search, Members' search text indexed once per load (phases 3, 4).
- `course/[id].tsx` — memoised roster card, the day's rows indexed per member, picker options built only when open, debounced search; today is the academy's day (phases 3, 4, 11).
- `ui.tsx` — `screenBodyPadding`, `Screen pad` (phase 3).
- `member/edit.tsx`, `member/[id].tsx`, `member/import.tsx`, `upload.tsx`, `(tabs)/reports.tsx`, `offering/edit.tsx`, `PeriodFilter.tsx` — today is the academy's day (phase 11).

Edge Functions, `supabase/functions/`
- `csv-import/index.ts` — nine register reads started together; per-row matching by lookup (phase 7). `csv-import/load.ts` (new) — the register's index.
- `_shared/match.ts` — the fuzzy tier prepared once per request, exact length band (phase 7).
- `send-followups/send-loop.ts` — bounded pool, per-send clock; `load.ts` — one paged metrics read per batch; `email.ts` — SES fetch aborts at 15 s; `index.ts` — wiring and `SEND_CONCURRENCY` (phase 8).

Database, `supabase/migrations/` (drafts, not applied) and `supabase/tests/`
- `0085` scoped recompute + expected set once (phase 5); `0086` metrics page planned with its dates (phase 6a); `0087` bucketed metrics function (phase 6b); `0088` `business_today()` and four in-place edits (phase 11). Specs 62, 63, 64, 65.

Tests (new, node): `windowedLists`, `searchDebounce`, `debounce`, `deferral`, `bulkDeleteAnnouncesOnce`, `requestBudget`, `bucketedMetrics`, `csvPreviewReads`, `edgeFuzzyMatcher`, `edgeSendLoop`, `sessionGate`, `businessDate`. Appended: `revalidate.test.ts` (T8A–T8E), `memberRefresh.test.ts` (6–7). Deno (CI only): `_shared/match.test.ts`, `send-followups/send-loop-pool.test.ts`. Modified under the owner-approved reversal exemption (one regex literal each, recorded in TEST_SUMMARY): `memberJoinedOn`, `importedMemberJoinedOn`, `dayStripUploadButton`, `memberInactiveFromField`.

Registers: `TEST_SUMMARY.md` (one entry per phase, with FAIL-FIRST evidence), `docs/registers/RUN_LOG.md`, `docs/registers/ISSUE_TRACKER.md` (T-014/T-015 status, new T-144), `.gitignore`, the two measurement scripts.

## 2. Database changes

Four additive migration files, **none applied** to any environment, every one replayed from scratch in the local harness (`npm run test:db`: 1,303 PASS, 2 pre-existing failures). Each merges to `main` only on the day it is applied (D-10).

| migration | kind | functions changed | indexes | triggers |
|---|---|---|---|---|
| 0085 | in-place edits (six anchors, each guarded to match once in the live body) | `update_member`, `commit_csv_import` | none | none |
| 0086 | restatement (`create or replace`, guarded on the live body's md5) | `member_period_metrics_page` | none | none |
| 0087 | new function | `member_period_metrics_buckets` | none | none |
| 0088 | new function + four in-place edits | `business_today` (new); `create_member`, `update_member`, `set_member_active_from`, `set_attendance` | none | none |

No table, column, index, policy, trigger or data change. No RLS change: the three metrics functions stay SECURITY DEFINER with the same grants (anon revoked); `business_today()` is granted to authenticated and service_role only.

Why in place: production and the harness disagree about `commit_csv_import` (production runs 0044's body; 0045 was never applied, T-125) and about `update_member` (T-120). A restated body would carry or revert changes nobody asked for; an anchor edit applies to whichever body is live and refuses if it is not the one it expects. Every anchor was read in production first.

Spec 53 (`harness_body_matches_production`, a copy-lock on production's `update_member` body) was red before this work and stays red: 0085 and 0088 move the replayed body on purpose; it is re-pinned on the day they are applied, from a read taken after.

## 3. Performance results

Before figures are the investigation's (04/05-Oct); after figures were taken on this box on the final tree (06-Oct). "fake network" = the real data layer against `fakePostgrest.testkit` (1,644 members); "stand-in" = the production bundle in headless Chromium against `standin2.js` (1,644 members, realistic rows); "harness" = Postgres 16 with `seed_scale.sql`.

| Scenario | Before | After | How |
|---|---:|---:|---|
| App startup requests (cold start on Home) | 40–47 (prod/local, §14) | 33 | stand-in, scenario A |
| Home requests | 54 → 50 after phase 2 | 42 (metrics pages 24 → 16) | fake network |
| Members requests | 27 | 25 | fake network |
| Attendance requests | 85 | 27 | fake network |
| Focus return requests, 6 tabs visited, 13 s idle | 28 (every tab's readers, empty stand-in) | 30 — all Home's; Courses/Reports/Members/Follow-ups readers defer until shown; 0 within 12 s; 0 on a tab switch back | stand-in, scenario A |
| Member save requests (5 screens mounted) | 52 | 44 (one register read in JS instead of five) | fake network |
| Member add latency, DB side | 249 ms mean, 49k buffers per `update_member` (prod) | 1.8 ms scoped recompute in the harness; prod **UNVERIFIED** until 0085 applies | harness |
| Search latency, first keystroke | 928 ms Attendance; 824 ms roster; 7,656 ms roster at 5,000 | Members 16–32 ms, Attendance 16–48 ms (no long task); roster 24–168 ms with 36k DOM nodes at 5,000 | stand-in, scenario B |
| Metrics RPC time | 426 ms / 13,999 buffers (prod, one week); 158,396 buffers (harness 5,000) | harness 2,000: 12,172 → 183 buffers; 5,000: 158,396 → ~12,000; prod **UNVERIFIED** (0086 not applied) | EXPLAIN (ANALYZE, BUFFERS) |
| Member stats recalculation time, 1,000-row commit at 1,500 members | 5.36 s | 1.21 s (100 rows 1.76 → 1.11 s) | harness, loadtest.sh |
| CSV 1,500 rows, fuzzy matcher | 1,000 × 1,644 rows 5.3 s; × 5,000 16.1 s | 1,500 × 1,644 1.4 s; 1,000 × 5,000 3.3 s | node, same module the function bundles |
| CSV preview sequential depth | ~21 round trips | ~10 (nine reads in parallel); wall time **UNVERIFIED** (not deployed) | code reading |
| Follow-up 100 recipients | 36–41 s (0.36–0.41 s each, prod) | 1,269 ms vs 5,040 ms serial with a 50 ms fake provider; prod **UNVERIFIED** (not deployed) | node |
| Members list DOM nodes | 29,703 (90,111 at 5,000) | 594 (594 at 5,000) | stand-in, scenario B |
| Attendance / Follow-ups DOM nodes | 49,476 / 16,346 | 543 / 595 | stand-in, scenario B |

Also recorded: duplicate requests 0 on every fake-network screen (T-406 plus the shared reads); sequential depth on the course day 5 → 3; no network request is caused by typing on any screen; the remaining empty terminating page per paged read is phase 10 (below).

## 4. Tests

- Added: 12 node specs (above), 4 harness specs (62–65), 2 Deno specs. Appended cases to 2 existing node specs.
- Modified: 4 existing node specs, one regex literal each (`iso(new Date())` → `businessTodayIso()`), under the owner-approved behaviour-reversal exemption, recorded in TEST_SUMMARY.
- `npm run test:unit`: 2,187 tests, all green after the phase 11 correction (the gate's G7 step: PASS).
- `npm run test:db`: 1,303 PASS, 2 failures, both pre-existing (spec 18's is_super_admin count; spec 53's production copy-lock on `update_member`). Baseline before this work: 1,219 PASS, 4 failures — spec 52 (T-014) turned green by 0085, the 6-Oct date fixture by the calendar.
- `npm run typecheck`: PASS. `npm run lint`: PASS (0 errors, 0 warnings). `npm run check`: contrast PASS, icons PASS, functions PASS; its `test:unit` step was red once on the matcher's absolute budget and is green with the relative one.
- Build: `npx expo export --platform web` PASS (6.4 MB dist).
- Edge Function tests: **UNVERIFIED locally** — Deno 2.9.7 is not installed and cannot be fetched through this box's proxy (403 on dl.deno.land; no npm release of that version), so `npm run check:edge` SKIPS and the two Deno specs run only in CI. The same claims are proven under node by `edgeFuzzyMatcher`, `edgeSendLoop` and `csvPreviewReads`, which import the identical modules.
- `npm run gate`: VERDICT FAIL on the pre-existing set only (G1–G3 `design/tokens.json` absent, G6 the conformance warning, G8), identical to every run since 24-Sep; G5 and G7 PASS.

## 5. Remaining issues

1. **Phase 10 — not done, by decision.** `pageAllByKey` ends a read only on an empty page, so a full last page costs one extra request (one per paged read, ~5 per screen). Ending on a short page is pinned as a defect by three existing specs (`pageAll.test.ts` "a short page is never read as the end", "the read ends only on an EMPTY page"; `edgeFunctionPagedReads.test.ts` "both pagers end a read ONLY on an empty page" and "a server ceiling BELOW the page size still returns everything"), for a stated reason: PostgREST's `db-max-rows` is a project setting, and a page shorter than asked cannot be told from a lowered cap. Removing the empty page means reversing that rule, which is a behaviour reversal those specs forbid without the owner's decision. Proposed, not done: end on a short page when the page size is at most `SUPABASE_MAX_ROWS` (1,000, the cap the project runs) and add a one-time runtime check that the cap is still 1,000 (a 1,001-row request answered with 1,000 proves it), plus the specs' re-pointing. Duplicate and repeated-page requests: none found (T-406 and the shared reads).
2. **The course roster is not windowed** (36k DOM nodes at 5,000 members; 11,986 at 1,644). Its keystroke cost is 10× lower than before but still 24–168 ms with long tasks; windowing a sectioned screen is a larger change than the three lists.
3. **A commit for an offering of 5,000 members still recomputes 5,000** — every member holds a row for the session after the sweep, so the scoped set is the population. Incremental maintenance of `member_stats` (streak as a window over history) is a redesign of `recompute_member_stats`, not done. The sweep's 4,900 per-row trigger calls are the other cost.
4. **Other `current_date` readers** (subscription window, course-save effective dates, the enrolment-ending `least(...)` in three paths, `is_in_course`, `member_status_on` reads) and `period.ts`'s local-Date week arithmetic — same class as T-144, listed there, each needing its anchors read first.
5. **Spec 53 and the fifteen divergent bodies (T-120).** Production and the harness still disagree about 15 functions; 0085/0088 edit two of them in place and the copy-lock will need re-pinning on apply.
6. **SES's real rate (T-010)** is unread; the pool default of 4 is a conservative guess under the commonly documented 14/s and is tunable by `SEND_CONCURRENCY`.
7. **Production effects are unverified** for everything server-side (0085–0088, both Edge Functions) until applied/deployed: the before figures are production's, the after figures are the harness's or node's.

## 6. Production deployment recommendation — do not deploy yet

- **Ready, with review:** the client bundle (phases 1, 2, 3, 4, 6b-client, 9, 11-client). It works against today's production functions: the bucket read needs 0087 and is only taken for two or more buckets — the Overview's period bars will fail with "could not load" until 0087 is applied, so the client must not ship before 0087, or `fetchBucketMetrics` must be shipped behind the migration. **Recommendation: apply 0086 and 0087 first, then deploy the client.**
- **Needs review before apply (CLAUDE.md: show the raw SQL, wait for a go-ahead, apply one at a time, report each):** 0085, 0086, 0087, 0088 — in that order; each is additive, guarded on the live body, and needs no data backfill or index over existing rows, so the harness replay is the whole pre-flight. After 0085 and 0088: re-pin spec 53's `update_member` hash from a post-apply read and ledger the four rows (D-10).
- **Needs deploy decision (D-14: no `supabase functions deploy` by any session until every deployed function is diffed against the repo):** `csv-import` and `send-followups`. `send-followups` needs `SEND_CONCURRENCY` set only if 4 is wrong for the account's SES rate (T-010).
- **Staged:** yes. Migrations 0086 → 0087 → client → 0085 → 0088 → Edge Functions, each with its smoke test before the next.
- **Smoke tests on production after each step:** (0086) `explain (analyze, buffers) select * from member_period_metrics_page(<this week>, null, 1000)` reads under 1,000 buffers; a member card's figures equal the Reports screen's. (0087) the Overview's period bars sum to the ring for every filter; `member_period_metrics_buckets` for the seven days equals seven page calls. (client) cold start on Home ≤ 35 requests and 0 × 401 in the edge logs over a day; return to the app after a minute refetches only the visible tab; Members/Attendance/Follow-ups scroll and search at 1,659 members with no long task; both themes. (0085) one CSV commit of a real file: the result counts unchanged, `member_stats.updated_at` moved only for that offering's members, `pg_stat_statements` mean for `commit_csv_import` and `update_member` well under the 353/249 ms means. (0088) add a member with today's date between 00:00 and 05:30 IST — accepted; `select business_today()` at that hour is tomorrow's UTC date. (csv-import) a preview of last week's file: identical rows and counts to the previous preview of the same file; function time under 2 s. (send-followups) a batch of ten to staff addresses: ten rows, ten sends, results in order, function time ~3 s; a batch of 100 well under 60 s with no SES throttling in the logs.
