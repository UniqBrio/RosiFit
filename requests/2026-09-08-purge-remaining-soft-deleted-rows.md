# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

The requester's words, in full and verbatim:

> "from supabase delete all records deleted such as course and members and all its related
> records such as attendance and all its reference execute at earliest"

This is the third ask of the same shape on the same day, after
[2026-09-08-hard-delete-course.md](./2026-09-08-hard-delete-course.md) and
[2026-09-08-hard-delete-member.md](./2026-09-08-hard-delete-member.md). Those two are context
and are **not re-opened**: both shipped, and their one-off purges (0048, 0052) have already run.

## WHAT THE ASK TURNS OUT TO BE, ONCE MEASURED
The named half of the sentence — courses, members, attendance, references — **was already done
before this request was made.** Read off production at 06:20 UTC on 08-Sep-2026:

| table | soft-deleted | total |
|---|---|---|
| courses | 0 | 4 |
| course_offerings | 0 | 4 |
| sessions | 0 | 6 |
| members | 0 | 27 |
| attendance_records | 0 | 22 |
| app_users | 0 | 7 |
| **branches** | **1** | 3 |
| **member_emails** | **3** | 21 |

and twelve orphan checks across the whole foreign-key graph, all zero: no offering without a
course, no session without an offering, no attendance, enrolment, stat, expectation, message or
import pointing at a row that is gone. 0047/0051 also changed the delete paths themselves, so
nothing new accumulates behind them — confirmed live during this work, when a super_admin
hard-deleted the member "Priya" through the app at 06:13 UTC and left no flagged row behind.

So the scope of THIS request is the residue on the two tables the earlier purges never covered.

- FEATURE / SCREEN: none. No screen changes. This is a one-off data migration against
  production, `supabase/migrations/0053_purge_soft_deleted_branches_and_emails.sql`.
- CURRENT BEHAVIOUR: two tables still hold rows flagged `deleted_at` that no screen can see —
  every read in the app filters them out ([repository.ts:134](../src/data/repository.ts#L134)
  for addresses; every branch read likewise).
  1. **branches** — one row: "Chennai" (`70e37863`), removed 06-Sep-2026, with **0 course
     offerings and 0 holidays** pointing at it. A *second, live* "Chennai" (`cbacccd2`) also
     exists and is a different row.
  2. **member_emails** — three rows: `shazia.far@`, `shaziafarheen75@`, `shaziafarhee74@`,
     all belonging to **Shazia Far (`8154aaa9`), who is LIVE and not deleted**, removed by hand
     between 04:42 and 04:45 UTC on 08-Sep-2026, carrying **0 sent messages** between them.
- DESIRED BEHAVIOUR: both sets leave the database for good, with their references, exactly as
  0048 and 0052 did for courses and members. Neither has any reference: that is measured above,
  and asserted again inside the migration before a single row is deleted.
- WHY: *"all its reference"* — the requester is clearing residue. The neighbouring reason given
  eight hours earlier for the identical course ask was *"which will reduce chaos"*; it is not
  restated here, so it is recorded as the neighbouring reason rather than this one's: `unknown`.
- MUST NOT CHANGE: everything not named above. Named explicitly because each was already decided
  and this request does not re-open it:
  `delete_course` / `purge_course` (0047) and `delete_member` / `purge_member` (0051) — the
  delete paths stay exactly as they are; **branch removal stays a SOFT delete** (0019 chose that
  deliberately, and no `purge_branch` is created here, because creating one would change what
  removing a branch DOES from now on and nothing in this sentence asks for that); the live
  "Chennai" and "Main" branches; every live address, including Shazia Far's own; every course,
  member, session, attendance record, enrolment, import and message — none is flagged;
  `audit_logs`, which is append-only (0004) and which the migration WRITES to.
- CORRECTION ROUND: 1

## DESIGN SURFACE
- VISUAL?: **no.** Every row this removes is already filtered out of every read by
  `deleted_at is null`, so no screen shows one today and none can show one less tomorrow. This
  is a claim the diff is checked against: the migration touches no `src/` file, no component and
  no string.
- SCREENS & STATES TOUCHED: none.
- STRINGS ADDED OR ALTERED: none in the app. Two new audit **action** strings reach the log —
  `branch.hard_deleted` and `member_email.hard_deleted` — matching `course.hard_deleted` (0047)
  and `member.hard_deleted` (0051), neither of which has a bespoke renderer either. Consistent
  with what ships; not extended here.
- PERMISSIONS: no. The migration runner is superuser / service_role, as 0048 and 0052 were.
- USAGE: `unknown`.
- RUN MODE: `auto` — *"execute at earliest"*, which says do not wait at the plan.
  **This does not lift the production gate.** CLAUDE.md makes the pre-apply stop a hard one
  regardless of run mode: the raw SQL is shown and an explicit go-ahead given before anything
  runs against the live project. `auto` covers the build; it does not cover the apply.
- SCALE: small

## THE ONE DECISION THAT IS NOT MINE TO ASSUME
**The three addresses belong to a member who is staying.** A flagged branch is a removed branch,
and purging it is the plain reading of the ask. A flagged `member_emails` row is a *correction to
a live member's record*: Shazia Far is on the register, her current address is untouched, and
what would be destroyed is the trace that she once had three others. "all records deleted" covers
it in plain words — but it edits the history of somebody who is not being deleted, which is a
different kind of act from everything 0048 and 0052 did, so it is put to the requester as its own
question rather than folded into a total. If the answer is the branch only, the second loop of
0053 comes out and the file is applied without it.

## REHEARSAL — and the one check that could not be made
- The local harness **could not be run on this machine**: `db/harness/` needs Postgres 16 and
  `psql`, and neither `psql` nor `docker` exists here. That is the standard pre-flight and it is
  recorded as NOT DONE rather than claimed.
- In its place, the migration was rehearsed **against production inside a transaction that was
  rolled back**, and run **twice in that same transaction** — the second pass standing in for the
  harness's empty-database case. It completed with no exception, every assertion held, and the
  audit count rose by exactly 4 (1 branch + 3 addresses) across both passes, which is the proof
  the second pass was a no-op. Then it rolled back, and production was re-measured unchanged.

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
