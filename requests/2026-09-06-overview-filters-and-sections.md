# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: Overview (Home) — `app/(tabs)/index.tsx`: the "Academy wise · Branch wise"
  tab pair, the filter row under it, and the single "Attendance distribution" donut.
- CURRENT BEHAVIOUR: Two scope tabs ("Academy wise", "Branch wise") sit at the top; the Branch
  dropdown only appears when "Branch wise" is chosen. The filter row is Branch · Course ·
  Period. Every dropdown is single-select with radio buttons. One chart: a donut with three
  segments — Present, Absent, **Not expected**.
- DESIRED BEHAVIOUR:
  1. Remove the two tabs under Overview.
  2. Show a Branch selection dropdown in their place, always.
  3. Filter order: **Course, then Period, then Branch**.
  4. All the dropdowns contain **checkboxes**.
  5. The charts are categorised into sections: **based on member**, **based on course**, and
     **based on period**.
  6. Only **Absent** and **Present** are categories. "Not expected" is not a category — remove it.
  7. The Overview should be built so "user can get gist of everything just by looking at it",
     approached "as senior dev and senior design engineer".
- WHY: stated only as the gist requirement in item 7 — the Overview should read at a glance.
  The motivation for items 1–4 and 6 beyond the instruction itself is `unknown`.
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. Named explicitly because they
  are adjacent and easy to hit: the Reports tab and its own scope pills, the Attendance tab's
  branch filter, the shell's two tabs under the academy name (Overview · Attendance) and the
  Home · Reports · More pill, and the guarantee that every figure on Overview is counted from
  the one member source.
- CORRECTION ROUND: 1

## DESIGN SURFACE
- VISUAL?: yes
- SCREENS & STATES TOUCHED: Overview (Home) only — loading (skeleton), error (retry), and the
  ready state; empty (no members in the narrowed set) becomes reachable per section and must be
  designed. Offline and permission-denied unaffected.
- STRINGS ADDED OR ALTERED: the requester's own words for the section names — "based on member",
  "based on course", "based on period" — and the categories "Present" and "Absent". The
  "Not expected" legend/segment string is removed. Exact final section headings `unknown`;
  everything else on the screen is frozen.
- PERMISSIONS: no
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
