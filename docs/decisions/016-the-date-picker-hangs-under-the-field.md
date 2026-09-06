# ADR-024 — The calendar sizes itself and hangs under the field, in every place a date is chosen

**Status:** Accepted
**Date:** 06-Sep-2026 · **Deciders:** requester (screenshots), this run

## Context

Every date in this app is chosen from one grid — `MonthCalendar` in
`src/components/DateTimePicker.tsx` — hosted in two places: a bottom sheet
for the four date FIELDS (holiday start and end, a member's joining date, the
date a course's days apply from), and the Overview / Attendance period
filter's dropdown for a custom RANGE.

The grid took whatever width its host gave it and drew SQUARE cells: each day
was `100/7`% wide with `aspectRatio: 1`. On a phone that is a 45px square and
looks deliberate. In a filter dropdown as wide as a desktop window it is a
260px tile, six rows of which are 1,560px inside a panel capped at 430 — the
requester's screenshot shows the weekday row, one row of empty cells, and
nothing else. The same arithmetic made the bottom sheet a full-window band on
a desktop for a control that needs 336px.

The requester sent a second screenshot — another product's date field, a
small calendar panel hanging under it, month-and-year header, weekday row,
tight grid, Clear and Today along the bottom — and asked for that, desktop
and mobile, everywhere a date is chosen.

## Options considered

### Option A — Cap the cell, keep the bottom sheet
Give the grid a fixed cell height and a maximum width, centred; leave both
hosts alone.
· **Pros:** the smallest possible diff; fixes the cut-off grid outright;
touches no host.
· **Cons:** on a desktop the sheet is still a full-width band sliding up from
the bottom of the window with a 336px calendar centred in it, and it still
covers the form the date is being entered into. It answers the size half of
the request and none of the placement half.
· **Cost:** ~10 lines.

### Option B — Cap the cell AND anchor the panel under the field (chosen)
As A, plus: the field measures itself when pressed and the calendar is drawn
in a `Modal` positioned under it, pulled back inside the window at the edges
and flipped above the field when there is no room below.
· **Pros:** what the requester's screenshot actually shows; the form stays
readable behind it; one calendar in both hosts, since the period filter's
panel is already anchored under its own field.
· **Cons:** a second modal host beside `Sheet.tsx` (CP-014 amended, not
forked); placement arithmetic that can be wrong on a window nobody tried.
· **Cost:** ~90 lines, plus `datePanel.ts` and 8 specs for the arithmetic.

### Option C — An inline panel, expanding the form
Render the calendar in flow, pushing the fields below it down.
· **Pros:** no measuring, no modal, no placement arithmetic at all.
· **Cons:** a form scrolls, and an inline panel taller than the space left
below the field is clipped by the scroller — the failure `Dropdown.tsx`'s
`flow` prop already exists to work around. Worse, holiday's two date fields
sit side by side at half width each: an inline calendar would either be
squashed into 150px or overlap its neighbour.
· **Cost:** ~30 lines, and a clipped calendar on the screen that prompted
the request.

### Option D — The platform's own picker (`<input type="date">`)
The screenshot the requester sent is, in fact, Chrome's native picker.
· **Pros:** free, and familiar.
· **Cons:** it is a web-only control in an app that also builds for native;
it cannot be themed, so it ships a light popup into a dark app and answers to
neither guardrail 2 nor 3; and `min`/`max` aside, none of the app's own state
(a half-picked range) can be expressed in it.
· **Cost:** small, and unrepeatable on the period filter, which dates a range.

## Decision

Option B. The size fix alone (A) would have closed the ticket and left the
requester looking at a bottom sheet on a desktop, which is the half of the
screenshot they were pointing at. The measuring cost is contained: the
arithmetic that decides where the panel lands is a pure function in
`src/components/datePanel.ts` with its own specs, so the part that can be
wrong on an untested window is the part that is tested.

The screenshot was followed for layout, not for palette or week start. The
panel is drawn in this app's own semantic tokens in both themes (guardrail
2), and the week still starts on Monday, because `follow_up_config.
week_start_day = 1` and every week in this product runs Mon–Sun (CP-012). A
Sunday-start grid would have made the picker disagree with the periods it
feeds.

The way out beside the panel carries no tint, which is the one thing it does
not take from the sheet: a date is entered into a form, and a scrim over that
form dims the fields the date is being chosen against — twice over inside a
dialog, which paints a scrim of its own.

**What that does not buy today, stated plainly.** Every date field sits inside
a `FormDialog`, and TD-021 collapses that dialog's card to a 2px sliver
whenever `useWindowDimensions()` re-reads as 0 — which mounting any `Modal`
over it does. So the page behind the open calendar is blank in the built app
right now, tint or no tint. Measured, both ways: the dialog renders at 811px
until the picker opens and at 2px while it is open, and the bottom sheet this
replaces did the same thing, being a `Modal` too. The untinted layer is
therefore a decision that pays out when TD-021 is paid, not a benefit
claimable now — and it costs nothing in the meantime. Where the calendar is
NOT in a modal, which is the Overview and Attendance period filter, the page
behind it is fully visible today.

## Consequences

**Positive:** one calendar, the same size on a phone and on a 27-inch screen;
the grid can no longer outgrow the panel that holds it; the calendar opens
where the field is rather than at the bottom of the window; a month-and-year
list makes a joining date four years back three taps instead of forty-eight.

**Negative:** a second modal host beside `Sheet.tsx` — CP-014 is amended to
cover both rather than forked, and the anchored panel keeps all three of its
rules. `TimeField` still opens the sheet, so a course's form now has a date
that opens a panel and times that open a sheet.

**What this forecloses:** the grid can no longer be made to fill a wide host
by passing it one — anything wanting a large calendar (a month view of
sessions, say) is a different component, not this one with a prop.

## Revisit when

A screen needs a calendar as a page rather than as a control — a month view
of the register, for instance. `MonthCalendar` is a control at a fixed size
now, and that would be the point to decide whether the two share code at all.
