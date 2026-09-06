# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: every date selection in the app — the `DateField` picker
  (Holiday → Start date / End date, Member → Joined on, Course → These days apply
  from) and the custom-range calendar inside the period filter (Overview,
  Attendance). Named by the requester as "wherever date selection is present".
- CURRENT BEHAVIOUR: the month grid is drawn at full panel width with square
  cells, so it is oversized on desktop and, inside the period dropdown, taller
  than the space it is given — image one shows "Pick the first day" with the
  weekday row and one row of empty cells filling the screen and the rest of the
  month cut off. The requester's word for it: unusable.
- DESIRED BEHAVIOUR: one compact calendar, matching image two — a small panel
  anchored under the field (not a full-width sheet), a month-and-year header with
  previous / next controls, a weekday row, a tight day grid sized to its digits
  rather than stretched to the container, and Clear / Today actions along the
  bottom. Readable and tappable on desktop and on mobile. The SAME picker at
  every date selection in the app.
- WHY: the picker as it stands is oversized and gets cut off, so a date cannot be
  chosen; and the app currently reads as more than one calendar.
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR.
- CORRECTION ROUND: 1 — no earlier request or commit for this surface.

### Not covered by the description (Track B must ask, not assume)
- WEEK START: `unknown` — image two starts the week on Sunday; today's grid starts
  on Monday, on the stated grounds that every week in this app runs Mon–Sun.
  The two cannot both hold.
- LIGHT PANEL: `unknown` — image two is a light calendar shown against another
  product's screen; whether the requester means the layout only, or also that
  palette, is not stated. (Guardrails 2 and 3 bind either way.)
- MONTH / YEAR JUMP: `unknown` — image two's header carries a month-year dropdown
  and up/down arrows; whether that jump is wanted, or only the compact size, is
  not stated.
- TIME PICKER: `unknown` — the request names dates. `TimeField` (Course start /
  end time) shares the same sheet host and is not mentioned either way.
- WHERE IT WAS SEEN: image one is stated to be the current picker; the requester
  did not say whether the period filter is the only place they saw it cut off.

## DESIGN SURFACE
- VISUAL?: yes
- SCREENS & STATES TOUCHED: Holiday (add/edit), Member → edit, Course → edit,
  Overview period filter, Attendance period filter. States: nothing-chosen (a
  real state, distinct from today), one day chosen, half-picked range, finished
  range, day outside min/max (shown, unpressable). Empty · loading · error ·
  offline · permission-denied are not affected — the picker holds no fetched data.
- STRINGS ADDED OR ALTERED: `unknown` — the requester named no words. Image two
  shows "Clear" and "Today", which the picker already says. Everything else on
  these screens is frozen.
- PERMISSIONS: no — who may open a form is unchanged.
- RUN MODE: auto (not stated by the requester; the default applies)

## STANDING INSTRUCTIONS (do not edit)
- Track B is SURGICAL: read the actual current files first (B1), run the impact
  analysis with the sibling call-site sweep (B2) BEFORE proposing, produce the
  plan with regression risks (B4) — confirm mode waits for approval; auto mode
  (default) logs it and applies — touching only what DESIRED BEHAVIOUR requires.
  Every changed line must trace to this request.
- MUST NOT CHANGE seeds the plan's "deliberately NOT changing" list; the plan may
  add to it, never subtract.
- If VISUAL?=yes, the plan carries the correction design pass (B4), scoped to the
  touched area: states, both themes in semantic tokens, the string table, the
  permission answer.
- CORRECTION ROUND ≥ 2: before proposing anything, read the previous attempt and
  state what it missed and why (B1). If the miss was the process's fault, flag
  `/framework-update` too.
- Close out with `checklists/DEFINITION_OF_DONE.md`, then the test gate. Nothing
  merges without a PASS.
