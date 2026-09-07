# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: **every filter dropdown in the app**, named by the requester as *"all
  dropdowns from filter to branches and date filters"*. That is the shared chrome in
  `src/components/Dropdown.tsx` and `src/components/PeriodFilter.tsx`, worn by:
  - Overview / home (`app/(tabs)/index.tsx`) — Course, Period, Branch;
  - Attendance (`app/(tabs)/attendance.tsx`) — Branch, Course, Status, Period;
  - Reports (`app/(tabs)/reports.tsx`) — Period;
  - and the single-choice field pickers on Courses, course edit / detail and offering edit,
    which already carry no Done step.

- CURRENT BEHAVIOUR (read in the files, 2026-09-07) — the app has three dropdown kinds and
  only two of them ask for a Done:
  - **Single-choice (`DropdownList`)** — Attendance's Branch / Course / Status and every field
    picker. Tapping a row applies the choice and closes the panel in the same tap. **No Done.**
  - **Multi-choice (`DropdownCheckList`)** — Overview's Course and Branch. A tick applies
    immediately (`onToggle` runs `setCourses` / `setBranches`, `app/(tabs)/index.tsx:206,221`),
    but the panel pins a **"Done" button** under the list (`DropdownDone`,
    `src/components/Dropdown.tsx:246`; mounted at `index.tsx:203` and `:218` as
    `home-course-done` / `home-branch-done`). It is the panel's only in-panel way out.
  - **Date filter (`PeriodPanel`)** — Overview, Attendance, Reports. The four named ranges
    apply and close on the tap (`PeriodFilter.tsx:57`). The **custom range** applies as soon
    as both days are picked (`PeriodFilter.tsx:49`) but then waits on a second button —
    `{testID}-custom-done`, labelled **"Use this range"**, disabled and reading "Pick both
    days" until then (`PeriodFilter.tsx:105-121`).

- DESIRED BEHAVIOUR: requester's exact words — *"Across application in dropdown dont ask user
  to click on done user select checkbox and then filter applied apply for all dropdowns from
  filter to branches and date filters"*.

  Read as: **the pick is the whole interaction.** No dropdown anywhere asks for a second,
  confirming tap. Ticking a checkbox applies the filter; picking the second day of a custom
  range applies that range. The "Done" and "Use this range" buttons go.

- WHY: `unknown` as stated. Evident from the ask: a Done button after a control that has
  already applied its change reads as though the change has NOT been applied until it is
  pressed, so every filter costs an extra tap for a confirmation that confirms nothing.

- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. Specifically —
  - **what a pick applies stays exactly what it applies today** — this is about removing a
    confirming tap, not about changing any filter's result;
  - **multi-choice stays multi-choice.** A tick must not close the panel: a checkbox list that
    shut on the first tick could never be given a second branch, which would silently turn
    Overview's Course and Branch filters into single-choice ones;
  - the custom range is still only applied when BOTH ends are picked — a half-picked range
    stays unapplied (C-84, `PeriodFilter.tsx` header comment), and "Clear" stays;
  - the single-choice dropdowns are already correct and are not touched;
  - `DropdownField`, `DropdownRow`, `DropdownPanel` geometry, the in-place (not bottom-sheet)
    placement, and one-open-at-a-time stay as they are;
  - every remaining testID keeps its name; both themes.

- CORRECTION ROUND: 1 on this surface.

## SETTLED AT INTAKE — asked of the requester, answered 07-Sep-2026
- **Q1. With Done gone, what closes a multi-choice panel?** The `DropdownDone` comment names
  the risk exactly: *"a multi-select panel does not close on a tick, so its way out has to
  stay reachable."* Tapping the field again closes it today and still would, but the panel
  floats over the figures, so a reader who has scrolled down would have to scroll back up.
  **ANSWERED — BINDING: "Tap outside, or the field."** Both ways out: the field keeps its
  toggle, AND a press anywhere else on the screen dismisses the panel. That is the pattern
  `AnchoredPanel` and `Sheet` already use, and the one ADR-034 deliberately KEPT for pickers
  when it removed backdrop dismissal from dialogs. The requester was shown, and rejected,
  both "field only" (leaves a scrolled reader stranded) and "close on every tick" (silently
  turns Course and Branch into single-choice filters).
  The dismissal layer is **invisible** — no dim, no blur: these panels exist precisely so the
  figures they narrow stay on screen (CP-012 / the in-place-dropdown decision).

## DESIGN SURFACE
- VISUAL?: yes
- SCREENS & STATES TOUCHED: Overview (Course and Branch panels), Attendance (Period panel),
  Reports (Period panel) — the open-panel state only. Loading, error, empty, offline and
  permission-denied are unaffected: the panels only exist while open, and Overview's and
  Reports' filter rows already render above their loading/error branches.
- STRINGS ADDED OR ALTERED: **removed** — "Done" (Overview Course and Branch panels), and
  "Use this range" / "Pick both days" (the custom-range panel on three screens). No string is
  added. Everything else on these screens is frozen.
- PERMISSIONS: no — a filter narrows what a person can already see; who may see it is unchanged.
- USAGE: the Overview filters are the first thing touched on the app's landing screen, and the
  period filter is on three of the six tabs — this is the most-used control in the app, which
  is why an extra tap on it was worth reporting.
- RUN MODE: auto
- SCALE: `<left blank — the track decides at B0>`

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
