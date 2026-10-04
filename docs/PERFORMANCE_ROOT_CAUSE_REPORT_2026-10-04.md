# RosiFit — Complete Application Performance & Latency Root-Cause Report

**Date:** 4 October 2026 · **Scope:** whole application (web PWA, Supabase PostgREST/RPC, Edge Functions, Postgres) · **Mode:** investigation only — no production code, schema, configuration, data or infrastructure was changed. Every production query was a read (`pg_stat_statements`, `pg_stat_user_tables`, `EXPLAIN ANALYZE` inside read-only statements as the `authenticated` role, edge/function/Postgres logs). Load tests ran against the local harness (`db/harness/`, Postgres 16) and a local stand-in API; the diagnostic scripts are committed under `scripts/perf/investigation-2026-10-04/` (isolated; not part of any gate) and described in §21 and the appendix so they can be re-run.

Evidence classes used throughout: **Confirmed** (measured in production or reproduced locally with the production bundle), **Likely** (strongly indicated by code plus partial measurement), **Unknown** (could not be measured from here).

---

## 1. Executive summary

RosiFit feels slow for four reasons, in this order of impact:

1. **Request volume, not query cost.** The database executes most queries in 2–16 ms, but the client issues 25–50 HTTP requests per screen and re-issues them constantly. Every request pays a fixed ~130 ms edge→origin floor (Cloudflare Chennai/Mumbai → Supabase Singapore → PostgREST → back) plus the browser's own RTT, and chains of 3–5 sequential requests turn that into 0.5–1.5 s per screen before any rendering. On Wednesday 1 October one browser issued **16,759 requests in 49 minutes** (342/min) while making 13 writes; the whole member register was re-downloaded **384 times** in that window. *(Confirmed, edge logs.)*
2. **Every return to the app, and every save, re-reads everything on every visited tab.** `DataRefresh` re-runs every mounted reader older than 12 s on each `focus`/`visibilitychange`/`online` event; tabs are never unmounted, so after visiting four tabs one return costs **28 requests** (reproduced locally) and 29–40 in production, each 4–6× slower inside the burst (0.5–0.9 s). A member save cost **~250 requests** until PR #63 (3 Oct) and still costs **~41** after it. *(Confirmed, logs + local reproduction.)*
3. **Lists are rendered whole, with no virtualization and no debounce.** Members renders 29,703 DOM nodes for 1,644 members (1.4 s of script on a fast CPU, ~5.6 s at phone speed); the course roster's search blocks the main thread **0.8 s per keystroke** today and **7.7 s** at 5,000 members. *(Confirmed, local reproduction with the production bundle.)*
4. **Three server-side functions do whole-population work for single-row changes.** `update_member` and `commit_csv_import` end with an unscoped `recompute_member_stats()` (1.0 s at 1,500 members, 3.4 s at 5,000; `member_stats` has been rewritten 390,346 times for 1,640 rows), `commit_csv_import` evaluates `expected_members_for_session` once per CSV row, and `send-followups` sends serially at 0.36–0.41 s per recipient (256 recipients = 120 s of function time). *(Confirmed, prod stats + harness.)*

The database itself is small (39 MB) and healthy (100 % buffer hit rate, no locks, 0.04 % error rate). Supabase is not the bottleneck as a service; the application's request pattern and the smallest compute tier's 2 MB `work_mem`/60-connection ceiling are what the pattern collides with. **What to fix first:** stop the refetch storms (§25 Phase 1), scope the two whole-population RPC calls (already specified as T-014/T-015, migration 0074 — unmerged), and virtualise/debounce the three big lists. Those three changes remove most of the user-visible wait without touching the data model.

---

## 2. Overall application latency assessment

| Layer | What the user waits for | Measured | Verdict |
|---|---|---|---|
| Browser → Cloudflare edge | Not visible in logs (India mobile RTT 30–80 ms typical) | — | Unknown; constant per request |
| Edge → Supabase origin (Singapore) → PostgREST → DB → back | `response.origin_time` p50 **133–145 ms** for the cheapest possible request (11-row `app_users`); p90 **250–400 ms** in normal minutes, **700–1,100 ms** inside bursts | Confirmed | **The fixed per-request cost dominates**: ~130 ms × N sequential hops |
| PostgREST + Postgres | `x_envoy_upstream_service_time` p50 **2–16 ms** for every list read; **78 ms** p50 / 275 ms p90 for the one real aggregate (`member_period_metrics_page`) | Confirmed | DB time is 5–15 % of request time |
| Gateway overhead (origin − upstream) | p50 **133 ms**, p90 **572 ms** (last 24 h, browser requests) | Confirmed | 85–95 % of per-request latency is outside Postgres |
| JS execution | Members 1.4–1.7 s script, course roster 1.3 s, per-keystroke 0.3–0.9 s (fast CPU; ×3–5 on phones) | Confirmed locally | Second-largest cost after request chains |
| JavaScript download | 462 KB gzip shared (entry 279 + common 183) + 3–18 KB per route; ~370 KB brotli | Confirmed | Acceptable; already split per route (T-407) |
| Edge Functions | csv-import preview 4.4–5.3 s, commit 1.0–2.0 s, sign-in 3–7 s (two functions), send 0.4 s/recipient | Confirmed | Cold boots + strictly sequential round trips |

Latency is **not load-dependent at the daily scale** (hourly p50 stays 142–150 ms whether the hour has 490 or 11,824 requests) but **is load-dependent at the per-second scale**: inside a 30–40-request burst each request takes 0.5–0.9 s instead of 0.13 s, and three parallel metrics calls were dropped with HTTP 502 at 14:09:53 on 1 Oct.

---

## 3. Performance architecture map

```
Browser (India, Chennai MAA / Mumbai BOM edge)
 │  expo-router web, React 19, one Supabase client, fetch wrapped by sharedFetch (5 s identical-URL window)
 │  per-tab AcademyHeader → useNotifications (5-stage chain) + useIdentity
 │  every data hook = useAsync → repository.ts → PostgREST; keyset paging 1000 rows, ends on an EMPTY page
 │  DataRefresh: focus/visibility/online → revalidate every mounted reader > 12 s old
 │  write → membersChanged()/attendanceChanged() buses → every subscribed mounted hook refetches
 ▼
Cloudflare → Supabase API gateway (envoy) → PostgREST 14.5 (db-pool) → Postgres 17.6, smallest tier
 │  max_connections 60, shared_buffers 224 MB, work_mem 2 MB, statement_timeout 8 s for authenticated
 │  RLS: (select is_active_app_user()) once per statement since 0079
 ▼
Edge Functions (Deno, run in ap-south-1 Mumbai; csv-import pinned to ap-southeast-1 since T-408)
 │  each: cold boot (~every call) → auth.getUser → app_users → N sequential DB round trips
 ▼
SES (send-followups, serial, no timeout)
```

Data volumes today: 1,644 members, 1,299 emails, 1,343 aliases, 1,620 enrollments, 18,305 attendance rows, 63 sessions, 15,832 audit rows. Whole public schema < 25 MB.

---

## 4. Initial-load analysis

**Bundle (production export, measured):** `entry` 1,065 KB raw / 279 KB gzip; `__common` 677 / 183; route chunks 3–64 KB; `exceljs` 922 / 249 (lazy, Reports export only). Shared start-up JS ≈ 462 KB gzip (≈370 KB brotli, from the T-407 record). Fonts: MaterialIcons.ttf 357 KB loaded on first icon; MaterialCommunityIcons.ttf **1.3 MB** is referenced for a single glyph (WhatsApp) but only on `/help`. No font preload, no `<link rel=preload>`, no stylesheet (styles are inline in JS). Service worker precaches only `/`.

**Cold-start sequence (code + local reproduction, production bundle):** prerendered sign-in shell paints at ~0.28 s → JS parse → `restoreSession` (`getSession` from localStorage; `POST /auth/v1/token` only if expired, **766–927 ms p50** in production) → `GET app_users` (restore) → `router.replace` → in parallel: `app_users` (identity), `user_preferences`, the notifications chain (5 sequential stages: sessions → offerings → courses/branches → batches/messages/pin requests → members), and the Home fan-out. **27 requests** against an empty stand-in; **~40–47** with real data (every 1,644-row table costs 3 sequential keyset pages: 1000, 644, then an empty terminator).

