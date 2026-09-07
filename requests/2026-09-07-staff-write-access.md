# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

> **Why CHANGE, and not BUG or a triage LIST.** Nothing is erroring in the
> requester's account of it — the words are "should be able" and "why are we
> restricting them", which is a decision being revisited, not a defect. And it
> is not a list of several asks: every item names one boundary — the staff
> role's write permissions — and moving that boundary is one decision. Nor is
> it Track F: the restrictions were deliberate, so the process did not
> misbehave.

## FIELDS
- FEATURE / SCREEN: What a **staff** account (`app_users.kind = 'staff'`) may
  WRITE — across the Attendance workspace header (Add Member, Bulk Import, Add
  Course), the course card's Edit and Delete actions, `/member/import`, the
  member roster, and the database RPCs behind all of them.
- CURRENT BEHAVIOUR: measured from the files on 07-Sep-2026, not from memory —
  WHAT ALREADY EXISTS gives the line numbers. Per capability, for staff:

  | Capability | Chrome offers it? | Database allows it? |
  |---|---|---|
  | Add course | yes | **no** — `save_course` (0022) is `is_super_admin()` |
  | Edit course | yes | **no** — same RPC |
  | Delete course | **no** — action hidden | **no** — `delete_course` (0020) |
  | Add member | **no** on the workspace header; **yes** inside a course | yes — `create_member` (0016) needs only an active user |
  | Bulk upload members | **no** — button hidden, route says no | **no** — `bulk_import_members` (0028) |
  | Edit member | yes | yes — `update_member` (0027) |
  | Delete member | a Remove button exists that does nothing yet | **nothing to allow — no delete RPC exists** |
  | Upload attendance | yes | yes — `set_attendance` (0035) |

- DESIRED BEHAVIOUR: "Staff should be able add course edit course delete course
  and add member upload bul member edit and delte they can upload attendance as
  well why are we restricting them." — the requester's words. Read as: a staff
  account may add, edit and delete a course; add a member, bulk-upload members,
  edit a member and delete a member; and upload attendance. Where a restriction
  exists today it is lifted; where the chrome hides a control, it is shown.
- WHY: `unknown` beyond the requester's own "why are we restricting them". No
  incident, no blocked person and no deadline was stated.
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. Two consequences
  of that line, stated because they are the ones most likely to be widened by
  accident: the requester did NOT name Overview, Staff & access or the Audit
  log, all three withheld from staff by an earlier decision
  (`requests/2026-09-06-staff-does-not-see-overview.md`), so they stay withheld;
  and nothing here touches the subscription gate — every RPC named above also
  requires `is_subscription_writable()`, which is not a role question and is not
  in scope.
- CORRECTION ROUND: 1 — nothing in the description says "still", "again", or
  points at a previous attempt.

## DESIGN SURFACE
- VISUAL?: yes.
- SCREENS & STATES TOUCHED:
  - `app/(tabs)/courses.tsx` — the header's Add Member and Bulk Import buttons
    (hidden for staff today) and the course card's Delete action (hidden today).
  - `app/member/import.tsx` — its **permission-denied** state, reached both by
    the hidden button and by a typed URL, which would become unreachable for
    staff.
  - `app/(tabs)/members.tsx` — the Remove button, which today only flashes a
    message; whether it becomes real is the open question in WHAT ALREADY EXISTS.
  - LOADING is the state that matters and was not stated: `useIdentity` resolves
    the role asynchronously, and `src/data/access.ts` records that `false` — the
    staff shape — is the safe answer while it does. Widening what staff may do
    changes which shape is the cautious one. B3 to settle it, not to assume it.
- STRINGS ADDED OR ALTERED: none stated. The freeze rule applies. One existing
  string is affected by consequence rather than by request — the import dialog's
  "Only the academy admin can bulk import" empty state and its body sentence
  would no longer be true for staff; B4 to say what happens to it.
- PERMISSIONS: **yes — this request is nothing but a permissions change**, and
  the boundary is in the DATABASE, not only in the chrome. Delivering it needs
  additive migrations touching `save_course` (0022), `delete_course` (0020) and
  `bulk_import_members` (0028), plus whatever `member_import_runs`' super-admin
  `select` policy (0028) implies for a staff member reading back her own run.
  Guardrail: the chrome agrees with the policies, it never replaces them — a
  UI-only change here would ship buttons that fail.
