# Production measurements (read-only) — running notes
Project lhpzhkzbnquwjljmbylo, ap-southeast-1, Postgres 17.6. pg_stat_statements since 2026-09-01 09:17 UTC (cumulative incl. pre-24-Sep RLS fix). now=2026-10-04 06:36 UTC.

## pg_stat_statements top by total time (cumulative since 1 Sep; includes pre-RLS-fix period)
| query | calls | total_ms | mean | max | blks/call |
|---|---|---|---|---|---|
| rpc member_period_metrics_page (p_from,p_to,p_after,p_limit) | 44,658 | 3,123,079 | 69.9 | 2,809 | 13,361 |
| member_stats page (ORDER BY member_id LIMIT/OFFSET) | 8,470 | 1,980,516 | 233.8 | 2,051 | 1,247 |
| member_enrollments status=active page | 8,365 | 1,847,054 | 220.8 | 1,885 | 1,272 |
| member_aliases alias_type page | 8,187 | 1,684,100 | 205.7 | 1,941 | 1,209 |
| members deleted_at null page (7 cols) | 7,749 | 1,585,781 | 204.6 | 1,985 | 1,238 |
| member_emails deleted_at null page (5 cols) | 2,421 | 1,501,723 | 620.3 | 1,889 | 1,134 |
| rpc course_week_day_status | 2,124 | 591,842 | 278.6 | 2,291 | 819 |
| members keyset (id > $) page | 15,287 | 566,732 | 37.1 | 1,258 | 321 |
| member_stats keyset page | 16,225 | 564,120 | 34.8 | 1,198 | 310 |
| member_enrollments keyset page | 16,587 | 542,293 | 32.7 | 1,090 | 295 |
| member_aliases keyset page | 14,464 | 216,321 | 15.0 | 611 | 156 |
| rpc member_period_metrics (unpaged, send-followups per member) | 4,978 | 150,359 | 30.2 | 705 | 1,089 |
| attendance_records in(session_id) | 2,125 | 152,491 | 71.8 | 983 | 185 |
| attendance_records (other shape) | 229 | 123,389 | 538.8 | 2,220 | 3,588 |
| member_emails ORDER BY (6 cols incl deleted_at — current readMembers shape) | 5,795 | 118,880 | 20.5 | 1,005 | 986 |
| members id=any (name chunks) | 6,535 | 65,941 | 10.1 | 403 | 152 |
| rpc commit_csv_import (service_role) | 175 | 61,939 | 353.9 | 1,793 | 46,657 |
| rpc update_member | 139 | 34,573 | 248.7 | 965 | 49,031 |
| set_config (PostgREST per-request) | 406,837 | 33,087 | 0.08 | 303 | 0 |
| rpc delete_member | 406 | 18,139 | 44.7 | 455 | 533 |
| offering_schedules whole table | 6,440 | 20,010 | 3.1 | — | — |
| course_follow_up_config | 9,555 | 19,154 | 2.0 | | |
| courses | 6,421 | 17,266 | 2.7 | | |
NOTE: PostgREST issued ~406,837 requests total since 1 Sep (set_config count).
NOTE: member_period_metrics_page: 13,361 shared blocks per call (~104 MB of buffer reads per page call) — it re-aggregates the whole period every page.
NOTE: commit_csv_import 46,657 blks/call; update_member 49,031 blks/call (unscoped recompute_member_stats).

## pg_stat_user_tables (2026-10-04)
- app_users: 11 live rows, seq_scan 19,686,798 (!), seq_tup_read 91M — RLS helper current_app_user_id() + audit_log() lookups; tiny table so cheap per scan but called per statement/row.
- sessions: 63 rows, seq_scan 331,740; course_offerings: 4 rows, seq_scan 3.4M.
- members 1,644 live (552 kB); member_emails 1,299; member_aliases 1,343; member_enrollments 1,620; member_stats 1,640 live, n_tup_upd = 390,346 (!!) for 1,640 rows -> whole-table rewrites by unscoped recompute_member_stats().
- attendance_records 18,305 live rows, 6.3 MB total, idx_tup_fetch 617,929,034 (!!) — index fetch count 34k× the row count: repeated whole-period aggregation (member_period_metrics_page per page/bucket) and current_streak_for per member.
- audit_logs 15,832 rows 11 MB. Whole DB public schema < 25 MB. Data volume is NOT the problem; repetition is.
- member_schedules: 0 live rows.

