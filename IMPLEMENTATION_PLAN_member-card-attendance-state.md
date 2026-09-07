# Implementation Plan — Attendance state on the member card

> The last cheap place to be wrong.

**Approved design:** `DESIGN_SPEC_member-card-attendance-state.md` · **Branch:** `main` ·
**Estimated tasks:** 4, built inline (see §5)

---

## 1. Summary

One migration adds `set_attendance` — the first and only client-reachable write path into
attendance — and the roster card gains a three-chip row that states and sets one member's state
for the day selected in the week strip. The read half needs no new query: `useAttendance` already
loads the week and its rows carry `member_id`. Everything else is derivation, and it is pure and
unit-tested.

## 2. Technical approach

| Piece | Lives in | Why there |
|---|---|---|
| Session find-or-create, `expected` derivation, upsert, correction columns, stats refresh | `supabase/migrations/0035_set_attendance.sql` | It is business logic over invariants only the database can enforce (docs/04 §2). `security definer` re-checks the caller, because it bypasses RLS — 0031's own comment is the precedent |
| `setAttendance(memberId, date, status)` | `src/data/repository.ts` | CP-001: one module decides live-vs-fixtures. The screen calls one function and never learns which answered |
| Per-member, per-day state derivation | `src/data/dayAttendance.ts` (new, pure) | Testable without a DOM, like `src/data/memberStatus.ts` and `followup.ts`. RC-009's lesson: parsing/derivation that lives beside `document` cannot be unit-tested at all |
| The chip row | `MemberCard` in `app/course/[id].tsx` | Layout only. It renders what the derivation returns and calls what the repository exposes |

**No fan-out.** The runbook's threshold is 3+ *independent* tasks; tasks 2–4 all read the same two
modules and the UI depends on the repository's signature. Four small tasks in one lane costs less
than four cold starts and an integration reconcile.

## 3. Schema changes

| Migration file | What it does | Reversible? | Rollback |
|---|---|---|---|
| `0035_set_attendance.sql` | Creates `public.set_attendance(uuid, date, text)`; revokes from `public`/`anon`; grants execute to `authenticated`, `service_role`. **Creates no table, alters no column, drops nothing** | Yes — `drop function public.set_attendance(uuid, date, text)` | The drop above. No data is migrated, so there is nothing to restore |

**Parity check — run 07-Sep-2026 against project `lhpzhkzbnquwjljmbylo` (read-only).**

Production's migration ledger holds 27 entries; `supabase/migrations/` holds 34 files. **Seven
files are not in the production ledger: 0016, 0017, 0018, 0025, 0031, 0032, 0034.** Two distinct
situations, and the difference matters:

- **0016 was applied outside the ledger.** `create_member(text, uuid, date, text[], text[],
  smallint[])` exists in production with the exact signature 0016 defines, but no ledger row
  names it. The object is real; the record of how it got there is missing. Same class for
  0017/0018/0025 (not separately probed).
- **0031 and 0032 were never applied.** `set_member_status` and `merge_member_into` do **not**
  exist in production. This confirms what FEATURE_TRUTH already says about 0031.

**Acknowledged, and it does not block this change**, for one specific reason: every object
`0035` depends on was verified present in production in the same read —
`expected_members_for_session`, `refresh_session_counts`, `recompute_member_stats(uuid[])`,
`current_app_user_id`, `is_active_app_user`, `is_subscription_writable`, `audit_log_as`. `0035`
therefore stands on its own and does not need 0031 or 0032 first. The seven-file drift is a real
finding and is being recorded in `docs/registers/TECH_DEBT.md` rather than fixed here — it is
not this request's scope, and reconciling a ledger is its own change with its own review.

**Migration ledger audit** — every object this change touches, and where it is defined:

