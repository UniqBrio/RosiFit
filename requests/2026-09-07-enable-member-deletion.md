# BUG REQUEST — something is broken
<!-- Filled by workflows/request.md (/request) · Consumed by Track C: /bug requests/<this-file> -->
<!-- Root cause comes before any fix - always. Stated fields are BINDING; "unknown" is honest. -->

Run **Track C** ([workflows/bug.md](../../workflows/bug.md)) with this request.

## CLASSIFICATION NOTE
Asked for as new work — *"Enable member deletion. Add the appropriate Delete Member action to
the existing member management UI, including confirmation before deletion."* It is filed as a
**BUG**, not a NEW, because every part of it already exists and is committed: the bin on each
roster card, the confirmation dialog, `deleteMember` in `src/data/repository.ts`, the
`delete_member` function in `0038_staff_write_access.sql` and 21 assertions in
`supabase/tests/30_delete_member.sql`. The screen already promises the deletion and cannot
perform it. That is the boundary in workflows/request.md R1: *"it does not do what it already
promises"*.

## FIELDS
- WHERE: Attendance → Members → a member card → the bin icon → **Remove**
- WHAT HAPPENS: The confirmation is accepted and the deletion fails. The repository maps the
  error through `personReadable`, so the flash reads `"She could not be removed. Nothing has
  been changed."` The member stays on the register.
- WHAT SHOULD HAPPEN: She comes off the register and off every follow-up list, her enrolment
  ends so she stops being expected at sessions, her email is freed, her lookup aliases go, and
  every attendance record she has stays — exactly what the confirmation dialog already states.
- WHEN IT STARTED: always — the capability has never worked against the live project.
- WHO IS AFFECTED: every user, on the live deployment only. It works offline against the
  fixture list (`dataSource !== 'live'`), and it passes in the local harness, because both of
  those have `delete_member` and production does not. That selectivity IS the root cause.
- REPRO STEPS:
  1. Sign in to the live app as any active user
  2. Attendance → Members
  3. Tap the bin on any member card
  4. Confirm **Remove**
- WAS WORKING BEFORE?: no.
- CORRECTION ROUND: 1

## ROOT CAUSE (established 07-Sep-2026, before any fix)
`public.delete_member(uuid)` **does not exist in the production database.** Verified directly
against project `lhpzhkzbnquwjljmbylo`: a `pg_proc` lookup returns `create_member`,
`update_member`, `delete_course`, `save_course`, `set_offering_schedule` and
`bulk_import_members` — and no `delete_member`. `supabase.rpc('delete_member', …)` therefore
fails, and the screen reports it honestly.

The function was written in `0038_staff_write_access.sql`, and **that migration was never
applied.** The live migration ledger jumps from `0036_message_from_email` to
`0038_repoint_stale_course_senders` — a different file that happens to share the number — and
`0038_staff_write_access` is not in it.

**The fix is not "apply 0038".** 0038 also does `CREATE OR REPLACE` on `save_course`,
`set_offering_schedule`, `delete_course` and `bulk_import_members`, reproducing each body in
full because Postgres has no partial function edit. Those bodies were lifted from
0018/0020/0029/0030 — and `save_course` has since moved on: **0040 is applied in production**
and 0038's copy predates it. Verified: the live `save_course` carries the 0040 conditional,
0038's copy still carries the unconditional `perform public.set_offering_schedule(...)`.
Applying 0038 now would ship the wanted function and silently revert RC-027 — rewording or
renaming a course would again dead-end on *"this offering has a completed session on <today>,
so a schedule cannot start on or before it"*, from a form with no date field.

So the deletion is separated into its own additive migration, `0044_delete_member.sql`, whose
body is `delete_member` **verbatim** from 0038 — not a variant. `30_delete_member.sql` passes
against either file, and applying 0038 later is a no-op `CREATE OR REPLACE` of identical text.
0038 is left untouched on disk; the RBAC decision it carries is a separate question from
whether a member can be removed, and it needs its save_course body rebased on 0040 before it
is applied.

## CHECKED AGAINST PRODUCTION (the harness has no live rows, so these are the checks it cannot make)
- `members.deleted_at`, `member_emails.deleted_at`, `attendance_records.deleted_at`,
  `member_enrollments.status / effective_from / effective_to` — all present.
- `member_emails_unique_live` is PARTIAL, `WHERE (deleted_at IS NULL)` — so flagging her
  address really does free it for the next holder.
- `member_aliases` has no `deleted_at`, and `member_aliases_unique` is global on
  `(alias_type, alias_normalized)` — the hard delete is required, not a preference.
- `member_enrollments_check` is `effective_to IS NULL OR effective_to >= effective_from` —
  which is what the `greatest()` clamp is for.
- The `members` write policy is `(is_active_app_user() AND is_subscription_writable())` —
  exactly the two guards the function restates, so it opens nothing the table did not allow.
- Trigger `audit_members → audit_row_change` fires on UPDATE, so the deletion lands in the
  audit log without the function writing one. The confirmation dialog already promises this.
- The migration creates a function and touches no row: no backfill, no index build, no
  constraint validated over existing data.

## OUTCOME — applied to production 07-Sep-2026
`0044_delete_member` was applied to project `lhpzhkzbnquwjljmbylo` on the repo owner's explicit
one-word go-ahead, after the raw SQL was shown. Verified immediately after:

