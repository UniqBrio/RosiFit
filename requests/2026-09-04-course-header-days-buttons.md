# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## ROUGH DESCRIPTION (verbatim)
> Place a comma between the days and  place the buttons such that it occupies less space

Accompanied by a screenshot of the course detail screen (Yoga), header reading
`Yoga / 1 branch / Anna Nagar: Tue Thu` above a full-width **Send Communication** button.

## FIELDS
- FEATURE / SCREEN: Course detail (`app/course/[id].tsx`) — the deep header: the frequency
  line under the branch count, and the buttons in that header area.
- CURRENT BEHAVIOUR: The frequency line renders the weekdays space-separated —
  `Anna Nagar: Tue Thu`. The header carries a back button and (super-admin) a delete button on
  the breadcrumb row, and a full-width **Send Communication** button below the frequency line.
- DESIRED BEHAVIOUR: (1) Put a comma between the days — `Anna Nagar: Tue, Thu`.
  (2) Place the buttons so they occupy less space.
- WHY: unknown (requester did not say; the screenshot shows the header consuming most of the
  first viewport)
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR
- CORRECTION ROUND: 1

### Answered at Track B's B3 gate (04-Sep-2026)
- WHICH BUTTONS: **Send Communication only.** Back, delete and the week-navigation arrows are
  explicitly out of scope.
- HOW: **Send Communication moves onto the breadcrumb row**, compact and right-aligned beside
  the delete button; the full-width block below the frequency line goes away (≈61pt saved).
- MULTI-BRANCH SEPARATOR: unchanged — branches stay joined with ` · `.
- LABEL: kept verbatim as "Send Communication" (freeze rule). Cost accepted at the gate and
  confirmed in the render: the breadcrumb truncates to `Courses → T…` at 390pt, and to nothing
  at 320pt when the delete button is present. Open for a follow-up if the requester wants the
  label shortened.

## DESIGN SURFACE
- VISUAL?: yes
- SCREENS & STATES TOUCHED: Course detail header only (loaded state). Empty / loading / error /
  offline / permission-denied states: `unknown` — not named by the requester; the delete button
  is super-admin-only, so the header already has a role-dependent layout.
- STRINGS ADDED OR ALTERED: the frequency line's day separator — `Tue Thu` becomes `Tue, Thu`
  (requester's words: "Place a comma between the days"). No button label change was asked for;
  everything else on the screen is frozen (the freeze rule).
- PERMISSIONS: no — nothing about who can see or do anything changes

## STANDING INSTRUCTIONS (do not edit)
- Track B is SURGICAL: read the actual current files first (B1), run the impact analysis with
  the sibling call-site sweep (B2) BEFORE proposing, present the plan with regression risks
  (B4), wait for approval, then apply — touching only what DESIRED BEHAVIOUR requires. Every
  changed line must trace to this request.
- MUST NOT CHANGE seeds the plan's "deliberately NOT changing" list; the plan may add to it,
  never subtract.
- If VISUAL?=yes, the plan carries the correction design pass (B4), scoped to the touched
  area: states, both themes in semantic tokens, the string table, the permission answer.
- CORRECTION ROUND ≥ 2: before proposing anything, read the previous attempt and state what it
  missed and why (B1). If the miss was the process's fault, flag `/framework-update` too.
- Close out with `checklists/DEFINITION_OF_DONE.md`, then the test gate. Nothing merges
  without a PASS.
