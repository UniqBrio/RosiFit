# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

The requester's words, verbatim, with a screenshot of the course detail screen (Test Course,
week 7–13 Sep 2026, Fri 11 showing a red ✕ over an *Upload again* button; the Show filter
drawn full-width under the search box):

> "Remove that marking of x on upload again button from date cards not others. Place the filter
> dropdown on right side making more members visible as its occupying more pace"

Two asks, both on `app/course/[id].tsx`, both visual, neither touching data.

## FIELDS

- FEATURE / SCREEN: the course detail screen — the week strip's day cards, and the roster
  block's Show filter.

- CURRENT BEHAVIOUR (read in the file, 12-Sep-2026):
  1. **The day card.** An uploaded day draws its status icon in the cell (`tone.icon`: ✓ for
     `present`, ✕ for `absent`), and since 08-Sep-2026 also offers *Upload again* under it
     (`second`, `course-day-add-<iso>`). An all-absent day therefore shows a red ✕ AND *Upload
     again*, one above the other — which is what the screenshot shows on Fri 11.
  2. **The Show filter.** `DropdownRow` at `width: '100%', maxWidth: FILTER_WIDTH` (340pt),
     stacked UNDER the search box, on a decision recorded in the render comment: *"at 360pt a
     field and a search box on one row leave neither enough to read"*. On a wide screen it costs
     a full row of height above the roster.

- DESIRED BEHAVIOUR:
  1. **No ✕ on a card that carries *Upload again*.** Requester: *"Remove that marking of x on
     upload again button from date cards not others."* Read as: the absent cross comes off the
     DAY CARD when the card offers *Upload again*; it stays everywhere else — the legend, the
     member cards' Absent chips, the Attendance tab. The tick on a present day is not named and
     is not touched.
  2. **The Show filter on the right.** Requester: *"Place the filter dropdown on right side
     making more members visible as its occupying more space."* Read as: beside the search box,
     right-aligned, on the SAME row — so the row it occupied is given back to the roster.

- WHY: stated for (2) — more members visible above the fold. For (1): `unknown`; the evident
  reading is that a red ✕ beside a button inviting another file reads as a verdict on the day
  when the day is still open.

- MUST NOT CHANGE: everything not named. Named because the asks sit on their edges: the
  status WORD stays in the card's accessibility label (guardrail 3 — the screen reader still
  hears "Fri 11 Sep, Absent"); the legend keeps its ✕; the ✓ on a present day stays; the
  *Upload again* and *Awaiting upload* presses, their testIDs and their routes; the Show
  filter's options, counts, multi-select, pop-over behaviour and dismiss layer (ADR-035); the
  PHONE layout — under 768pt the field stays under the search box, on the recorded 360pt
  reason, which this request does not reopen; every string on the screen.

- CORRECTION ROUND: 1 for both. Prior rounds on these surfaces:
  `2026-09-08-…` (Upload again on the day, `multipleFilesSameDay.test.ts`) and the Show filter's
  own request (ADR-035). Nothing here reverses either.

## DESIGN SURFACE
- VISUAL?: yes — two layout changes on one screen, both themes.
- SCREENS & STATES TOUCHED: course detail → week strip → an uploaded, all-absent day in the
  current week (the only card that draws ✕ + *Upload again*); course detail → roster block →
  search row, wide (≥768pt) and compact (<768pt), filter open and closed.
- STRINGS ADDED OR ALTERED: none.
- PERMISSIONS: no.
- RUN MODE: `auto`.

## ANSWERS TAKEN AT INTAKE
None asked. Two readings recorded above (the ✓ stays; phones keep the stacked layout) and
taken as the surgical reading of each sentence.
