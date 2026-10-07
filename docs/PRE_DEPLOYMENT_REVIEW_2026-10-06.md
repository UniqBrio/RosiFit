# RosiFit — Read-only pre-deployment review (06-Oct-2026)

Branch `claude/loving-euler-8nz5a8`, commit `60db85f`. Nothing deployed, applied or modified.
Evidence sources: the repository at `60db85f`; a fresh local harness replay (Postgres 16) in the
proposed production order; one read-only SQL read of production (Postgres 17.6, 09:00 UTC) that
compared every migration anchor and body hash against the live functions, read the subscription
row and the send ledger aggregates (no addresses). The Supabase MCP connector refused
authentication for most of this session and answered once; every production fact below comes
from that one read.

## 1. Migration 0090 — subscription_state

**What it is.** `public.subscription_state()` (0002) derives one of `suspended | active | grace |
expired` from the singleton row `app_subscription` (id = 1): `status = 'suspended'` wins; else
`current_date <= expires_at` is active; else `current_date <= expires_at + grace_days` is grace;
else expired. It does not read `start_date`, `renewed_at` or `renewal_history`.

**Where it is read.** Only through `is_subscription_writable()` = `subscription_state() in
('active','grace')`: 28 RLS policies (every insert/update/delete policy on the business tables)
and 16 SECURITY DEFINER RPCs (`create_member`, `update_member`, `save_course`, …) refuse writes
when it is false. Counted in production: 28 policies, 16 functions. The client and the Edge
Functions never call either function (grep of app/, src/, supabase/functions/: zero readers), so
nothing displays or caches the state. Reads are never gated: an expired academy keeps its data.

**Where it is written.** Nowhere in code: zero functions insert or update `app_subscription`
(production count 0); `authenticated` holds SELECT only; the row is edited by hand with the
service role. There is no activation, renewal, upgrade, downgrade or billing code path to alter.

