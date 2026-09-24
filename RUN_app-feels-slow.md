# RUN — app feels slow: measurements (Track C, root cause before fix)

Request: [requests/2026-09-24-app-feels-slow-measure-first.md](requests/2026-09-24-app-feels-slow-measure-first.md)
Measured 2026-09-24. **No fix has been applied.** Every production query was a read. RLS timings ran inside
`begin read only` as `authenticated` with a real super-admin JWT subject.

## Ranked by measured cost

| # | Cause | Measured | Evidence |
|---|---|---|---|
| 1 | **RLS helper functions are evaluated once per row.** Every read policy is `is_active_app_user()` (SECURITY DEFINER → `current_app_user_id()` → a scan of `app_users`), not `(select is_active_app_user())`. | 1,000-row `member_stats` read: **158 ms with the policy as written vs 1.3 ms** with the same check hoisted to an InitPlan (120×). `members`, 1,000 rows: 154 ms. RPC `course_week_day_status` (SECURITY INVOKER): **403 ms under RLS vs 13.5 ms** without (30×). In prod the five member-list page reads average **624–774 ms each**, 1.4–1.8 M ms total apiece since 1 Sep. `app_users` has had **18.9 M sequential scans** for 11 rows. | `pg_policies`, `EXPLAIN ANALYZE`, `pg_stat_statements`, `pg_stat_user_tables` |
| 2 | **A parallel burst saturates a small database.** A cold Home load fires ~40 requests in 50 ms (21 of them `member_period_metrics_page`). Inside the burst, even 4-row tables take 740–1,090 ms; the same reads outside it take 95–190 ms. | The database has 60 max connections and 224 MB shared_buffers (smallest compute tier). #1 is what makes each request heavy. | Edge-log trace, session 5a86…, 24 Sep 02:14 UTC |
| 3 | **Identity is read 10 times, one after another, before any data loads.** 10 identical `app_users?select=id,name,kind,…` requests, each ~150–180 ms, spaced ~200 ms apart. | **2.4 s** (49.75 s → 52.29 s) before the first data request. Why they serialize is **not yet proven**. auth-js 2.112.4 runs lockless by default, so the auth lock is ruled out. | same trace; call sites: `useIdentity` in `AppShell` ×3, `AdminOnly`, screens; `ThemeProvider` `currentAppUser()`; `restoreSession` |
| 4 | **No cross-screen dedupe or cache.** In one Home load (~6 s, ~116 requests): `courses` fetched 7×, `follow_up_config` 5×, `sessions` 5×, `member_schedules` 5×, and the 5-table member list re-read 4× within 4 s. Paging costs an extra empty page per read: ⌈N/1000⌉+1 round-trips. | ~116 requests for one screen | same trace; `src/data/hooks.ts`, `src/data/pageAll.ts` |
| 5 | **One JS bundle for every screen.** `entry-*.js` is **2.65 MB raw / 713 KB gzip**. `exceljs` is already split out (944 KB / 256 KB, loaded lazily). | Lighthouse mobile table below | `expo export --platform web` |
| 6 | **Region.** Supabase is `ap-southeast-1` (Singapore). Every request in the last 24 h came from India (6,073 via the Chennai edge MAA, 126 via Mumbai BOM). Vercel serves a static site only: no `api/` directory and no functions, so there is no Vercel function region. | Edge→origin time on trivial tables: **p10 45 ms, p50 91 ms per request**. Over a 4–5-deep chain that is roughly 0.2–0.45 s. | `list_projects`, edge logs (`request.cf.*`, `response.origin_time`) |
| 7 | **Advisors.** 29 unindexed foreign keys, all audit columns (`created_by`, `updated_by`, `resolved_by`, …) that no read path filters on. 3 unused indexes. There is **no** `auth_rls_initplan` finding: `auth.uid()` is already wrapped in the only two policies that use it directly. The advisor cannot see #1 because the per-row call goes to a helper function. List filters and sorts use `id`/pkey on tables of ≤12 k rows. | ≈0 ms today | `get_advisors`, `pg_indexes` |

