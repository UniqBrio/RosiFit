# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: the ADD member form — `app/member/edit.tsx` opened with NO `?id=`
  ("Add member"). Its EDIT state (`?id=`) is the sibling, and already carries the control
  this request is about.
- CURRENT BEHAVIOUR: the Add form has no status control. `app/member/edit.tsx:531-534`
  gates the Active/Inactive radio group on `existing`, so it renders on Edit only, and the
  comment there states the reason: "A member being created is created active (create_member,
  0016), and a status control on a form that is welcoming somebody asks a question nobody
  has." `createMember` (`src/data/repository.ts:1824`) sends no status; `create_member`
  (0016) inserts `'active'`. That absence is a decision on the record —
  [docs/decisions/017-member-status-on-the-edit-form-applies-on-save.md](../docs/decisions/017-member-status-on-the-edit-form-applies-on-save.md)
  (ADR-025), Consequences, last bullet: "The Add form does not ask."
- DESIRED BEHAVIOUR: requester's exact words —
  "While adding member show active and inactive toggle by default it should be active if they
  want to set as inactive they can cliq on edit and det as inactive"
  Read as: the Add form SHOWS the Active/Inactive toggle, and it starts on Active. The second
  clause names Edit as the route to Inactive — whether that means the toggle on Add is
  display-only is `unknown`, see OPEN 1.
- WHY: `unknown` — stated as an instruction, not as a problem it causes. The requester did not
  say what goes wrong today when the Add form shows nothing about status.
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. In particular: the EDIT form's
  status control, its pending-until-Save mechanism, its consequence notice and its split
  refusal (ADR-025 option B, chosen by the requester) — this request adds a state to the
  form, it does not re-open how Edit behaves; the course-detail roster pill and its
  write-on-tap confirmation; `set_member_status` (0031) as the only path that writes
  `members.status`; `create_member` (0016) and `update_member` (0027) signatures — folding
  status into either is a migration ADR-025 already deferred; the follow-up rule; every other
  field on the Add form, its validation and its save; and every copy string not listed below.
- CORRECTION ROUND: 1 for the ADD form — it has never carried a status control, and no
  previous attempt put one there. It is, however, a REVERSAL of a shipped decision: ADR-025
  answered "does the Add form show it?" with no. That question was carried as OPEN item 3 of
  [requests/2026-09-06-member-status-in-edit-form.md](./2026-09-06-member-status-in-edit-form.md);
  the ADR records the MECHANISM question as "asked as a direct question before anything was
  built" and does not record item 3 being asked. Track B must read that ADR before proposing,
  and the ADR needs superseding rather than contradicting.

## DESIGN SURFACE
- VISUAL?: yes — a control the Add state does not have today.
- SCREENS & STATES TOUCHED: `/member/edit` with NO `id` (the Add state) — default/empty,
  saving, and the refusal line the form already shows when a write is declined. Both themes.
  The EDIT state (`?id=`) is NOT a target: it already has the control and MUST NOT CHANGE
  covers it. Whether a new refusal state exists at all depends on OPEN 1.
- STRINGS ADDED OR ALTERED: the two words "Active" and "Inactive" and the "Status" label
  already exist in `STATUS_CHOICES` / the Edit block and are REUSED, not reworded. Whether
  the Add state needs its own helper sentence (the Edit one talks about the follow-up rule
  reaching her, which reads differently for somebody not yet created) is `unknown`. Nothing
  existing is reworded. The word the requester used is "toggle"; the shipped control is a
  two-option radio group — see OPEN 2.
- PERMISSIONS: no change. Creating a member is `is_active_app_user() and
  is_subscription_writable()`; `set_member_status` (0031) restates the same gate.
- USAGE: `unknown` — the requester did not say how often a member is added, nor how often one
  would be created inactive.
- RUN MODE: `auto` (not stated by the requester — the default applies).
- SCALE: left blank — the track decides at B0.

## OPEN — `unknown`, for Track B's B3 to ask
1. **Is the toggle on Add pickable, or shown-and-fixed?** The requester said "show ... toggle
   ... by default it should be active" AND "if they want to set as inactive they can cliq on
   edit". Two readings, materially different builds:
   (a) pickable — she can be created Inactive, which needs a second write
       (`setMemberStatus` on the id `createMember` returns) because `create_member` cannot
       take a status, bringing the same partial-failure state ADR-025 describes for Edit;
   (b) shown, reading Active, not pickable — no write path changes at all; the control states
       what she will be, and Edit remains the only way to change it.
2. Toggle or radio group? The requester said "toggle"; the shipped Edit control is a
   two-option radio group with a word, an icon and a meaning line per option. Reusing it keeps
   the two states of one form identical; a switch would be a second idiom for one column.
3. If (a): does the Add form show the consequence notice the Edit form shows when the pick
   differs from Active, and does a status refusal after a successful create leave the member
   created-and-active with a message, as Edit does for its partial failure?

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
