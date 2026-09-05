# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: Every form dialog in the app. Named by the requester through a screenshot of
  "Welcome a new member" (`app/member/edit.tsx` via `src/components/FormDialog`), and then
  generalised in their own words: "same goes for all forms".
- CURRENT BEHAVIOUR: The dialog is drawn over a scrim, but the screen it was opened from is
  NOT visible behind it — the backdrop is a flat near-black field (`DARK.bg` `#08040A`), so the
  form reads as a page you travelled to rather than a decision taken over where you were.
- DESIRED BEHAVIOUR: Requester's exact words, first ask — "The dialog should open top of screen
  from where that button is clicked or form is opened. same goes for all forms."
  Clarified by the requester at Track B's first gate, and this clarification is what binds:
  "I mean on click of button when form open it should be same dialog as shown now but the
  background from where dialog is opened should be shows as blurred screen as dialog is opens".
  So: the dialog's own size, shape and placement stay EXACTLY as they are today. What changes is
  the backdrop — the screen the dialog was opened from must be visible behind it, blurred.
  Applies to all six form dialogs.
- WHY: `unknown` — not stated as a problem statement. Implied by the clarification: the flat
  black backdrop loses the sense of where the form was opened from.
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. Not stated by the requester;
  in particular: the dialog's placement, width, height, chrome, close behaviour, scrolling body,
  pinned footer and copy — all stated unchanged ("same dialog as shown now") — and the bottom
  sheets, pickers and confirmation dialogs, which the requester scoped OUT at the first gate
  ("The six form dialogs only").
- CORRECTION ROUND: 1

## DESIGN SURFACE
<!-- Filled whenever anything the user sees changes. "not visual" is a claim the diff will be checked against. -->
- VISUAL?: yes — what is rendered behind the dialog is the whole of the ask.
- SCREENS & STATES TOUCHED: every route that renders a form dialog — member/edit,
  course/edit, offering/edit, staff/add, holiday, change-mobile — in their default state.
  Confirmation dialogs (`ConfirmDialog`) and bottom sheets (`Sheet`, `SearchPicker`) are OUT
  of scope — the requester chose "the six form dialogs only" at the first gate.
  Empty · loading · error · offline · permission-denied: unaffected by a change of backdrop.
- STRINGS ADDED OR ALTERED: none — no copy changes were asked for; everything on screen is frozen.
- PERMISSIONS: no.

## STANDING INSTRUCTIONS (do not edit)
- Track B is SURGICAL: read the actual current files first (B1), run the impact analysis with
  the sibling call-site sweep (B2) BEFORE proposing, present the plan with regression risks
  (B4), wait for approval, then apply — touching only what DESIRED BEHAVIOUR requires. Every
  changed line must trace to this request.
- MUST NOT CHANGE seeds the plan's "deliberately NOT changing" list; the plan may add to it,
  never subtract.
- If VISUAL?=yes, the plan carries the correction design pass (B4), scoped to the touched
  area: states, both themes in semantic tokens, the string table, the permission answer.
- CORRECTION ROUND ≥ 2: before proposing anything, read the previous attempt and state what it
  missed and why (B1). If the miss was the process's fault, flag `/framework-update` too.
- Close out with `checklists/DEFINITION_OF_DONE.md`, then the test gate. Nothing merges
  without a PASS.
