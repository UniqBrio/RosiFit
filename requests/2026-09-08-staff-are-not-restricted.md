# BUG REPORT — something that ships is broken
<!-- Filled by workflows/request.md (/request) · Consumed by Track C: /bug requests/<this-file> -->

Run **Track C** ([workflows/bug.md](../workflows/bug.md)) with this request.

> **Why BUG, and not a CHANGE.** The decision was already taken and recorded
> (`requests/2026-09-07-staff-write-access.md`, `0038_staff_write_access.sql`,
> `docs/decisions/022-staff-own-the-register.md`, and two amended rows in
> `docs/registers/RBAC_MATRIX.md`). Nothing is being revisited. The app simply
> does not do what all four of those say it does, which is a defect.
>
> **And not Track F.** The process did not misjudge the decision; a migration
> was written and never applied. That is an execution gap, and 0040's own
> header had already flagged the trap that made applying it unsafe (TD-023),
> so the register worked.

## FIELDS
- SCREEN: Bulk import members (`app/member/import.tsx`), reached from the
  Attendance workspace header. The same defect covers Add Course, Edit Course,
  Delete Course and the offering schedule.
- WHAT HAPPENED: signed in as **staff**, choosing a file and importing shows
  *"Something went wrong — Only the academy admin can bulk import members.
  Nothing has been saved."*
- WHAT SHOULD HAPPEN, in the requester's words: "all actions crud bulk import
  upload everything as staff does is possible only staff access audit log and
  overview screen is not visible to staff thats it do not restrict staff from
  any operations within app."
- REPRODUCIBLE: yes, every time, for every staff account.
- CORRECTION ROUND: 2 — "why **again**". Round 1 is
  `requests/2026-09-07-staff-write-access.md`, which produced
  `0038_staff_write_access.sql`. What round 1 missed is stated below.

## ROOT CAUSE (measured on 08-Sep-2026, not remembered)
**`0038_staff_write_access` was never applied to the live project.**

- The ledger on `lhpzhkzbnquwjljmbylo` has no `0038_staff_write_access` row.
  It has `0038_repoint_stale_course_senders`, a *different file* that collided
  on the number — which is exactly what would make a person reading the ledger
  believe 0038 had landed.
- Exactly four functions there still call `is_super_admin()`:
  `save_course`, `delete_course`, `set_offering_schedule`,
  `bulk_import_members` — precisely the set 0038 was written to open.
- **The client is not implicated and never was.** `src/data/access.ts` gates
  two prefixes, `/staff` and `/audit`, plus Overview which guards itself. No
  screen in `app/` asks the role before offering Add Member, Bulk Import, Add
  Course, Edit, Delete or Upload. Everything else staff needs is already hers
  in production: `create_member`, `update_member`, `delete_member` (via 0044),
  `set_attendance`, `set_member_status`, and the members/attendance policies.

**Why round 1 did not finish, and why the obvious repair was the wrong one.**
0038 could not simply be applied afterwards: `0040` re-issued `save_course` in
full from the 0030 baseline — the live body — so replaying 0038 on top drops
0040's "reschedule only when the days change" block and puts RC-027's refusal
back. 0040's header says so in block capitals and TD-023 records it. The same
hazard runs the other way for 0039's `meet_code` clause and 0049's `joined_on`
fix. Any repair that reproduces a function body inherits this trap.

## THE FIX
`supabase/migrations/0050_staff_are_not_restricted.sql` reproduces **no
bodies**. It reads each of the four definitions out of `pg_get_functiondef`,
asserts exactly one `is_super_admin()` occurrence, moves that token and the
refusal wording, and writes the definition back. Whatever body is live is the
body that survives — 0040's in production, 0047's and 0049's in the harness —
so the file is order-independent by construction and can revert nothing.

Verified against the live catalogue *before* it was written, read-only: all
four carry exactly one guard, the rewrite leaves `is_subscription_writable()`
standing in every one, and `save_course`'s rewritten text still contains
`rescheduled`. `supabase/tests/39_staff_are_not_restricted.sql` asserts all of
that permanently, plus a staff account actually importing, saving,
rescheduling and deleting — and that the audit log still returns her nothing.

## MUST NOT CHANGE
The exclusions the requester named herself: the **Audit log**, **Overview** and
**Staff & access**. `app_users`, `audit_logs`, `audit_remarks`, security
questions, PIN issue/reset, academy settings, follow-up rules, email templates,
branches and holidays all keep `is_super_admin()`, exactly as 2026-09-06 and
0038 left them. `is_subscription_writable()` is untouched — a billing gate, not
a role gate.

## OPEN, FOR THE REQUESTER
Branches, holidays and academy settings are writes that no screen currently
offers staff and that "do not restrict staff from any operations" could be
read to cover. They are deliberately NOT in 0050. Say the word and they move
in a follow-up; guessing either way would put a permissions decision in a bug
fix.