## Edge logs 2026-10-03 11:09 → 2026-10-04 08:11 UTC (24h window, Sat; 1,186 requests total = quiet day)
Field semantics: response.origin_time = edge→origin ms (Supabase gateway+PostgREST+DB); x_envoy_upstream_service_time = PostgREST+DB ms. Difference ≈ gateway/envoy/Cloudflare-to-origin overhead.
| path | n | p50 origin | p90 origin | max | p50 upstream (PostgREST+DB) |
|---|---|---|---|---|---|
| rpc member_period_metrics_page | 172 | 216 | 738 | 1,887 | 43 |
| courses | 91 | 139 | 703 | 1,416 | 8 |
| member_enrollments | 70 | 264 | 866 | 1,584 | 10 |
| course_offerings | 69 | 137 | 696 | 1,394 | 5 |
| members | 61 | 267 | 881 | 1,684 | 9 |
| member_aliases | 60 | 266 | 867 | 1,649 | 12 |
| member_stats | 60 | 265 | 830 | 1,570 | 10.5 |
| member_emails | 60 | 263 | 890 | 1,668 | 10 |
| branches | 56 | 137 | 750 | 1,385 | 7 |
| sessions | 29 | 144 | 883 | 1,461 | 13 |
| app_users | 29 | 153 | 842 | 1,383 | 25 |
| member_schedules | 23 | 378 | 1,062 | 1,362 | 96 |
| course_follow_up_config | 21 | 398 | 971 | 1,367 | 79 |
| follow_up_config | 20 | 353 | 1,123 | 1,370 | 91 |
| offering_schedules | 20 | 280 | 868 | 1,458 | 15.5 |
| rpc course_week_day_status | 12 | 168 | 850 | 1,252 | 37.5 |
| rpc create_member | 8 | 301 | 473 | 484 | 67.5 |
| auth/v1/token (refresh) | 6 | 927 | 984 | 990 | 420 |
| OPTIONS preflights | ~250 | 0 | 134–190 | 206 | 0 |
KEY FINDING: p50 upstream (PostgREST+DB) is 5–43 ms for every member-list read, but p50 origin is 137–398 ms and p90 700–1,100 ms. 85–95% of per-request time is NOT database time; it is gateway/connection/queueing on the Supabase side (origin_time − upstream_service_time). The 1,000-row page reads sit at ~265 ms p50 vs 137 ms for tiny tables → ~130 ms extra attributable to payload size (~100–200 KB per page) transfer edge↔origin.
Preflight OPTIONS: every browser request pays a CORS preflight (0 ms origin, but a full RTT India→Cloudflare).