**Measured phases, simulated mid-range phone (CPU ×4, 1.6 Mbps/150 ms), local uncompressed JS:** Members — JS done 9.1 s (≈2.5–3 s with Vercel brotli), first API request at 10.2 s, last API response at 20.6 s (33 requests), content visible at **26.2 s**; at CPU ×1 the render alone is 1.4 s, at ×4 it is 5.6 s. Nothing is painted between the shell and the finished list.

**Unauthenticated fan-out (Confirmed):** on 3 Oct 18:53:41 a browser with no valid session sent the entire Home fan-out: 30 "permission denied" errors in Postgres in one second, 33 × 401/403 responses in the last 24 h. Data hooks are not gated on a resolved session.

**Not an issue:** TTFB (static Vercel HTML, 2–3 ms locally), CSS (none), Supabase client construction (synchronous), token refresh (6–10 per day, each ~0.8–0.9 s, only when expired).

---

## 5. Navigation analysis

- **Tabs stay mounted, nothing is cached.** `app/(tabs)/_layout.tsx` sets no `lazy`/`unmountOnBlur`/`freezeOnBlur`; a tab mounts on first visit and never unmounts. Returning to a visited tab costs 0 requests (Confirmed locally), but every mounted tab keeps refetching on bus events and focus returns (§6).
- **First visit to a tab = a fresh full read: 18–19 requests** (Courses, Reports; Confirmed locally) because `memberStore` only joins reads that are *in flight* and `sharedFetch` keeps answers for 5 s. The same 1.4 MB of member JSON is downloaded again per tab.
- **Per-tab header chain.** `AcademyHeader` is a per-screen `header` option, so each visited tab owns a `useNotifications` instance (5 sequential requests) that re-runs on the attendance/courses/holidays/staff buses — in the 1 Oct trace the chain ran 3× within 0.5 s (three mounted tabs).
- **Sequential chains per screen (code, confirmed by the trace at 130–140 ms per hop):** Course day: `course_offerings → courses/branches → sessions → attendance_records → members in(…)` = 5 hops + 1 name-chunk per 150 members (629-member day = 15 requests, 14 serial). Member dialog: 7 hooks, including the **whole member list to find one member**. Attendance tab: sessions → records (chunks of 150 session ids, each paged) → names/aliases/emails (3 chunk chains in parallel) → courses/branches ≈ 50 requests for a 2,220-row week. Course edit mounts `useFollowUp()` (the whole register) to read a rule.
- **Provider re-initialisation:** none found. Theme context is memoised; no context carries data. Route guards (`AdminRouteGuard`, `useAdminRedirect`) only read the shared identity.
- **Dead reader:** `useWeekRows` (4 × metrics chains) has no app caller.

**Does navigating download data that is already in memory? Yes** (Confirmed): the member register held by the Home tab is re-fetched when Members, Reports, Courses, course detail, the member dialog or the course-edit dialog mount, unless the previous read is still in flight or < 5 s old.

---

## 6. Refresh analysis

**Browser refresh (Ctrl+R):** identical to a cold start minus JS download (service worker serves `/_expo/static/*` cache-first; the HTML itself is network-first). All data is re-fetched; nothing is persisted (guardrail 1, confirmed: no member data in storage). Auth resolves first (`restoreSession`), then the screen mounts, then data loads — but the Home fan-out can also fire for a session that turns out invalid (§4).

**Soft refresh — the real problem (Confirmed in production and reproduced locally):** `src/pwa/DataRefresh.tsx` listens to `visibilitychange`, `focus` and `online` and calls `revalidateStale`, which re-runs **every** registered `useAsync` reader older than 12 s, on every mounted tab. Local reproduction with the production bundle: after visiting three tabs, each return to the app issued **28 requests** (member fan-out, 9 metrics pages, 3 notification chains, courses ×3, branches ×2, offerings, schedules); within 12 s of the last load, 0. Production trace (1 Oct 02:16:43): a 29-request burst with every request at 560–890 ms. In the 12:00–15:00 window one Chennai user triggered **384 full fan-outs in 49 minutes with 13 writes** — a fan-out every 7.6 s. The 12 s staleness window, applied to every tab at once, is the multiplier.

**Write refresh:** `membersChanged()` + `attendanceChanged()` after every save/delete/import/mark; before PR #63 (3 Oct) a `delete_member` produced **243 requests** and an `update_member` **~290** within 2–3 s (6–12 list fan-outs, 42–48 metrics calls, 11 identity reads); after PR #63 a `create_member` produces **41–45** (1 fan-out, 19 metrics calls across Home's day buckets and Reports' month). The write itself is 390–480 ms; the refresh adds 1.5–2.5 s.

**Service worker:** does not intercept Supabase calls (cross-origin passthrough) — ruled out as a cause of slow refresh or stale data. `DeploymentRefresh` fetches `/` with `cache: no-store` on every focus/visibility change and every 5 min; it is a Vercel HTML fetch (~21 KB), not an API call, and it never reloads while a write is in flight.

---

## 7. Member-flow analysis

| Action | What happens | Measured | Verdict |
|---|---|---|---|
| Open Members | `useFollowUp()` = member register (6 paged tables + metrics) + rules; renders every member card | 33 requests, 1.4 MB JSON, **29,703 DOM nodes**, script 1,655 ms, long tasks 2,565 ms (max 1,435 ms) at 1,644; **90,111 nodes / 7,073 ms** at 5,000 | **P1** — unvirtualised list |
| Search / filter / sort | Client-side substring over the whole array on every keystroke, no debounce; no re-sort; the whole filtered list re-renders | Attendance search first key **928 ms**; Members not captured (no search placeholder match) but same code shape | **P2** today, P1 at 5,000 |
| Open member details | Route dialog mounting 7 hooks incl. **the whole register** (`useMembers`) + `useMemberWeek` (5 sequential hops) + courses + rules + sent-for-period | ≈ 24 + 8 + 4 + 3 requests when nothing is fresh | **P1** — 1–2 s per open |
| Add / edit member | Form loads whole register + courses; save = `create_member`/`update_member` RPC (390–480 ms origin; `update_member` **249 ms mean DB time, 49k buffers** because it ends with unscoped `recompute_member_stats()`), then bus refresh (~41 requests) | Save-to-list ≈ 1.5–2.5 s after #63; 4 of 8 creates on 3 Oct failed with "joining date in the future" (IST vs UTC) and were retried | **P1** (DB) + correctness bug |
| Delete member | `delete_member` 45 ms mean DB; `bulkDeleteMembers` loops `deleteMember` **sequentially and rings both buses per member** | Deleting 40 members = 40 RPCs + 40 cascade bursts | **P2** |
| Member email / aliases / history | Inside the detail dialog chain; `fetchMemberWeek` runs `course_offerings` sequentially where it could be parallel | 5 hops ≈ 0.7 s | P3 |
| CSV import (members, `bulk_import_members`) | ≤ 500 rows/RPC, per-row sub-transaction + advisory lock + `is_in_course` checks | not exercised in logs this week | Likely P2 at 5,000 |
| Duplicate detection | In-memory on the client (register already loaded) + `refuse_course_duplicate` (advisory lock per course) | 8 × 409 on 1 Oct | OK |
| N+1 / full-table reads | No per-row queries on the client; **six whole-table reads per register load** (`member_emails` read without the `deleted_at` filter, `member_schedules` read though empty, `offering_schedules` whole history) | 6 tables × 3 pages | P1 (the fan-out) |

---

## 8. Attendance analysis

