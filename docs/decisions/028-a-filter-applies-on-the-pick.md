# ADR-035 — A filter applies on the pick; the panel leaves by the press beside it

**Status:** Accepted
**Date:** 07-Sep-2026 · **Deciders:** requester, this run
**Request:** `requests/2026-09-07-dropdowns-apply-on-pick-no-done.md`

## Context

The app had three kinds of dropdown and only one of them was honest about
when it had taken the answer.

**Single-choice** (`DropdownList` — Attendance's Branch, Course and Status,
and every field picker) applied the choice and closed the panel in the tap
that made it. Nothing to confirm, nothing asked.

**Multi-choice** (`DropdownCheckList` — Overview's Course and Branch) applied
the tick immediately too: `onToggle` ran `setCourses` / `setBranches`, and the
ring, the bars and the counts moved underneath the open panel as each box was
ticked. But the panel pinned a **"Done"** button under the list, and that
button applied nothing whatsoever. It called `setOpen(null)`. It closed the
panel and did not touch the filter.

**The date filter** (`PeriodPanel`) split the difference. The four named
ranges applied and closed on the tap. The custom range applied the moment the
second day was picked — and then waited on a second button, disabled and
reading "Pick both days" until both were, then "Use this range" afterwards,
which also only closed the panel.

So two of the three kinds ended in a button that asked for a decision already
made. The requester read it exactly that way: *"Across application in dropdown
dont ask user to click on done user select checkbox and then filter applied
apply for all dropdowns from filter to branches and date filters."*

A confirming control that confirms nothing is worse than a redundant tap. It
says the change has NOT happened yet. Someone who ticks Coimbatore, watches
the numbers move, and then sees a Done button has been given two contradictory
accounts of the same moment, and the button is the louder one — so the honest
reading of that screen is that the figures now on it are provisional. They
never were.

## The thing that made this not a deletion

`DropdownDone` carried a comment that was right, and it is the whole
difficulty of the request:

> Pinned under the scroller, never inside it. A multi-select panel does not
> close on a tick, so its way out has to stay reachable however far down a
> long list somebody has scrolled.

A checkbox list **must not** close on a tick — a second branch could never be
added to the first, and the checkbox glyph would be lying about what the
control does (guardrail 3 is about exactly that kind of lie). So the button
was doing a real job after all. Not applying the filter: **being the way
out.** Delete it alone and a reader who has ticked two branches and scrolled
down to read the numbers has nothing left to press, because the field that
toggles the panel is back up at the top of the screen.

## Options considered

### Option A — Delete the buttons and add a press beside the panel (chosen)
The tick and the completing date-tap are the whole interaction. The panel is
left by pressing the field again (unchanged) **or** by pressing anywhere
beside it, through a new `dismiss` prop on `DropdownRow`.
· **Pros:** answers the request everywhere it applies; keeps multi-choice
multi-choice; the way out is the one every dropdown on the web already has,
and the one `Sheet` and `AnchoredPanel` already use here.
· **Cons:** the first press anywhere in the screen's content after opening a
filter goes to closing it rather than to what it landed on.
· **Chosen because** that is what a dropdown scrim is, everywhere, and the
alternative to a layer is a reader who has to scroll to escape a panel.

### Option B — Delete the buttons and leave the field as the only way out
· **Pros:** the smallest possible diff; no new layer, no platform branch.
· **Rejected:** it trades a redundant tap for a scroll. The panel is
`position: absolute` over the figures, so on a long branch list the field is
off-screen exactly when the panel most needs closing. Put to the requester
with that consequence stated, and not chosen.

### Option C — Close the panel on every tick
· **Pros:** the most literal reading of "select checkbox and then filter
applied"; no layer at all.
· **Rejected by the requester, having been shown what it costs:** Overview's
Course and Branch silently stop being able to hold two values. It is a
capability removal wearing a simplification's clothes, and the checkbox
glyphs would have stayed.

### Option D — Make the Done button actually apply (a draft-and-commit filter)
· **Rejected:** it is the opposite of the request, and it introduces the
drift guardrail 1 and C-84 exist to stop — a screen showing figures for one
selection while a panel holds another.

## Decision

1. `DropdownDone` is **gone from the library**, not merely unmounted, and
   `DropdownPanel`'s `footer` slot with it — an empty shelf is how a button
   comes back.
2. `PeriodPanel`'s custom range **applies and closes on the day that
   completes it**, exactly as a named range does. "Clear" stays; the
   confirming button beside it does not. A half-picked range still applies
   nothing (C-84), and that guard is now the only thing between a stray tap
   and a one-day period, so it is asserted rather than assumed.
3. `DropdownRow` takes an optional `dismiss` — `{ onPress, testID }` — and
   renders a press layer over the screen's content while a panel is open. It
   is wired on the three filter screens: Overview, Attendance and Reports.

The layer is **untinted**, and that is not an omission. These panels exist
precisely so the figures they narrow stay on screen — that is why the filters
stopped being bottom sheets. A scrim would dim the very counts the filter is
being chosen against, which is the same reason CP-014 exempts a picker hung
under a form field from tinting the form.

It is `position: fixed` on the web and a negatively-inset `absolute` on
native, because the two platforms need opposite tools to reach beyond the row
from inside a scroller: on the web an absolute child stretched out that far
still counts towards the scroller's content, so every open filter would have
handed the screen a scrollbar of empty space; on native there is no `fixed`,
and an absolute child does not contribute to content size.

## Consequences

- The Overview filters lose a tap each; the custom range loses a tap on three
  screens. Nothing about **what** any filter applies changed — this record is
  about a confirmation, not a result.
- Three strings leave the app: "Done", "Use this range", "Pick both days".
  None is added.
- This is consistent with, not contrary to, ADR-034. That record removed
  backdrop dismissal from **dialogs** and deliberately kept it for
  **pickers**, on the grounds that a picker holds nothing typed to lose and
  its backdrop is its way out. A filter dropdown is a picker. It is now the
  third layer holding that half of CP-014, and `dropdownAppliesOnPick.test.ts`
  holds it the way `dialogDismiss.test.ts` holds the other two.
- The layer's reach was **measured in the exported page, not assumed**: 420x603
  at y=178 in a 420x780 window. It covers the screen's content area rather
  than the whole window, because react-navigation's screen container carries a
  transform and so becomes the containing block for a fixed child. The
  persistent header's controls (`shell-settings` and its neighbours) and the
  tab bar sit above it and stay reachable — checked with `elementFromPoint`,
  both themes. So the cost is confined to presses inside the screen's own
  content, which is exactly where the panel floats.
- The layer is a tab stop, `role="button"` with the label "Close the open
  filter" — the same shape `Sheet` and `AnchoredPanel` already ship, and what
  CP-014 asks of a layer beside a picker. It is invisible, so a sighted
  keyboard user meets one focus stop with nothing drawn on it; that is
  pre-existing behaviour for all three layers rather than something this
  change introduced, and the panel's own way out for a keyboard is unchanged
  (Shift+Tab to the field, Enter). Worth a dedicated pass across all three, as
  one question, rather than a fourth answer here.
- Native gets the negatively-inset layer untested — the shipped product is the
  web export (`expo export --platform web`), and there is no native build in
  the pipeline. Recorded as a known limit, not a claim.