| Object | Defined in | Present in production |
|---|---|---|
| `attendance_records`, `attendance_unique_live`, `absent_must_be_expected`, `extra_is_not_expected`, `audit_attendance`, `attendance_updated_at` | `0008_attendance.sql` | ✅ (0008 in ledger) |
| `sessions`, `sessions_unique_live` | `0007_sessions.sql` | ✅ |
| `offering_schedules` | `0005_organisation.sql` | ✅ |
| `member_enrollments` | `0006_members.sql` | ✅ |
| `expected_members_for_session`, `refresh_session_counts`, `recompute_member_stats` | `0008` | ✅ verified by `pg_proc` |
| `current_app_user_id`, `is_active_app_user`, `is_subscription_writable` | `0002`, `0003` | ✅ verified |
| `audit_log_as` | `0023_audit_actor.sql` | ✅ verified |
| `set_attendance` | **`0035` — new** | ❌ not yet, by design |

Nothing this change builds on exists without a migration. **No backfill is required.**

> **The harness cannot rehearse this on this machine.** `db/harness/` needs local PostgreSQL 16,
> which this machine does not have (the same reason 0031 was never rehearsed — FEATURE_TRUTH).
> `0035` is therefore **written and spec'd but not applied anywhere**, and the run reports it
> that way rather than claiming a rehearsal that did not happen.

## 4. Constraint-aware write audit

| Table | Unique constraint (live schema) | The guard that makes the write idempotent |
|---|---|---|
| `attendance_records` | `attendance_unique_live (session_id, member_id) where deleted_at is null` | `insert … on conflict (session_id, member_id) where deleted_at is null do update` — the same clause `commit_csv_import` uses. A double tap sets the same status twice and reports `changed: false` the second time |
| `attendance_records` | CHECK `absent_must_be_expected` | `expected` is derived from `expected_members_for_session()`, never accepted from the client; an *absent* on a not-expected day is refused in words **before** the insert, so the constraint name never reaches a person |
| `attendance_records` | CHECK `extra_is_not_expected` | a *present* on a not-expected day is stored as `extra`, which is what the column means |
| `sessions` | `sessions_unique_live (offering_id, session_date) where deleted_at is null` | find-or-create with `for update`, mirroring `commit_csv_import`; a race inserts once and the loser reads the winner's row |
| `member_stats` | PK `member_id` | `recompute_member_stats(array[p_member_id])` is an upsert over a derived value — idempotent by construction |

**The whole RPC is one statement's worth of work inside one function call**, so it is one
transaction: session, attendance row, counts and stats either all move or none do (A4 rule 4).

## 5. Tasks

### Task 1 — the migration and its spec
- **Objective:** `set_attendance(p_member_id uuid, p_date date, p_status text)` returning
  `jsonb`, per the design's §2 approach.
- **Files:** `supabase/migrations/0035_set_attendance.sql`,
  `supabase/tests/27_set_attendance.sql` (new — test files are append-only; this is a new file,
  nothing is overwritten).
- **Depends on:** nothing.
- **Acceptance:** caller re-checks (`current_app_user_id`, `is_active_app_user`,
  `is_subscription_writable`) each raise `42501` with a sentence · a status outside
  `present|absent` raises `22023` naming what was passed · a member not on the register raises
  `P0002` · marking on a scheduled day with no session row creates exactly one session with
  `expectation_mode='schedule'`, `source='manual'` · marking on an off-schedule day creates one
  with `expectation_mode='all_enrolled'` · *absent* on a day she is not expected is refused, and
  the CHECK constraint is never the message · *present* on a day she is not expected stores
  `extra` · re-marking an imported row writes `original_status` **once**, plus `corrected_by`,
  `corrected_at`, `correction_reason` · setting the status she already holds returns
  `changed:false` and does not touch `corrected_at` · `member_stats` for that member alone is
  refreshed · `anon` and `public` hold no execute grant.

### Task 2 — the write path in the app
- **Objective:** `setAttendance` in the repository, live and fixture halves, plus the
  invalidation that makes the roster and the strip re-read.