- **Opening Attendance (week):** 1 + K(sessions)·pages + 3 chunk chains + 3 ≈ **50 requests** for a 2,220-row production week (85 with the local 4.9k-row fixture); renders **every attendance record** as a row (49,476 DOM nodes locally; production ≈ 22k), 2.4 s of long tasks on a fast CPU.
- **Changing the period** re-runs the whole chain (deps change → `loading`); branch/course/status/search are client-side. Changing the date on the **course detail** screen re-runs `fetchCourseDayRows` (5 sequential hops + name chunks ≈ 15 requests, ~0.7–2 s) per tap; week arrows also re-run `course_week_day_status` (3.5 ms DB, 276 ms p50 origin).
- **Marking attendance:** `set_attendance` (scoped recompute, 8 statements) is cheap, but it rings both buses → every mounted reader refetches (§6). `reset_day_attendance` likewise.
- **Daily/monthly metrics:** `member_period_metrics_page` — **the single most-called request (5,221/day = 14 % of all traffic)** and the only one with real DB time. Home fetches it for 7 day buckets + the week (8–9 calls, each paged: 2–3 requests); Reports once per month; a custom 3-year range at month grain would be 36 parallel chains. In Postgres the SECURITY DEFINER SQL function cannot be inlined, so it runs a **generic plan that walks the entire `attendance_records` table through `attendance_member`** (11,675 buffers/call, 131,346 rows discarded by the join filter; 16 ms warm, 452 ms cold) whereas the same SELECT with constants reads 527 buffers in 23 ms. Cost scales with total history, not the period: `attendance_records.idx_tup_fetch` is **617 million** for an 18,305-row table.
- **Follow-up calculations** are client-side single passes (`flagged`, O(N)) — not a cost. The per-card `dayAttendance` on the course roster is O(roster × week rows) per render (§16).

---

## 9. Search analysis

Every search box is client-side over the already-loaded array; **no search ever hits the database** (0 network requests while typing, confirmed). No debounce anywhere; no `React.memo`; the whole list re-renders per keystroke.

| Search | Dataset scanned per key | Measured per-key main-thread block (fast CPU) | Scale |
|---|---|---|---|
| Course roster (`course/[id].tsx`) | roster × (4-field substring + `dayAttendance` scan of all week rows + 1,644-option picker array rebuilt per card) | **824 / 448 / 352 / 392 / 400 ms** | **7,656 / 2,096 / 2,712 ms** at 5,000 |
| Attendance tab | every record in the period (2,220 prod / 4.9k local) + 4 count passes + grouping | **928 / 296 / 72 / 96 / 80 ms** | linear in records |
| Members tab | 1,644 cards, `[name, code, email, ...aliases].some` per card | not captured by the harness (placeholder mismatch); same shape as Attendance, 1,644 rows | linear |
| Courses, Audit, Send | ≤ a few hundred rows / memoised | 16 ms | fine |
| Holiday preview | `previewHoliday` **network call on every keystroke** of from/to (no debounce) | 1 RPC per key | P3 |

Short/common/exact/no-result searches cost the same: the filter runs over the whole array regardless of the result size; the cost is the re-render of whatever remains.

---

## 10. Upload / CSV analysis

Pipeline, measured end to end (`csv-import` Edge Function, pinned to Singapore since T-408):

| Stage | Measured | Scales with |
|---|---|---|
| File selection + browser parse (`parseMeetCsv`) | 10 rows 0.8 ms · 500 → 2.3 ms · 1,000 → 2.3 ms · 1,500 → 2.9 ms · 5,000 → 10.9 ms (244 KB) | nothing visible |
| Upload (JSON body) | ≤ 250 KB | network |
| **Preview** (`csv-import` POST) | **4,368–5,266 ms for 12–61 rows** (2 Oct, nine imports; 24 Sep median 5,503) — independent of row count | **~21 sequential round trips**: authz 2, offering, same-file, supersedes, staff names, five whole-table keyset reads (aliases, members, emails, stats, enrollments: ⌈N/1000⌉+1 requests each, sequential), offerings/courses/branches, insert, audit — plus a cold boot (64 "booted" entries/day) |
| Matching (in memory) | exact + alias tiers O(R × N) with `.filter` scans; fuzzy tier **bigram similarity rebuilt per comparison**: worst case 1,000 rows × 1,644 members = **4.1 s**, × 5,000 = **12.7 s** (CPU limit 2 s) | only rows that miss exact/alias; production files show 0–8 unmatched, so ≤ 50 ms today |
| Response / `csv_imports.summary` | every row with every candidate's full profile; 1.6–17 KB today | rows × candidates |
| **Commit** (`commit_csv_import`) | **972–1,959 ms for 12–61 rows** in production; harness at 1,500 members: **100 rows 1.46 s · 500 → 2.61 s · 1,000 → 4.16 s**; at 5,000 members: **100 rows 4.38 s · 500 → 5.28 s · 1,000 → 7.16 s** | ≈ 1.0–3.4 s fixed = unscoped `recompute_member_stats()` for all N (T-014); + `expected_members_for_session` evaluated **R+2 times** (58 ms cold / 3–5 ms warm each, T-015); + per-row `attendance_backdates_membership` BEFORE-INSERT trigger (3–4 queries per inserted row, including every absent-sweep row: 4,900 at 5,000 members) + per-row audit |
| UI refresh | `attendanceImported` → members + attendance buses → §6 cascade | 25–45 requests |

**Timeout risk (Confirmed from config):** `authenticated`/`authenticator` carry `statement_timeout = 8 s` and `lock_timeout = 8 s` (ISSUE_TRACKER T-005). At 5,000 members a 1,000-row commit measured 7.2 s on this container's fast local disk — on the production tier it would exceed 8 s. CPU time: the preview is I/O-bound (round trips); the fuzzy tier is the only CPU risk. Memory: the five whole-table reads hold ~N × 5 rows in the isolate (≈ 10 MB at 5,000) — fine.

---

## 11. Dashboard (Home) analysis

- Mounts `useFollowUp(range)` (register + rules, 27 requests), `useFilterOptions` (2), `useBucketMetrics(range)` (7 day buckets × ⌈N/1000⌉+1 = **21 metrics requests** at N > 1,000, in parallel), plus the shell's identity + notifications chain: **~47 requests with real data** (local), 1.4 MB JSON.
- Render cost is low (367 nodes, 292 ms script; the member rows are capped) — Home is network-bound, not render-bound. Every render re-runs `membersInPeriod`, two `matchesSelection` filters, `reportRows` (one group per member + sort), `withScope`, `bucketTotals` with no `useMemo` — cheap at 1,644 (~100 ms long task), noticeable at 5,000.
- The 7 day-bucket metrics calls share nothing with the week call (different `p_from/p_to`), and each bucket re-scans the whole attendance table server-side (§8).

---

## 12. Follow-up (Weekly) analysis

- `useFollowUp(week)` only; renders every flagged member as a `MemberRow` (456 flagged measured in a production week → 16,346 DOM nodes locally with the "all" chip; 49,466 at 5,000). `isEligible` calls `new Date()` per member per render; `members.filter(isReachable)` runs every render. 777 ms script, 1.05 s long tasks locally.
- **Send flow:** `send/index.tsx` mounts 6 hooks; `picked.includes` inside filters is O(n²) per render (fine at 456). The server side is the bottleneck: `send-followups` loads 8 chunked+paged reads (⌈M/150⌉ × 2 requests each), then **M sequential `member_period_metrics` RPCs**, then **per recipient 3 serial DB writes + 1 SES call with no timeout**. Production: 136 recipients 51 s, 256 → 91 s (function time 120,138 ms), 291 → 113 s = **0.36–0.41 s per recipient**. A 1,000-recipient send would take ~6.5 min — beyond the Edge Function wall-clock limit — and the client's 12 s load timeout does not cover it (the UI relies on the batch row).

---

## 13. Database analysis

Postgres 17.6, smallest tier: `max_connections` 60, `shared_buffers` 224 MB, **`work_mem` 2 MB**, `effective_cache_size` 384 MB, `statement_timeout` 120 s (8 s for `authenticated`). Database 39 MB. `pg_stat_statements` since 1 Sep 09:17 (cumulative; includes the pre-24-Sep RLS period).

**Top statements (cumulative since 1 Sep):**