### Lighthouse, mobile throttling (median of 3; production build served locally with gzip)

| Screen | Perf | FCP | LCP | TBT | TTI | JS boot-up | Unused JS |
|---|---|---|---|---|---|---|---|
| Sign-in `/` | 59 | 0.65 s | 6.1 s | 668 ms | 6.3 s | 1.07 s | 376 KB |
| Home `/(tabs)` | 72 | 0.66 s | 4.9 s | 428 ms | 5.2 s | 0.74 s | 391 KB |
| Courses | 86 | 0.64 s | 0.64 s* | 562 ms | 8.1 s | 1.10 s | 368 KB |
| Reports | 63 | 0.67 s | 7.0 s | 496 ms | 8.0 s | 1.08 s | 366 KB |
| Attendance | 84 | 0.67 s | 0.67 s* | 638 ms | 6.9 s | 1.03 s | 366 KB |

Limits, stated: this environment's network proxy blocks the deployed Vercel URL, so these runs measure the
**bundle only**. They have no session and no data waterfall; rows 1–4 above are the data cost. *An LCP equal to FCP
means that screen had no larger paint without data. Which 3 screens are most used was not stated, so every visible tab
was run.

## Per-screen call map (static, from code)
- Shell on every tab: ~13–16 requests, 5 deep. The notifications tray waits on an unrelated 3-step chain, identity is read 3–4×, and theme loads the user, then preferences.
- Home: 4–5 deep, plus 7 parallel metric calls for "This week" (14 requests); in prod the metrics paged to 21 calls.
- Courses / Members / Weekly / Reports: 4–5 deep. Attendance: sessions → records → name chunks (150 ids each, sequential) → names.
- Course detail: the course list loads first, then the day chain, ~9 deep. Member dialog: the whole member list, then that member's week, ~10–11 deep.
- Tabs mount lazily, then stay mounted and refetch on focus once data is older than 12 s.