## Edge logs Wed 2026-10-01 00:00→24:00 UTC (busy weekday, ~38k non-OPTIONS requests)
| path | n | p50 origin | p90 | p99 | max | p50 upstream | p90 upstream |
|---|---|---|---|---|---|---|---|
| rpc member_period_metrics_page | 5,221 | 276 | 575 | 1,299 | 2,028 | 78 | 275 |
| members | 4,038 | 142 | 303 | 789 | 1,592 | 6 | 35 |
| courses | 3,210 | 136 | 279 | 829 | 1,906 | 4 | 99 |
| branches | 2,546 | 135 | 250 | 808 | 1,903 | 3 | 73 |
| member_enrollments | 2,475 | 160 | 355 | 877 | 1,838 | 6 | 57 |
| member_emails | 2,436 | 153 | 359 | 894 | 1,489 | 6 | 59 |
| member_aliases | 2,435 | 151 | 347 | 914 | 1,524 | 5 | 46 |
| member_stats | 2,426 | 155 | 346 | 874 | 1,856 | 6 | 51 |
| course_offerings | 2,288 | 135 | 273 | 862 | 1,725 | 4 | 87 |
| app_users | 1,363 | 133 | 211 | 846 | 1,465 | 2 | 40 |
| sessions | 926 | 139 | 306 | 934 | | 8 | 117 |
| member_schedules (0 rows!) | 812 | 144 | 308 | 911 | | 10 | 109 |
| follow_up_config | 732 | 147 | 359 | 905 | | 12 | 148 |
| course_follow_up_config | 719 | 147 | 398 | 865 | | 12 | 154 |
| email_batches / email_messages / pin_reset_requests (notifications) | 702/669/648 | 135 | ~150 | | | 4-5 | 16-23 |
| offering_schedules | 551 | 148 | 449 | 1,011 | | 13 | 181 |
| attendance_records | 297 | 259 | 294 | 476 | | 8 | 32 |
| rpc course_week_day_status | 228 | 276 | 662 | 1,259 | 1,956 | 124 | 356 |
| app_settings | 64 | 234 | 1,033 | 1,528 | | 51.5 | 361 |
| rpc update_member | 22 | 340 | 473 | 619 | | 211 | 341 |
| auth/v1/token | 10 | 766 | 939 | | | 353 | 409 |
| auth/v1/user | 10 | 762 | 1,108 | 2,209 | | 180 | 514 |
| rpc commit_csv_import | 4 | 876 | 1,686 | 1,925 | | 762 | 1,581 |
| rpc create_member | 4 | 392 | 541 | | | 254 | 294 |
FLOOR: the cheapest possible request (app_users, 11 rows, 2 ms upstream) costs 133 ms p50 at the edge→origin hop. So ~130 ms is the fixed per-request cost (Cloudflare BOM/MAA → Singapore origin → gateway → PostgREST → back), BEFORE the browser↔Cloudflare leg (not visible in logs). Every request = ≥130 ms + browser RTT, regardless of size. 5-deep chains therefore cost ≥0.65 s + 5×browser RTT before any DB work.
member_period_metrics_page is both the most called (5,221/day = 14% of all requests) and the one with real DB time (78 ms p50 upstream, 275 p90) — the only read where DB time matters.

## Burst anatomy, Wed 1 Oct 01:10–02:17 UTC, ONE browser IP (31 active minutes, 11,500 requests)
Per active minute: 69 member_period_metrics_page, 53 members, 40 courses, 32 each of enrollments/aliases/emails/stats/branches, 30 app_users, 9 each of notifications' email_batches/email_messages/pin_reset_requests. Minutes with ZERO writes still show 140–490 requests; peak minute 02:13 = 1,017 requests (4 writes).
Raw 10-second slice 02:16:42–02:16:52 (no writes):
- 42.78 one app_users (786 ms). 43.19–43.21: a 29-request parallel burst (every mounted reader at once: members×6 tables, 9× metrics page, course_week_day_status, sessions, courses×3 shapes, branches×2, offerings×2, follow_up_config×2, offering_schedules) — each request took 560–890 ms (vs 130 ms when alone): the burst queues at the gateway/pool.
- 43.6–45.5: app_users identity read 14 times in 4 s (sequential, ~150–200 ms apart) — the T-405 chain pattern.
- member_schedules (0 rows, returns [] ) read at 43.195, 43.923, 44.090, 46.836, 50.619 → 5 complete readMembers fan-outs in 8 s with no write in the minute. Each fan-out = ~24 requests (6 tables × 3 keyset pages incl. the empty terminator + metrics 3 pages + offerings/courses/branches).
- Notifications chain (email_batches/email_messages/pin_reset_requests) fetched 3× within 0.5 s (44.256, 44.491, 44.664) = 3 AcademyHeader instances (one per mounted tab).
- Course day chain visible: course_offerings → courses/branches → sessions → attendance_records → members in(...) name chunks, each ~130–140 ms, strictly sequential (44.85→45.45: 5 hops ≈ 0.7 s).
- Keyset paging is sequential: members page1 (1000) → page2 (644) → page3 ([]), each ≥130 ms → one 1,644-row table costs ≥400 ms of serial latency even though DB time is ~6 ms/page.
INTERPRETATION (likely, to verify locally): the all-at-once bursts match DataRefresh.revalidateStale (focus/visibility) over every mounted tab + the per-tab AcademyHeader; the repeated readMembers within seconds come from different period keys / generation bumps; the 14 identity reads mean the shared identity read is not holding (T-405 deployed? check).
Hourly p50 origin stays 142–150 ms whether the hour has 490 or 11,824 requests → per-request latency is NOT load-dependent at today's volume; the fixed per-hop cost dominates. Inside a burst, per-request time rises 4–6× (queueing), which IS load-dependent at the per-second scale.

