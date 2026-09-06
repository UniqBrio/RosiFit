# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: **Overview** (Home) — `app/(tabs)/index.tsx`, the four sections under
  the filter row: **Attendance** (the ring), **Based on member**, **Based on course**,
  **Based on period**. Shown in the requester's desktop screenshot (≈1900px wide) with
  "Based on member" filling the whole width.

- CURRENT BEHAVIOUR (read in the file, 2026-09-06): the four sections are four cards
  stacked one under the other, each the full width of the screen at every size. Based on
  member is a ranked bar list (six rows). Based on course is a dot plot on one 0–100% axis.
  Based on period is a line over the period's sub-ranges.

- DESIRED BEHAVIOUR: requester's exact words — *"in overview section the sections are
  categorized in 4 categories hence bring graphs two in one row hence it will be minimal
  and bring do not chart or pie chart based on perio and based on course"*.

  Read as: (1) the four sections sit **two per row**, a 2×2 grid, so the tab is shorter and
  reads at a glance; (2) **Based on course** and **Based on period** render as **donut or
  pie charts** instead of the dot plot and the line. ("do not chart" is read as *donut
  chart* — the app already draws one, `src/components/Donut.tsx`.)

- WHY: "hence it will be minimal" — the requester's words. Nothing more was said.

- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. Named because they are
  adjacent and easy to hit: the three filters and their dropdowns, the Attendance ring
  and its three facts (Members · Courses · Need follow-up, the last opening Weekly), the
  Based on member bar list and its six-row limit, every figure being counted from the one
  narrowed member list (guardrail 1 — no chart may compute its own total), the period
  section's own loading and error states, the closing "Every figure here…" note, the
  Reports and Attendance tabs.

- CORRECTION ROUND: 1 for the layout and the two marks. (The sections themselves are round 1
  of `requests/2026-09-06-overview-filters-and-sections.md`, which chose the dot plot and
  the line; this request replaces those two choices on the requester's instruction.)

## OPEN QUESTIONS — the requester did not settle these; taken at the gate
- **Q1. Two per row at every width?** A phone cannot hold two charts side by side.
  `unknown` — recommendation: two per row from 768px (the breakpoint courses.tsx already
  uses), one per row below it. **Taken** (auto mode): `TWO_UP_MIN = 768` on the window width.
- **Q2. What does one pie "based on course" show?** A course is a rate (present ÷
  expected), and a pie shows shares of one whole. `unknown` — recommendation: one small
  ring **per course**, Present vs Absent with the percentage in the hole, the same mark as
  the Attendance ring — so every ring on the screen means the same thing. The same for each
  sub-range of the period. **Taken** (auto mode): `src/components/AttendanceRings.tsx`; a
  single pie with a slice per course was rejected because a slice is a share of the whole,
  not the attendance rate every other figure on the screen means — ADR-026.
- **Q3. Donut or pie?** `unknown` — recommendation: donut, matching the existing ring.
  **Taken** (auto mode): donut, the percentage in the hole.

## DESIGN SURFACE
- VISUAL?: yes
- SCREENS & STATES TOUCHED: Overview (Home) only — the ready state's layout; the course and
  period sections' empty states (no course / nothing to split) keep their words; the period
  section's loading (skeleton) and error (retry) states stay, inside the narrower card.
  Offline and permission-denied unaffected.
- STRINGS ADDED OR ALTERED: none requested. The captions "Where each course sits on the same
  scale" (describes the axis being removed) and the trend's "The flat line is…" note
  (describes the line being removed) can no longer be true; their replacements are
  `unknown` — taken at the gate. **Taken** (auto mode): the course caption is now "Present
  and absent, course by course"; the period caption was already true of rings and is
  unchanged; the trend's note left with the trend. Everything else on the screen is frozen.
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
