# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: every screen in the application that has an input field — stated as "across the application wherever user goes if there is input field". The one screen named by example: Add course, its first form field.
- CURRENT BEHAVIOUR: no cursor sits in the first input field when a form opens — the requester asks for the cursor to be shown there, so today it is not.
- DESIRED BEHAVIOUR: when a screen with input fields opens, the first input field carries the cursor — a blinking cursor, as stated: "if you click add course in first form field show blinking cursor".
- WHY: unknown
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR
- CORRECTION ROUND: 1

## DESIGN SURFACE
<!-- Filled whenever anything the user sees changes. "not visual" is a claim the diff will be checked against. -->
- VISUAL?: yes
- SCREENS & STATES TOUCHED: every surface with a text input — confirmed by the requester at Track B's first gate (07-Sep-2026) as "everything, pickers included": the forms (Add/Edit course, Add/Edit member, Add staff, Add holiday, Branches, Register, Change mobile, Forgot PIN, Set PIN), the list search boxes (Members, Attendance, course detail member list), and the search box inside picker sheets and dropdown panels. Which of empty · loading · error · offline · permission-denied are affected is not stated.
- STRINGS ADDED OR ALTERED: none — no wording stated or implied; everything on the screen is frozen
- PERMISSIONS: unknown
- USAGE: unknown
- RUN MODE: auto (default — the description did not say how to run)
- SCALE: `<leave blank — the track decides at B0>`

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