- **Files:** `src/data/repository.ts`, `src/data/hooks.ts`, `src/data/mock.ts` (fixture write).
- **Depends on:** Task 1's signature only (contract-first).
- **Acceptance:** live path calls `rpc('set_attendance', …)` and returns the parsed result · a
  PostgREST error is re-raised through the same failure-text path as `setMemberStatus`, saying
  nothing was changed (CP-003) · **a missing function is named honestly**: `0035` is not applied
  to production, so `PGRST202`/`42883` must say the academy database does not have this yet —
  not "her attendance was not changed" alone · the fixture path mutates the fixture rows so the
  chip and the strip agree on this device · `onAttendanceChanged` notifies every mounted
  `useAttendance`, exactly as `onCoursesChanged` does (RC-008's fix: a write missing from the
  list it was written to reads as a write that did nothing).

### Task 3 — the derivation
- **Objective:** `src/data/dayAttendance.ts` — given the week's rows, a member, the chosen day
  and the course's offerings, return `{ state, canPresent, canAbsent, reason }`.
- **Files:** `src/data/dayAttendance.ts`, `src/data/dayAttendance.test.ts` (both new).
- **Depends on:** nothing (pure).
- **Acceptance:** present · absent · `extra` reads as present · no row on a scheduled past day →
  `unmarked` with both actions available · no row on an off-schedule day → `unmarked`, present
  only, with the reason · a future date → `unmarked`, neither available, with the reason · today
  is markable · the member's own branch decides the offering, not the roster's branch filter ·
  a row for another course or another member never leaks in (RC-012's class: never resolve a
  member against the wrong list).

### Task 4 — the card
- **Objective:** the chip row and the roster caption, exactly as specified.
- **Files:** `app/course/[id].tsx`.
- **Depends on:** Tasks 2 and 3.
- **Acceptance:** every string from the design's §8 table verbatim · `testID`
  `course-member-attendance-{status}-{member.id}` — the **database** id, never the index
  (RC-024) · `aria-checked` written directly on each chip (KL-002) · `spaceSelects` on each chip
  (KL-003) · the chip fills only on the write's resolution · the group is disabled while in
  flight · the eleven states of the design's §5 all render · both themes · no chip word
  truncates at 320 pt.

## 6. Permissions

The five questions are answered in the design §10. The matrix row, rewritten in this change:

| Capability (policy) | Academy admin | Staff | Configurable? | Reason | Decided |
|---|---|---|---|---|---|
| Write attendance | ➖ **through the tables** | ➖ **through the tables** | 🔒 no | Unchanged and deliberate: `authenticated` still holds only `select`. A stolen anon key still cannot forge attendance | 02-Sep-2026 |
| **Mark one member's attendance (`set_attendance`, 0035)** | ✅ on | ✅ on | 🔒 no | The register is front-desk work — the same reasoning that gives both roles `sessions_status_update`. The RPC is `security definer` and re-checks `is_active_app_user()` and `is_subscription_writable()` itself, so a disabled account and an expired subscription both close it | 07-Sep-2026 |

**Verification that the gate is real, not cosmetic:** there is no button to hide — the check is
inside the function, and `supabase/tests/25` asserts that `anon` cannot execute it at all and
that an inactive caller is refused. That is the deep-path test this row needs.

## 7. Root-cause compliance

| Module | Recorded classes | How this change avoids each |
|---|---|---|
| `app/course/[id].tsx`, `src/data/repository.ts` | **RC-008 / RC-017** — a confirmation for a write that did not happen | The chip fills and the toast fires **only** on the resolved write; the fixtures path says so in its own words. Written into Task 4's acceptance, not left to care |
| `supabase/migrations` | **RC-007** — narrow grants that were no-ops over an open default | No table grant is touched. The only grant is `execute` on one function, with the `revoke … from public, anon` first, as 0011/0012 established |
| roster rows | **RC-024** — two members with one name were one React key | The chips key on `member.id`, and the testIDs carry it |
| figures on this screen | **RC-010** — numbers that were literals | Nothing is displayed that is not derived from the rows; `recompute_member_stats` keeps the engine's copy in step |
| member resolution | **RC-012** — a screen that read the fixture directly | The derivation takes rows as an argument; it never imports `mock.ts` |
| `commit_csv_import` | **RC-009 / 0024** — assuming a session already exists | Find-or-create, with the same `expectation_mode` rule 0024 landed on |