## Proposed fixes — waiting for go-ahead (RUN MODE: confirm)
1. **(#1, #2)** Additive migration: every policy calls `(select is_active_app_user())` / `(select is_super_admin())` /
   `(select is_subscription_writable())` / `(select current_app_user_id())`. The predicates stay the same and are
   evaluated once per statement. Before PROD: harness replay + `npm run test:db`, permission-reviewer, and the raw SQL shown to you.
2. **(#3)** One shared identity read per session (a single in-flight promise or context), after pinning down why the 10 reads serialize.
3. **(#4)** Dedupe identical in-flight or fresh reads across hooks; stop fetching the empty trailing page.
4. **(#5, later)** Route-level code splitting. Lower payoff than 1–3 and more invasive.
5. **(#6, not recommended now)** Moving the project to `ap-south-1` (Mumbai) saves at most ~45–90 ms per sequential hop. It needs a project migration, and 1–3 cut far more.

## Before / after — Fix 1 (T-043, migration 0079)

Applied to production 24-Sep-2026 **09:14:28 UTC** (ledger `20260924091428 / 0079_rls_helpers_once_per_statement`),
via the Supabase connector's `apply_migration` (one transaction). The in-migration guard (fingerprint `4d21e86e…`) and
equivalence check passed. "Before" was re-measured at 09:10 UTC with the same method, so both columns are like for like.

| Measure | Before | After | Method |
|---|---|---|---|
| 1,000-row read (`member_stats`, as `authenticated`) | **102 ms** (158 ms at 04:50) — `Filter: is_active_app_user()` per row | **2.7 ms** — `InitPlan 1`, evaluated once | `EXPLAIN ANALYZE`, read-only transaction, real owner JWT subject |
| `course_week_day_status` RPC | **211 ms** (403 ms at 04:50) | **12.0 ms** | same |
| Member-list page read, avg (5 tables, `limit=1000`, edge→origin) | **648 ms** (p50 312, p90 1,102; n = 2,986, prior 24 h) | **120 ms** (p50 91, p90 288; n = 60, first 10 min) | edge logs `response.origin_time` |
| Requests inside a parallel data burst | 0.74–1.27 s each; member list + metrics complete **~1.28 s** after the burst starts | 0.28–0.41 s each; member list + metrics complete in **0.23–0.45 s** | edge-log traces, session 5a86… 02:14 vs session c249… 09:14–09:15 |
| Home request count | ~116 per load | **unchanged by design** — fix 1 is database-side; T-406 (fix 3) owns the count | — |
| Home time-to-data, cold start | ~3.8 s (2.4 s identity chain + ~1.3 s burst) | **not yet observed** — no cold start in the logs since 09:14; the 2.4 s identity chain is T-405 (fix 2) and fix 1 does not touch it | — |

Rules unchanged, read in production after the apply: owner sees 1,625 members / 12,320 audit rows / 11 accounts;
staff 1,625 / 0 / 1 (its own); an unknown account 0 / 0 / 0. `pg_policies`: 62, zero bare calls.
The `auth_rls_initplan` advisor output is identical before and after (29 unindexed FKs, 3 unused indexes, no RLS
finding) — it never saw this defect (T-118).

**Burst (cause #2):** per-request time inside a burst fell ~3×, but the burst itself (~40 parallel requests)
is unchanged. Per the owner, compute size stays as is until the burst is re-measured after fix 3.

## Experiment — csv-import runs beside the database (T-408)

**Finding (24-Sep-2026).** Vercel runs no server code for RosiFit (static Expo export; no `api/`, route
handlers, middleware or `regions`), so a Vercel region has no effect. The server code is Supabase Edge
Functions, and `function_edge_logs.x_sb_edge_region` shows every call executing in **ap-south-1 (Mumbai)**,
next to the user, while the database is in **ap-southeast-1 (Singapore)**.

**Why csv-import.** The preview path makes **~26 database round trips in sequence**: `auth.getUser`,
`app_users`, offering, same-file check, same-session check, staff names, five keyset-paged full reads of
3 pages each (aliases, members, primary emails, stats, enrollments), offerings/courses/branches, the
`csv_imports` insert and the audit RPC. There are no per-row query loops; matching is in memory. Commit is
3 trips, with the work inside `commit_csv_import`. Each trip crosses Mumbai → Singapore.

**Mechanism.** `?forceFunctionRegion=ap-southeast-1` on the csv-import URL only (`src/data/functionRegion.ts`).
The SDK's `region:` option was NOT used: it also sends an `x-region` header, which
`supabase/functions/_shared/cors.ts` does not allow, so every browser preflight would fail. Supabase's
regional-invocation guide names the query parameter for CORS requests. There is no function redeploy, no CORS
change, and no other function moves.

### Baseline — every csv-import in the logs (all ap-south-1)

| Import (UTC) | Rows | Preview `execution_time_ms` | Commit `execution_time_ms` | Preflights | First preflight → commit logged |
|---|---|---|---|---|---|
| 23 Sep 11:38 | 15 | 5,709 | 1,677 | 200 / 140 | ~7.8 s |
| 23 Sep 14:06 | 15 | 5,886 | 1,409 | 244 / 141 | ~7.8 s |
| 24 Sep 01:11 | 22 | 3,597 | 1,112 | 216 / — | ~4.9 s |
| 24 Sep 03:06 | 14 | 5,503 | 793 | 219 / 138 | ~6.5 s |
| 24 Sep 10:45 | 98 | 5,150 | 2,043 | 244 / 157 | ~7.6 s |
| **Median** | — | **5,503** | **1,409** | — | **~7.6 s** |

Errors: 0 of 19 calls (all HTTP 200). Preview time barely moves with file size (14 → 98 rows), so it is the
sequential round trips, not the rows. The last column is server-side (edge-log timestamps), not a browser
measurement.

### After — to be filled from real imports once deployed
Same queries: `function_edge_logs` for `/functions/v1/csv-import`, grouped by `x_sb_edge_region`, with
`execution_time_ms` for preview and commit, joined to `csv_imports.row_count` by time. Compare files of
14–98 rows. **Not measured yet**: no import has run with this change, and this session cannot run one.