- USAGE: `unknown` — how often staff hit these flows, and how many staff
  accounts exist, was not stated.
- RUN MODE: auto (default — the description says nothing about approvals).
  This does NOT relax the standing rule that a migration reaches PROD only after
  its raw SQL is shown and an explicit go-ahead is given (CLAUDE.md).
- SCALE: `<blank — B0 decides>`

## WHAT ALREADY EXISTS (dedupe, 07-Sep-2026 — read from the files, not from memory)
- **Two of the named capabilities are already staff's, in full.** Editing a
  member (`update_member`, 0027) and uploading attendance (`app/upload.tsx`,
  `set_attendance` 0035) require only an active user and a writable
  subscription. Neither is restricted; neither is net-new work.
- **Adding a member is half open.** `create_member` (0016) allows staff, and
  `app/course/[id].tsx:388` offers Add Member inside a course to everyone. Only
  the workspace header's copy of the button is hidden
  (`app/(tabs)/courses.tsx:139`). The ask here is smaller than it looks: one
  hidden button, not a permission.
- **Add Course and Edit Course are offered to staff and refused by the
  database.** `app/(tabs)/courses.tsx:144` shows Add Course unconditionally and
  the card's Edit action at :284 is ungated, but `save_course` (0022) raises
  "only the super admin can add or change a course". A staff member can fill the
  form today and be refused on save. That is a live defect, and this request's
  DESIRED BEHAVIOUR resolves it by granting the permission rather than by hiding
  the button — B2 should confirm that reading, because the opposite repair (hide
  the buttons) is the one this request overrules.
- **Delete member is not restricted — it is not built.** There is no
  `delete_member` RPC in any of the 37 migrations, and
  `app/(tabs)/members.tsx:220` wires Remove to a flash message, "Removing …
  needs a confirmation". Lifting a restriction cannot deliver this half, because
  there is no restriction to lift. **B3 must ask** whether the requester wants
  member deletion BUILT — which is a NEW feature and a separate `/request` — or
  whether `set_member_status` (0031, already staff's) is what she meant by
  delete. Do not silently drop this half and do not silently build it.
- **The precedent for the chrome half** is `src/data/access.ts` +
  `src/components/AdminOnly.tsx`, which hold the staff/admin rule in ONE module
  with its own tests (`src/data/access.test.ts`,
  `src/components/staffShell.test.ts`) rather than as scattered `isSuperAdmin ?`
  expressions. Whatever role questions this change needs belong there, in that
  shape.
- **The precedent for a partial grant** is `app/branches.tsx:108` — staff read
  branches and only the write half is withheld. It is the model for any item the
  requester turns out to want granted narrowly.
- **Guardrail 4 is untouched.** No PIN, no pepper, no secret is in scope; the
  RPCs stay `SECURITY DEFINER` with their checks inside.

## STANDING INSTRUCTIONS (do not edit)
- Track B is SURGICAL: read the actual current files first (B1), run the impact
  analysis with the sibling call-site sweep (B2) BEFORE proposing, produce the
  plan with regression risks (B4) — confirm mode waits for approval; auto mode
  (default) logs it and applies — touching only what DESIRED BEHAVIOUR requires.
  Every changed line must trace to this request.
- MUST NOT CHANGE seeds the plan's "deliberately NOT changing" list; the plan
  may add to it, never subtract.
- If VISUAL?=yes, the plan carries the correction design pass (B4), scoped to
  the touched area: states, both themes in semantic tokens, the string table,
  the permission answer.
- CORRECTION ROUND ≥ 2: before proposing anything, read the previous attempt and
  state what it missed and why (B1). If the miss was the process's fault, flag
  `/framework-update` too.
- Every backend change is an ADDITIVE migration with tests in `supabase/tests/`;
  test files are append-only. Rehearse by replaying every migration from scratch
  against the local harness and running the full suite.
- Close out with `checklists/DEFINITION_OF_DONE.md`, then the test gate. Nothing
  merges without a PASS.
