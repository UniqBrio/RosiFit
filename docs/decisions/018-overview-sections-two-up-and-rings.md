# ADR-026 — The Overview's sections sit two to a row, and course and period are rings

**Status:** Accepted
**Date:** 06-Sep-2026 · **Deciders:** requester (instruction and screenshot), this run

## Context

ADR-023 gave the Overview three sections under its ring and argued for a different mark in
each: ranked bars for members (length is a volume), a dot plot on one shared axis for
courses (a course is a rate), a line over the period's sub-ranges (time, where the shape is
the finding). Each was full width, stacked one under the next.

The requester looked at it on a desktop and asked for two things
(`requests/2026-09-06-overview-two-per-row-donuts.md`): *"bring graphs two in one row hence
it will be minimal"* and *"bring donut chart or pie chart based on period and based on
course"*. The screenshot shows why: at ~1900px the member bars alone filled the window, and
the four sections were a long scroll of one chart at a time.

Two things are genuinely in tension here. The dataviz guidance this project builds charts
against says a two-slice pie is a stat tile in disguise and a bar beats a donut for
comparing close values — that is why ADR-023 chose an axis for courses. The requester's
instruction is that the sections should be donuts, and the instruction binds. The decision
is how to honour it without giving up what the axis was for.

## Options considered

### Option A — One pie per section, a slice per course (or per sub-range)
A single donut under "Based on course" whose slices are the courses, sized by attended
sessions.
**Pros:** literally "a pie chart based on course"; one mark per section.
**Cons:** it answers a question nobody asked. A slice is a *share of the whole* — which
course contributed most of the academy's attended sessions — and a big course with poor
attendance draws the biggest slice. The percentage that the bars, the ring and the report
all mean (present ÷ expected, per group) is not readable from it at all. A period pie is
worse: seven days as slices of a whole says nothing about Thursday falling off.
**Cost:** a chart that looks like the others and means something different.

### Option B — A small ring per course and per sub-range, the same mark as the Attendance ring (chosen)
Each course, and each sub-range of the period, drawn exactly as the ring above draws the
whole picture: Present against Absent around the track, the percentage in the hole, the
counts under it, in a wrapping row of small rings.
**Pros:** every ring on the screen means one thing — the attended share of what was expected
of that group — so there is one mark to learn, not three. That is the honest version of
"minimal". The rings are fed the same `ReportRow` the bars and the report read, so guardrail
1 holds by construction: nothing here computes a total. A group that expected nothing is a
dash on an empty track, exactly as before. It is a *meter* in the dataviz sense (a ratio
against a limit, same-ramp track), which is the form that guidance recommends over a
two-slice pie — the ring is that meter drawn round.
**Cons:** the shared axis is gone, so "is Postnatal keeping up with Prenatal" is read by
comparing two numbers rather than two positions — a small loss, since the number is large
and in the hole. The period's *shape* is gone: seven rings in a row do not show a slope the
way a line did. The trend's reference line (the whole period's figure) had no home on a ring
and was dropped with it.
**Cost:** one new component, two removed. `AttendanceDots` and `AttendanceTrend` leave the
tree rather than staying as unimported files (definition of done: dead weight deleted).

### Option C — Keep the dot plot and the line; only change the layout
Two per row, marks as they were.
**Pros:** ADR-023's reasoning stands untouched.
**Cons:** it is half the instruction. The requester named the marks, not just the layout.
**Cost:** the next correction round.

### The layout — one grid, two to a row from a named width
Not an option so much as a constraint: a phone cannot hold two charts side by side. The four
cards share one container that measures itself; from `TWO_UP_MIN` (a 768px window less the
screen's padding — the breakpoint the Attendance tab already uses) it is a wrapping row,
below that a column. Measured on the grid rather than the window so the first render is the
column on both server and browser and React does not remount over a mismatch — the same
rule `app/(tabs)/courses.tsx` states. The requester's screenshot, at ~1900px, gets two per
row; a phone gets the stack it had.

## Decision

Option B, with the grid. The requester asked for donuts and for two per row; the way to give
them both without a chart that misleads is a ring that means what every other ring on the
screen means, and a grid that stacks where it must.

ADR-023 is **amended, not superseded**: the two removals it records (the "Not expected"
segment, the scope tabs) stand, and the member section's ranked bars stand. Only the row of
its table that assigned the course and period marks is replaced by this record.

## Consequences

**Positive:** the Overview reads in one screen on a desktop; one mark, one meaning, four
times over; the course and period sections carry their numbers in text ink and their status
in words and glyphs, as the ring always did (guardrail 3); the specs that held the
arithmetic (`report.test.ts`, `buckets.test.ts`, `periodBuckets.test.ts`) are untouched
because the arithmetic is untouched.

**Negative:** the period section no longer shows a slope. If "how did the week move" turns
out to be the question the admin actually asks of this section, a line answered it better,
and `git log` has it (`src/components/AttendanceTrend.tsx`, removed at this ADR).

**What this forecloses:** a chart on the Overview whose colour means anything other than
Present / Absent status. A course-identity palette (one hue per course) would make the rings
and the bars disagree about what green means.

## Revisit when

The requester asks how attendance *moved* across a period and the rings cannot say — that is
the line coming back, as a fifth mark or in place of the period rings. Or a course count
that no longer fits as a row of rings (past six or so the wrap becomes a grid of its own and
the report's list is the better home).