| Query / RPC | Calls | Avg ms | Max ms | Total s | Blocks/call | Severity |
|---|---:|---:|---:|---:|---:|---|
| rpc `member_period_metrics_page` | 44,658 | 69.9 | 2,809 | 3,123 | **13,361** | **P1** (volume × whole-table generic plan) |
| `member_stats` page (ORDER BY/LIMIT/OFFSET, pre-keyset shape) | 8,470 | 233.8 | 2,051 | 1,981 | 1,247 | historical (pre-0079) |
| `member_enrollments` status=active page | 8,365 | 220.8 | 1,885 | 1,847 | 1,272 | historical |
| `member_aliases` alias_type page | 8,187 | 205.7 | 1,941 | 1,684 | 1,209 | historical |
| `members` deleted_at null page | 7,749 | 204.6 | 1,985 | 1,586 | 1,238 | historical |
| `member_emails` page | 2,421 | 620.3 | 1,889 | 1,502 | 1,134 | historical |
| rpc `course_week_day_status` | 2,124 | 278.6 | 2,291 | 592 | 819 | historical (3.5 ms now) |
| members / member_stats / enrollments keyset pages (current shape) | 15–16k each | 33–37 | ~1,200 | 542–567 each | ~300 | P2 (volume) |
| rpc `member_period_metrics` (unpaged, send-followups per member) | 4,978 | 30.2 | 705 | 150 | 1,089 | P2 |
| rpc `commit_csv_import` (service_role) | 175 | 353.9 | 1,793 | 62 | **46,657** | **P1** |
| rpc `update_member` | 139 | 248.7 | 965 | 35 | **49,031** | **P1** |
| PostgREST `set_config` per request | 406,837 | 0.08 | 303 | 33 | 0 | = total request count |

Percentiles are not available from `pg_stat_statements`; p50/p90 for the live shapes come from the edge logs (§2): 2–16 ms upstream for list reads, 78/275 ms for the metrics RPC.

**Plans (production, read-only, as `authenticated`):**
- `member_period_metrics_page` week: via the function **16.5 ms warm / 452 ms cold, 11,675 buffers** (generic plan: index scan of all `attendance_records` by `attendance_member`, nested-loop join filter discards 131,346 rows); the same SELECT inlined with constants: **23 ms, 527 buffers** (sessions-first). Harness at 5,000 members / 785k rows: 7–11 ms (the harness planner picked the sessions-first plan — the production generic plan is the one that scales with history).
- `recompute_member_stats()` unscoped, SELECT part: **170 ms, 52,846 buffers** (1,640 lateral aggregates + 1,640 `current_streak_for` window scans) before a 1,640-row upsert. Harness: **1.0 s at 1,500 members, 3.3–3.4 s at 5,000**; scoped to one member: 1.4 ms (700× cheaper). `member_stats` `n_tup_upd` = **390,346** for 1,640 rows; 351 dead tuples.
- `expected_members_for_session`: 58 ms first call / 3–5 ms warm; its `msched` CTE cross-joins all `member_schedules` (empty today) with no member filter.
- `course_week_day_status`: 3.5 ms (RLS InitPlans once per statement — 0079 works as intended).

**Indexes / scans:** all list filters use primary keys or the existing partial indexes; advisor: 29 unindexed FKs (all audit `created_by`/`updated_by` columns no read path filters on), 3 unused indexes, no RLS finding. `app_users` has **19.7 M sequential scans** for 11 rows (RLS helper + `audit_log()` per row; cheap individually, 0.08 ms set_config comparable). `sessions` 332k seq scans (63 rows). Missing but low-value today: `csv_imports (offering_id, session_date, status)`, a partial index on `attendance_records (deleted_at)`.

**Temp files: 47,942 files / 122 GB since 25 Aug** despite a 39 MB database — sorts/hashes spilling at `work_mem` 2 MB (aggregates over attendance with window functions, `jsonb` summaries). Buffer hit 100 %, no deadlocks, rollbacks 0.1 %, no long transactions, idle-in-transaction timeout 0 (none observed). Connection pool: PostgREST's own pool (default 10) — inside a 40-request burst requests queue for a slot, matching the 4–6× in-burst slowdown; `pg_stat_activity` shows 1 PostgREST backend at quiet times.

**Triggers:** every audited write runs `audit_row_change()` (plpgsql loop over every column + `audit_log()` → `current_app_user_id()` lookup + 1 insert into a 4-index table) **per row**; `attendance_backdates_membership` BEFORE INSERT does 3–4 queries per attendance row; `member_emails_carry_suppression` scans `audit_logs` + `jsonb_array_elements` per same-address row. Views: none (member_stats is a table). pg_cron: present, no app jobs.

---

## 14. Supabase / API analysis

