# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: every date selection in RosiFit. Scoped by the requester's own
  answer at intake — "Calendar style, all RosiFit date fields". That is the
  `DateField` picker (Holiday → Start date / End date, Member → Joined on,
  Offering → These days apply from) and the `MonthCalendar` inside the period
  filter (Overview, Attendance).
- CURRENT BEHAVIOUR: the picker is mid-change and the change is NOT committed —
  `src/components/DateTimePicker.tsx` is modified in the working tree and
  `src/components/datePanel.ts` / `datePanel.test.ts` are untracked, all written
  minutes before this request. As it stands in that working tree: tapping a date
  row opens a compact calendar panel anchored under the field, over a fully
  transparent full-screen scrim, so the form behind it stays visible and undimmed;
  the header is chevron-left / month-and-year jump / chevron-right; the week grid
  starts on Monday; Clear and Today sit along the bottom.
  What the requester actually had on screen when they wrote this is `unknown` —
  they attached a reference image, not a picture of the current app.
- DESIRED BEHAVIOUR: requester's exact words — "the date selection and form
  visibility shoudl be same as shown in the attached reference image."
  Clarified at intake, and this clarification is what binds: the image is a
  reference for the CALENDAR STYLE, to be applied to ALL RosiFit date fields.
  The image is a screenshot of a DIFFERENT product (a "Create Course" dialog with
  Course Fee / Staff / Start Date / End Time and Payments · Manage · Courses ·
  To-Dos · Enquiries tabs); none of those fields or tabs exist in RosiFit, and
  nothing in the image is a request to add them.
  What the image shows, recorded as observation and not as instruction: a light
  calendar panel hanging directly under the date field inside a dark dialog; a
  "September, 2026 ▾" month-and-year control with an up arrow and a down arrow to
  its right; a Su-first weekday row; adjacent-month days shown greyed; the chosen
  day filled; Clear bottom-left and Today bottom-right; and the panel overlapping
  the form beneath it, with the dialog title, the fields above, and the Add Course
  footer all still visible around it.
- WHY: `unknown` — the requester stated a target, not a problem.
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. Not stated by the
  requester.
- CORRECTION ROUND: 2 — previous attempt
  [requests/2026-09-06-compact-date-picker-everywhere.md](./2026-09-06-compact-date-picker-everywhere.md)
  (same surface, same reference image, filed 06-Sep-2026 06:34). That attempt is
  UNCOMMITTED and appears to be in flight in a concurrent session sharing this
  worktree. Track B must read it and state what it missed before proposing
  anything — and must establish whether it is finished before touching the same
  files.

### Not covered by the description (Track B must ask, not assume)
- WHAT "FORM VISIBILITY" MEANS: **ANSWERED by the code, not by a question.** The
  image shows the calendar overlapping a form that stays visible around it. In this
  app the form did NOT stay visible: `FormDialog` capped its card at 90% of a
  viewport that `useWindowDimensions()` reports as `0` for as long as any `Modal` is
  mounted over it — which is every picker in every form — so with `overflow: hidden`
  the card collapsed to a 2px sliver and the form was clipped away entirely. That is
  TD-021, measured at 1280×900 on the built app (card 811px → 2px on opening the
  start-date picker) and explicitly left unfixed by round 1 as "a request of its
  own". This is that request, and its stated remedy is what was applied.
- WEEK START: **ANSWERED at Track B's first gate — Monday stays.** The image starts
  the week on Sunday; the grid starts on Monday. Put to the requester with the
  trade-off (the same grid picks a custom RANGE beside This week / Last week chips,
  and a Sunday-first grid invites a Sun–Sat span that is not the app's week), they
  chose to keep Monday. This is now BINDING and overrides "same as the image" on
  this one point.
- MONTH STEP CONTROL: `unknown` — the image pairs the month-year dropdown with an
  up arrow and a down arrow at the right; today's header flanks it with a left and
  a right chevron.
- PANEL PALETTE: `unknown` — the image's calendar is light against a dark screen;
  whether that is the layout only or also the palette is not stated. (Guardrails 2
  and 3 bind either way.)
- THE FIELD ITSELF: `unknown` — the image's date field is a typed `05-09-2026`
  with a native calendar button; RosiFit's is a read-only picker row reading
  "5 Sep 2026". The ask names the calendar, not the field.
- TIME PICKER: `unknown` — the image carries an End Time field with a clock
  button; the ask names date selection. `TimeField` is not mentioned either way.
- WHICH SCREEN THEY SAW: `unknown` — the requester did not say which RosiFit date
  field prompted this.

## DESIGN SURFACE
<!-- Filled whenever anything the user sees changes. "not visual" is a claim the diff will be checked against. -->
- VISUAL?: yes — the appearance of the calendar is the whole of the ask.
- SCREENS & STATES TOUCHED: Holiday (add/edit), Member → edit, Offering → edit,
  Overview period filter, Attendance period filter. States: nothing-chosen (a real
  state, distinct from today), one day chosen, half-picked range, finished range,
  day outside min/max (shown, unpressable), and the panel with no anchor measured
  yet. Empty · loading · error · offline · permission-denied are not affected — the
  picker holds no fetched data.
- STRINGS ADDED OR ALTERED: `unknown` — the requester named no words. The image
  shows "Clear" and "Today", which the picker already says. Everything else on
  these screens is frozen.
- PERMISSIONS: no — who may open a form or a filter is unchanged.
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
