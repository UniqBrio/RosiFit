# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

> **Origin.** One line from the requester on 06-Sep-2026 — *"email address is
> mandatory for add member"* — sent with a screenshot of the **Welcome a new
> member** dialog scrolled to its Email addresses row, with the footer reading
> *Her name is all that is required*.

## FIELDS
- FEATURE / SCREEN: **Add Member** — the *Welcome a new member* dialog,
  `app/member/edit.tsx` on its Add path (no `id` in the route).
- CURRENT BEHAVIOUR (verified in the file, 06-Sep-2026): the save is gated on
  her name and an offering (course + branch). An email address is optional:
  the row carries no required mark, the note under it reads *"With no address
  she is listed and counted as excluded from every send — never quietly
  dropped"*, the footer reads *"Her name is all that is required"*, and the
  last footer line offers to add her *"· no email, she will be excluded from
  sends"*. `create_member` (0016) accepts an empty address list.
- DESIRED BEHAVIOUR: the requester's exact words — *"email address is mandatory
  for add member"*. Add Member does not save a member who has no email address
  on the form.
- WHY: `unknown` — the requester stated the rule, not the problem. The sibling
  rule for the member FILE (`requests/2026-09-06-import-writes-on-upload-email-required.md`)
  was asked for on the same day: a member with no address cannot be written to.
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. In particular:
  the **Edit member** form is `unknown` — the requester named Add Member only.
  Track B's recommendation, logged for auto mode: Edit keeps its rule, because
  a member created by the ATTENDANCE import (C-76) has no address and must
  still be editable — renamed, moved, marked inactive — without somebody
  inventing one for her. The name / course / branch gates, the several-
  addresses-one-primary rule, the address format check on **+ Add**, the
  attendance import (C-76: a member already on the register with no address is
  still imported and still counted), and the "Add as new member" route from a
  no-email card (it lands on this form, which now asks for the address that
  card was missing).
- CORRECTION ROUND: 1. Same rule, different surface, as the import request
  above; nothing on this form was corrected before.

## DESIGN SURFACE
- VISUAL?: yes — strings and one required mark; no layout change.
- SCREENS & STATES TOUCHED: the Add form of `/member/edit` in its default state
  and its "not yet valid" state (the disabled Add Member and the footer line
  that says what is missing). Both themes. The Edit form, its skeleton, its
  failed-read and its not-on-the-register states are unaffected.
- STRINGS ADDED OR ALTERED: the Email addresses label gains the shared
  required mark on the Add form (the same `<RequiredMark />` every other
  mandatory field draws, CP-017, with "required" in its accessible name); the
  note under an empty address row on the Add form; the footer's
  *"Her name is all that is required"* on the Add form; a new footer line for
  "name, course and branch chosen, no address yet". Every other string on the
  screen is frozen, including all of the Edit form's.
- PERMISSIONS: no.
- RUN MODE: auto

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

---

## AS BUILT — 06-Sep-2026

- **The gate.** `app/member/edit.tsx` decides `emailRequired` from the route
  (`!editing`, the same way Add-vs-Edit itself is decided, RC-021) and the
  save gate reads it: Add Member stays disabled until an address is on the
  form. The Edit form's gate is unchanged.
- **The form says so.** The Email addresses label carries the shared
  `<RequiredMark />` on the Add form (word "required" in its accessible name;
  `theme.danger`, measured). With no address the note reads *"Add her email
  address — it is where every follow-up is sent, and she cannot be added
  without one."*; the footer reads *"Her name and an email address are
  required"* before a name is typed and *"Add her email address — follow-ups
  are sent there"* once course and branch are chosen. The Edit form keeps
  every one of its old strings.
- **Spec:** `src/components/addMemberEmail.test.ts` (3 specs, source-reading
  like editDialog.test.ts). Fail-first recorded in
  `.evidence/add-member-email-fail-first.txt` — 2 of 3 fail on the tree before
  the change.
- **Verified:** `npm run check` green end to end — typecheck, 469 unit specs,
  2,840 contrast pairs, 75 icons. `audit:testids` and `audit:colors` clean.
  Both themes looked at on the exported page (scratchpad Playwright, DOM and
  screenshot): the mark, its accessible name, the note, the footer line and
  `aria-disabled` on Add Member, dark and light.
- Register: FEATURE_TRUTH gains an **Add a member** row and the Edit row says
  why an address is not required there. CHANGELOG entry written.

### ASSUMPTIONS (auto mode)
- **Edit member keeps its rule.** The requester named Add Member; a member the
  attendance import created (C-76) has no address and must still be editable.

### NOT CHANGED, deliberately
- **`create_member` (0016) still accepts an empty address list.** The client
  is the gate, exactly as it is for the bulk import (same-day precedent). A
  refusal in the RPC is a migration, and this machine cannot rehearse one
  (no PostgreSQL 16) — per CLAUDE.md the harness replay is the whole of the
  pre-flight check, so it is recorded here rather than shipped unproven.
- The design canvas's `nmHint` (*"Her name is all that is required"*) is not
  edited; the register records the divergence, as it does for the import.
- **Learning check:** a correctly functioning process would not have caught
  this — it is a product rule the requester changed, not a defect.