- **Request mix (Wed 1 Oct, ~38k non-preflight):** metrics RPC 5,221 · members 4,038 · courses 3,210 · branches 2,546 · the four other member tables ~2,430 each · course_offerings 2,288 · app_users 1,363 · sessions 926 · member_schedules 812 (**0 rows, always**) · follow-up configs ~730 each · notifications trio ~650 each · offering_schedules 551 · attendance 297 · course_week_day_status 228. **Plus one CORS preflight per request** (~250/day on a quiet day; each a full browser RTT with 0 ms origin time).
- **Sequential vs parallel:** the register read is parallel across its 7 tables but each table's pages are sequential (3 hops at N > 1,000, the last always empty); chunked id lists (150 ids) are sequential per table; the notifications, course-day, member-week and member-dialog chains are 4–5 deep. Candidates to parallelise: `course_offerings` inside `fetchMemberWeek`, the `holidays` lookup inside `createHoliday`, `pin_reset_requests` after `app_users` in `fetchStaff`.
- **Duplicated / unnecessary:** `member_schedules` (empty) on every register read; `member_emails` read without `deleted_at` filter; `offering_schedules` whole history on every courses read and again in `fetchOfferings`; `courses` fetched in 3 shapes per screen (`id,name` / `name` / 5 columns) so `sharedFetch` cannot dedupe them; the empty terminating page on every paged read; identity read in two URL shapes (restore vs identity) so they never share.
- **Where the time goes per request:** DB 2–16 ms → PostgREST/envoy/gateway ~115–130 ms → Cloudflare ↔ browser (not logged). `origin_time − upstream_service_time` p50 133 ms, p90 572 ms. Payload size adds ~130 ms per 1,000-row page (265 ms p50 for the 1,000-row pages vs 137 ms for tiny tables on the quiet day). Whether the gateway compresses JSON is **Unknown** from the logs (`content_encoding` is not recorded); the 1.4 MB per screen is the uncompressed figure the browser parses.
- Auth endpoints: `/auth/v1/token` 766–927 ms p50 (6–10/day), `/auth/v1/user` 762 ms (Edge Functions' `getUser`). Storage: unused.

---

## 15. Edge Function analysis

| Function | Calls (1–3 Oct) | Execution time | DB round trips (code) | External | Notes |
|---|---|---|---|---|---|
| `csv-import` preview | 9 on 2 Oct | **4,368–5,266 ms** (p50 ≈ 4,600), flat vs row count | ~21 sequential incl. 5 whole-table keyset reads | — | T-408 moved it to Singapore: 5,503 → ~4,600 ms (−16 %); the rest is boot + serial trips |
| `csv-import` commit | 9 | 972–1,959 ms | 3 (work inside `commit_csv_import`, §13) | — | |
| `send-followups` | 13 on 1 Oct, 3 on 2–3 Oct | 1 recipient 4.5 s; **256 recipients 120,138 ms** | 4M + 16·⌈M/150⌉ + 2C + 8, all serial | M SES calls, serial, **no timeout**, no retry | 0.36–0.41 s/recipient; signing key re-derived per message; unsubscribe HMAC key re-imported per member |
| `auth-lookup` + `auth-login` (sign-in) | daily | 1,061 + 1,930 ms (3 Oct); 3,260 + 3,720 ms (2 Oct) | 1 + 4–5 (+ GoTrue) | — | two cold boots per sign-in; `audit_app_users` trigger + explicit audit = 2 audit rows per login |
| `unsubscribe` | 8–10/day | 2,153–4,050 ms (p50 ≈ 3,000) | 3–6, incl. `email_status_before_opt_out` (audit_logs scan) | — | `app_settings` read before token validation |
| `ses-feedback` | 5–7/day | 473–3,820 ms | 2–4 | SNS confirm fetch (no timeout) | |
| `auth-bootstrap`, `pin-*`, `recovery-check` | rare | — | 4–11 sequential | — | not measured |

Cold starts: `function_logs` shows 64 "booted (time: 22 ms)" lines on 1 Oct — essentially every invocation boots a fresh isolate, and every authenticated function then does `auth.getUser` (GoTrue HTTP, ~760 ms p50 at the edge) **then** `app_users`, sequentially, before its own work. Functions run in ap-south-1 (Mumbai) against a Singapore database except `csv-import`. Memory/CPU per invocation: not exposed in these logs (Unknown); the only CPU-bound path is the fuzzy matcher (§10). Synchronous work that could be asynchronous: the SES send loop (queue + worker, or at least bounded concurrency), the audit writes inside the login path, the per-recipient `member_period_metrics` (one paged call would return all).

---

## 16. Frontend rendering analysis

Measured with the production bundle, realistic data, headless Chromium on a fast CPU (multiply script times by 3–5 for phones):

| Screen | DOM nodes (1,644 / 5,000) | Script ms | Long tasks sum / max | Heap |
|---|---|---|---|---|
| Members | **29,703 / 90,111** | 1,655 / 2,203 | 2,565 / 1,435 → **7,073 / 4,055** | 107 → 136 MB |
| Attendance (week) | 49,476 (4.9k rows) | 1,197 | 2,390 / 1,182 | 117 MB |
| Follow-ups | 16,346 / 49,466 | 777 / 1,558 | 1,052 / 444 → 2,245 / 1,304 | 68 → 140 MB |
| Course detail | 11,988 / 36,063 | 1,316 / 2,261 | 1,388 / 887 → **8,850 / 7,654** | 173 → **430 MB** |
| Home / Courses / Reports / Audit | 87–367 | 183–300 | ≤ 250 | 9–17 MB |

Root causes in code (all Confirmed by reading, costs confirmed above):
- **No virtualisation anywhere** (`ScrollView` + `.map`; no `FlatList`/`FlashList`), **no `React.memo`**, inline arrow props on every row (`onOpen/onEdit/onRemove`, `onToggleSelect`, `rows={marks.data ?? []}`), so every state change re-renders every row.
- **Per-card work on the course roster** (`course/[id].tsx` `MemberCard`): `dayAttendance` scans all week rows per card (O(roster × rows) ≈ 1.3 M comparisons per render), builds a 1,644-option array for a closed `SearchPicker` per card (≈ 1 M objects per render), `new Date()` per card, 6 `useState` + 1 `useEffect` + 3 dialog components per card.
- **Un-memoised derivations per render**: Home (`reportRows`, `attentionFirst`, `distribution`, `withScope`), Courses tab (`courseSummary` per course **twice** per render, ~6 passes over the register each), Reports (4 derivations), Weekly (`isReachable` filter), Member dialog (`flagged()` over the register, `new Date()` per member), Send (`picked.includes` O(n²)), Attendance (4 count passes + regroup per keystroke).
- **Effects:** `setMeasured(true)` on mount forces a second full render on Home/Courses/course detail; every `<Icon>` has its own `useState`+`useEffect` and commits twice (≈ 10k Icon instances on Members); `FreshnessLine` ticks a 12 s interval per mounted screen (re-renders only itself); `upload.tsx` recomputes `targets` as an effect dep every render; `holiday.tsx` fires a network preview on every keystroke.
- **Contexts** are memoised and carry no data — context re-renders are not a cause.

---

## 17. PWA / service-worker analysis

`public/sw.js` (read in full): precaches only `/`; `/_expo/static/*`, manifest and icons are cache-first (only `response.ok` and non-HTML); navigations are network-first with the cached shell as fallback; **cross-origin (Supabase) requests are never intercepted**; no stale-while-revalidate; cache `rosifit-shell-v2`, older caches purged on activate, `clients.claim()` without `skipWaiting`. IndexedDB: unused. Verdict (Confirmed): the service worker contributes **nothing** to slow startup, stale data or duplicate API requests. The only PWA-side traffic is `DeploymentRefresh`'s `fetch('/', {cache:'no-store'})` on each focus/visibility/online event and every 5 min — one ~21 KB HTML fetch, not an API call; its `visibilitychange` handler probes on both directions (hidden and visible). Chunk recovery reloads at most once per minute and never during a write.

---

## 18. Authentication analysis

- **Session restore:** `getSession()` reads localStorage; a network refresh (`/auth/v1/token`, 0.77–0.93 s p50) only when expired. Then one `app_users` GET (restore) gates `router.replace`; the screen then issues a second `app_users` GET in a different URL shape (identity). **Two sequential identity-class round trips before the first data request** on every cold start (Confirmed in the trace at 02:16:42–43).
- **Listeners:** one `onAuthStateChange` subscription per mounted `useAppUser` (≈5 on Home, growing per visited tab). A `TOKEN_REFRESHED` event makes each re-run `currentAppUser()` (deduped 10 s); data hooks do not listen to auth events, so a refresh does not refetch data. The 1 Oct trace still shows **14 identity reads in 4 s** (sequential, ~150–200 ms apart) — the shared identity read holds only for a successful answer within 10 s; the exact trigger of that chain was not reproduced locally (Unknown; the local cold start shows 3 identity reads).
- **Unauthorized requests (Confirmed):** 33 × 401/403 in 24 h and a 30-error Postgres burst at 18:53:41 — the Home fan-out runs for a browser whose session is invalid before the redirect to sign-in. Nothing in `useAsync` waits for a resolved session.
- **Sign-in itself:** `auth-lookup` then `auth-login`, sequential Edge Functions, 3–7 s combined function time (two cold boots, GoTrue password sign-in, HMAC PIN derivation, two audit rows). Logout is local-scope and clears the shared caches. No unnecessary redirects found. Route guards read the shared identity only.
- Separation: genuine auth latency per cold start ≈ 0.15–0.3 s (two identity reads) or ≈ 1.1 s with a token refresh; everything after that is data latency.

---

## 19. Network analysis

Per major workflow (production per-request costs applied to the measured request counts; byte figures are uncompressed JSON from the realistic stand-in):

| Workflow | Requests | Transferred (uncompressed JSON) | Largest responses | Slowest (prod p50 / p90) | Sequential depth | Waterfall estimate |
|---|---:|---:|---|---|---:|---|
| Cold start → Home | 40–47 | 1.4 MB | 1,000-row pages 170–220 KB each | metrics RPC 276 / 575 ms; 1,000-row pages 265 / 880 ms | 5 (identity → identity → page1 → page2 → page3) | 1.5–2.5 s; 2–3 s in a burst |
| First visit to Members | 33 | 1.4 MB | same | same | 3 | 1.0–1.6 s |
| Attendance week | 50 (prod) | ~0.5 MB | records chunk 50–100 KB | records 259 / 294 ms | 4 + serial chunks | 1.5–3 s |
| Course detail | 40 (+15 per day tap) | 1.4 MB | | course_week_day_status 276 / 662 ms | 5 | 2–3 s |
| Return to app (>12 s away, 3+ tabs) | 28–40 | 1.4 MB | | each 560–890 ms in burst | — | 1–2 s "updating…" |
| Member save (after #63) | 41–45 | 1.4 MB | | create/update 390–480 ms | 2 | 1.5–2.5 s |
| CSV import (preview + commit) | 2 function calls + ~45 refresh | — | summary 1.6–17 KB | preview 4.4–5.3 s, commit 1–2 s | serial | 6–8 s |
| Send to 256 | 1 call | — | | 120 s | serial | 2 min |

Failed requests: 0.04 % (409 refusals, 1 × 401, 3 × 502 inside a burst). Retries: none automatic (the user retries). Duplicate requests: §14. Where latency comes from, in order: **the number of sequential hops × ~130 ms gateway floor** → in-burst queueing (×4–6) → payload transfer (~+130 ms per 1,000-row page) → Postgres (2–16 ms, 78 ms for metrics) → browser RTT (Unknown).

---

## 20. Production-log analysis

Window read: 24 h (3–4 Oct), the full day of Wed 1 Oct (busiest), Thu 2 Oct (imports), Fri 3 Oct (post-#63 writes), plus `pg_stat_*` since 1 Sep.

- **Volume:** 1 Oct ≈ 38k requests (≈ 60k with preflights) from ≤ 7 IPs; 3–4 Oct (Saturday) 1,186. Essentially all traffic is 1–3 staff browsers in India (MAA/BOM edges). PostgREST has served ~407k requests since 1 Sep.
- **Bursts:** 01:00–03:00 one browser 14,116 requests (peak minute 1,017); 12:00–15:00 one browser 16,759 (342/min for 49 min). Minutes with zero writes still carry 140–490 requests.
- **Latency pattern:** constant per-request floor (p50 133–150 ms every hour regardless of volume) → **constant**, plus **intermittent** in-burst spikes (p90 0.7–1.1 s, max 1.9–2.0 s) that are **screen- and behaviour-specific** (return-to-app and save cascades), not time-of-day or device specific (both MAA and BOM users show the same shape).
- **Errors:** 1 Oct — 8 × `update_member` 409, 2 × `create_member` 409, 3 × `member_period_metrics_page` **502** (14:09:53, inside a burst), 1 × 401. 3 Oct — 4 × `create_member` **500** ("a joining date in the future cannot be recorded", 00:37–01:02 IST: the form's "today" is tomorrow in UTC) each retried ~10 s later; 33 × 401/403 and 30 Postgres "permission denied" at 18:53:41 (unauthenticated fan-out). No 5xx from Postgres, no timeouts, no lock waits in `postgres_logs` for 24 h.
- **Edge Functions:** csv-import preview 4.4–5.3 s, send-followups 120 s for 256, sign-in 3–7 s, unsubscribe 2–4 s; 64 cold boots/day.
- **Auth:** 6–10 token refreshes/day at ~0.8–0.9 s each.

---

## 21. Load / scaling analysis (local harness + stand-in; production untouched)

Harness: Postgres 16, `seed_scale.sql` (a full year of sessions), `commit_csv_import` with real summaries, everything rolled back.

| Measure | 500 members | 1,500 (≈ today) | 5,000 |
|---|---:|---:|---:|
| attendance rows seeded | 78,500 | 235,500 | 785,000 |
| `member_period_metrics_page` week page 1 (warm) | — | 7.2 ms | 7.2 ms (harness plan; prod's generic plan scales with history) |
| `expected_members_for_session` | — | 3.3–4.7 ms | 3.2–4.8 ms |
| `recompute_member_stats()` unscoped | 256–265 ms | **1,003 ms** | **3,401 ms** |
| scoped to 1 member | — | 1.4 ms | 1.5 ms |
| `commit_csv_import` 100 rows | 0.44 s | 1.46 s | **4.38 s** (4,900 absent inserts through the per-row trigger) |
| 500 rows | 1.05 s | 2.61 s | 5.28 s |
| 1,000 rows | — | 4.16 s | **7.16 s** (8 s statement timeout on prod) |

Recompute and commit cost grow linearly with the register (≈0.65 ms per member per unscoped recompute); the commit's per-row cost is ≈2.3–2.9 ms.

Client, realistic stand-in (fast CPU): Members 29.7k → 90k nodes, long tasks 2.6 s → 7.1 s; course roster search 0.8 s → 7.7 s per key; heap 173 → 430 MB; every screen load 1.4 MB → 4.4 MB JSON, 33–47 → 49–72 requests (5 keyset pages per table). **The first clear degradation point is between ~1,600 and ~3,000 members**: the course roster and Members screens cross 3–5 s of blocked main thread on phones, the CSV commit approaches the 8 s statement timeout, and a send to the whole register exceeds the Edge Function wall clock. Repeated navigation, refresh and search were exercised in scenarios A–C above; multiple open screens are the default (tabs never unmount).

---

## 22. Complete root-cause list

| # | Root cause | Where | Evidence | Status |
|---|---|---|---|---|
| RC-1 | Focus/visibility/online revalidation re-runs every mounted reader on every visited tab after 12 s | `src/pwa/DataRefresh.tsx`, `src/data/revalidate.ts:304-341`, `app/(tabs)/_layout.tsx` (no unmount) | 28-request burst per return (local), 384 fan-outs / 49 min (prod) | Confirmed |
| RC-2 | No cross-screen cache: readers share only in-flight reads (5 s), keyed by period, so each tab/dialog does its own full register read | `src/data/memberStore.ts`, `src/lib/sharedFetch.ts`, `hooks.ts` | 18–19 requests per first tab visit; 6–12 fan-outs per write pre-#63 | Confirmed |
| RC-3 | Write buses refetch every subscribed hook on every mounted screen; `bulkDeleteMembers` rings per member | `repository.ts:3077, 4264, 4226-4248`, `hooks.ts` bus table | 243–290 requests/write (1 Oct), 41–45 (3 Oct) | Confirmed |
| RC-4 | Keyset paging ends only on an empty page and runs pages sequentially; id chunks (150) run sequentially | `src/data/pageAll.ts:135, 227-236, 259` | 3 hops per 1,644-row table; 14 serial requests for a 937-member name lookup | Confirmed |
| RC-5 | Fixed ~130 ms gateway floor per request from India to a Singapore origin, plus a preflight per request | region, CORS | p50 133 ms for an 11-row read; p90 572 ms gateway overhead | Confirmed |
| RC-6 | Whole lists rendered with no virtualisation, memo or debounce; O(roster × rows) per card on the course roster | `app/(tabs)/members.tsx`, `attendance.tsx`, `weekly.tsx`, `app/course/[id].tsx:2208+`, `src/data/dayAttendance.ts:359` | 29.7k nodes, 0.8–0.9 s per keystroke | Confirmed |
| RC-7 | `recompute_member_stats()` unscoped in `update_member` and `commit_csv_import` | migrations 0027, 0045 (T-014, 0074 unmerged) | 170 ms + 1,640-row upsert per save; 1.0–3.4 s in harness; 390k updates on 1,640 rows | Confirmed |
| RC-8 | `expected_members_for_session` evaluated per CSV row + per-row backdating trigger + per-row audit | 0045, 0046 (T-015) | commit 1.46 → 4.16 s for 100 → 1,000 rows | Confirmed |
| RC-9 | `member_period_metrics_page` is SECURITY DEFINER SQL → not inlinable → generic plan scanning all attendance; called 8–9× per Home load and once per bucket | 0075 | 11,675 buffers/call vs 527 inlined; 5,221 calls/day; 617 M index tuples fetched | Confirmed |
| RC-10 | Edge Functions: cold boot every call + strictly sequential round trips (preview ~21, send 4M+…) + serial SES sends with no timeout | `supabase/functions/*` | preview 4.6 s flat, 0.36–0.41 s/recipient | Confirmed |
| RC-11 | Data hooks fire before/without a valid session | `hooks.ts` `useAsync` has no auth gate | 30 permission-denied errors in 1 s; 33 × 401/403 per day | Confirmed |
| RC-12 | Unnecessary reads: empty `member_schedules`, unfiltered `member_emails`, whole `offering_schedules` history ×2, `courses` in 3 shapes, identity in 2 URL shapes, dead `useWeekRows` | `repository.ts:266-285, 576, 1159`, `session.ts` | per fan-out | Confirmed |
| RC-13 | `work_mem` 2 MB on the smallest tier → sort/hash spills; PostgREST pool queueing inside bursts | project config | 122 GB temp files; in-burst 4–6× | Confirmed (effect), Likely (attribution to specific queries) |
| RC-14 | Per-row audit trigger (`audit_row_change` column loop + `current_app_user_id()` per row) on every write table | 0004 | app_users 19.7 M seq scans | Likely (cost not isolated) |
| RC-15 | Sign-in = two sequential cold Edge Functions | `auth-lookup`, `auth-login` | 3–7 s | Confirmed |
| RC-16 | Member form "today" computed in IST, refused as "future" in UTC | `create_member` SQLSTATE 55000 | 4 of 8 creates on 3 Oct failed and were retried | Confirmed (correctness, not latency) |

---

## 23. Severity classification

- **P0 — Critical:** none today. (Candidates at ~3,000+ members: CSV commit > 8 s statement timeout; whole-register send > function wall clock.)
- **P1 — High:** RC-1, RC-2, RC-3, RC-6, RC-7, RC-8, RC-9, RC-10 (csv preview / send), RC-4.
- **P2 — Medium:** RC-5 (constant, only mitigable by fewer hops or a Mumbai project), RC-11, RC-12, RC-13, RC-15, course-day 5-hop chain, member-dialog register read, bulk delete loop, holiday keystroke RPC.
- **P3 — Low:** RC-14, 1.3 MB WhatsApp font on `/help`, un-memoised derivations on Home/Courses/Reports, `Icon` double commit, double `setMeasured` render, `DeploymentRefresh` probing on hidden, unindexed audit FKs.

---

## 24. Performance scorecard

| Area | Status | Current latency | Root cause | Severity | Recommended action |
|---|---|---:|---|---|---|
| Initial load | Amber | 2.5–4 s to usable Home on a phone (JS ~2.5–3 s + 40–47 requests) | RC-4, RC-5, RC-11, 2 identity hops | P2 | gate hooks on session; one identity read; drop the empty page; show first page early |
| Navigation | Red | 1–2 s per first tab visit, 0 s on return | RC-2, RC-12 | P1 | app-level cache of the register keyed by data generation, not per hook |
| Refresh (return to app / save) | **Red** | 1–2 s burst of 28–45 requests per return; was 250/write | RC-1, RC-3 | **P1** | revalidate only the focused screen; raise staleness; one bus-driven read |
| Members | Red | 1.6 s network + 1.4 s (×3–5 phone) render | RC-6, RC-2 | P1 | virtualise, memo rows, debounce |
| Attendance | Red | 50 requests, 22k–49k nodes, 0.9 s first keystroke | RC-4, RC-6 | P1 | server-side day/week shape, virtualise |
| Search | Amber/Red | 0.3–0.9 s per key on roster/attendance | RC-6 | P1 at 5,000 | debounce 150 ms + memoised rows + precomputed per-row search text |
| CSV upload | Amber | preview 4.6 s + commit 1–2 s (+ 45-request refresh) | RC-10, RC-7, RC-8 | P1 | scope recompute, hoist expected set (0074), parallel/fewer trips |
| Dashboard | Amber | ~47 requests, 21 of them metrics | RC-9, RC-2 | P1 | one bucketed metrics RPC; inlinable or plpgsql with custom plan |
| Follow-ups | Amber | 16k nodes; send 0.4 s/recipient | RC-6, RC-10 | P1 (send) | batched send with bounded concurrency + timeout |
| Reports | Green/Amber | 35 requests, light render; month metrics chain | RC-2, RC-9 | P2 | share register; cache |
| Database | Amber | 2–16 ms per read; 170 ms + upsert per member save; 122 GB temp | RC-7, RC-9, RC-13 | P1 | scoped recompute; metrics plan; consider work_mem per role |
| Edge Functions | Amber | 4.6 s preview, 3–7 s sign-in, 120 s/256 send | RC-10, RC-15 | P1 | fewer sequential trips, pooled auth, concurrency |
| Authentication | Amber | 0.15–1.1 s per cold start; 33 unauthorised requests/day | RC-11, 2-hop restore | P2 | gate + share |
| PWA | Green | no contribution to API latency | — | — | none (optional: stop probing on hidden) |
| Network | Amber | ~130 ms floor × hops; preflight per request | RC-5, RC-4 | P2 | reduce hops; (Mumbai project only if hops cannot be cut) |

---

## 25. Prioritised remediation roadmap

### Phase 1 — Critical fixes (user-visible latency, no data-model change)

1. **Stop the refetch storms (RC-1, RC-3).** `src/pwa/DataRefresh.tsx` / `src/data/revalidate.ts`: revalidate only readers belonging to the *focused* screen (or mark tabs' readers inactive on blur via `useIsFocused`), raise `STALE_AFTER_MS` for focus-driven refreshes to minutes, and keep the write-driven refresh to one shared register read per generation (extend `memberStore` to key by generation and keep the last answer, not only in-flight). Expected: return-to-app bursts 28–40 → ≤ 5 requests; per-write 41 → ~10. Complexity low–medium; risk: a stale list after a write on another device (mitigate by keeping bus-driven refresh). Tests: extend `src/data/revalidate.test.ts`, `memberRefresh.test.ts`, `scripts/perf/cold-start-and-tabs.js` with a focus step (scenario A here).
2. **Scope the server recompute and hoist the expected set (RC-7, RC-8) — migration 0074 (T-014/T-015, already written, unmerged).** `update_member`, `commit_csv_import`: `recompute_member_stats(array[...])`; compute `expected_members_for_session` once per commit (after any add-as-new). Expected: `update_member` 249 ms → ~20 ms DB; commit 100 rows 1.46 s → ~0.4 s; at 5,000 members 4.4 s → ~1 s; `member_stats` churn gone. Risk: the add-as-new ordering trap documented in `52_import_recomputes_only_its_own.sql`; run `npm run test:db` and the owner's pre-prod SQL review per CLAUDE.md. Pre-apply check on production: none needed beyond the harness replay (no index/constraint over existing rows).
3. **Virtualise and memoise the three big lists (RC-6).** `app/(tabs)/members.tsx`, `attendance.tsx`, `weekly.tsx`, `app/course/[id].tsx`: `FlatList` (or `@shopify/flash-list` after dependency verification) with `React.memo` rows, stable callbacks, a precomputed `searchText` per row, 150 ms debounce on the query, and move `dayAttendance` to a `Map` built once per day instead of a scan per card; build the `SearchPicker` options only when the picker opens. Expected: Members 29.7k → ~600 nodes, script 1.4 s → < 200 ms; keystroke 0.8 s → < 50 ms; course roster at 5,000 usable. Complexity medium; risk: scroll/anchor behaviour, `.harness/` route checks in both themes. Tests: `src/components/*.test.ts` for row memo contracts; scenario B here as a budget (nodes, long tasks).

### Phase 2 — High-impact request reduction

4. **Gate data hooks on a resolved session and share one identity read (RC-11, auth).** `hooks.ts` `useAsync`: do not load until `useAppUser` has settled; make `restoreSession` use the same URL shape as `currentAppUser`. Expected: −33 unauthorised requests/day, one hop less per cold start.
5. **Remove the empty terminating page and read in parallel (RC-4).** `pageAll.ts`: stop when a page is shorter than `PAGE_SIZE` **and** verify `db-max-rows` is 1000 via a build-time check (the recorded reason for the current contract), or request `limit=1001` and detect overflow; fetch chunked id lists in parallel (bounded 4). Expected: −1 request per table per read (−7 per fan-out), chunk chains 14 serial → 4 parallel.
6. **Delete the unnecessary reads (RC-12).** Skip `member_schedules` when empty is known, filter `member_emails` by `deleted_at`, read `offering_schedules` once per course set, fetch `courses` in one shape, remove `useWeekRows`, make the member dialog read one member (new RPC or `members?id=eq`). Expected: −6 to −10 requests per screen.
7. **One bucketed metrics RPC and an inlinable/custom-planned metrics function (RC-9).** Replace the 7–9 parallel `member_period_metrics_page` calls with one RPC returning all buckets (`p_buckets daterange[]`), and make the function plan with its arguments (plpgsql `RETURN QUERY` with the dates as literals via `EXECUTE`, or drop SECURITY DEFINER so it inlines, keeping RLS correct). Expected: Home 21 → 3 requests; 11.7k → ~0.5k buffers per call; this is the only migration in Phase 2 — it needs the harness replay and the raw SQL review, and no data backfill.
8. **Edge Functions (RC-10, RC-15).** csv-import preview: run the five register reads with `Promise.all`, index members by `alias_normalized`/`name_normalized` in a `Map`, precompute member bigrams once per request; send-followups: one paged metrics call instead of M, bounded concurrency (e.g. 5) with a timeout on SES, cache the SigV4 signing key per day; sign-in: fold `auth-lookup` into `auth-login` or keep the isolate warm. Expected: preview 4.6 s → ~1.5 s; 256-recipient send 120 s → ~25 s; sign-in −1 cold boot.

### Phase 3 — Architecture

9. **Application-level data store** (one in-memory register + attendance store with generation stamps, screens subscribe to slices; writes patch locally then reconcile) — removes RC-2 entirely and makes tabs free. Complexity high; risk: consistency rules (guardrail 1) — keep the follow-up list derived.
10. **Server-side screen shapes**: an attendance-week RPC returning rows with names/aliases/emails joined (50 → 2 requests), a course-day RPC (15 → 1), a member-detail RPC (24+ → 2). Each is an additive migration + spec.
11. **Compute tier / `work_mem`**: after 7, re-measure temp spills; if still > 1 GB/day, set `work_mem` per role (`alter role authenticated set work_mem`) rather than upgrading the tier. Region move to ap-south-1 only if hop counts cannot be cut (saves ≤ 45–90 ms per hop).

### Phase 4 — Fine tuning

12. Memoise Home/Courses/Reports derivations; drop the duplicate `courseSummary`; `Icon` font-ready state lifted to one provider; skip `DeploymentRefresh` probe on hidden; debounce `previewHoliday`; lazy-load the 1.3 MB WhatsApp font only when the Help button is on screen (it already is Help-only); parallelise `fetchMemberWeek`'s offering lookup; index `csv_imports (offering_id, session_date, status)` when imports grow; fix the IST/UTC "joining date in the future" refusal (RC-16).

---

## 26. Exact files / functions requiring changes (by phase)

- **P1:** `src/pwa/DataRefresh.tsx`, `src/data/revalidate.ts` (`revalidateStale`, `STALE_AFTER_MS`), `src/data/hooks.ts` (`useAsync` registration, bus subscriptions), `src/data/memberStore.ts` (`createMemberReads`), `src/data/repository.ts` (`readMembers`, `membersChanged`, `attendanceChanged`, `bulkDeleteMembers`), `app/(tabs)/_layout.tsx`; `supabase/migrations/0074_*.sql` (from `fix/T-014`: `update_member`, `commit_csv_import`), `supabase/tests/52_import_recomputes_only_its_own.sql`; `app/(tabs)/members.tsx` (`MemberCard`, filter memo), `app/(tabs)/attendance.tsx` (`matchesAttendanceQuery`, groups), `app/(tabs)/weekly.tsx`, `src/components/MemberRow.tsx`, `app/course/[id].tsx` (`MemberCard`, `narrowToSearch`, `rosterFilterCounts`), `src/data/dayAttendance.ts`, `src/data/rosterFilter.ts`, `src/components/Sheet.tsx` (`SearchPicker` options).
- **P2:** `src/data/session.ts` (`restoreSession`, `currentAppUser`), `src/data/pageAll.ts` (`pageAllByKey`, `inChunks`), `src/data/repository.ts` (`readMembers` table list, `fetchCourses`, `fetchOfferings`, `fetchFilterOptions`, `fetchMemberWeek`, `fetchCourseDayRows`), `src/data/periodMetrics.ts` + a new migration for the bucketed RPC / `member_period_metrics_page` planning, `supabase/functions/csv-import/index.ts` (`preview`), `_shared/match.ts` (`similarity`), `supabase/functions/send-followups/{index,load,send-loop,email}.ts`, `auth-lookup`/`auth-login`.
- **P3/P4:** `src/state/` (new store), new RPC migrations (`attendance_week`, `course_day`, `member_detail`), `app/(tabs)/index.tsx`, `courses.tsx`, `reports.tsx`, `src/components/Icon.tsx`, `src/pwa/DeploymentRefresh.tsx`, `app/holiday.tsx`, `app/member/edit.tsx` (date default).

---

## 27. Recommended tests

- **Request budgets (CI, stand-in API):** extend `scripts/perf/cold-start-and-tabs.js` with the focus/visibility step and a write step; assert ≤ 30 requests per cold start, ≤ 5 per return-to-app, ≤ 12 per save, 0 while typing, 0 before the session resolves. (Scenario A here is the template.)
- **Render budgets:** a Playwright check with the realistic stand-in (scenario B): Members ≤ 2,000 DOM nodes, no long task > 200 ms at 1,644 and 5,000 members; course-roster keystroke < 50 ms.
- **DB specs (append-only, `supabase/tests/`):** 52 (sentinel stats row untouched by import — the T-014 proof), a new spec asserting `expected_members_for_session` evaluation count via a counting wrapper, timing rows in `T-039` for 2,000/5,000, `EXPLAIN (BUFFERS)` assertion that the metrics RPC reads < 1,000 buffers for a one-week window, and a 1,000-row commit under `set statement_timeout = '8s'`.
- **Edge Functions:** `deno test` for the matcher with a 1,000 × 5,000 fixture under a 500 ms budget; a send-loop test proving bounded concurrency and a timeout; a csv-import preview test counting round trips (≤ 8).
- **Both themes** route checks (`.harness/`) for every virtualised list; copy-lock tests untouched.

---

## 28. Expected improvement per fix (estimates from the measurements above)

| Fix | Metric | Now | Expected |
|---|---|---|---|
| 1 Focus/write refetch scoping | requests per return-to-app / per save | 28–40 / 41–45 | ≤ 5 / ≤ 10; the 342 req/min storms disappear |
| 2 Migration 0074 (scoped recompute, hoisted expected set) | `update_member` DB time; commit 100 rows (1,500 / 5,000) | 249 ms; 1.46 s / 4.38 s | ~20 ms; ~0.4 s / ~1.0 s |
| 3 Virtualised, memoised, debounced lists | Members script / nodes; roster keystroke | 1.4–1.7 s / 29.7k; 0.8 s (7.7 s at 5k) | < 0.2 s / < 1k; < 50 ms |
| 4 Session gate + one identity shape | unauthorised requests/day; cold-start hops | 33; 2 | 0; 1 |
| 5 Paging without the empty page, parallel chunks | requests per register read; name chunks | 24; 14 serial | 17; 4 parallel |
| 6 Remove unnecessary reads | requests per screen | 33–47 | 25–35 |
| 7 Bucketed metrics RPC + inlinable plan | Home metrics requests; buffers/call | 21; 11,675 | 3; ~500 |
| 8 Edge Function round trips / concurrency | preview; 256-send; sign-in | 4.6 s; 120 s; 3–7 s | ~1.5 s; ~25 s; −1 boot |
| 9 App-level store | first-visit tab cost | 18–19 requests, 1.4 MB | 0 |
| 10 Screen-shape RPCs | attendance week / course day requests | 50 / 15 | 2 / 1 |

Combined Phase 1+2 effect on "why it feels slow": a cold start to a usable Home from ~40–47 requests and 2–3 s of waterfall to ~20 and ~1 s; returning to the app from a 1–2 s "updating…" burst to nothing; a member save from 1.5–2.5 s to ~0.7 s; Members from ~5 s on a phone to ~1.5 s; CSV import from 6–8 s to ~3 s.

---

### Appendix — how the measurements were made
- Production, read-only: `pg_stat_statements`, `pg_stat_user_tables`, `pg_stat_database`, `pg_settings`, `EXPLAIN (ANALYZE, BUFFERS)` under `set_config('role','authenticated')` with the owner's JWT subject, `csv_imports`/`email_batches` rows, Supabase advisors; logs via the unified log store (`edge_logs` fields `response.origin_time`, `response.headers.x_envoy_upstream_service_time`, `function_edge_logs.execution_time_ms`, `postgres_logs`, `postgrest_logs`).
- Local: production export (`expo export --platform web`, no gzip on the local server), headless Chromium via `playwright-core`, two stand-in APIs (`[]` answers with a 130 ms delay; a data-rich one implementing the PostgREST filter subset the app uses, 1,644 and 5,000 members), scenarios A (request counts per phase), B (render cost + keystrokes), C (throttled cold start); the harness (`db/harness/reset.sh`, `seed_scale.sql` at 500/1,500/5,000) with `\timing`, every write rolled back.
- Not measured (Unknown): browser↔Cloudflare RTT from India, gateway JSON compression, Edge Function CPU/memory per invocation, the exact trigger behind the 14-read identity chain, and real-user render timings on phones (all phone figures are CPU-throttled estimates).
