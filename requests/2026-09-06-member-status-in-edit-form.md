# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: the Edit member dialog — `app/member/edit.tsx`, opened with `?id=` ("Edit
  member", subtitle `<her name> · <her course>`).
- CURRENT BEHAVIOUR: the form holds her name, course, branch, joined-on, her days, her Google
  Meet display names and her addresses. It carries NO status control, and `updateMember`
  (0027) does not touch `members.status`. The only place anybody can set that column is the
  Active/Inactive pill on the course-detail roster card (`app/course/[id].tsx`, tapped →
  `setMemberStatus` → `set_member_status`, migration 0031), shipped under
  [requests/2026-09-05-inline-actions-and-member-status.md](./2026-09-05-inline-actions-and-member-status.md).
  So a member's status can only be changed from inside a course she is on — never from her own
  record.
- DESIRED BEHAVIOUR: requester's exact words —
  "For member there is no active and inactive status setting screen enable user to mark member
  as active and in active in edit member form"
  Read as: the Edit member form lets the user mark her active or inactive.
- WHY: `unknown` — stated as an absence ("there is no active and inactive status setting
  screen"), not as a problem it causes.
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. In particular the course-detail
  roster pill and its toggle (it stays, and keeps working), `set_member_status` (0031) as the
  only write path for the column and everything it deliberately does not do — no enrolment,
  session, expectation or attendance record moves with the status — the follow-up rule itself
  (an inactive member is left out because the database already leaves her out), every other
  field on this form and its save, and every copy string not listed below.
- CORRECTION ROUND: 1 for this surface — the edit form has never carried a status control.
  Related, not a previous attempt at this: 2026-09-05-inline-actions-and-member-status put the
  same capability on the course roster, which is where that request asked for it.

## DESIGN SURFACE
- VISUAL?: yes — a control the form does not have today.
- SCREENS & STATES TOUCHED: `/member/edit` with `id` — default, roster-still-loading (her record
  arrives after first render and the fields are seeded once), saving, and the refusal line the
  form already shows when a write is declined. Both themes. The ADD state (no `id`) is not
  named by the requester — see the `unknown` below.
- STRINGS ADDED OR ALTERED: NEW — the control's label and its two words, "Active" and
  "Inactive" (the words the roster pill already uses). Any confirmation wording: `unknown`.
  Nothing existing is reworded.
- PERMISSIONS: no change. Marking her active or inactive is the same gate as editing her —
  `is_active_app_user() and is_subscription_writable()`, restated inside `set_member_status`.
- RUN MODE: `auto` (not stated by the requester — the default applies).

## OPEN — `unknown`, for Track B's B3 to ask
1. Two values or three? The requester named active and inactive; the column's CHECK also
   allows `paused`, which no screen has ever offered.
2. Does the control take effect on TAP (as the roster pill does, one RPC, no Save) or on SAVE
   with the rest of the form? The two differ visibly on Cancel.
3. Does the ADD form show it? The requester said "edit member form"; add always creates her
   `active`.

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