| check | result |
|---|---|
| `public.delete_member(uuid)` exists | yes |
| SECURITY DEFINER, `search_path=public` pinned | yes |
| `anon` holds EXECUTE | **no** — correct (0011/0012 posture) |
| `authenticated` / `service_role` hold EXECUTE | yes |
| `save_course` untouched | yes — `v_wanted` and `v_in_force` present, `pg_get_functiondef` length **5169 both before and after** |
| recorded in `supabase_migrations.schema_migrations` | yes |
| rows changed | **none** — the smoke test used a nil UUID that matches no member; the one member carrying `deleted_at` was flagged six hours earlier, unrelated |

**What is still NOT proven, and must not be claimed:** the local Postgres 16 harness has no
`psql` and no Docker on the machine that did this work, so `npm run test:db` never ran.
`30_delete_member.sql` and `33_delete_member_subscription_gate.sql` have never been executed
anywhere. The apply went ahead without that rehearsal, on instruction. **The first end-to-end
removal through the live app is still the real proof**, and `docs/registers/FEATURE_TRUTH.md`
holds the row at ◻ until someone does one.

## FRONTEND — completed and proven 08-Sep-2026
The screen already carried the whole flow, so the work here was proving it and removing
the one part nobody could test.

**Checked, not changed.** Every member-derived surface — the dashboard, the members list,
the course roster, the member record, the send draft and reports — reads through
`useMembers` or `useFollowUp`, and both revalidate on `onMembersChanged`, which
`deleteMember` fires. So the roster, the follow-up list and every count refresh off the
one write, by construction. Guardrail 1 holds: nothing keeps a second list. A link to a
member who is no longer on the register already answered *"That member is not on the
register. She may have been removed since this link was opened."* The bin stays on the
roster card only; the member dialog's footer is Edit and Reach out, and a destructive
third button there was not asked for and is not added.

**Changed.** The four outcome sentences were four nested ternaries inside `remove()` in
`app/(tabs)/members.tsx` — untestable by construction, and three of the four are outcomes
nobody meets by hand (already gone, fixtures-only, refused), each of which reads like
success if worded wrong. They moved to `src/data/memberRemoval.ts` with 14 specs in
`memberRemoval.test.ts`. The wording is character-for-character what shipped, with one
deliberate fix: the screen read `name.split(' ')[0]`, so a name arriving off an imported
file with a leading space produced the empty string and a toast reading *" removed, 3
attendance records kept"*, addressed to nobody. `firstName` trims first.

**Proven.** `.evidence/enable-member-deletion-browser.txt` — 29 DOM checks, Chromium,
both themes, fixtures build. That run also caught a trap: `ThemeProvider` defaults to
dark outright rather than to `system`, so `prefers-color-scheme` alone silently re-tests
dark twice, which is what the first pass of the script did while reporting a clean sweep
of "both themes". It now sets the stored preference and fails itself if the two passes
paint the same background.

`npm run check` green: typecheck, **951** unit tests, 2840 contrast pairs, 75 icons.

## SIBLING FINDING — not fixed here
Sweeping all 47 functions the migrations define against production turned up six absent. Four
are harmless (no caller, or a caller withdrawn under TD-040). One is not: **`set_member_status`
is missing from production and has a live caller** in `src/data/repository.ts`, because
`0031_member_status` was never applied either — the same root cause as this file. *"Mark a
member active or inactive"* is therefore dead on the live project in exactly the way member
deletion was. It is deliberately untouched: outside this request, and another session was
editing that surface (`0045_member_inactive_from.sql`) while this ran. It needs its own request.

**RESOLVED WITHOUT THIS FILE — 08-Sep-2026, and not by this session.** The other session
finished that strand and applied `0045` to production. Re-checked directly:
`members.inactive_from` exists, and so do `set_member_status(uuid, text, date)` and
`member_status_on(text, date, date)`, both with the right posture — `anon` no EXECUTE,
`authenticated` yes. **`0031` was never the answer and must not be applied now:** it
creates the two-argument `set_member_status(uuid, text)`, which `0045` drops, and which
does not match the three-argument call in `src/data/repository.ts`. Applying it would
add a dead overload, not a capability.

**The sweep, re-run 08-Sep-2026.** Four of the 48 functions the migrations define are
still absent from production, and none of them is a live fault:

| absent | why it is not a fault |
|---|---|
| `set_attendance` (0035) | zero UI callers — the control was withdrawn a day after it shipped (TD-040), exactly as FEATURE_TRUTH records |
| `offering_for_meeting`, `place_member_in_group` (0039) | zero app callers. `0042` calls them, but the `commit_csv_import` actually running in production does not reference either — verified against `pg_get_functiondef`. Repo-to-production drift in the meeting-code strand, owned by another session, not a live break |
| `attendance_backdates_membership` (0046) | another session's migration, written today and not yet applied. Theirs to apply |

## STANDING INSTRUCTIONS (do not edit)
- Track C order is binding: search `docs/registers/ROOT_CAUSE_REGISTER.md` for the same class;
  state the ROOT CAUSE, distinct from the symptom, BEFORE any fix; reproduce with a failing
  test, fix at the root, make it pass; if the cause is a pattern, sweep EVERY sibling site;
  append the root-cause entry; then the test gate.
- WHO IS AFFECTED is evidence — a fix whose mechanism does not explain the stated selectivity
  has not found the root cause.
- CORRECTION ROUND ≥ 2: before proposing anything, read the previous attempt and state what it
  missed and why. A recurring "fixed" bug is a process finding — flag `/framework-update`.
- Data-store-level cause → STOP, propose the change, wait for approval. Production is never
  touched automatically.
