# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

> **Why CHANGE and not FEATURE.** The write already exists and already ships: `delete_member`
> (0038, extended by 0044) is called from the Members tab's card, and the four outcomes are
> already worded and asserted in `src/data/memberRemoval.ts`. Nothing new is being built. One
> card that was missing the control gains it.

## FIELDS
- FEATURE / SCREEN: the roster card on the course detail screen — `MemberCard` in
  [app/course/[id].tsx](../app/course/%5Bid%5D.tsx). The requester's screenshot is that screen:
  the "Attendance for Tue, Sep 8" caption, the Missed/consecutive line, the "Inactive from
  1 October 2026" line and the Active pill are all on it. Both the with-email and the no-email
  sections draw the same card, so both gain the control.
- CURRENT BEHAVIOUR: the card's right-hand controls are the Active/Inactive pill and Edit.
  There is no way to take a member off the register from this screen. The Members tab's card
  ([app/(tabs)/members.tsx](../app/%28tabs%29/members.tsx)) has had one since 0038 — the same
  card in two places, offering two different sets of actions.
- DESIRED BEHAVIOUR: requester's exact words —
  "give delete icon to delete member in members screen attached on member card atttached"
  Read as: a delete control on the roster card, beside Edit.
- WHY: not stated. Stated as an instruction, with the screen and the position on the card both
  named ("in members screen attached", "on member card"), which is the whole of the ask.
- MUST NOT CHANGE: the Active/Inactive pill and its write (`set_member_status`, 0031) — marking
  a member inactive and removing her are different acts and stay two controls; the Edit button;
  the three attendance readings and their read-only shape (ADR-023) — the row gains no control;
  the day strip; the Missed/consecutive line and the pending-inactive line; `delete_member`
  itself, which is applied and tested; the Members tab's card, which already had this; the
  wording in `src/data/memberRemoval.ts`, which this reuses character for character; every
  string not listed below.
- CORRECTION ROUND: 1.

## DESIGN SURFACE
- VISUAL?: yes — one control is added to the card's right-hand group.
- SCREENS & STATES TOUCHED: `/course/[id]`, the roster card. States: with email, no email
  (where the Edit button is ALREADY drawn in the danger colour, so Remove sits beside it in the
  same red), mid-write, and the confirmation open. Both themes.
- STRINGS ADDED OR ALTERED: no new outcome strings authored. The confirmation is the Members
  tab's, unchanged; the four sentences after the write come from `removalOutcome` /
  `removalFailure`. One new accessibility label: "Remove {name} from the academy" — longer than
  the Members tab's "Remove {name}" because on this card it sits next to a same-coloured Edit.
- PERMISSIONS: nothing gained. `delete_member` keeps the grants it already has; this is a
  second call site for a capability the app already exposes on another screen.
- USAGE: implied by the screenshot — the roster is where a member is looked at, so it is where
  removing her is reached for.
- RUN MODE: `auto` (not stated — the default applies).

## OPEN — settled by the request or by what already ships
- **Does "delete" mean remove from the academy, or unenrol from this course?** Settled by the
  words: "delete member", not "remove from course". It is the same act the Members tab calls
  Remove, and the confirmation names the enrolment that ends so the wider effect is not a
  surprise.
- **Does it need a confirmation?** Not asked for, and not optional: it is the one write on this
  card that cannot be undone from the app, and `delete_course` and the Members tab both ask
  first. The question is the Members tab's, verbatim.
- **Does it replace the Inactive pill?** No — MUST NOT CHANGE says so. A member paused and a
  member deleted are different states and the academy chooses between them.

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