## Wed 1 Oct 12:00–15:00 UTC, IP 223.185.25.4 (Chennai/MAA): 16,759 requests in 49 active minutes = 342/min
- 384 full member-list fan-outs (member_schedules count), 2,696 metrics-page calls (7 per fan-out = Home's 7 day buckets), 408 identity reads, 115 course_week_day_status, 347/341/335 notification reads.
- Writes in the same 3 h: 6 update_member, 5 set_member_status, 1 create_member, 1 delete_member = 13. So ~30 fan-outs per write: writes do NOT explain the volume.
- No set_attendance, no edge-function calls. One token refresh.
- Cadence: one fan-out every ~7.6 s for 49 minutes. Hypothesis to verify locally: each return to the app (visibilitychange/focus → DataRefresh.revalidateStale) re-runs every mounted reader older than 12 s across every visited tab, i.e. a ~40-request burst per app switch (e.g. reach-out via WhatsApp and back).

## Database config / health (2026-10-04)
- max_connections 60, shared_buffers 28672×8kB = 224 MB, work_mem 2184 kB (~2 MB), effective_cache_size 384 MB, jit off, statement_timeout 120 s, max_parallel_workers_per_gather 1. Smallest compute tier.
- DB size 39 MB. Buffer hit 100% (blks_read 1,795 vs 754 M hits) → nothing is disk-bound for reads.
- **temp_files 47,942 / temp_bytes 122 GB since 25 Aug** → queries spill sorts/hashes to disk constantly despite a 39 MB database: work_mem 2 MB is below the working set of member_period_metrics_page / recompute_member_stats (18k attendance rows × joins, GROUP BY member_id, window sort). This is the DB-side cost behind the 78 ms p50 / 275 ms p90 upstream time of the metrics RPC.
- Activity at a quiet moment: 1 PostgREST backend + mgmt, exporter, pg_cron, pg_net; 6 backends. No long transactions, 0 deadlocks, xact_rollback 1,905 / 1.93 M commits (0.1%).
- Connections: PostgREST uses its own pool (db-pool default 10) → inside a 40-request burst, requests queue for PostgREST pool slots/workers; this matches the 4–6× per-request slowdown inside bursts.

## EXPLAIN ANALYZE (prod, read-only, role=authenticated with the owner's JWT sub), 2026-10-04
- `member_period_metrics_page('2026-09-28','2026-10-04', null, 1000)` (this week, page 1): **452 ms**, shared hit 12,437 buffers (~97 MB of buffer traffic for a 6 MB table). Plan hidden behind Function Scan (SQL function) — inner plan below.

## Query plans (prod, read-only, 2026-10-04)
- metrics page, inlined SQL (custom plan with constants): 23 ms, 527 buffers, sessions-first nested loop (12 sessions → attendance by session index).
- metrics page via the SQL function (SECURITY DEFINER → not inlinable → generic plan): first call 452 ms cold, 16.5 ms warm, but **11,675 buffers every call** — the generic plan walks the ENTIRE attendance_records table through the attendance_member index (11,275 rows read, 131,346 rows discarded by the join filter) because the plan is built for unknown dates/cursor. Cost scales with total attendance history, not the period: at 5,000 members × 1 year (~780k rows) each of the ~7–9 metrics calls per Home load would scan 780k rows.
- recompute_member_stats() unscoped, SELECT part only: 170 ms, 52,846 buffers, 1,640 lateral aggregates + 1,640 current_streak_for window scans, then a 1,640-row upsert (member_stats n_tup_upd 390,346 to date). Called by update_member (every member save; pg_stat mean 249 ms, 49k buffers/call) and commit_csv_import (mean 354 ms, 47k buffers/call).
- expected_members_for_session(latest session): 58 ms, 486 rows (first call). Evaluated R+2 times per CSV commit.
- course_week_day_status (authenticated, RLS InitPlans): 3.5 ms warm.

## Edge Functions (function_edge_logs, Thu 2 Oct 2026)
| call | execution_time_ms |
|---|---|
| csv-import preview (12–61 rows, 9 imports) | 4,368 / 4,370 / 4,599 / 4,601 / 4,644 / 4,898 / 4,910 / 5,012 / 5,266 → p50 ≈ 4,600 ms, independent of row count |
| csv-import commit | 972 / 1,056 / 1,409 / 1,639 / 1,671 / 1,704 / 1,891 / 1,959 → p50 ≈ 1,650 ms |
| send-followups 256 recipients | 120,138 ms (email_batches: 256 → 91 s, 136 → 51 s, 291 → 113 s, 260 → 106 s ⇒ **0.36–0.41 s per recipient, strictly serial**) |
| auth-lookup | 3,260 ms |
| auth-login | 3,720 ms (sign-in = lookup + login ≈ 7 s of function time) |
| unsubscribe (GET/POST, 303) | 2,324 / 2,818 / 4,050 ms; Oct 1 p50 3,073 |
| ses-feedback | 3,820 ms |
| Oct 1 send-followups p50 4,524 ms (n=13, mostly 1-recipient sends 0.4–0.6 s DB-side; the function wall time is ~4.5 s even for 1 recipient) |
- function_logs: 64 "booted (time: 22ms)" entries on Oct 1 → nearly every invocation is a cold boot (functions are called rarely, so isolates are evicted). A 1-recipient send measured 0.5 s DB-side but 4.5 s function time ⇒ ~4 s is boot + sequential authz (getUser → app_users) + Mumbai→Singapore round trips.
- T-408 (csv-import pinned to ap-southeast-1): preview p50 before = 5,503 ms (24 Sep); on 2 Oct p50 ≈ 4,600 ms. Improvement ~0.9 s (16%), the preview is still ~21 sequential DB round trips + cold boot.

## LOCAL reproduction A (production bundle, stand-in API replying [] after 130 ms, headless Chromium, stored session) — 2026-10-04
- Cold start on Home: **27 requests** (app_users×3, 8× member_period_metrics_page = 7 day buckets + the week, the 6-table member read, courses×2, branches, follow-up configs, notifications chain ×1, user_preferences, sessions). With real data every paged table adds its 2nd/3rd page → ~40.
- First visit to another tab: **18–19 requests each** (Courses, Reports): a fresh member-list fan-out (memberStore shares only in-flight reads), the notifications chain again (one AcademyHeader per tab), courses/branches/offerings again.
- Returning to an already-visited tab: 0 requests (tabs stay mounted). Idle 13 s: 0 requests (no polling).
- **Return to the app (visibilitychange hidden→visible + focus) after >12 s idle with 3 tabs visited: 28 requests in one burst, every time** (member list fan-out, 9 metrics pages, 3 notification chains, courses×3, branches×2 …). Within 12 s of the last load: 0. This is DataRefresh.revalidateStale over every mounted reader on every visited tab; with production paging it is the 29–40-request burst seen in the edge logs, and each such burst costs 0.5–0.9 s per request inside the burst (gateway queueing) ⇒ 1–2 s of "updating…" per return to the app.

## LOCAL reproduction B — render cost with realistic data (1,644 members, 4 courses, 12 completed sessions/week, stand-in API 130 ms/request), headless Chromium on a 4-vCPU container (phones are ~3–5× slower on script time)
| Screen | requests | JSON | DOM nodes | script ms | long tasks (sum / max) | heap | network-idle |
|---|---|---|---|---|---|---|---|
| Home / | 47 | 1,435 KB | 367 | 292 | 1 (99/99) | 13 MB | 2.1 s |
| Members | 33 | 1,435 KB | **29,703** | **1,655** | 5 (**2,565** / 1,435) | 107 MB | 1.6 s |
| Attendance (week ≈4.9k rows here; prod 2.2k) | **85** | 1,884 KB | **49,476** | 1,197 | 5 (2,390 / 1,182) | 117 MB | **7.1 s** |
| Courses | 35 | 1,436 KB | 211 | 300 | 3 (246/120) | 11 MB | 1.6 s |
| Reports | 35 | 1,436 KB | 162 | 219 | 2 (147/84) | 9 MB | 1.5 s |
| Follow-ups /weekly | 31 | 1,434 KB | **16,346** | 777 | 7 (1,052/444) | 68 MB | 1.5 s |
| Course detail (411-member roster) | 40 | 1,437 KB | **11,988** | **1,316** | 6 (1,388/887) | **173 MB** | 1.7 s |
| Audit | 10 | 1 KB | 87 | 183 | 1 | 10 MB | 1.0 s |
Search, one key at a time ('p','r','i','y','a'):
- Attendance: input-event durations **928 / 296 / 72 / 96 / 80 ms**; first key blocks the main thread 829 ms (the whole 4.9k-row list re-filters and re-renders per keystroke; no debounce).
- Course detail: **824 / 448 / 352 / 392 / 400 ms per key**, main thread blocked 320–809 ms per keystroke (roster re-render + the per-card O(roster×rows) dayAttendance scan + the 1,644-option SearchPicker array rebuilt per card).
- Courses: 16 ms per key (small list). Typing never causes a network request anywhere (all search is client-side).
- Every tab load re-downloads the same ~1.4 MB of JSON (the 6-table member read + metrics) because nothing is cached across screens beyond 5 s.

## LOCAL reproduction B at 5,000 members (same stand-in, 1,250-member roster per course)
| Screen | requests | JSON | DOM nodes | script ms | long tasks (sum / max) | heap |
|---|---|---|---|---|---|---|
| Home | 72 | 4,363 KB | 367 | 278 | 2 (141/83) | 17 MB |
| Members | 49 | 4,363 KB | **90,111** | 2,203 | 5 (**7,073** / 4,055) | 136 MB |
| Follow-ups | 47 | 4,362 KB | **49,466** | 1,558 | 5 (2,245 / 1,304) | 140 MB |
| Course detail | 56 | 4,365 KB | **36,063** | 2,261 | 5 (**8,850** / 7,654) | **430 MB** |
Course-detail search at 5,000 members: per keystroke **7,656 / 2,096 / 2,712 / 1,776 / 1,232 ms** of blocked main thread. Every tab load downloads 4.4 MB of JSON. The first point of clear degradation is between 1,644 and 5,000 members: Members ≈ 1.4 s → 4 s single long task; course roster typing ≈ 0.8 s → 7.7 s. On a phone CPU (3–5× slower) the 1,644-member screens are already at 4–7 s of blocked main thread.

## LOCAL harness (Postgres 16, this container) N=1,500 members, 235,500 attendance rows (a full year), 261 sessions
- member_period_metrics_page week page 1: 9.6 ms cold / 7.2 ms warm; page 2: 4.0 ms; one-day bucket: 2.6 ms (the harness has work_mem 4 MB and local disk; prod's 2 MB work_mem + 11.7k-buffer generic plan is the difference).
- expected_members_for_session: 4.7 / 3.3 ms (1,500 members).
- **recompute_member_stats() unscoped: 1,003 ms / 952 ms** (1,501 rows upserted); scoped to one member: 1.4 ms (700× cheaper).
- **commit_csv_import: 100 rows 1,459 ms · 500 rows 2,613 ms · 1,000 rows 4,161 ms** (~1.2 s fixed, of which ~1.0 s is the unscoped recompute; ~2.9 ms per row). Against production's `authenticated`/`authenticator` statement_timeout 8 s (ISSUE_TRACKER T-005), a 1,000-row commit at 5,000 members is at risk — see N=5,000 below.

## CSV pipeline pieces measured locally (Node 22, this container)
- Browser parse (`parseMeetCsv`): 10 rows 0.8 ms · 100 → 0.6 ms · 500 → 2.3 ms · 1,000 → 2.3 ms · 1,500 → 2.9 ms · 5,000 → 10.9 ms (244 KB). Browser parsing is NOT a cost.
- Edge-function fuzzy matcher (`_shared/match.ts similarity`, bigram Dice, rebuilt per comparison), worst case where every row misses the exact/alias tiers: R=100×N=1,644 → 400 ms · 500 → 1,971 ms · 1,000 → 4,094 ms; at N=5,000: 100 → 1,123 ms · 500 → 6,543 ms · 1,000 → 12,685 ms. In practice only rows that miss exact+alias match go fuzzy (production previews show 0–8 unmatched per file), so today this is ≤ ~50 ms; it becomes a problem only for a file of mostly-new names at 5,000 members (CPU limit for Edge Functions is 2 s per request → a mostly-new 500-row file at 5,000 members would hit it).

## Write cascade in production (edge logs, Wed 1 Oct 02:06 UTC, one browser)
- `delete_member` at 02:06:39 → 02:06:39–41: **243 requests** (6 member-list fan-outs, 42 metrics-page calls, 6 notification chains).
- `update_member` at 02:06:43 → 02:06:42–45: **~290 requests** (12 list fan-outs, 48 metrics calls, 11 identity reads).
- 02:06:19, no write: 168 requests, 4 fan-outs (a dialog open / return-to-app burst).
So ONE member save or delete costs ~250 requests and 2–3 s of saturated gateway. Mechanism: `membersChanged()` + `attendanceChanged()` ring every mounted reader on every visited tab (Home/Members/Weekly/Courses/Reports/course detail + the member dialog), and `memberStore` only joins readers whose period key is identical and in flight — Home (selected range), Members (current week) and Reports (month) use different keys, so each tab performs its own full fan-out; each `AcademyHeader` (one per visited tab) re-runs the 5-stage notifications chain on the attendance bus.
NOTE: commit 36cae9d "One member change, one shared member refresh" (PR #63/#64) may post-date these logs — see git dates below; re-verified against the last-24h logs separately.

## After PR #63 (36cae9d "One member change, one shared member refresh", merged 3 Oct 12:48 UTC) — write cascade re-measured, Fri 3 Oct 19:07–19:32 UTC
- create_member 19:07:14 (484 ms) → 19:07:15–17: **41 requests** (1 member fan-out, 19 metrics pages); 19:08:57 → 45 requests; 19:09:29 → 41; 19:31:59 → 25. Down from ~250 per write on 1 Oct. Save → refreshed list ≈ 1.5–2.5 s wall. The 19 metrics-page calls per save = Home's 7 day buckets + week + Reports' month, all keyed differently, each still 2–3 paged calls.
- 4 of 8 create_member calls returned HTTP 500 (PostgREST log: SQLSTATE 55000 "a joining date in the future cannot be recorded", at 00:37–01:02 IST = 19:07–19:31 UTC) — the member form's "today" (IST) is tomorrow in UTC. Not a performance defect, but each refusal costs a round trip and a retry ~10 s later; it belongs in the member-add flow findings as a correctness bug (timezone).
- 18:53:41 UTC: a burst of 30 "permission denied for table …/function member_period_metrics_page/course_week_day_status" in postgres_logs = the whole Home fan-out sent by a browser with no valid session (anon role): data hooks fire before/without auth (~30 wasted requests + 30 Postgres errors per cold start with an expired/invalid session).
## Errors, Wed 1 Oct (38k requests): 8× update_member 409 (duplicate refusal), 2× create_member 409, **3× member_period_metrics_page 502 at 14:09:53** (gateway dropped three parallel calls inside a burst), 1× app_users 401. Error rate 0.04%.
## Sign-in (function_edge_logs): Fri 3 Oct auth-lookup 1,061 ms + auth-login 1,930 ms; Thu 2 Oct 3,260 + 3,720 ms. Sign-in = two sequential Edge Functions (lookup, then login), each cold-booted, each doing GoTrue + app_users + HMAC PIN derivation + audit writes.

## LOCAL reproduction C — cold start on a simulated mid-range phone (CPU ×4, 1.6 Mbps / 150 ms RTT), data stand-in 130 ms, 1,644 members. CAVEAT: the local static server sends JS UNCOMPRESSED (1.77–1.83 MB); Vercel serves brotli (~460 KB for the shared JS), so the JS phase is ~4× shorter in production (~2.5–3 s on this network).
| Route | FCP (shell) | JS fully downloaded | first API request | last API response | content on screen |
|---|---|---|---|---|---|
| Home | 0.29 s | 10.4 s (uncompressed) | 10.1 s | 10.6 s (26 req; stand-in returns [] quickly for Home's bucket data) | 9.7 s (shell) |
| Members | 0.29 s | 9.1 s | 10.2 s | 20.6 s (33 req, 1.4 MB JSON) | **26.2 s** (29,703 nodes) → ≈ 10.4 s API waterfall + 5.6 s render at CPU×4 |
| Members, CPU ×1 | 0.27 s | 9.1 s | 9.4 s | 19.9 s | 21.3 s → render 1.4 s unthrottled |
| Attendance | 0.28 s | 9.2 s | 10.3 s | 26.1 s (85 req) | LCP 22.2 s |
Phases on Members: shell paint (instant, prerendered "checking sign-in") → JS → session restore + identity → member fan-out (33 requests, 3 sequential keyset pages per table) → one 1.4 s–5.6 s render. Nothing is shown between FCP and the full list: no skeleton rows, no first page.
