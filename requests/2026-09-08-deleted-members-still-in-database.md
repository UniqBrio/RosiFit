# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

The requester's words, in full and verbatim:

> "Deleted members are still in database clean all delete members records along with attendnace
> email and all related records of that member do it at earliest"

and, shown the choice between redacting the person out of each import receipt and removing the
receipts entirely:

> "delete them as well i just want to delete all records"

Fourth ask of this shape on the same day, after
[hard-delete-course](./2026-09-08-hard-delete-course.md),
[hard-delete-member](./2026-09-08-hard-delete-member.md) and
[purge-remaining-soft-deleted-rows](./2026-09-08-purge-remaining-soft-deleted-rows.md). Those
three shipped and are **not re-opened**.

## THE REPORT AND THE FINDING ARE NOT THE SAME THING
The report is that deleted members are still in the database. Measured on production at 07:00
UTC on 08-Sep-2026, the named half of it is **not what is happening**:

- `public.members` holds **30 rows and not one has `deleted_at` set**. There is no soft-deleted
  member anywhere.
- **Eleven** members have been hard-deleted through the app (`audit_logs`,
  `member.hard_deleted`): nitha, Rahul ×2, Raja ×2, Sunny, Pooja, Sumathi, kkjkj, Rajesh, Priya.
- For all eleven, **every** table referencing members holds **zero** rows — `attendance_records`,
  `email_messages`, `member_emails`, `member_enrollments`, `member_aliases`, `member_schedules`,
  `member_stats`, `session_expectations`. Counted one table at a time, not inferred from the
  foreign keys.

The attendance and the email the request names were already gone. **The delete path is not
leaking.** What the requester was seeing is real all the same, and it is here:

- **`public.member_import_runs.rows`** — the jsonb receipt of a member upload, one element per
  spreadsheet row, shaped `{row, status, full_name, member_id}`. It has **no foreign key to
  members** (0028 gave it only `default_offering_id` and `imported_by`), so `purge_member` never
  reached it and no cascade ever will. **Seven of fourteen elements**, across three runs, still
  carried the name and id of a member who no longer exists:

  | run | elements | deleted members named |
  |---|---|---|
  | `c0a09d45` | 4 of 4 | Raja · Sunny · Rahul · Pooja |
  | `08e413fb` | 2 of 2 | Raja · Rahul |
  | `434124d5` | 1 of 1 | Priya |

- FEATURE / SCREEN: none. No screen changes; nothing in `src/` reads `member_import_runs`. This
  is a one-off data migration,
  `supabase/migrations/0054_purge_deleted_members_from_import_receipts.sql`.
- CURRENT BEHAVIOUR: a member removed from the register keeps her name and id in the import
  receipt of the upload that created her, indefinitely, reachable by anyone with database access.
- DESIRED BEHAVIOUR: those receipts leave the database. The requester was offered the surgical
  option — keep the run, drop `{full_name, member_id}` from the seven elements — and chose the
  whole row.
- WHY: *"clean all ... records of that member"*. A person off the register should not still be
  named in the tables.
- MUST NOT CHANGE: everything not named above. Explicitly:
  `delete_member` / `purge_member` (0051) and `delete_course` / `purge_course` (0047) — the
  delete paths are correct and this proves it, so nothing about them changes; the five import
  runs that name only live members; every member, attendance record, enrolment, address and
  message; `csv_imports`, which 0051 deliberately spared as the academy's own record.
- CORRECTION ROUND: 1

## DESIGN SURFACE
- VISUAL?: **no.** Nothing in `src/` reads `member_import_runs` — the only references in the
  repo are docs, specs and the demo teardown. No screen shows one of these rows today.
- SCREENS & STATES TOUCHED: none.
- STRINGS ADDED OR ALTERED: none in the app. One new audit action reaches the log,
  `member_import_run.hard_deleted`, alongside `member.hard_deleted` (0051) and
  `branch.hard_deleted` (0053).
- PERMISSIONS: no. Migration runner is superuser / service_role, as 0048, 0052 and 0053 were.
- USAGE: `unknown`.
- RUN MODE: `auto` — *"do it at earliest"*. **This does not lift the production gate**: the
  options and their costs were put to the requester and the go-ahead was explicit.
- SCALE: small

## THE TRAP, RECORDED BECAUSE IT NEARLY ATE LIVE DATA
Three `attendance_records` carry a `raw_display_name` matching a deleted member — **"Sumathi"**
twice and **"nitha"** once. Every one of them belongs to a **live** member (Sumathi `5f1a0dba`,
Ani `061c5f48`). They are name collisions, not residue. Any implementation of this request that
matched on a **name** would have destroyed three live members' attendance records. Every
selection in 0054 is by **id**, and by that id's **absence from `members`** — which also makes it
idempotent and indifferent to which delete path removed her.

## WHAT WAS DELIBERATELY LEFT
`audit_logs` still holds each deleted member's name, in the `member.hard_deleted` entry that
records her removal. The table is append-only by construction (0004, three immutability
triggers) and that entry is the **proof the deletion happened** — without it the academy cannot
show it honoured the removal. Not touched, and named to the requester rather than done quietly.
If the names are to come out of the audit trail too, that is a separate request with a very
different answer.

## REHEARSAL — and the one check that could not be made
- The local harness **could not be run**: `db/harness/` needs Postgres 16 and `psql`; neither
  `psql` nor `docker` exists on this machine. Recorded as NOT DONE rather than claimed.
- In its place, rehearsed **against production inside a rolled-back transaction**, run **twice
  in that same transaction** — the second pass standing in for the harness's empty case:
  runs `8→5`, elements `14→7`, elements naming a missing member `7→0`, `audit_logs +3`, and
  members (30), attendance (25), enrolments (12) and messages (10) **all unchanged**. The second
  pass changed nothing. Then it rolled back and production was re-measured unchanged.
- Nothing in the file is hard-coded to a snapshot: counts are captured at apply time and the
  assertions compare before against after, because the database is in active use.

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