## 8. Performance

| Operation | Budget | Device / network | Verified by |
|---|---|---|---|
| Tap → chip settled | < 1.2 s | mid phone, 3G-ish | one `rpc` round trip (~150–300 ms live) + one `useAttendance` refetch of a week that is already cached-shaped |
| `set_attendance` server side | < 50 ms | Supabase shared instance | one indexed session lookup, one upsert, `refresh_session_counts` for one session, `recompute_member_stats` for **one** member (the array argument — passing `null` walks every member, which is the ceiling this design steps around) |
| Roster render, 200 members | no regression | as above | the derivation is O(rows) once per render, memoised on the week's rows; the chip row adds no query |

## 9. Security and data

- **Personal data stored:** whether one named member attended one dated class — the same fact
  the CSV import already stores, in the same columns. Nothing new in kind.
- **New actor trail:** `corrected_by` and `corrected_at` name the signed-in user who changed a
  record. That is the point: a correction with no author is indistinguishable from a mistake.
- **Policies changed:** none. No RLS policy is added, altered or dropped; no table grant moves.
  The only new surface is one function, `security definer`, revoked from `public`/`anon` and
  re-checking its caller — the CP-005 posture, applied to an RPC instead of an Edge Function.
- **No new endpoint, nothing public, no secret involved.** Guardrail 4 is untouched.

## 10. Test plan

| Dimension | Cases | Notes |
|---|---|---|
| Functional | 24 assertions in `supabase/tests/27_set_attendance.sql` (Task 1's acceptance list) · 13 specs in `src/data/dayAttendance.test.ts` | Fail-first evidence recorded in `.evidence/`, as this repo does |
| Responsive | 320 / 360 / 768 / 1280 pt — chip wrap, no word truncated, top row unchanged | Rendered and looked at, both themes |
| Performance | the budgets in §8 | Observed on the built page |
| Security | `anon` cannot execute; an inactive caller is refused; a non-writable subscription is refused; `expected` cannot be forced by the caller | In `27_set_attendance.sql` |
| Idempotency (§4) | double tap · re-mark to the same value · two sessions racing for one `(offering, date)` | |
| Non-default config | `dataSource !== 'live'` (fixtures) · `0035` absent from the database (production, today) | The second is the honest-message case in Task 2 |
| Geometry | `npm run check` — contrast (2,800 pairs) and icons | Mechanical; its result is the evidence |

## 11. Rollback

`drop function public.set_attendance(uuid, date, text);` and revert the app commit. **Nothing is
irreversible:** no column is dropped, no data is rewritten by the migration itself, no message is
sent, no external side effect exists. Attendance rows a person created before a rollback simply
stay — they are valid rows in the shape the import already writes, and `original_status` keeps
what any corrected row used to say.

## 12. Open questions

1. **`0035` will not be applied in this run.** The harness cannot rehearse it on this machine, and
   CLAUDE.md requires the raw SQL in front of the requester plus an explicit go-ahead before
   production. Until then the chips render and read correctly, and a tap reports honestly that the
   academy database does not have this write yet. The alternative — shipping nothing until a
   Postgres 16 exists here — leaves the request undelivered for a reason unrelated to it.
2. **The seven-migration ledger drift** (§3) is recorded in TECH_DEBT for its own change.
3. **`session.source = 'manual'`** is a value this feature introduces for sessions it creates.
   If `sessions.source` carries a CHECK that does not include it, the migration adds the value in
   the same file — verified against `0007` before the SQL is written, not after it fails.
