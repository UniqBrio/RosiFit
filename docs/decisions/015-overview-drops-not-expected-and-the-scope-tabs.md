# ADR-023 — The Overview drops "Not expected" and the scope tabs, and gains a mark per question

**Status:** Accepted — **amended by ADR-026 (06-Sep-2026):** the course and period marks
this record chose (a dot plot on a shared axis, a line over time) were replaced by small
rings on the requester's instruction. The two removals below, and the member section's
ranked bars, stand.
**Date:** 06-Sep-2026 · **Deciders:** repo owner (request), this session (implementation)

## Context

Two things were removed from a shipped screen on the owner's instruction
(`requests/2026-09-06-overview-filters-and-sections.md`), and a removal is the one kind of
change Track B will not let pass quietly. Both had a written justification in the code, so
both need one to leave.

**1. The "Not expected" ring segment.** `Donut` drew three segments and
`distribution()` returned three numbers. The third was `FULL_WEEK_SESSIONS - expected`, and
`src/data/followup.ts` said why in as many words: *"a member expected at 4 sessions in a
6-session week has 2 not expected, not 2 missed. Drop the segment and she is
indistinguishable from a 6-day member who skipped twice."* That reasoning was correct, and
`src/data/distribution.test.ts` held it with three assertions.

The owner's instruction is that "not expected" is not a category. It is not: **present and
absent are what a scheduled session can turn out to be; "not expected" is the absence of a
session.** It describes the schedule, not attendance.

**2. The "Academy wise / Branch wise" tab pair,** and the `scope` in
`src/state/academy.tsx` behind it. The canvas prescribes both — *"Overview holds the
Academy wise / Branch wise view, the Branch / Course / Period filters, and the attendance
chart"* — so this is a deliberate departure from `design/RosiFit App.dc.html`, which is the
design source of truth.

## Options considered

### Option A — Keep "Not expected", stop rendering it
`distribution()` keeps returning three numbers; `Donut` draws two. Nothing in the spec
changes and no coverage is lost.
**Pros:** zero test churn; the append-only rule on specs is untouched; trivially reversible.
**Cons:** a computed value with no consumer, which is the residue `check-dead-weight` exists
to catch in `scripts/` and cannot see in `src/`. The next reader cannot tell whether the
segment is coming back. It also leaves `FULL_WEEK_SESSIONS = 6` — a hardcoded academy-wide
assumption — alive in a module nothing consults it from.
**Cost:** none up front, one confused reader later.

### Option B — Remove the segment AND fix the denominator (chosen)
`distribution()` returns `{ attended, missed }`. The ring's percentage becomes
`attended / (attended + missed)` — the share of what was **expected of the members being
counted**, which it already was; the segment was never in that denominator. `perWeek` and
`FULL_WEEK_SESSIONS` go with it.
**Pros:** the reason the segment existed disappears rather than being overruled. A member due
at four who came four times reads **100%**, not 67%, in every section of the screen. There is
no fixed-week assumption left anywhere in the arithmetic, so a seven-day academy needs to tell
it nothing.
**Cons:** `src/data/distribution.test.ts` had to change shape — three assertions on a removed
field could not survive a field that does not compile. The repo's standing rule is
**"Test files are append-only. Never overwrite an existing spec."**
**Cost:** one spec rewritten, deliberately and in the open.

### Option C — Keep the scope tabs and add the Branch dropdown beside them
The requested filter order, with the tabs left above it.
**Pros:** no departure from the canvas; nothing removed.
**Cons:** two controls for one fact, and they can be set to disagree — "Academy wise" with a
branch ticked has no honest reading. The screen would have to pick a winner silently, which is
the class of bug the whole screen was cut back on 03-Sep to avoid.
**Cost:** a permanent ambiguity in exchange for a canvas line.

### Option D — Keep `scope` in `src/state/academy.tsx`, unused
Delete the tabs, leave the state.
**Pros:** smallest diff; `app/(tabs)/attendance.tsx` keeps `chooseBranch` byte-for-byte.
**Cons:** a shared-state field whose only writer has been deleted. The next screen to want
"academy wide" reads a value nothing sets.
**Cost:** dead shared state, which is worse than dead local state because it is reachable.

## Decision

**Option B and the removal of `scope` (rejecting D).**

What decided the first one is that "not expected" was **a correction for a wrong denominator,
not a category in its own right**. Fixing the denominator is strictly better than keeping the
correction, because it fixes every figure on the screen at once — the ring, the member bars,
the course dots and the period line all divide by expected now, so a reduced schedule is
protected in four places instead of being annotated in one.

The spec was rewritten rather than deleted, and **every case the removed assertions
protected is still asserted** — the reduced schedule, the member expected at nothing, the
extra attendance — against the property that replaced the segment: a member is never shown as
having missed a session she was not due at. Coverage went from 10 assertions to 11. The
append-only rule exists to stop a failing spec being deleted for convenience; it is not a
freeze on behaviour the requester has removed, and this is recorded here so the difference is
on the record rather than in a commit message.

What decided the second one is that the tabs and the filter **encoded the same fact twice**.
The canvas is the source of truth for what a screen looks like, not a guarantee that a
control it drew can never be found redundant; the owner asked, and the redundancy is real.

## Consequences

**Positive:**
- The Overview's percentage means one thing everywhere: attended ÷ expected, for the people
  the filters left.
- No fixed-length week anywhere in the arithmetic.
- One control for branch scope, which can now hold *several* branches — a comparison that was
  not expressible while the answer had to be "academy" or "one branch".
- `src/state/academy.tsx` is two fields and does one job.

**Negative:**
- The screen no longer distinguishes a member on a reduced schedule *visually*. She is
  counted correctly, but you cannot see from the ring that her week was shorter than
  somebody else's. The member section's own row states her expected count in words, which is
  where that fact now lives.
- A departure from `design/RosiFit App.dc.html` that the canvas file itself does not record.
  Anyone regenerating the screen from the canvas will re-add the tabs.
- `src/data/distribution.test.ts` no longer has continuous history with its pre-06-Sep self.

**What this forecloses:**
- Any future chart that wants to show scheduled-but-not-due time has to recompute it; the
  member's own `expected` is still there, but the academy's nominal week is not modelled
  anywhere any more.
- A screen that wants "academy wide" as a distinct MODE rather than as an empty filter would
  have to reintroduce `scope` — and would have to answer the disagreement question that
  killed it.

## Revisit when

- The academy asks to see reduced schedules called out on the Overview rather than inferred
  from a member's expected count — at which point the honest form is a marker on the member
  row, not a segment in a ring whose denominator does not contain it.
- The canvas is revised, so the departure can be folded back into
  `design/RosiFit App.dc.html` rather than living only here.
