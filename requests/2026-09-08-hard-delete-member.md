# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

The requester's words, in full and verbatim, because the whole ask is one sentence:

> "on deleting a student delete that record entirely from database as confirmation before
> delete. Implement at earliest"

This is the member-shaped twin of [2026-09-08-hard-delete-course.md](./2026-09-08-hard-delete-course.md),
asked the same day in the same terms. That file is context for this one, not scope: nothing
here re-opens it.

## FIELDS
- FEATURE / SCREEN: the member deletion — the bin on the Members tab card
  ([app/(tabs)/members.tsx:317](../app/%28tabs%29/members.tsx#L317)), the same control on the
  roster card of the course detail screen
  ([app/course/[id].tsx:1286](../app/course/%5Bid%5D.tsx#L1286)), the confirmation dialog both
  raise, and the `public.delete_member(uuid)` function behind them
  ([0044_delete_member.sql](../supabase/migrations/0044_delete_member.sql)).
- CURRENT BEHAVIOUR: a SOFT delete. `delete_member` flags `members.deleted_at` and
  `member_emails.deleted_at`, ENDS the active enrolment (status `ended`, `effective_to` today),
  hard-deletes only `member_aliases`, and COUNTS her attendance records without touching one of
  them. The member row and every attendance record stay in the database for good. Both
  confirmations say so as a promise, word for word on both screens: *"She comes off the register
  and off every follow-up list, and her enrolment in {course} ends today. Her attendance history
  stays: every session she was marked at is untouched. Her email address is freed for whoever
  holds it next. Recorded in the audit log."* — and the toast afterwards repeats it as
  *"{name} removed, N attendance records kept"*
  ([src/data/memberRemoval.ts](../src/data/memberRemoval.ts)).
- DESIRED BEHAVIOUR: deleting a student **removes her record entirely from the database**, and a
  confirmation is shown before it happens.
  Two halves, both stated:
  1. **The removal is a real one.** Requester's words: *"delete that record entirely from
     database"*. Nothing of the member is left behind — read alongside the course request of the
     same day (*"delete course from db and all its related data"*), "that record entirely" is the
     member and the rows that belong to her, not the `members` row alone. Which tables that is,
     and what happens to rows that are the ACADEMY's record rather than hers, is settled at B2/B3
     — see OPEN below. Not `unknown`, because the direction is stated; the boundary is what is
     open.
  2. **A confirmation comes first.** A confirmation already ships on both screens, so this half
     asks nothing new of the flow — but its sentence promises the exact opposite of half 1
     ("Her attendance history stays") and cannot survive unchanged.
- WHY: not stated for the member. The requester gave the reason for the identical course ask
  eight hours earlier — *"which will reduce chaos"* — and it is not restated here, so it is
  recorded as the neighbouring reason rather than this one's: `unknown`.
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. Named explicitly because each has
  already been decided on this surface and this request does not re-open it:
  the Active/Inactive pill and `set_member_status` (0031) — a member paused and a member deleted
  stay two different acts and two different controls; the Edit button; the deletion's permission
  boundary (`is_active_app_user()` + `is_subscription_writable()`, 0044) and its subscription
  gate; its idempotence — a second tap on an already-deleted member still reports rather than
  errors; the fact that a confirmation is asked at all, on both screens, with the same question
  on each; `delete_course` / `purge_course` (0047) and the course flow entirely.
- CORRECTION ROUND: 1

## DESIGN SURFACE
<!-- Filled whenever anything the user sees changes. "not visual" is a claim the diff will be checked against. -->
- VISUAL?: yes — the confirmation states a promise this change withdraws, so its wording cannot
  stand, and the toast after the write says "N attendance records kept" about records that will
  no longer exist.
- SCREENS & STATES TOUCHED: Members tab → Remove → confirmation → result toast; course detail
  roster card → Remove → the same confirmation → the same toast. Both, identically: they are one
  question asked in two places and must not drift apart. Downstream and not yet assessed:
  anything that aggregates attendance or follow-up counts, since rows those screens read can now
  disappear. Empty · loading · error · offline · permission-denied for the touched dialog:
  `unknown`, settled in the B4 design pass.
- STRINGS ADDED OR ALTERED: the confirmation body on both screens — *"Her attendance history
  stays: every session she was marked at is untouched."* — becomes false under this change and
  must be rewritten; the surrounding clauses of that same sentence are in scope only so far as
  they are made false by it. The toast `{name} removed, N attendance records kept`
  ([memberRemoval.ts](../src/data/memberRemoval.ts)) likewise. The requester gave no replacement
  wording: `unknown`, proposed at B4. Every other string on both screens is frozen.
- PERMISSIONS: no — unchanged from 0044, and named in MUST NOT CHANGE.
- USAGE: `unknown`.
- RUN MODE: `auto` — *"Implement at earliest"*, which says do not wait at the plan.
  **This does not lift the production gate.** CLAUDE.md and Track B both make the pre-apply stop
  a hard one regardless of run mode: the raw SQL of the migration is shown and an explicit
  go-ahead given before anything runs against the live project. `auto` covers the build; it does
  not cover the apply, and this is the most destructive write in the product.
- SCALE: full

## OPEN — for B2/B3, not to be filled in silently
The sentence states a direction and stops. These are the boundaries it does not draw, and each
one changes what is destroyed. None may be answered by assumption:

1. **The reading of the sentence itself.** "delete that record entirely from database as
   confirmation before delete" is read here as *hard delete, and confirm first*. The other
   reading — *keep the soft delete and merely add a confirmation* — is ruled out because a
   confirmation already ships on both screens, so it would ask for something already delivered.
   Confirmed at Track B's first gate before anything is written.
2. **Her attendance records.** A hard delete of the member is currently REFUSED by the foreign
   keys: `attendance_records.member_id`, `session_expectations.member_id` and
   `email_messages.member_id` all reference `members(id)` with no on-delete clause (0008, 0007,
   0009). So the attendance rows either go with her or the removal cannot happen at all — there
   is no third option, and 0044's own header says as much. The course request answered the same
   question by destroying them. Whether this one does is the requester's to confirm, with the
   live row counts in front of her, exactly as the course one was.
3. **What is hers and what is the academy's.** A session's attendance is the academy's record of
   who was there on a day; the sessions themselves, their expected sets and their completed
   status are not hers at all. Removing her rows changes historical session figures for people
   who are not being deleted. Named at the gate, not decided here.
4. **The cache and the derived list.** `member_stats` and the follow-up list are derived
   (guardrail 1); the course purge had to recompute them. Whether this one must is B2's answer.
5. **The already-soft-deleted members.** The course request carried a one-off purge of the rows
   its old soft delete had left behind. Nothing in this sentence asks for the member equivalent.
   It is NOT in scope here; if the requester wants it, it is a request of its own.

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
