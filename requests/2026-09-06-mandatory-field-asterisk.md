# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

> **Origin.** The requester's words in full: "in all forms  where ever there are
> mandatory fields show them with red asterisk symbol." One rule applied across
> every form — not a list of separate asks, so it is one CHANGE, not a triage.
>
> **Overlap to read before starting.** `requests/2026-09-06-register-form-single-page.md`
> already carries the same marker for ONE form ("for all mandatory fields mark
> with red asterisk symbol", Register only). At the moment this file was
> written that work was not in the tree: `src/components/Field.tsx` has no
> `required` affordance and `app/register.tsx` marks nothing. Track B's B1 must
> re-read both files as they actually stand before planning — a concurrent
> session is working the same surface (see the note in MUST NOT CHANGE).

## FIELDS
- FEATURE / SCREEN: **Every form in the app.** The sweep for input surfaces found:
  Register (`app/register.tsx`), Sign-in (`app/index.tsx`), Set PIN (`app/set-pin.tsx`),
  Forgot PIN (`app/forgot-pin.tsx`), Change mobile (`app/change-mobile.tsx`),
  Member edit (`app/member/edit.tsx`), Course edit (`app/course/edit.tsx`),
  Course detail (`app/course/[id].tsx`), Offering edit (`app/offering/edit.tsx`),
  Staff add (`app/staff/add.tsx`), Branches (`app/branches.tsx`),
  Holidays (`app/holiday.tsx`), Match/unresolved email (`app/match.tsx`),
  Appearance custom hue (`app/appearance.tsx`). Whether the requester counts the
  list-screen search boxes (`app/(tabs)/members.tsx`, `courses.tsx`,
  `attendance.tsx`) as "forms" is `unknown` — they hold no mandatory field, so
  on the stated rule nothing there is marked.
- CURRENT BEHAVIOUR: No form marks which of its fields are mandatory. Every label
  renders the same whether the field blocks the save or not. Where a field IS
  mandatory today it is discoverable only after the fact or in prose: Course edit
  shows "A course name is required" as a hint under the name, Member edit says
  "Her name is all that is required", Register's step-1 validation raises a toast
  naming the fields it wanted, and elsewhere the forward button is simply
  disabled with no field-level reason.
- DESIRED BEHAVIOUR: In every form, each mandatory field shows a red asterisk
  against its label. The asterisk is the requester's stated marker, in red.
- WHY: `unknown` — the requester stated the marker, not the problem behind it.
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. No field becomes
  mandatory or stops being mandatory because of this change — the marker reports
  the validation that already exists, it does not set it. No existing validation
  message, hint, toast, disabled-button rule, layout or field order changes.
  Note for the track: this tree is shared with concurrent sessions and files
  under `app/` and `src/components/` moved during intake; re-read before editing
  and do not revert a peer's uncommitted work.
- CORRECTION ROUND: 1 for the app-wide scope. The Register form alone was asked
  for the same marker once before, in
  `requests/2026-09-06-register-form-single-page.md` (built, then absent from the
  tree — see Origin). If Track B finds that work still missing, it states why
  before re-doing it.

## DESIGN SURFACE
<!-- Filled whenever anything the user sees changes. "not visual" is a claim the diff will be checked against. -->
- VISUAL?: yes
- SCREENS & STATES TOUCHED: every screen listed under FEATURE / SCREEN, in their
  default and error states — the marker must survive alongside the per-field
  error text that already replaces the hint, and must not shift the label row's
  height. The change reaches the shared field components, which is where most of
  the diff will land: `src/components/Field.tsx` (`Field`, `Choice`, `Stepper`,
  `Toggle` — none has a required affordance), `src/components/Dropdown.tsx`
  (`DropdownField`), `src/components/DateTimePicker.tsx` (`DateField`,
  `TimeField`). Screens that render a raw `TextInput` with their own label —
  Sign-in, Set PIN, Appearance's custom hue, Course edit's subject and body — do
  not go through those components and need their own answer. Empty, loading,
  offline and permission-denied states are unaffected.
  **Which fields are mandatory in each form is `unknown` as a stated list** — the
  requester named no fields. Track B derives it from each form's existing
  blocking validation and puts that list in front of the requester in the plan.
- STRINGS ADDED OR ALTERED: the asterisk marker itself (new). Whether any form
  gains a legend such as "* required", and whether the screen-reader name says
  "required" in words, is `unknown` — the requester asked for the red asterisk
  and nothing else. Every other string on every touched screen is frozen.
  Binding constraint from CLAUDE.md guardrail 3 (colour is never the only
  signal): the marker may not depend on being seen as red, so the plan states
  what carries it for a colour-blind or screen-reader user. Guardrail 2 applies
  to the red itself — a measured token, not a literal.
- PERMISSIONS: no — a label marker changes nothing about who can see or do anything.
- RUN MODE: auto (default — the description did not say how to run)

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
