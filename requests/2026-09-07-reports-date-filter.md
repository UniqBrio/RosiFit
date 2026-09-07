# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: the **Reports tab** — `app/(tabs)/reports.tsx`, the area between the
  screen header and the three scope pills (*Members · Courses · Branches*).

- CURRENT BEHAVIOUR (read in the file, 2026-09-07): the screen already holds the period as
  state — `const [period, setPeriod] = useState<PeriodChoice>({ key: 'This month' })` — and
  already uses it for everything downstream: `resolvePeriod(period)` produces `range`,
  `range` is passed to `useFollowUp` (which refetches on `[period.from, period.to]`),
  `range.label` is printed in the `ScreenHeader` subtitle, and `range.from` / `range.to` /
  `range.label` go into the export filename and into a Period column on every CSV row.

  **`setPeriod` is never called.** A grep across `app/` and `src/` finds the declaration and
  no call site. There is no dropdown and no control of any kind on the screen — only the
  three scope pills, which choose what the rows are grouped by, not when. So the report is
  permanently pinned to the current calendar month, and the subtitle names a range that
  nobody chose. The file's own comment at that line says the opposite of what ships:
  *"The period is a CONTROL, not a caption."*

- DESIRED BEHAVIOUR: requester's exact words — *"Add filter dropdown for date filters in
  reports"*.

  Read as: a **Period dropdown field on Reports**, opening the panel the app already has —
  `PeriodPanel` from `src/components/PeriodFilter.tsx`, offering the four presets
  *This week · Last week · Last 4 weeks · This month* plus *Custom range* — wired to the
  existing `setPeriod`. Choosing a range refetches the figures, and the subtitle, the bars
  and both exports follow the choice, because they all already read the same `range`.

  This MOUNTS an existing shared component; it does not design a new one. `PeriodPanel` is
  already mounted on Overview (`app/(tabs)/index.tsx:212`, testID `home-period`) and on
  Attendance (`app/(tabs)/attendance.tsx:197`, testID `attendance-period`), both inside a
  `DropdownRow` / `DropdownField` / `DropdownPanel maxHeight={430}` trio. Reports is the
  third screen with a period and the only one without the control.

- WHY: `unknown` as stated. Evident from the code: the control was intended on this screen
  and never mounted — the state, the resolve, the query wiring and the label all exist and
  are dead-ended by the missing field.

- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. Specifically —
  - The three scope pills, their behaviour and their `reports-scope-*` testIDs.
  - The arithmetic: `reportRows` / `reportBars` / `reportMeta` in `src/data/report.ts`, and
    the `pct === null` distinction between "nothing scheduled" and "0% attended".
  - Both export controls (`reports-export`, `reports-export-excel`), the CSV column list,
    the filename shape and the toast wording. These already interpolate `range`, so they
    follow the chosen period by themselves — that is the existing contract being honoured,
    not a change to it.
  - The loading, error and empty states and their copy, the legend row, the
    *"uploaded sessions only"* subtitle suffix, and the holidays/cancellations footnote.
  - Guardrail 1: the period still flows into the one member query. No second list, no
    separate period stored anywhere.
  - Guardrail 3 and both themes: the field and panel are semantic tokens only, and every
    icon resolves to a real glyph (`check-icons`, `check-contrast` stay green).

- CORRECTION ROUND: 1 on this surface.

## CLASSIFICATION NOTE — correct this at the gate if it is wrong
Filed as **CHANGE**, not NEW, because the Reports screen ships and works, and a date filter
is not a new app capability: `PeriodFilter` exists and is mounted on two other screens. The
missing piece here is one control over state the screen already keeps. If the requester
means something larger than mounting the shared filter, this should be re-filed as NEW.

## OPEN QUESTIONS — the requester did not settle these; taken at the gate
- **Q1. Does the default period change?** **Taken: no — Reports keeps `This month`.**
  The ask is for a control, not a new default. Overview and Attendance open on *This week*;
  Reports differs on purpose, per its register entry — the dashboard says what is happening
  this week, Reports says whether it is a trend. Changing the default would silently move
  every figure on the screen on first load, which nobody asked for.
- **Q2. Is *Custom range* offered?** **Taken: yes — the whole `PeriodPanel` unchanged.**
  `PeriodFilter`'s own contract is that every screen with a date filter offers the same
  ranges; trimming the list here would fork the shared control and give the same field two
  meanings in one app.
- **Q3. Where does the field sit, and how wide?** **Taken: in its own `DropdownRow` directly
  under `ScreenHeader`, above the scope pills, as one full-width field labelled *Period*.**
  Above, because a filter belongs above what it narrows (as on Attendance) and the in-place
  panel keeps the card in view. Full-width because Reports has no other dropdown to share the
  row with — the three-across `flex: 1` layout on Overview and Attendance is a consequence of
  those screens having three filters, not a rule about the field.
- **Q4. Does the filter render in the loading, error and empty states?** **Taken: yes — it
  sits above the branch, so it renders in all four.** This is the one that matters: today
  `rows.length === 0` shows *"Nothing to report yet"*, and a filter that disappeared with the
  rows would leave a person looking at an empty month with no way to ask for another one.
- **Q5. Do the scope pills become a dropdown too?** **Taken: no.** The ask names date filters.

## DESIGN SURFACE
- VISUAL?: yes
- SCREENS & STATES TOUCHED: Reports only — and **all four of its states**: ready, loading
  (`Skeleton`), error (`ErrorState`) and empty (`EmptyState`), per Q4. The panel's own open
  and closed states, the custom-range calendar mid-pick (start chosen, end not), and the
  z-order of the open panel over the report card (`DropdownRow` owns the stacking context).
  No offline or permission-denied state on this screen.
- STRINGS ADDED OR ALTERED: the field label **"Period"** and its value text, which is
  `periodFieldValue(period)` — an existing function. Every string inside the panel already
  exists in `PeriodFilter.tsx`. Everything else on the screen is frozen.
- PERMISSIONS: no — Reports is reachable by the same roles as today, and a date filter
  changes nothing about who sees what.
- USAGE: `unknown` — the requester did not say how often Reports is read or by whom.
- RUN MODE: auto (default — the description says nothing about approvals)
- SCALE: left blank; Track B decides at B0.

## OBSERVED AT INTAKE — not part of this ask
`docs/registers/FEATURE_TRUTH.md` "Reports" is stale (last confirmed 02-Sep-2026): it states
*"Limits — no export. Reports are read on screen"* when both export controls ship, and lists
*"Branch and course filters"* as a capability when what the screen has is the three scope
pills. Flagged for the track's Definition-of-Done register pass, not to be fixed at intake.

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
