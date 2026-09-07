# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

Item 1 of 2 from the triage of 8 Sep 2026 (`/request`, two strands off the "already
imported" upload panel). Item 2 — the panel's "That is not the course you have open"
clause — is queued behind this one and is largely dissolved by it; see the note at the
foot of this file.

## FIELDS
- FEATURE / SCREEN: Courses list → Delete course, its confirmation dialog, and the
  `public.delete_course(uuid)` function behind it ([0020_delete_course.sql](../supabase/migrations/0020_delete_course.sql)).
- CURRENT BEHAVIOUR: The delete is a SOFT delete in one transaction. The course row and
  its offerings get `deleted_at`; not-yet-completed sessions get `deleted_at`; active
  enrolments are ENDED (status `ended`, `effective_to` today) rather than removed; and a
  **completed** session is left entirely untouched — with its frozen `session_expectations`
  and all of its `attendance_records`. The confirmation dialog states this as a promise:
  *"N members are enrolled. Their attendance history stays, but the course and its sessions
  are removed."* Nothing is ever removed from the database.
- DESIRED BEHAVIOUR: Deleting a course **removes it and all of its related data from the
  database outright** — the course, its offerings, their schedules, every session
  (completed included), those sessions' expectations and attendance records, the
  enrolments, and the `csv_imports` rows that landed in it. Nothing of the course is left
  behind in any table. Requester's words: *"if course is deleted then delete course from db
  and all its related data which will reduce chaos"*.
  Scope includes a **one-off purge of the courses already soft-deleted** in the live
  project, under this same rule — the requester requires the raw SQL and the exact row
  counts shown, and gives a go-ahead, before anything runs against production.
- WHY: *"which will reduce chaos."* Stated concretely by what the soft delete has left in
  the live project as of 8 Sep 2026: three separate course rows named `Postnatal` at branch
  `Main` (two soft-deleted, one live), 8 completed sessions hanging off deleted offerings
  and unreachable from any screen in the app, and a CSV file whose fingerprint is locked to
  a deleted course so it can never be imported into the live one.
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. In particular the delete keeps
  its permission boundary unchanged, stays subscription-gated, stays idempotent, and stays a
  single transaction.
  <!-- CORRECTED 08-Sep-2026, during B1/B2, before anything was applied. This line first read
  "the delete stays super-admin-only", which was read off 0020 — the body that is LIVE in
  production — rather than off the repo's decided state. The repo owner moved delete_course to
  `is_active_app_user()` on 07-Sep-2026 (requests/2026-09-07-staff-write-access.md, 0038,
  docs/registers/RBAC_MATRIX.md), and supabase/tests/14_delete_course.sql asserts it. 0047
  therefore carries 0038's boundary; restating 0020's would have reverted a decision this
  request never touched. The consequence for the apply is named in 0047's header and at the
  pre-production gate: because 0038 is not applied in production, applying 0047 there lands
  the hard delete AND staff access together. -->
- PERMISSION SIDE EFFECT (surfaced at B2, requester to acknowledge at the apply gate):
  applying 0047 to production delivers `is_active_app_user()` on `delete_course` for the first
  time, since 0038 never reached it. A decision already made on 07-Sep-2026 and not yet
  delivered — not a new one — but it lands with this migration and not on its own.
- CORRECTION ROUND: 1

## DESIGN SURFACE
<!-- Filled whenever anything the user sees changes. "not visual" is a claim the diff will be checked against. -->
- VISUAL?: yes — the confirmation dialog currently promises the opposite of what this change
  does, so its sentence cannot stand unchanged.
- SCREENS & STATES TOUCHED: Courses list → delete confirmation (the promise sentence, and
  what it counts); the post-delete result state. Also, downstream and not yet assessed:
  any screen that reads a member's attendance history or follow-up counts, since rows those
  screens aggregate can now disappear. Empty · loading · error · offline ·
  permission-denied for the touched dialog: `unknown`, to be settled in the B4 design pass.
- STRINGS ADDED OR ALTERED: the confirmation sentence *"N members are enrolled. Their
  attendance history stays, but the course and its sessions are removed."* must be
  rewritten — it becomes false under this change. The requester gave no replacement
  wording: `unknown`, proposed at B4. Every other string on the screen is frozen.
- PERMISSIONS: no — super admin only, as today.
- USAGE: `unknown`
- RUN MODE: confirm — the requester asked to see the raw SQL before it is applied, and B4's
  gate is a hard stop regardless: this is a destructive operation.
- SCALE: full

## STATED CONCERN, RAISED AND OVERRULED
Recorded because a later reader will ask whether it was considered. Before this file was
written the requester was shown, in the live data, exactly what a hard delete destroys:

| | |
|---|---|
| completed sessions | 8 |
| attendance records | 39 |
| enrolments, across members | 15, over 15 members |
| csv_import records | 11 |

— together with the fact that this contradicts the promise the confirmation dialog makes
today, changes 15 members' attendance history and follow-up counts retroactively, and is
not reversible. A middle option (purge only when the course carries no attendance; keep and
rename otherwise) was offered and declined. The requester chose **always hard delete
everything**, and chose to clean the existing rows under the same rule once the SQL has
been shown. That decision is binding on this track.

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

## THE QUEUED ITEM (context, not scope)
Item 2 of the triage is a BUG: the already-imported upload panel's last line — *"That is
not the course you have open: nothing about this file has touched <course>"*
([src/data/uploadOutcome.ts:157](../src/data/uploadOutcome.ts#L157)) — compares
`offering_id` but prints `Course · Branch`, so it contradicted itself on a re-created
course. `courses_name_live` ([0005:44](../supabase/migrations/0005_organisation.sql#L44))
makes the name unique among LIVE courses, so that contradiction is reachable only through
soft-deleted rows. This change removes those rows, and with them the failure class. Item 2
is re-assessed after this one lands and closes; it does not enter a track before then.
