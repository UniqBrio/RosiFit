# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

The requester's words, in full and verbatim:

> "delete all member and all corresponding records"

sent with a screenshot of the Supabase table editor: all 30 rows of `public.members` ticked,
**Delete 30 rows** pressed, and the dashboard refusing —

> "Unable to delete rows as one of them is currently referenced by a foreign key constraint from
> the table `attendance_records` DETAIL: Key (id)=(28e2fc9e-632a-4a15-9a5c-f36336b630a4) is still
> referenced from table attendance_records."

## THIS IS NOT ANOTHER SOFT-DELETE CLEANUP
[0048](../supabase/migrations/0048_purge_soft_deleted_courses.sql),
[0052](../supabase/migrations/0052_purge_soft_deleted_members.sql),
[0053](../supabase/migrations/0053_purge_soft_deleted_branches_and_emails.sql) and
[0054](../supabase/migrations/0054_purge_deleted_members_from_import_receipts.sql) each removed
rows that were **already deleted**. This removes **the entire live student register** — thirty
members, every one currently on it, none flagged. Nothing selects on `deleted_at`, because
nothing in the database has it set.

- FEATURE / SCREEN: none. No screen changes. A one-off data migration,
  `supabase/migrations/0055_purge_every_member.sql`.
- CURRENT BEHAVIOUR: `delete from members` — which is what the table editor issues — is
  **refused by the foreign keys** and cannot be made to work by ticking boxes in any order.
- DESIRED BEHAVIOUR: every member and everything belonging to her leaves the database.
- WHY: not stated. The pattern of the day — repeated purges, a register full of test names
  (`QWE`, `Test`, `jfffjj`, `RosiFit`, `UniqBotz Infotech`, and several duplicated real names) —
  reads as clearing test data before go-live, but the requester did not say so: `unknown`.
- MUST NOT CHANGE: `sessions`, `courses`, `course_offerings`, `offering_schedules` — the
  academy's classes; `csv_imports` and `email_batches` — a file it processed and a send it
  performed, both spared by 0051 for that reason; `app_users`, `branches`, `holidays`,
  `email_templates`, settings, subscription; `audit_logs`, append-only (0004), which this
  **writes** to. `delete_member` / `purge_member` themselves are not modified.
- CORRECTION ROUND: 1

## WHAT IT REMOVED, measured on production at 07:35 UTC on 08-Sep-2026

| table | rows |
|---|---|
| `members` | **30** — the whole register |
| `member_aliases` | 34 |
| `member_emails` | 19 |
| `member_enrollments` | 12 |
| `member_stats` | 30 |
| `member_schedules` | 2 |
| `email_messages` | 10, of which **6 were actually sent** |
| `member_import_runs` | 5 — see below |
| `attendance_records` | 0 — see below |
| `session_expectations` | 0 — see below |

## THE FINDING THAT IS NOT PART OF THE REQUEST, RECORDED BECAUSE IT MATTERS
`attendance_records` held **25 rows at 07:00 UTC and 0 at 07:35**, and `audit_logs` records
**nothing** between 0054 at 07:16 and the measurement: no `attendance.delete`, no entry of any
kind. `audit_attendance` fires on insert and update only, so rows removed straight from the
Supabase table editor **leave no trace at all** — no actor, no time, no count.

That is what happened here, and it is worth stating plainly as a property of the system rather
than a one-off: **anything deleted through the Supabase dashboard bypasses every audit trigger
in this schema.** It is also precisely why 0055 goes through `purge_member` — thirty audit
entries, one per member, written before her rows go.

## WHY IT MUST NOT BE A BARE DELETE
The removal order is dictated by foreign keys, and the one that bites is invisible unless you
have read the constraint graph:

```
email_messages.member_id       -> members(id)        NO ACTION
email_messages.member_email_id -> member_emails(id)  NO ACTION   <-- the trap
attendance_records.member_id   -> members(id)        NO ACTION
session_expectations.member_id -> members(id)        NO ACTION
```

`member_emails` **cascades** from `members`, so deleting a member fires a cascade that
`email_messages` then refuses and the whole statement fails — for any member the academy has
emailed. 0051 got that order right once, with a spec
([40_hard_delete_member.sql](../supabase/tests/40_hard_delete_member.sql)); this reuses it rather
than writing a second copy.

## THE IMPORT RECEIPTS FOLLOW THE REGISTER
`member_import_runs.rows` names members by id with **no foreign key**. Emptying the register
would leave all five surviving receipts naming members who no longer exist — exactly the
"deleted members are still in database" of
[the previous request](./2026-09-08-deleted-members-still-in-database.md), recreated by this
file. So 0054's rule runs again at the end, on the terms chosen then.

## DESIGN SURFACE
- VISUAL?: **no code change**, but the *consequence* is highly visible and was stated before the
  go-ahead: every student screen comes back empty, and every session reads "0 present" because
  nobody is left to have attended. No component, string or token is touched.
- SCREENS & STATES TOUCHED: none in code. Every member-listing screen now renders its empty
  state — which is a state the app already has and this request does not change.
- STRINGS ADDED OR ALTERED: none.
- PERMISSIONS: no. Migration runner is superuser / service_role, as every purge before it.
- RUN MODE: `auto`. **The production gate was not lifted**: the counts above, the six sent
  emails, and "no backup, no way back" were put to the requester, with an offer to dump the
  register to a file first. They chose to proceed without one.
- SCALE: small in code, total in effect.

## REHEARSAL — and the one check that could not be made
- The local harness **could not be run**: `db/harness/` needs Postgres 16 and `psql`; neither
  `psql` nor `docker` exists on this machine. Recorded as NOT DONE rather than claimed.
- In its place, rehearsed **against production inside a rolled-back transaction**, run **twice
  in that same transaction**: members `30→0`, aliases `34→0`, addresses `19→0`, enrolments
  `12→0`, stats `30→0`, schedules `2→0`, messages `10→0`, receipts `5→0`, `audit_logs +71` —
  and sessions (6), courses (4), offerings (4), imports (13), batches (11), app_users (8) **all
  unchanged**. The second pass changed nothing. Then it rolled back and production was
  re-measured unchanged.
- The file asserts the survivors as well as the casualties: a purge that reached the classes,
  the uploads or the sends would be a different and far worse event than the one asked for, and
  it would show up in those assertions and nowhere else.

## STANDING INSTRUCTIONS (do not edit)
- Track B is SURGICAL: read the actual current files first (B1), run the impact analysis with
  the sibling call-site sweep (B2) BEFORE proposing, produce the plan with regression risks
  (B4) — confirm mode waits for approval; auto mode (default) logs it and applies — touching
  only what DESIRED BEHAVIOUR requires. Every changed line must trace to this request.
- MUST NOT CHANGE seeds the plan's "deliberately NOT changing" list; the plan may add to it,
  never subtract.
- If VISUAL?=yes, the plan carries the correction design pass (B4), scoped to the touched
  area: states, both themes in semantic tokens, the string table, the permission answer.
- CORRECTION ROUND ≥ 2: before proposing anything, read the previous attempt and state what it
  missed and why (B1). If the miss was the process's fault, flag `/framework-update` too.
- Close out with `checklists/DEFINITION_OF_DONE.md`, then the test gate. Nothing merges
  without a PASS.
