# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: the **detail chip rows** in *Add a course / Edit course* —
  `src/components/TokenChips.tsx`, rendered twice in `app/course/edit.tsx` (once under
  Subject, once under Message). Shown in the requester's screenshot of the Add a course
  dialog, dark theme.

- CURRENT BEHAVIOUR (read in the file, 2026-09-07): each row is a horizontal `ScrollView`
  with `showsHorizontalScrollIndicator={false}` holding all thirteen `MESSAGE_TOKENS`
  chips. At the dialog's width five fit — *Her first name, Her full name, Course, Branch,
  Period from* — and the sixth is clipped at the card's edge. Nothing on the screen says
  the row scrolls: no scrollbar, no partial chip on some widths, no arrows. A person who
  does not think to drag a row sideways sees five of the thirteen details and concludes
  those five are all there are.

- DESIRED BEHAVIOUR: requester's exact words — *"Add - Right and left arrow to move and
  see various variable names"*, followed by the list of names that must be reachable:
  Her first name, Her full name, Course, Branch, Period from, Period to, Sessions due,
  Sessions made, Sessions missed, Attendance %, Missed in a row, Last present, Academy.

  Read as: each chip row gains a **left arrow and a right arrow** that move the row, so
  every one of the thirteen names can be brought into view by tapping. The thirteen names
  listed are exactly `MESSAGE_TOKENS` as it already stands, in its existing order — the
  ask is that they can be SEEN, not that any is added, removed or renamed.

- WHY: `unknown` as stated. Evident from the ask: the requester listed all thirteen names
  because the screen shows five, and wanted a way to reach the rest.

- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. `MESSAGE_TOKENS` itself —
  no token added, removed, reworded or reordered; it stays name-for-name the map
  `supabase/functions/send-followups/index.ts` builds. Tapping a chip still inserts its
  token with `insertToken`'s spacing, into the field directly above it. The
  `course-subject-token-*` and `course-body-token-*` testIDs stay. Dragging the row
  sideways still works — the arrows are an addition, not a replacement. Both themes.
  Guardrail 3 binds: each arrow resolves to a real canvas glyph and carries its own
  accessibility label.

- CORRECTION ROUND: 1 on this surface.

## OPEN QUESTIONS — the requester did not settle these; taken at the gate
- **Q1. What happens when every chip already fits?** The ask assumes a row too long for
  the space. **Taken: no arrows at all** on a width where nothing is hidden — two
  permanently dead controls in a form is the hidden-state problem this component exists
  to remove, pointing the other way.
- **Q2. What happens at each end of the row?** **Taken: that arrow goes disabled** —
  dimmed, not pressable, and `accessibilityState.disabled`. An arrow that is tappable and
  does nothing is the same silence the requester is complaining about.
- **Q3. How far does one tap move?** The ask says "move", not by how much. **Taken: a
  page** — the visible width less a small overlap, so a chip that was at the edge is still
  on screen after the move and the reader keeps their place. Never less than half the
  visible width, so a narrow phone still advances.

## DESIGN SURFACE
Visual and interactive → the B4 correction design pass runs, scoped to the two chip rows
in the *Add a course / Edit course* wording card. Both themes; disabled and enabled arrow
states; the no-overflow width where the arrows are absent.