**What 0090 changes.** Two anchors, each present exactly once in production (md5 `78d1e4ab`, 315
bytes, matches the migration's guard):
`when current_date <= s.expires_at` → `when public.business_today() <= s.expires_at`, and the
same for `+ s.grace_days`. `business_today()` = `(now() at time zone 'Asia/Kolkata')::date`;
production's `TimeZone` is UTC, so `current_date` is the UTC day.

**Old vs new, one example.** `expires_at = 2026-10-06, grace_days = 0`:

| Instant (UTC) | Chennai | old `current_date` | old state | new `business_today()` | new state |
|---|---|---|---|---|---|
| 2026-10-06 18:29 | 06 Oct 23:59 | 2026-10-06 | active | 2026-10-06 | active |
| 2026-10-06 18:30 | 07 Oct 00:00 | 2026-10-06 | **active** | 2026-10-07 | **expired** |
| 2026-10-06 23:59 | 07 Oct 05:29 | 2026-10-06 | active | 2026-10-07 | expired |
| 2026-10-07 00:00 | 07 Oct 05:30 | 2026-10-07 | expired | 2026-10-07 | expired |

The write gate closes at the academy's midnight instead of 05:30 the next morning: the only
behavioural difference is the 5½ hours between 00:00 and 05:30 IST on the last day of the
subscription and on the last day of grace, where writes are now refused (reads continue). It
never grants access the old rule refused. Activation is unaffected (`start_date` is not read);
`suspended` is unaffected; grace length is unaffected (same `+ grace_days` arithmetic).

**Production row today:** `start_date 2026-09-01, expires_at 2027-09-01, grace_days 14, status
active`; state `active`. The two rules cannot disagree before 2027-09-01 18:30 UTC, so applying
0090 changes nothing observable for eleven months, and the first observable effect is one
night's write access shifting to the academy's calendar.

**Recommendation: APPROVE 0090** (after 0088, which it requires and checks for: applied without
0088 in the harness it raised `0090: public.business_today() is missing -- apply 0088 first`).

## 2. Migration 0089 vs 0085

| Question | Evidence | Answer |
|---|---|---|
| Does 0089 need 0085? | Production's `recompute_member_stats` is 0008's body (md5 `142f926f`, 1,502 bytes) with signature `p_member_ids uuid[] default null` — the parameter 0085's calls use already exists. 0089 keeps the signature and `p_member_ids is null` = whole academy. | **No.** |
| Does 0085 change anything 0089 needs? | 0085 edits two call sites (`update_member`, `commit_csv_import`: `recompute_member_stats()` → scoped array) and does not touch the function. | **No.** |
| Replay proof | Harness replayed to 0084, then 0089 alone: applied; spec 66 (equality with 0008's body, scoped and unscoped) 18/18. Proposed order 0086→0087→0085→0088→0090→0089 on a fresh replay: all six applied, object inventory byte-identical to the filename-order replay. | Independent in either order. |
| Rollback coupling | 0089's rollback is re-creating 0008's body (one statement); 0085's is reversing five anchors. Neither undoes the other. | None. |

**Safest order: APPLY SEPARATELY — 0085 first, verify a real CSV commit; 0089 on a later day,
verified in one rolled-back transaction** (snapshot `member_stats` into a temp table, call
`recompute_member_stats()`, `except` both ways ignoring `updated_at`, `rollback`). Together
would only save an apply day.

## 3. SEND_CONCURRENCY

**SES account status: PRODUCTION (out of the sandbox) — determined from the production send
ledger, not from the AWS console.** `email_batches`: 31 batches `completed` with `sent 1,288,
failed 0, excluded 5` and the largest batch 291 sent; `email_messages` 1,202 `sent`, 9
`bounced`; `email_events` 29 Bounce, 1 Complaint, SNS subscription confirmed; `member_emails`
1,250 `unknown`, 30 `unsubscribed`, 9 `bounced`. A sandbox account can only deliver to verified
recipient identities, so 1,288 accepted sends across 1,250+ member addresses is not a sandbox.
(The five `completed_with_failures` batches, 5 requested / 5 failed, are the 05–09 Sep test
sends from T-002.) **The account's maximum send rate is still unread (T-010).** What production
has proven: the serial loop sustained ~2.5–2.8 sends/s over 291 recipients with zero failures.

**Recommendation: `SEND_CONCURRENCY=2` for Stage F**, marked assumption: AWS's default rate on
sandbox exit is 14/s, but this account's figure is unverified; 2 in flight at ~0.36 s each is
~5.5/s — double the rate already proven, under even a reduced 10/s grant, and 3× faster than
today. Raise to 4 (the code default) once T-010 is read as ≥ 14/s, or after a 100+ batch shows
no `Throttling` in `email_messages.failure_reason`. Not 1: the serial loop already runs at
~2.8/s today, so 1 buys nothing. Not 4 before the read: 4 ≈ 11/s is within 20 % of the
assumed limit with nothing proving it.

**Bounded concurrency does not change** (`send-loop.ts`, `index.ts`, `ses-feedback`,
`unsubscribe`, `edgeSendLoop.test.ts` 5 cases, `send-loop-pool.test.ts` 3 cases, CI-only):
- *Duplicate protection / 409:* the batch row is inserted before the pool (`client_batch_id`
  unique, 0009); `23505` → `409 This send has already been submitted.` Inside the pool `next++`
  hands each recipient to exactly one worker (single-threaded JS); every recipient writes its
  `email_messages` row before the provider is called; a timed-out send is recorded failed and
  **not** retried ("SES may have accepted it").
- *Unsubscribe:* the per-recipient HMAC link and `List-Unsubscribe` headers are prepared before
  the pool; the `unsubscribe` function verifies the token against `member_emails` — nothing in
  it touches the send order.
- *Bounce / complaint:* `ses-feedback` suppresses by address (`member_emails.status`, never
  overwriting `unsubscribed`) and marks the message by `provider_message_id` best-effort; the
  pool writes `provider_message_id` in the same `sent` update as before. A suppressed address is
  failed before any provider call.
- *Audit:* one `audit_log_as('communication.batch_sent', …)` after the pool with sent/failed/
  excluded counts; `email_batches` finalised once; results array in recipient order.
- *A worker that throws* takes the send down exactly as the serial loop did (no silent skips).

## 4. Migration safety table (production anchors/md5s read 06-Oct-2026 09:00 UTC)

| Migration | Purpose | Depends on | Safe separately? | Risk | Order |
|---|---|---|---|---|---|
| 0085 | scope `recompute_member_stats` to the member(s) a write touched; hoist `expected_members_for_session` out of the CSV loop | none (`p_member_ids` exists since 0008) | Yes | Low: 5 in-place anchors, each present exactly once in production (`update_member` 10915909, `commit_csv_import` ff61afad); refuses otherwise. Spec 53 re-pin after. | 3 |
| 0086 | `member_period_metrics_page` plans with its dates (sql → plpgsql, EXECUTE … USING) | 0075 (applied 18-Sep) | Yes | Low: md5-guarded (66f8af1d, 1,202 bytes = production); same identity arguments asserted; anon revoked asserted. | 1 |
| 0087 | new `member_period_metrics_buckets` | none (the client needs it) | Yes | Low: refuses if the name exists; anon revoked asserted. | 2 |
| 0088 | new `business_today()`; four joining/attendance rules onto it | none | Yes | Low: 4 anchors present exactly once (create_member 50c546af, update_member 10915909, set_member_active_from b4551360, set_attendance 076e4572); composes with 0085 on a different line (harness: both orders). | 4 |
| 0089 | `recompute_member_stats` in one pass | none | Yes | Low–medium: md5-guarded (142f926f, 1,502 bytes = production); row-for-row equal in the harness; **verify on production data in a rolled-back transaction before trusting it** (the harness has no production rows). | 6 |
| 0090 | five remaining `current_date` readers onto `business_today()` | **0088** | Yes (given 0088) | Low: 8 anchors present exactly once in production; final guard; subscription effect bounded (§1). | 5 |

Fresh replay in that exact order: all six applied; inventory identical to the filename-order
replay (2 new functions, 13 changed bodies, no table/column/index/trigger/policy/RLS/grant
change). Every RPC the client calls exists in production except `member_period_metrics_buckets`
(0087); every RPC the Edge Functions call exists.

## 5. Production deployment order

Rules: show the raw SQL and wait for a go-ahead; one migration per step; report before the next;
D-10 ledger row the day it applies; stop on any failed check and leave the previous body in place
(every step is a function body; the migration ledger holds the previous one).

| Stage | Apply / deploy | Check afterward | Smoke test | STOP if |
|---|---|---|---|---|
| A | 0086 | `md5(prosrc)` of `member_period_metrics_page` ≠ 66f8af1d; identity arguments unchanged; `has_function_privilege('anon', …)` false | Reports screen and a member card agree for this week; `explain (analyze, buffers)` of one week < 1,000 buffers | the migration raised (guard); the page function errors; Reports shows "could not load" |
| B | 0087 | function exists once; anon false, authenticated true | `member_period_metrics_buckets` for 7 days = 7 page calls (SQL, read-only) | guard raised; counts differ |
| C | client bundle (`dist/`, 6.5 MB) | sign in; Home ≤ 35 requests, 0 × 401 in the edge logs over a day | §7.1 checklist of the final report (auth, members, attendance, roster scroll/search at 300+ members, follow-ups list = Home count, CSV preview, both themes) | any screen fails to load; period bars empty; a 401 storm |
| D | 0085 | `update_member` and `commit_csv_import` bodies no longer contain `recompute_member_stats();`; re-pin spec 53 from a post-apply read | commit one real CSV: counts identical to its preview; `member_stats.updated_at` moved only for that offering's members; edit one member: 1 row moved | guard raised; counts differ; `updated_at` moved academy-wide |
| E1 | 0088 | `business_today()` exists, anon false; the four bodies carry it | between 18:30 and 24:00 UTC: `select business_today(), current_date` differ by one; add a member dated today — accepted | guard raised; a joining date for today refused that evening |
| E2 | 0090 | none of the five bodies contains `current_date`; `subscription_state()` = active | `select subscription_state()`; save a course's days; the follow-up list unchanged for the week | guard raised; the write gate reads anything but `active` |
| E3 | 0089 | md5 ≠ 142f926f; in ONE transaction: snapshot `member_stats`, call `recompute_member_stats()`, `except` both ways (ignoring `updated_at`) = 0 rows, **rollback** | time that call (expect < 1 s at ~1,250 members); edit one member — figures unchanged | any differing row — rollback and do not apply |
| F | `csv-import`, `send-followups` with `SEND_CONCURRENCY=2` | **CI has never run on this branch** (`ci.yml` triggers on push to main/dev and on pull_request; the branch has no PR and zero workflow runs), so the Deno specs and `deno check` are unexecuted anywhere: open the PR first and wait for green on `60db85f`; then diff the deployed code against the repo (D-14) | preview of last week's file: same rows/decisions as its last preview; batch of 10 to staff: 10 sent, results in order; one 100+ batch: no `Throttling` failure reason | CI red; a preview differs; any `Throttling`/`failed` rows → set 1 and re-check |
| G | — | +1 h and +24 h: `pg_stat_statements` means for `update_member`, `commit_csv_import`; edge logs; audit log for joining-date refusals after 18:30 UTC (expect 0) | the §7.1 checklist once more, one evening between 18:30 and 24:00 UTC | a regression on any figure above its pre-deploy mean |

## DECISION

### 0090:
APPROVE

### 0089:
APPLY SEPARATELY

### SEND_CONCURRENCY:
VALUE = 2

### MIGRATIONS:
READY

### CLIENT:
READY

### EDGE FUNCTIONS:
NOT READY

### PRODUCTION:
SAFE TO START CONTROLLED DEPLOYMENT

(Stages A–E: migrations and client. Stage F waits for the branch's first CI run — the Deno
specs have not executed anywhere yet — and for `SEND_CONCURRENCY=2` to be set as a secret.)
