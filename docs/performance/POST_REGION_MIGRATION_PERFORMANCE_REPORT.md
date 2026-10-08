# RosiFit — Post-Region-Migration Performance Report (Singapore → Mumbai)

**Date:** 8 October 2026, 06:30–06:45 UTC · **Repository state:** branch
`claude/inspiring-lamport-icxy6z` at `97bcaec` (= `main`, merge of PR #71) · **Mode:**
investigation only. No application code, schema, index, Supabase setting, secret, Vercel
variable, function or production row was changed. No production system was reached at all
(see §4.1).

Evidence classes, used on every figure below:

| Class | Meaning |
|---|---|
| **PROD-SG** | Measured in the Singapore production project, read-only, before the move. Dated. |
| **LOCAL** | Measured on this container today, 8 Oct, against the code at `97bcaec`: the harness Postgres 16, or the production web bundle in headless Chromium against a local stand-in API. Region-independent by construction. |
| **CODE** | Established by reading the code at `97bcaec` and the open cutover branches. |
| **MODEL** | A derived expectation, never a measurement. Labelled every time it appears. |
| **UNAVAILABLE** | Could not be measured from this session. |

---

## 1. Executive summary

1. **No post-migration production measurement exists, here or in the repository.** This session's
   Supabase connector refuses both RosiFit project refs (`lbyqipunsbzkcvdrxach` Mumbai and
   `lhpzhkzbnquwjljmbylo` Singapore: "You do not have permission to perform this action"; it lists
   only two unrelated projects), and the environment's network policy denies CONNECT to
   `*.supabase.co` and to `rosi-fit.vercel.app` (HTTP 403 from the proxy on every attempt). The
   repository holds no cutover record either: no `ENVIRONMENTS.md` "Production moved" entry, no
   post-cutover edge-log figure, no RUN_LOG row. **Every "After Mumbai" cell in this report is
   therefore `N/A`, and the overall verdict is INCONCLUSIVE.** §4.1 names the two settings that
   would unblock a re-run.
2. **The BEFORE baseline is unusually good.** Three dated production investigations (24 Sep,
   4 Oct, 7 Oct) recorded Singapore-era figures with method and sample size for every operation
   the brief asks about (§3). They are reproduced with their sources, not re-derived.
3. **The repository's own numbers say the region was never the main cost.** On the busiest
   recorded day (1 Oct, ~38k requests) the database answered list reads in 2–16 ms while the
   edge→origin time was 133–145 ms p50 for the cheapest request; of that, the India→Singapore
   leg was measured at roughly 45–90 ms (p10 45 / p50 91 ms on trivial tables, 24 Sep). The rest
   is gateway, PostgREST and in-burst queueing, which do not move with the region. On a screen
   that chains 3–5 sequential requests the move can save about 0.15–0.45 s (MODEL). The 4–6 Oct
   fix branch, applied to production on 7 Oct, removed far more than that by cutting request
   counts (Home 40–47 → 27 requests, LOCAL today) and DOM sizes (Members 29,703 → 594 nodes).
4. **One accidental cross-region dependency is on `main` and in the bundle it builds.**
   `src/data/functionRegion.ts` still pins `csv-import` to `ap-southeast-1` — the T-408
   experiment that moved the function *next to the Singapore database*. With the database now in
   Mumbai that pin runs the import function in Singapore and sends every one of its database
   round trips Singapore → Mumbai, the exact inversion of its purpose. The export built from
   `97bcaec` today contains `{'csv-import':'ap-southeast-1'}` in `__common-*.js`. The fix exists
   (PR #69, branch `cutover/mumbai-app`, "merge only during cutover") but is **open and
   unmerged**. Whether the live Vercel build carries the pin could not be checked from here
   (§15.3 gives the one-line check).
5. **The intentional cross-region dependency (PIN pepper migration, PR #70) is designed to cost
   one server-to-server call per staff account, once.** `auth-login` and `recovery-check` call
   Singapore's `pin-verify` only for credentials still at `pin_pepper_version = 0`, with an 8 s
   timeout, fail-closed, then re-key under Mumbai's pepper and never call again. Eleven accounts.
   PR #70 is a draft marked "DO NOT DEPLOY"; whether it is live is UNAVAILABLE.
6. **What is left after the move is not regional:** JS boot (~467–493 KB compressed shared JS,
   2.5–3 s on a mid-range phone), the 23–24-request register re-read on every first visit to a
   screen and on every return to the app after 12 s, cold-booted Edge Functions with sequential
   authz hops, the whole-offering `member_stats` recompute on CSV commit, and the Nano tier's
   60-connection / 2 MB `work_mem` ceiling inside request bursts (§17, §19).

---

## 2. Migration context

| Item | Value | Source |
|---|---|---|
| Previous production | `lhpzhkzbnquwjljmbylo` ("Rosifit"), `ap-southeast-1` Singapore, Postgres 17.6, Nano | `requests/2026-10-06-move-production-to-mumbai.md` (branch `claude/funny-ramanujan-w7au8a`), `ENVIRONMENTS.md` |
| Current production (per the brief) | `lbyqipunsbzkcvdrxach` ("Rosifit_Claude"), `ap-south-1` Mumbai, Postgres 17.11, Nano, same org, Free plan | same request file |
| Method decided | Byte-for-byte clone (roles, schema, data, auth rows, migration ledger); 11 Edge Functions redeployed from the repo; Vercel + SNS re-pointed; Singapore frozen 30 days as an unsubscribe forwarder, pause at 30, delete at 90 | same request file, DECISION block |
| Where users and the other tiers already were | Every request from India (6,073 via Chennai MAA, 126 via Mumbai BOM, 24 Sep sample); Edge Functions executed in `ap-south-1` (`x_sb_edge_region`); SES in `ap-south-1`; Vercel serves a static export (no server region) | `RUN_app-feels-slow.md` rows 6 and T-408 |
| What the move changes, physically | The database and GoTrue (auth) move from Singapore to Mumbai. Functions, SES and users were already in Mumbai. | CODE + the above |
| Compute | Nano on both; the Free plan cannot raise it, so the parallel-burst finding (cause 2 of 24 Sep) is unchanged by the move | request file, "OBSERVED AT INTAKE" |
| Repo work done for the move | PR #67 (B1, unsubscribe pages accept both refs) merged; PR #68 (B2 forwarder) merged; PR #71 (forwarder re-signs old links) merged 8 Oct 02:59 UTC; **PR #69 (A10, remove the csv-import pin, config.toml → Mumbai) OPEN, draft**; **PR #70 (PIN pepper migration) OPEN, draft, "DO NOT DEPLOY"** | GitHub, `git log` |
| Cutover timestamp | **Not recorded anywhere in the repository.** `supabase/config.toml` on `main` still says `project_id = "lhpzhkzbnquwjljmbylo"`; `ENVIRONMENTS.md` still names Singapore as production. | CODE |

The last production-side records in the repo pre-date the move and were taken on Singapore:
migrations 0085–0090 applied 7 Oct 11:44–11:50 UTC; `csv-import` v20 and `send-followups` v25
deployed 7 Oct 11:55–12:01 UTC from `main` `6a03c51` (TEST_SUMMARY entries in commits `179c82b`
and `e7853d7`).

---

## 3. Before baseline (Singapore)

All figures PROD-SG unless marked. "n" is the sample count where the source states one.

### 3.1 Per-request network floor and database time

| Metric | Value | Date / window | n | Method |
|---|---|---|---|---|
| Edge→origin, trivial tables, p10 / p50 | 45 / 91 ms | 24 Sep, last 24 h | ~6,200 requests | `edge_logs` `response.origin_time` |
| Edge→origin, cheapest request (`app_users`, 11 rows) p50 / p90 | 133 / 211 ms | Wed 1 Oct, full day | 1,363 | same |
| Edge→origin, `courses` / `branches` / `course_offerings` p50 | 135–136 ms | 1 Oct | 2,288–3,210 each | same |
| Edge→origin, 1,000-row register pages (`members`, `member_*`) p50 / p90 | 142–160 / 303–359 ms | 1 Oct | 2,426–4,038 each | same |
| Edge→origin, `member_period_metrics_page` RPC p50 / p90 / p99 | 276 / 575 / 1,299 ms | 1 Oct | 5,221 | same |
| PostgREST+DB (`x_envoy_upstream_service_time`) p50, list reads | 2–16 ms | 1 Oct | as above | same |
| PostgREST+DB p50 / p90, metrics RPC | 78 / 275 ms | 1 Oct | 5,221 | same |
| Gateway overhead (origin − upstream) p50 / p90 | 133 / 572 ms | 3–4 Oct, 24 h | 1,186 | same |
| Hourly p50 regardless of volume | 142–150 ms | 1 Oct, every hour | 490–11,824 per hour | same |
| Inside a 30–40-request burst, per request | 0.5–0.9 s (max 1.9–2.0 s) | 1 Oct 02:16, 14:09 | traces | same |
| CORS preflight | 0 ms origin, one full browser RTT each | 3–4 Oct | ~250 | same |
| Token refresh `/auth/v1/token` p50 | 766–927 ms | 1–4 Oct | 6–10/day | same |
| GoTrue `/auth/v1/user` (functions' `getUser`) | ~760 ms p50 at the edge | 1–3 Oct | — | same |

Source: `docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md` §2, §14, §20;
`scripts/perf/investigation-2026-10-04/MEASUREMENT_NOTES.md`; `RUN_app-feels-slow.md` row 6.

### 3.2 Screens and navigation (pre-fix code, Singapore)

| Operation | Value | Date | Method |
|---|---|---|---|
| Cold start → Home, requests / JSON | 40–47 / 1.4 MB; waterfall 1.5–2.5 s (2–3 s in a burst) | 4 Oct | prod trace + LOCAL stand-in, §19 of the 4 Oct report |
| Home time-to-data, cold | ~3.8 s (2.4 s identity chain + ~1.3 s burst) | 24 Sep trace | edge logs |
| First visit to Members / Courses / Reports | 18–19 requests (33 for Members incl. register), 1.0–1.6 s | 4 Oct | LOCAL + prod per-request costs |
| Return to the app after 12 s, 3+ tabs visited | 28–40 requests, 1–2 s; 384 fan-outs in 49 min for one browser | 1 Oct | edge logs |
| Course detail | ~40 requests (+15 per day tap), 2–3 s | 4 Oct | code + trace at 130–140 ms/hop |
| Lighthouse mobile (bundle only, no data): Sign-in / Home / Members LCP | 6.1 / 4.9→3.95 / 7.3→5.8 s; TBT 668 / 428→343 / 627→499 ms | 24–25 Sep, median of 3 | Lighthouse, simulated slow 4G ×4 CPU |
| Shared start-up JS | 702 → 467 KB compressed per screen (T-407); 462 KB gzip / ~370 KB brotli | 25 Sep, 4 Oct | `js-budget.js`, source map |

### 3.3 Member operations

| Operation | Value | Date | Method |
|---|---|---|---|
| Member list (Members tab) | 33 requests, 1.4 MB; 29,703 DOM nodes; script 1,655 ms; long tasks 2,565 ms (fast CPU) | 4 Oct | LOCAL stand-in, prod bundle |
| Member search, first keystroke | Attendance 928 ms; course roster 824 ms; Members "same shape" (not captured) | 4 Oct | LOCAL |
| Member detail open | ≈24+8+4+3 requests when nothing fresh; 1–2 s | 4 Oct | code + prod costs |
| `create_member` RPC edge→origin p50 / p90 | 301 / 473 ms | 3–4 Oct | edge logs, n=8 |
| `update_member` DB mean | 248.7 ms, 49,031 blocks/call (unscoped recompute) | since 1 Sep | `pg_stat_statements`, n=139 |
| Save → list refreshed | 1.5–2.5 s (41–45 requests after PR #63; ~250 before) | 3 Oct | edge logs |
| `delete_member` DB mean | 44.7 ms | since 1 Sep | `pg_stat_statements`, n=406 |

### 3.4 Attendance

| Operation | Value | Date | Method |
|---|---|---|---|
| Attendance week load | ~50 requests (prod week of 2,220 rows); 1.5–3 s; 49,476 DOM nodes locally | 4 Oct | prod + LOCAL |
| `attendance_records in(session_id)` DB mean | 71.8 ms (max 983) | since 1 Sep | `pg_stat_statements`, n=2,125 |
| `course_week_day_status` RPC | 3.5 ms DB; 168–276 ms p50 origin | 1–4 Oct | `EXPLAIN`, edge logs |
| Attendance search, first key | 928 ms (fast CPU) | 4 Oct | LOCAL |
| `set_attendance` | cheap (8 statements, scoped) but rings both buses → cascade | 4 Oct | code + trace |

### 3.5 CSV import (`csv-import` Edge Function; pinned to Singapore since T-408, 24 Sep)

| Stage | Value | Date | n | Method |
|---|---|---|---|---|
| Browser parse, 10 → 5,000 rows | 0.8 → 10.9 ms | 4 Oct | — | LOCAL `csvtime.ts` |
| Preview `execution_time_ms`, function in Mumbai, DB in Singapore (pre-T-408) | median 5,503 ms (14–98 rows) | 23–24 Sep | 5 imports | `function_edge_logs` |
| Preview, function pinned to Singapore beside the DB | 4,368–5,266 ms (p50 ≈ 4,600), flat vs rows | 2 Oct | 9 imports | same (−16 % from the pin) |
| Commit `execution_time_ms` | 972–1,959 ms (median 1,409 pre-pin) | 23 Sep–2 Oct | 14 | same |
| `commit_csv_import` DB mean | 353.9 ms, 46,657 blocks/call | since 1 Sep | 175 | `pg_stat_statements` |
| Fuzzy matcher worst case, 1,000 × 1,644 / × 5,000 | 4.1 s / 12.7 s (CPU limit 2 s) → after phase 7: 1.4 s / 3.3 s | 4 Oct / 6 Oct | — | node, same module |
| Harness commit 100 / 500 / 1,000 rows at 1,500 members (pre-0085/0089 code) | 1.46 / 2.61 / 4.16 s | 4 Oct | — | LOCAL harness |
| Browser first preflight → commit logged | ~7.6 s median | 23–24 Sep | 5 | edge-log timestamps |

### 3.6 Authentication

| Operation | Value | Date | Method |
|---|---|---|---|
| Sign-in: `auth-lookup` + `auth-login` execution time | 1,061 + 1,930 ms (3 Oct); 3,260 + 3,720 ms (2 Oct); "3–7 s combined, two cold boots" | 2–3 Oct | `function_edge_logs` |
| Cold boots | 64 "booted (time: 22 ms)" lines on 1 Oct — essentially every call | 1 Oct | `function_logs` |
| Session restore, token valid | 2 identity-class round trips before the first data request (~0.15–0.3 s) | 4 Oct | trace |
| Session restore, token expired | +0.77–0.93 s (`/auth/v1/token`) | 1–4 Oct | edge logs |
| Unauthenticated fan-out | 33 × 401/403 per day; 30 permission-denied in 1 s | 3 Oct | edge + postgres logs |

### 3.7 Edge Functions and email

| Function | Execution time | Date | n | Notes |
|---|---|---|---|---|
| `send-followups`, serial loop | 1 recipient 4.5 s; 136 → 51 s; 256 → 120,138 ms; 291 → 113 s = **0.36–0.41 s per recipient** | 1–3 Oct | 16 | 3 serial DB writes + 1 SES call per recipient, no timeout |
| `unsubscribe` | 2,153–4,050 ms (p50 ≈ 3,000) | 1–3 Oct | 8–10/day | 3–6 DB trips |
| `ses-feedback` | 473–3,820 ms | 1–3 Oct | 5–7/day | SNS confirm fetch |
| `auth-bootstrap`, `pin-*`, `recovery-check` | not measured (rare) | — | — | 4–11 sequential trips by code |
| SES API latency, isolated | **not separately measured** — only the per-recipient composite above | — | — | SES endpoint `email.ap-south-1.amazonaws.com` (`email.ts:82`, `AWS_REGION`) |

### 3.8 Database compute, Singapore, same code as today (post-fix, 7 Oct)

These are the only PROD-SG figures taken on the code that production now runs, and so the
most like-for-like BEFORE values for the database layer:

| Query | Before fix (PROD-SG) | After fix, still Singapore (PROD-SG, 7 Oct 11:44–11:50 UTC) |
|---|---|---|
| `member_period_metrics_page`, one week | 426 ms, 13,999 buffers | **13 ms, 1,064 buffers** (0086) |
| Whole-academy `recompute_member_stats()` SELECT | 170 ms + upsert, 52,846 buffers | **362 ms, 21,937 buffers** read-only EXPLAIN, 1,610 members (0089) |
| `update_member` / `commit_csv_import` | unscoped recompute per call | scoped (0085); DB means **not yet re-read** after the apply |

Source: TEST_SUMMARY entry "PRODUCTION APPLY: MIGRATIONS 0086, 0087, 0085, 0088, 0090, 0089 —
07-Oct-2026" (commit `179c82b`).

**BEFORE BASELINE UNAVAILABLE** for: Payments and Settings screens (they do not exist — the
tab bar is Home / Reports / More / Courses, with Members, Weekly and Attendance reached through
More; "Reach out" is `app/send/`), SES request latency in isolation, Edge Function cold-start
time as a separate number, real-user render timings on phones, and browser↔Cloudflare RTT.

---

## 4. After baseline (Mumbai)

### 4.1 Why there is none

| Attempt | Result |
|---|---|
| `mcp__Supabase__list_projects` | Lists `JalsaRestaurant` and `JalsaRestaurant-test` (`ap-southeast-2`) only |
| `get_project` / `query_logs` on `lbyqipunsbzkcvdrxach` | `MCP error -32600: You do not have permission to perform this action` |
| `get_project` on `lhpzhkzbnquwjljmbylo` | same |
| `curl https://lbyqipunsbzkcvdrxach.supabase.co/rest/v1/` | proxy: `CONNECT tunnel failed, response 403` |
| `curl https://lhpzhkzbnquwjljmbylo.supabase.co/rest/v1/` | same |
| `curl https://rosi-fit.vercel.app/` | same |
| Repository, branches, PRs | No cutover record, no post-cutover log excerpt, no Mumbai figure |

The environment's network policy denied `lbyqipunsbzkcvdrxach.supabase.co`,
`lhpzhkzbnquwjljmbylo.supabase.co` and `rosi-fit.vercel.app`. Network access is changed in the
cloud environment's settings (the environment menu in the session's title bar, then Edit):
either a broader access level, or those hosts added under Allowed domains with "Allow package
managers" left ticked (https://code.claude.com/docs/en/cloud-environments#network-access).
The Supabase connector is attached to an account or organisation that does not hold the RosiFit
projects; it has to be reconnected with the organisation that owns `lbyqipunsbzkcvdrxach`.
With either of those two in place, §21 lists the exact queries to run.

### 4.2 What was measured instead (LOCAL, code at `97bcaec`, 8 Oct)

These isolate the components the region cannot change. They are not Mumbai figures.

**Harness Postgres 16, `seed_scale.sql` at 1,500 members (235,500 attendance rows, 261
sessions), full migration replay 0001–0090 (every migration on `main`) succeeded, every write rolled back
(`scripts/perf/investigation-2026-10-04/loadtest.sh 1500`):**

| Query | Cold | Warm | n |
|---|---|---|---|
| `member_period_metrics_page`, one week, page 1 | 8.1 ms | 4.3 ms | 2 |
| same, page 2 / one-day bucket | 4.1 ms / 2.0 ms | — | 1 each |
| `expected_members_for_session` | 5.1 ms | 3.8 ms | 2 |
| `current_streak_for`, one member | 1.7 ms | — | 1 |
| `recompute_member_stats()` whole academy | 441 ms | 439 ms | 2 |
| `recompute_member_stats(array[1 member])` | 2.2 ms | — | 1 |
| `commit_csv_import` 100 / 500 / 1,000 rows (sweep inserts 1,400 / 1,000 / 500 absent rows) | 674 / 621 / 806 ms | — | 1 each |

**Production bundle (`expo export --platform web`, 36 chunks, 3.22 MB raw) in headless Chromium
412×915 against the realistic stand-in API (1,644 members, 130 ms answer delay, HTTP/2):**

| Phase | Requests | First start → last end |
|---|---|---|
| Cold start on `/`, signed in, fresh token | **27** | 799 ms |
| First visit to a register-reading screen (two observed) | 23–24 | 616–623 ms |
| Idle 13 s | 0 | — |
| Return to the app after 13 s idle | 24 | 333–343 ms |
| Return within 12 s | 0 | — |
| Network requests while typing, any screen | 0 (unchanged from 6 Oct) | — |

(The scenario's tab selectors pre-date the current tab bar, so the per-tab labels in the raw log
are unreliable; the request counts per phase are what they are.) Compressed JS per screen,
gzip: Home **493 KB** (entry 281 + common 186 + route 18 + layout 3), Attendance / Members /
Reports / Courses **475–476 KB**. Every 1,644-row table costs two pages (1,000 + 644); the empty
terminator page is gone (commit `a48b750`).

---

## 5. Navigation performance (Q1)

**Verdict: INCONCLUSIVE** — no Mumbai navigation trace. What is known:

- Per route the user waits for: static HTML from Vercel (TTFB 2–3 ms locally; not an issue,
  §4 of the 4 Oct report), JS download and parse (281 + 186 KB gzip shared, ~2.5–3 s on a
  mid-range phone, unchanged by the move), session restore (2 identity reads), then the data
  waterfall: 23–27 requests, 2 pages deep per big table, 3–5 sequential hops.
- The move touches only the waterfall's per-hop floor. MODEL: with the India→Singapore leg at
  45–90 ms per hop removed and 3–5 sequential hops per screen, **0.15–0.45 s per first visit**;
  0 s on a return to an already-loaded tab (0 requests, unchanged).
- Breakdown for a first visit to Members on a phone (MODEL from the measured parts): browser
  ~0 (cached shell) · Vercel ~0 · JS 2.5–3 s · Supabase waterfall 0.6–1.0 s (was ~1.0–1.6 s) ·
  Edge Function 0 · database 2–16 ms per request · client render ~0.2 s (windowed list). **JS and
  the waterfall's request count dominate, not the region.**

---

## 6. Page load performance (Q2)

**Verdict: INCONCLUSIVE.** Initial load = shell paint (~0.28 s) → JS → `restoreSession` →
identity → fan-out. Only the last two steps go to Supabase. LOCAL today: 27 requests, 799 ms on
a 130 ms stand-in; the equivalent Singapore floor would be ~135 ms per hop and in Mumbai (MODEL)
~50–90 ms. Lighthouse mobile scores of 65–87 with LCP 3.95–5.8 s (25 Sep) are bundle-bound and
cannot change with the region.

---

## 7. Member performance (Q4, Q5)

| Operation | Browser→Vercel | Browser→Supabase (per hop) | Edge Function | PostgREST/RPC + DB | Client | Region effect |
|---|---|---|---|---|---|---|
| A. Member list | 0 (cached) | 23–24 requests, 2 deep per table | — | 2–16 ms each | 594 DOM nodes, no long task (6 Oct) | MODEL −0.1 to −0.2 s on the two-deep pages |
| B. Member search | 0 | **0 requests** (client-side, debounced) | — | — | 16–32 ms per key | **none** — never touches the network |
| C. Member detail | 0 | reads the register (shared for 5 s) + the member's week, 3 deep | — | ms | small | MODEL −0.15 to −0.3 s |
| D. Create member | 0 | `create_member` RPC (301 ms p50 origin, 67.5 ms upstream, n=8) + refresh | — | 67 ms DB | — | MODEL −45 to −90 ms on the RPC |
| E/F. Edit / save | 0 | `update_member` RPC + one shared register refresh (35 requests on the fake network, 6 Oct) | — | was 249 ms mean DB; scoped since 0085 (7 Oct), **not re-read** | — | MODEL −45 to −90 ms on the RPC |

**Which dominates:** for A and C the request count; for D–F the server RPC plus the refresh
burst; for B nothing on the server. Database latency is 2–16 ms per read; the per-request
gateway floor (≈ 40–90 ms that stays after the move) times the hop count is what the user feels.

---

## 8. Attendance performance (Q6)

| Operation | Where the time goes | Region effect |
|---|---|---|
| A. Page load | sessions → records (chunks of 150 ids, paged) → names (one shared read since phase 2) → catalogue; 22–27 requests (6 Oct fake network, was 85) | MODEL −0.2 to −0.4 s on the 4-deep chain |
| B. Search | client-side, 16–48 ms per key, 0 requests | none |
| C. Session / period selection | re-runs the chain | as A |
| D. Record loading | `attendance_records in(session_id)` 71.8 ms mean DB (max 983) | the DB part is unchanged by region |
| E. Save / update | `set_attendance` (scoped, 8 statements) + bus refresh (visible screen only since phase 1) | MODEL −45 to −90 ms |
| F. Upload | §9 | §9 |

---

## 9. CSV import performance (Q7)

Pipeline at `97bcaec` (CODE), with the stage timings that exist:

| Stage | Value | Class |
|---|---|---|
| Upload start → complete | ≤ 250 KB JSON body, one POST + preflight | CODE |
| CSV parse | 0.8–10.9 ms (10–5,000 rows) | LOCAL, 4 Oct |
| Preview, function: authz (`getUser` → `app_users`, 2 sequential), offering / same-file / supersedes checks (3–5 sequential), then **nine register reads in parallel** (`Promise.all`, `index.ts:294`; each 2 pages sequential), matching in memory by lookup (fuzzy tier prepared once), insert + audit (2) | ≈ 8–10 sequential stages; wall time **UNVERIFIED in production** since v20 deployed 7 Oct ("no invocations yet") | CODE |
| Matching | 1,500 × 1,644 rows 1.4 s; 1,000 × 5,000 3.3 s (worst case, every row unmatched); production files have 0–8 unmatched rows → ≤ 50 ms | LOCAL node, 6 Oct |
| Commit, DB | 100 / 500 / 1,000 rows at 1,500 members: **674 / 621 / 806 ms** (was 1,460 / 2,610 / 4,160 before 0085 + 0089) | LOCAL harness, today |
| UI completion | `attendanceImported` → members + attendance buses → visible screen refreshes (23–24 requests) | CODE |

**The five previously identified scalability risks, today:**

| Risk | Status at `97bcaec` | Contributing to latency today? |
|---|---|---|
| Fuzzy matching | bigrams prepared once per request, exact length band (`_shared/match.ts`) | No: ≤ 50 ms with ≤ 8 unmatched rows; 3.3 s only if 1,000 rows all miss at 5,000 members |
| O(N×M) comparisons | exact/alias tiers are `Map` lookups (`load.ts`); only the fuzzy tier scans | No |
| Edge Function CPU limit (2 s) | only the fuzzy tier is CPU-bound | Not at today's files |
| PostgREST/RPC row caps | every read keyset-paged, ends on a short page after a longer one (`_shared/pageAll.ts`) | No |
| Unpaged RPCs | `send-followups` reads metrics through one paged call per batch (`load.ts`) | No |

**Region, specifically (CODE):** the preview's DB hops are the only part of this pipeline the
region touches. While `main` pins the function to `ap-southeast-1`, those hops cross
Singapore → Mumbai (MODEL: +45–90 ms × ~8–10 sequential stages ≈ **+0.4–0.9 s per preview** and
+0.15–0.3 s per commit, plus the browser's own trip to the Singapore edge). With PR #69 merged
and built, the function runs in `ap-south-1` beside the database and every hop is in-region.

**Verdict: INCONCLUSIVE**, with a flagged risk of DEGRADATION versus the 2 Oct baseline while
the pin is live.

---

## 10. Authentication performance (Q9, Q10)

**Sign-in (CODE at `97bcaec`, as deployed on 7 Oct if unchanged by the cutover redeploy):**
`auth-lookup` (1 DB read) then `auth-login` (`app_users` read → lock/disabled checks →
`signInWithPassword` to GoTrue → 2 writes → `audit_log` RPC), each a cold isolate. GoTrue and
the database both moved with the project, so (MODEL) the 5–7 function→service hops each lose the
Mumbai→Singapore leg: **−0.25 to −0.6 s of the 3–7 s** measured on 2–3 Oct. The two cold boots
and the sequential shape remain.

**PIN verification / PIN migration (Q10), CODE from PR #70, branch `feat/pin-pepper-migration`:**

| Element | Latency behaviour |
|---|---|
| `pin_pepper_version = 1` (re-keyed under Mumbai's pepper) | local sign-in, Singapore never contacted — zero added latency |
| `pin_pepper_version = 0` (copied from Singapore) | one HTTPS POST Mumbai function → `https://lhpzhkzbnquwjljmbylo.supabase.co/functions/v1/pin-verify` (HMAC-signed, ±60 s, nonce), `AbortSignal.timeout(8_000)`, `redirect: 'error'`; Singapore's function does its own cold boot + GoTrue sign-in and sign-out; then Mumbai `rotatePin` + local sign-in. MODEL: **+1.5 to +4 s once**, then never for that account |
| Singapore unreachable / paused | 503 after up to 8 s, fail closed, attempt not counted |
| Scope | staff only, 11 accounts; `supabase/reports/pin_pepper_coverage.sql` reports when every row is at 1 |
| Deployed? | **UNAVAILABLE** — PR #70 is a draft marked "DO NOT DEPLOY"; `pin-verify` is not in `supabase/functions/` on `main` |

**Verdict: INCONCLUSIVE.** Expected direction: improvement for steady-state sign-in; a bounded,
one-time cost per staff account during the pepper migration.

---

## 11. Edge Function performance (Q8)

Inventory at `97bcaec` (CODE). "Deployed version" is the last one the repo records, on
**Singapore**; the Mumbai versions after the cutover redeploy are UNAVAILABLE.

| Function | Deployed (SG, last record) | Region of execution | DB calls (`.from` / `.rpc` sites) | External | Singapore dependency after the move |
|---|---|---|---|---|---|
| `auth-login` | v11 (18 Sep) | caller's (`ap-south-1`) | 4 / 2 + GoTrue sign-in | — | **intentional, temporary** (PR #70, version-0 credentials only) |
| `auth-bootstrap` | v12 | `ap-south-1` | 8 / 1 + GoTrue | — | none |
| `auth-lookup` | v5 | `ap-south-1` | 1 / 0 | — | none |
| `recovery-check` | v11 | `ap-south-1` | 10 / 3 + GoTrue | — | **intentional, temporary** (PR #70) |
| `pin-reset-request` | v5, `verify_jwt=true` (T-127) | `ap-south-1` | 6 / 1 | — | none |
| `pin-issue` | v13 (stale, T-130) | `ap-south-1` | 11 / 5 | GoTrue admin sessions fetch | none |
| `pin-reset` | v13 | `ap-south-1` | 5 / 2 | — | none |
| `csv-import` | **v20 (7 Oct, from main)** | **`ap-southeast-1` while `main`'s pin is in the bundle** | 18 / 3, nine in parallel | — | **accidental** (§15) |
| `send-followups` | **v25 (7 Oct, from main)**, `SEND_CONCURRENCY` set by the owner | `ap-south-1` | 18 / 4, pool of 4, 15 s SES timeout | SES `email.ap-south-1.amazonaws.com` | none |
| `ses-feedback` | v4 | `ap-south-1` (called by SNS) | 3 / 0 | SNS confirm fetch | none (SNS re-pointed at cutover per the plan; UNAVAILABLE) |
| `unsubscribe` | v9 (3 Oct) | `ap-south-1` | 6 / 3 | — | none on Mumbai; **Singapore's slot runs the forwarder** (intentional) |
| `pin-verify` | not on `main` | Singapore only, by design | read-only | — | it *is* the intentional dependency |

Cold starts: every authenticated function still runs `getUser` (GoTrue HTTP) then `app_users`
sequentially before its own work (`_shared/authz.ts:23-27`); 64 boots/day were logged on 1 Oct.
The move makes those two hops in-region (MODEL −90 to −180 ms per call) and changes nothing
about the boot itself.

**Verdict: INCONCLUSIVE** (no `function_edge_logs` reachable).

---

## 12. Email / SES performance (Q11, Q12)

| Segment | Before (PROD-SG) | After (Mumbai) | Region effect (MODEL) |
|---|---|---|---|
| UI request → function invocation | one POST + preflight to the caller-nearest edge | N/A | none (function region unchanged) |
| Function → database: batch insert, 8 chunked/paged reads, one paged metrics read, then per recipient 3 serial writes | each hop Mumbai → Singapore | N/A | **in-region now**: −45 to −90 ms × (≈12 + 3 per recipient) hops; at 256 recipients ≈ −35 to −70 s of the 120 s serial figure, before the pool of 4 |
| Function → SES API (`email.ap-south-1.amazonaws.com`, SigV4, 15 s timeout) | inside the 0.36–0.41 s per-recipient composite; never isolated | N/A | **none** — SES was and is `ap-south-1`, called from an `ap-south-1` function |
| SES processing, recipient delivery | not application latency | — | none |

Nothing was sent and no recipient was used. The send-initiation latency the UI sees is the
function's wall time; the only region-sensitive part of it is the DB chain, and the 7 Oct
`send-followups` v25 (bounded pool of 4) was deployed with "no invocations yet", so **no
production figure exists for the current code in either region.**

**Verdict: INCONCLUSIVE**; SES request latency expected UNCHANGED; send initiation expected
to improve from the pool and the in-region DB chain, in that order.

---

## 13. Database performance (Q3)

| Table / query | Singapore facts (PROD-SG) | Today, LOCAL harness 1,500 members | Index / scan notes |
|---|---|---|---|
| `members`, `member_stats`, `member_enrollments`, `member_aliases`, `member_emails` keyset pages | 15–37 ms mean DB, ~300 blocks; 5–12 ms p50 upstream | — | keyset on pkey; the pre-24-Sep OFFSET shapes (205–620 ms) are historical |
| `member_period_metrics_page` | 69.9 ms mean cumulative, 13,361 blocks (generic plan); **13 ms, 1,064 buffers after 0086** | 4–8 ms | plans with its dates since 0086 |
| `member_period_metrics_buckets` (0087) | seven-day bucket = seven page calls, row-equal | — | one call for the Overview |
| `attendance_records` | 18,305 rows; `idx_tup_fetch` 617 M (repeated whole-period scans, pre-0086) | 235,500 rows seeded | partial index on `deleted_at` listed as "missing, low value" |
| `audit_logs` | 15,832 rows, 11 MB, 4 indexes; per-row `audit_row_change` trigger | — | 29 unindexed FKs are audit columns no read filters on |
| `csv_imports` | `commit_csv_import` 353.9 ms mean, 46,657 blocks (unscoped) | 621–806 ms for 100–1,000 rows incl. the sweep | `(offering_id, session_date, status)` index "when imports grow" |
| `app_users` | 19.7 M seq scans on 11 rows (RLS helper + audit per statement; InitPlan since 0079) | — | by design, cheap each |
| `member_schedules` | 0 rows, read on every register load | still read (LOCAL: ×1 per fan-out) | unnecessary read, carried |
| `work_mem` / temp files | 2 MB; 122 GB temp files since 25 Aug on a 39 MB DB | — | Nano tier; unchanged by the move |

N+1: none on the client. Unbounded: none since the pagers. Duplicates: 0 within the 5 s
shared-read window (LOCAL); the register is still re-read per first screen visit and per return
after 12 s (23–24 requests), which is repetition by design, not duplication. PostgREST overhead:
origin − upstream ≈ 130 ms p50 in Singapore; the part attributable to the region is the 45–90 ms
leg; the remainder is gateway/PostgREST/queueing and travels with the project.

**Verdict: INCONCLUSIVE** for "faster after Mumbai". The database's own work is 2–16 ms per read
and milliseconds in the harness; the region never showed up inside those numbers, only in front
of them.

---

## 14. Frontend performance

Cases where Supabase is fast but the screen is still slow (LOCAL, code at `97bcaec`), all
classified **FRONTEND** or **CLIENT PROCESSING**:

| Finding | Measure | Class |
|---|---|---|
| Shared JS every screen downloads | 467–493 KB gzip (entry 281 + common 186); owner target 250 KB not met; this stack's floor ≈ 281 KB (`react-dom` + `react-native-web` + `expo-router`) | FRONTEND |
| JS boot on a mid-range phone | 2.5–3 s (CPU ×4 simulation, 25 Sep / 4 Oct) | CLIENT PROCESSING |
| Register re-read per first screen visit | 23–24 requests, 2 pages per big table, no cross-screen cache beyond 5 s | FRONTEND (request pattern) |
| Return to app after 12 s | 24 requests for the visible screen (was 28–40 for every tab) | FRONTEND (`DataRefresh`, 12 s staleness) |
| Lists | Members / Attendance / Follow-ups 594 / 543 / 595 DOM nodes; course roster 699; search 16–80 ms per key, no long task | fixed (6 Oct) |
| `member_schedules` (empty) and whole `offering_schedules` history on every fan-out | 1 + 1 requests per fan-out | FRONTEND |
| `useEffect` chains / route loaders | identity → preferences → fan-out; notifications chain 5 deep per shell | FRONTEND |
| Service worker | never intercepts Supabase; contributes nothing | — |

The move cannot change any row above.

---

## 15. Cross-region dependencies (Q13, Q14)

### 15.1 Every reference to Singapore / the old ref / the regions, `97bcaec`

| Reference | Category | Why it exists | Still required? | Adds latency? | Removable when |
|---|---|---|---|---|---|
| `src/data/functionRegion.ts` `PINNED = {'csv-import': 'ap-southeast-1'}` | **CODE — runtime, browser** | T-408 (24 Sep): run the import beside the then-Singapore DB | **No** — inverted by the move | **Yes**, every csv-import call (§9) | now: PR #69 (`cutover/mumbai-app`) removes it |
| `src/data/functionRegion.test.ts` | TEST (copy-lock) | pins the above | reversed in PR #69 | no | with PR #69 |
| `supabase/config.toml` `project_id = "lhpzhkzbnquwjljmbylo"` | **CONFIG** | CLI link target | **No** — a `supabase functions deploy` without `--project-ref` lands on Singapore | no latency; a deploy-safety risk | PR #69 sets `lbyqipunsbzkcvdrxach` |
| `public/unsubscribe.html`, `public/unsubscribed.html` host regex accepts both refs | CODE — runtime, browser (host check only) | B1: links already sent name Singapore | yes, for the rollback window | no | when the rollback window closes (PR #69 keeps it on purpose) |
| `supabase/forwarders/unsubscribe/{index,forward}.ts` → `MUMBAI_UNSUBSCRIBE` constant | **INTENTIONAL TEMPORARY DEPENDENCY** (deployed to Singapore only, outside `supabase/functions/`) | old links in sent emails point at Singapore | yes, 30 days | one 307/308 redirect (+ a Singapore cold boot) for **pre-cutover links only**; never for the app | Singapore pause (+30 d) |
| PR #70 `pinVerifyProtocol.ts` `SINGAPORE_PIN_VERIFY_URL`, `pin-verify/` | **INTENTIONAL TEMPORARY DEPENDENCY** (not on `main`) | old pepper unrecoverable | yes, until `pin_pepper_coverage.sql` says `t t` | one call per staff account, once (§10) | delete `pin-verify`, unset `PIN_VERIFY_KEY` |
| `supabase/functions/ses-feedback/index.ts:24` "SNS topic in ap-south-1" | CODE comment | SES/SNS region | yes (correct) | no | — |
| `src/data/unsubscribe*.test.ts`, `migrationGrants.test.ts`, `fromAddress.test.ts`, `supabase/tests/53` | TEST | fixtures and copy-locks | — | no | with their features |
| `supabase/migrations/0040`, `0050`, `0085` comments | MIGRATION (prose only) | dated history | — | no | never (applied) |
| `supabase/SETUP.md`, `docs/registers/ENVIRONMENTS.md` (production row), `HANDOFF.md`, `TEST_ACCOUNTS.md`, `APPLY_0078.md`, `.evidence/*` | DOCUMENTATION | describe the Singapore era | **stale**: still name Singapore as production | no | PR #69's Phase 3 register updates (not yet written) |
| `requests/2026-10-0[678]-*`, `RUN_app-feels-slow.md`, `ISSUE_TRACKER.md` T-408 | DOCUMENTATION / ROLLBACK | the move's own ledger | — | no | — |

Runtime references that actually place a request across regions: **one accidental (csv-import
pin, on `main`), two intentional and bounded (unsubscribe forwarder for old links; pin-verify
for version-0 credentials, if deployed).** No other function, hook or page names the Singapore
host.

### 15.2 Still calling Singapore unnecessarily (Q14)

Only `csv-import`, and only while the live bundle was built from a `main` that includes
`97bcaec`'s `functionRegion.ts`. Everything else that reaches Singapore does so by design and
only for pre-cutover artefacts (old links, old-pepper credentials).

### 15.3 The one check that settles the csv-import question

From any machine that can reach the site:

```
curl -s https://rosi-fit.vercel.app/ | grep -o '/_expo/static/js/web/__common-[a-f0-9]*\.js' | head -1
curl -s "https://rosi-fit.vercel.app<that path>" | grep -c "'csv-import':'ap-southeast-1'"
```

`1` means the pin is live; `0` means the cutover build (PR #69's code) is what is served. The
same answer is in `function_edge_logs` for `/functions/v1/csv-import`: `x_sb_edge_region` =
`ap-southeast-1` is the pin at work.

---

## 16. Before vs after comparison (Q15)

| Operation | Before Singapore (source) | After Mumbai | Change | Confidence |
|---|---|---|---|---|
| Login (sign-in, two functions) | 3–7 s; 1,061+1,930 ms (3 Oct), 3,260+3,720 ms (2 Oct); `function_edge_logs` | N/A — no reliable post-migration measurement | — | — |
| Dashboard (Home) | 40–47 requests, 1.5–2.5 s waterfall (4 Oct, prod trace + LOCAL); LOCAL today 27 requests | N/A | — | — |
| Member list | 33 requests, 1.0–1.6 s (4 Oct); LOCAL today 23–24 | N/A | — | — |
| Member search | 0 requests; 928 ms per key (4 Oct) → 16–32 ms (6 Oct, LOCAL) | N/A (not region-sensitive) | — | — |
| Member creation | `create_member` 301 ms p50 origin, n=8 (3–4 Oct, edge logs) | N/A | — | — |
| Member edit | `update_member` 248.7 ms mean DB, n=139 (`pg_stat_statements`); scoped since 7 Oct, not re-read | N/A | — | — |
| Attendance load | ~50 requests, 1.5–3 s (4 Oct) → 22–27 requests (6 Oct, LOCAL) | N/A | — | — |
| Attendance search | 928 ms per key (4 Oct) → 16–48 ms (6 Oct, LOCAL); 0 requests | N/A (not region-sensitive) | — | — |
| Attendance upload (preview + commit, browser) | ~7.6 s median (23–24 Sep, 5 imports) | N/A | — | — |
| CSV import: preview function time | 4,368–5,266 ms pinned (2 Oct, n=9); 5,503 ms median unpinned (23–24 Sep, n=5) | N/A — v20 "no invocations yet" on 7 Oct; pin inverted | — | — |
| CSV import: commit DB | 353.9 ms mean (n=175); LOCAL today 621–806 ms for 100–1,000 rows incl. sweep | N/A | — | — |
| Email send initiation | 0.36–0.41 s per recipient serial; 256 → 120 s (1 Oct, n=16) | N/A — v25 pool deployed 7 Oct, no invocation logged | — | — |
| SES request | never isolated | N/A | — | — |
| Navigation (first tab visit) | 18–19 requests, 1.0–1.6 s (4 Oct) | N/A | — | — |
| Per-request floor (tiny table) | p50 133–145 ms (1 Oct, n≈1,363–3,210), 91 ms (24 Sep) | N/A | MODEL −45 to −90 ms | — |

No "Change" cell is filled because no After cell is measured. Fabricating one from the MODEL
column was explicitly out of scope.

---

## 17. Bottleneck classification

| # | Bottleneck | Class | Evidence | Changed by the move? |
|---|---|---|---|---|
| 1 | Shared JS 467–493 KB gzip; 2.5–3 s boot on phones | FRONTEND | LOCAL today, 25 Sep Lighthouse | No |
| 2 | Register re-read on every first screen visit and every return after 12 s (23–24 requests, 2 pages per table) | FRONTEND | LOCAL today | Per hop only (MODEL −0.1 to −0.2 s) |
| 3 | Per-request gateway floor × sequential depth (3–5 hops; csv preview 8–10 stages) | NETWORK / REGION | PROD-SG 133–145 ms p50 | **Yes**: the 45–90 ms India→Singapore leg is gone for in-region calls; the ~40–90 ms gateway/PostgREST remainder is not |
| 4 | csv-import pinned to Singapore (on `main`) | REGION (accidental) | CODE + bundle grep | **Made worse** by the move until PR #69 ships |
| 5 | Edge Function cold boot + sequential `getUser` → `app_users` before any work; two functions per sign-in | EDGE FUNCTION | 64 boots/day; 3–7 s sign-in | Hops in-region now; boots unchanged |
| 6 | Whole-offering `member_stats` recompute inside `commit_csv_import` (every expected member gets a row from the absentee sweep) and the per-row `attendance_backdates_membership` trigger | DATABASE | LOCAL 621–806 ms; PROD-SG 362 ms whole academy | No |
| 7 | Nano tier: 60 connections, 2 MB `work_mem`, PostgREST pool queueing inside 25–40-request bursts (4–6× per request) | DATABASE (capacity) | PROD-SG 1 Oct traces; 122 GB temp files | No (same tier, Free plan) |
| 8 | SES send loop: 1 SES call + 3 serial DB writes per recipient (pool of 4 since v25) | EXTERNAL SERVICE + EDGE FUNCTION | 0.36–0.41 s/recipient serial | DB writes in-region now; SES unchanged (already `ap-south-1`) |
| 9 | PIN pepper verifier round trip to Singapore, once per staff account | REGION (intentional, bounded) | CODE PR #70 | Introduced by the move, by design |
| 10 | One CORS preflight per request | NETWORK | ~250/day on a quiet day | Preflight goes to the nearest edge: unchanged |
| 11 | Empty `member_schedules` and whole `offering_schedules` history read per fan-out | FRONTEND | LOCAL ×1 each | No |

---

## 18. Regression / improvement assessment

Thresholds from the brief (GREEN < 10 % degradation, YELLOW 10–25 %, RED > 25 %; GREEN
IMPROVEMENT > 10 %, SIGNIFICANT > 25 %) need an After sample. None exists, so **no operation is
assigned a colour.** Two statements can be made without one:

- **Expected, not claimed (MODEL):** every in-region sequential hop loses 45–90 ms. On the
  cheapest request that is a 33–67 % reduction of the Singapore p50 floor (133–145 ms) — which
  would read SIGNIFICANT per request — but on the user-visible operations it is 0.15–0.45 s
  against totals of 1–4 s, i.e. 5–20 %, somewhere between GREEN and GREEN IMPROVEMENT depending
  on the screen. This needs ≥ 20 samples per operation on the Mumbai edge logs to be stated.
- **Flagged risk (CODE):** csv-import while pinned. MODEL +0.4–0.9 s on a ~4.6 s preview is a
  10–20 % degradation (YELLOW) relative to the 2 Oct pinned-beside-the-database baseline; it is
  the only operation the move can plausibly have made slower.

---

## 19. Remaining performance risks

1. **The csv-import pin on `main`** (§15). Until PR #69 is merged and the served bundle is
   verified free of `'csv-import':'ap-southeast-1'`, every import pays an avoidable
   cross-region chain, and when Singapore is paused (+30 days) the function would still be
   *invoked* in `ap-southeast-1` — a Supabase edge region, not the paused project, so it keeps
   working, but slower than it needs to be.
2. **`supabase/config.toml` still links the CLI to Singapore.** A `supabase functions deploy`
   without `--project-ref` deploys to the frozen project. Not a latency risk; a correctness one.
3. **Nothing in the repository proves what Mumbai runs.** No cutover record, no post-cutover
   function-version diff (T-400's method), no ENVIRONMENTS row. Every "the function in Mumbai
   does X" above is inferred from `main`.
4. **Singapore's free-tier pause.** `pin-verify` (if deployed) and the unsubscribe forwarder stop
   answering when the project pauses (~7 days idle); version-0 staff then cannot sign in (503
   after 8 s) until an admin re-issues their PIN. The forwarder's job is also unmeasured: Gmail's
   one-click POST may not follow a 308.
5. **Edge Function cold boots** remain the largest fixed cost per sign-in and per import.
6. **Register re-reads** (23–24 requests per first visit / return) are the largest variable
   network cost on every screen, and the stale 12 s window is still the multiplier on a return.
7. **CSV commit at scale** still recomputes every expected member (the sweep), and the 1,000-row
   commit at 5,000 members measured 7.16 s on 4 Oct code against an 8 s statement timeout; the
   6 Oct halving (0089) buys room, not a ceiling.
8. **Nano tier in bursts.** Unchanged by the move; the Free plan cannot raise it.
9. **The two Deno specs run only in CI**; no Deno here (version pinned 2.9.7 in `ci.yml`).

---

## 20. Recommendations (no fixes in this task; ordered by evidence)

1. **Verify the served bundle for the pin** (§15.3) and, if present, treat merging PR #69 as the
   first post-cutover action. Then read `function_edge_logs` for csv-import: `x_sb_edge_region`
   should be `ap-south-1` and `execution_time_ms` well under the 2 Oct 4,368–5,266 ms.
2. **Record the cutover in the repository**: timestamp, Vercel deployment id, the eleven Mumbai
   function versions diffed against `supabase/functions/` (T-400's method), the SNS subscription,
   `config.toml`, the ENVIRONMENTS production row, and the pause/delete dates for Singapore.
3. **Take the After baseline the plan already prescribes** (request file, Phase 4): Mumbai
   `edge_logs` `response.origin_time` p50/p90 per path over one busy weekday (≥ 20 samples per
   path; expect the tiny-table p50 to fall from 133–145 ms), `x_envoy_upstream_service_time` to
   confirm the DB side is still 2–16 ms, `function_edge_logs` per function, `pg_stat_statements`
   means for `update_member` and `commit_csv_import` (first read since 0085/0089), and one
   browser DevTools cold start on Home (expect ≤ 35 requests). §21 lists the queries.
4. **Watch the pepper migration's one-time cost** via `pin_pepper_coverage.sql`, and retire
   `pin-verify` the day it reads complete, before Singapore's idle pause can strand a version-0
   account.
5. **After the region is confirmed in-region, the remaining work is not regional**: cold boots
   (fold `auth-lookup` into `auth-login`, or keep isolates warm), the register re-read pattern
   (an app-level store keyed by generation — Phase 3 of the 4 Oct roadmap), the shared JS floor
   (drop supabase-js for the three sub-clients; ~20–25 KB), and the whole-offering recompute
   (incremental `member_stats`, R1 of the 6 Oct final report).

---

## 21. Evidence / sources

**Repository documents (all at `97bcaec` unless a branch is named):**
- `docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md` — §2, §4–§15, §19–§22, §24 (PROD-SG + LOCAL, dated 1–4 Oct)
- `scripts/perf/investigation-2026-10-04/MEASUREMENT_NOTES.md` — raw `pg_stat_statements`, `pg_stat_user_tables`, edge-log percentile tables (1 Oct, 3–4 Oct)
- `RUN_app-feels-slow.md` — 24 Sep measurements: region (row 6), RLS fix before/after, T-405/T-406/T-407/T-408 experiments and their baselines
- `docs/PERFORMANCE_FIX_REPORT_2026-10-06.md` §3 and `docs/PERFORMANCE_FIX_FINAL_REPORT_2026-10-06.md` §4, §7.2 — LOCAL before/after on the fix tree
- `docs/PRE_DEPLOYMENT_REVIEW_2026-10-06.md` — production anchors, SES production status from the send ledger
- `TEST_SUMMARY.md` entries of 7 Oct (commits `179c82b`, `e7853d7`) — production apply of 0085–0090 with post-apply timings; Stage F deploy (csv-import v20, send-followups v25)
- `docs/registers/ISSUE_TRACKER.md` rows T-005, T-006, T-010, T-114, T-120, T-127, T-130, T-131, T-400, T-408
- `supabase/config.toml` (deployed versions and `verify_jwt` per function, measured 18 Sep)
- `requests/2026-10-06-move-production-to-mumbai.md` (branch `claude/funny-ramanujan-w7au8a`, `036e2b1`) — the move's design, decision block, phases, rollback
- `requests/2026-10-07-singapore-unsubscribe-forwarder.md`, `requests/2026-10-07-unsubscribe-pages-accept-mumbai.md`, `requests/2026-10-08-unsubscribe-forwarder-resigns.md`
- PR #69 `cutover/mumbai-app` (`7b64923`): `requests/2026-10-08-cutover-app-mumbai.md`, `functionRegion.ts` diff, `config.toml` diff
- PR #70 `feat/pin-pepper-migration` (`dcff06f`): `docs/security/PIN_PEPPER_MIGRATION.md`, `_shared/pinVerifyClient.ts`, `_shared/pinVerifyProtocol.ts`, `auth-login/index.ts` diff, migrations 0091–0092
- Code read: `src/data/functionRegion.ts`, `src/data/api.ts` (`callFn`), `src/data/session.ts`, `supabase/functions/*/index.ts`, `_shared/authz.ts`, `csv-import/{index,load}.ts`, `send-followups/{index,send-loop,email,load}.ts`, `supabase/forwarders/unsubscribe/*`, `public/unsubscribe*.html`, `app/(tabs)/_layout.tsx`

**Measurements taken today (LOCAL, logs in the session scratchpad, not committed):**
- `bash db/harness/start.sh && bash scripts/perf/investigation-2026-10-04/loadtest.sh 1500` — full replay 0001–0090 + `seed_scale.sql`; timings in §4.2
- `EXPO_PUBLIC_SUPABASE_URL=https://localhost:54322 EXPO_PUBLIC_SUPABASE_ANON_KEY=x npx expo export --platform web --clear` → `dist/` (gitignored); `grep` of `__common-*.js` for `'csv-import':'ap-southeast-1'` → present
- `node serve.js dist` + `MEMBERS=1644 DELAY=130 node standin2.js` + `node scenarioA.js` (playwright-core 1.63.0, container Chromium) — request counts in §4.2
- gzip static server (scratchpad) + `node scripts/perf/stand-in-api.js` + `node scripts/perf/js-budget.js 250 / /attendance /members /reports /courses` — compressed JS in §4.2

**Queries to run once production is reachable (all read-only):**
- `edge_logs`, one busy weekday: per `request.path`, `quantile(0.5)`, `quantile(0.9)` of `response.origin_time` and of `response.headers.x_envoy_upstream_service_time`, with counts; compare to §3.1
- `function_edge_logs`: per `function_id`/path, `x_sb_edge_region`, `execution_time_ms` p50/p90, count, boots (`function_logs` "booted")
- `pg_stat_statements`: `update_member`, `commit_csv_import`, `member_period_metrics_page`, `member_period_metrics_buckets`, `create_member` — calls, mean, max since the cutover
- `select x_sb_edge_region, count(*) from function_edge_logs where path like '%csv-import%'` — the pin check from the server side
- `supabase/reports/pin_pepper_coverage.sql` — pepper migration progress

---

## Change control

| Check | Before | After |
|---|---|---|
| `git status` | clean | one new untracked file: `docs/performance/POST_REGION_MIGRATION_PERFORMANCE_REPORT.md` (this report) |
| Branch | `claude/inspiring-lamport-icxy6z` | same |
| Commit | `97bcaecde79098dd41adde8df95655b52b51dbfc` | same, until the report is committed |
| Tracked files modified | — | none |
| Production configuration | not reachable, not touched | unchanged: no Supabase, Vercel, SNS, secret, function or data call was made or possible |
| Local side effects | — | `node_modules/` (install), `dist/` (export), `scripts/perf/investigation-2026-10-04/certs/` and `*.log` — all gitignored; harness Postgres data under `/tmp` |
| Remote refs fetched | — | `origin/cutover/mumbai-app`, `origin/feat/pin-pepper-migration`, `origin/claude/funny-ramanujan-w7au8a` (read-only; nothing pushed to them) |

---

REGION MIGRATION PERFORMANCE VERDICT

Overall:
  INCONCLUSIVE

Database:
  INCONCLUSIVE

Navigation:
  INCONCLUSIVE

Member operations:
  INCONCLUSIVE

Attendance:
  INCONCLUSIVE

CSV import:
  INCONCLUSIVE

Email sending:
  INCONCLUSIVE

Authentication:
  INCONCLUSIVE

Cross-region latency remaining:
  UNEXPECTED

Top 5 remaining bottlenecks:
  1. csv-import still pinned to ap-southeast-1 on `main` and in the bundle it builds (PR #69 open): every import's database chain crosses Singapore → Mumbai — the one dependency the move created by accident.
  2. Shared JavaScript of 467–493 KB gzip per screen (281 KB of it this stack's floor): 2.5–3 s of boot on a mid-range phone, untouched by any region.
  3. The member register re-read on every first screen visit and every return after 12 s: 23–24 requests, two pages per table, each paying the gateway floor that stays after the move.
  4. Edge Function cold boots with a sequential getUser → app_users preamble, two of them per sign-in (3–7 s measured on Singapore).
  5. The whole-offering member_stats recompute and per-row triggers inside commit_csv_import on a Nano tier whose 60 connections and 2 MB work_mem the Free plan cannot raise.

Most important finding:
  No post-migration production measurement exists anywhere (this session cannot reach either project or the site, and the repository records no cutover), while the code on `main` still pins csv-import to Singapore — so the one region change that is verifiable today is an accidental cross-region dependency, not an improvement.
