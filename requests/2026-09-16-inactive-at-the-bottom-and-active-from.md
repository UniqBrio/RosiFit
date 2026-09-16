# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: The attendance roster — `app/course/[id].tsx`, the member list under the day
  strip where attendance is marked, and the ACTIVE / Inactive pill on each member card
  (`course-member-status-<id>`). This is the only screen that carries that pill; the read-only
  register tab `app/(tabs)/attendance.tsx` has no member status pill and is not in scope.
- CURRENT BEHAVIOUR:
  1. A member who is inactive on the shown day is **removed from the roster entirely**
     (`membersActiveOn`, `app/course/[id].tsx:448-449`); only a "left earlier" note says a
     member is missing.
  2. Tapping the pill opens a `ConfirmDialog` with a text body and Cancel / Mark active ·
     Mark inactive buttons (`app/course/[id].tsx:2443-2473`). There is no date control in it:
     the write always uses today (`applyStatus`, `:1987-2010`).
- DESIRED BEHAVIOUR:
  1. Inactive members are **shown in the attendance section, at the bottom** of the list
     rather than dropped.
  2. Tapping an **Inactive** tag opens a popup to mark the member active — the same popup that
     tapping the Active tag shows today — **plus** a control to select the **active-from date**,
     defaulting to **today's date**.
- WHY: `unknown` — not stated.
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. Named explicitly by the shape of
  the ask: the mark-**inactive** direction of the popup keeps behaving as it does today, and the
  read-only attendance register tab is untouched.
- CORRECTION ROUND: 1

## DESIGN SURFACE
- VISUAL?: yes
- SCREENS & STATES TOUCHED: attendance roster on `app/course/[id].tsx` — the member list order
  and the status pill's dialog. States: populated list (new bottom grouping), and the dialog's
  saving state. Empty / loading / error / offline / permission-denied are not affected by the
  ask; offline must keep working because the fixture path writes through the same repository
  call.
- STRINGS ADDED OR ALTERED: the requester gave no exact wording. New: a label for the
  active-from date control inside the popup, and whatever heading marks the inactive group at
  the bottom of the list. Everything else on the screen is frozen.
- PERMISSIONS: no — same roles as the existing pill.
- USAGE: `unknown` — not stated.
- RUN MODE: auto (nothing in the ask asks to wait for approval)
- SCALE: scoped

## ANSWERED AT TRACK B's FIRST GATE (16-Sep-2026)
- **The 08-Sep rule and this one sit together as a SEPARATE SECTION.** The day's
  register rows are unchanged — a member off the register is still not one of them —
  and the members that rule takes out are listed under an `Inactive` heading at the
  foot of the roster. The requester picked this over folding them into one sorted list.
- **The date must be real and selectable, defaulting to today**: "give a date
  selection option in pop to select date or else make todays date as default there."
  The current schema cannot hold it (question 1 below), so migration 0072 adds
  `members.active_again_from` as the mirror of `inactive_from`.

## OPEN QUESTIONS FOR B3 (not decisions — the requester never covered these)
1. **What does "active from date" write?** The app already uses the exact label "Active from"
   in the member edit form, where it means `members.joined_on` (the joining day that drives
   `membersOnDay`), NOT a reactivation date. There is no separate reactivate-on column: today
   marking active sets `status='active'` and clears `inactive_from`. Whether the picked date
   should move `Active from` / `joined_on`, or only date-stamp the reactivation, is `unknown`.
2. **Can an inactive member at the bottom of the roster be marked present?** The ask says show
   them, not what tapping their attendance control does. `unknown`.
3. **May the picked date be in the future?** Default is today as stated; whether a later date is
   allowed (a scheduled reactivation, mirroring the existing pending-inactive date) is `unknown`.

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
