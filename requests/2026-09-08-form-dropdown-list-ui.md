# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: The open option list of every dropdown that sits **inside a form or a
  dialog** — named by the requester as "add edit forms of course member and other form
  within which drop down is present". Explicitly NOT the list-screen filter dropdowns.
- CURRENT BEHAVIOUR: An open dropdown draws its options as separate bordered cards with a gap
  between them — each row has its own 1px border and rounded corners, a leading radio glyph
  (`radio_button_checked` / `radio_button_unchecked`), and right-hand text that reads
  "Selected" on the chosen row and the option's meta on the others. Two components draw this:
  `DropdownItem`/`DropdownList` (src/components/Dropdown.tsx) and `PickerChoice` behind
  `AnchoredPicker` (src/components/Sheet.tsx).
- DESIRED BEHAVIOUR: Apply the dropdown UI in the attached image, inside forms and dialogs
  only. From the image: the options are **flat full-width rows** filling the panel edge to
  edge, with no per-row border or card, separated by **thin hairline rules**; the **selected
  row is tinted with the accent**, its label is drawn in the **accent colour and bold**, and it
  carries a **check mark at the right end of the row**; unselected rows are untinted with a
  plain label and no leading glyph. The panel keeps hanging directly under its field.
- WHY: unknown — the requester supplied the image as the target and gave no reason.
- MUST NOT CHANGE: the list-screen filter dropdowns (Members, Courses, Attendance, Reports,
  Audit and the course roster's branch filter) and `PeriodFilter`, which the requester scoped
  out by saying "only inside forms and dialogs"; and everything not named in DESIRED
  BEHAVIOUR — which choice a row commits, the apply-on-pick behaviour, the picker search box,
  the "Add …" row, the empty note, panel placement and dismissal.
- CORRECTION ROUND: 1

## DESIGN SURFACE
<!-- Filled whenever anything the user sees changes. "not visual" is a claim the diff will be checked against. -->
- VISUAL?: yes
- SCREENS & STATES TOUCHED: the OPEN state of the in-form/in-dialog dropdowns only —
  Course add/edit (Branch, From email ID, Message template), Offering add/edit (Branch),
  Member add/edit (Course, Branch), Add staff (Role, Recovery question), Register (its
  picker). Empty / loading / error / offline / permission-denied states are untouched.
- STRINGS ADDED OR ALTERED: unknown — the image shows no per-row wording, so whether the word
  "Selected" and the per-row meta text ("3 courses", "verified", the template preview line)
  survive the flat row is a question for the track. Guardrail 3 (colour is never the only
  signal) applies to whatever is decided.
- PERMISSIONS: no
- USAGE: unknown
- RUN MODE: auto
- SCALE: scoped

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

## THE ATTACHED IMAGE (what it shows, recorded because the file cannot hold it)
A dark-theme "Create Course" dialog. Its "Payment Type" field is open: the closed field shows
`Monthly` with a caret-up on the right; below it a bordered, rounded panel lists four options —
`Monthly`, `EMI`, `Terms + Installments`, `Sessions`. `Monthly` is the selected row: a purple
accent tint across the full row, the label in the accent colour and bold, and a check mark at
the right edge. The other three rows are untinted, their labels plain white, each separated
from the next by a single hairline rule that spans the panel's width. No row has a border, a
card, a radio glyph or right-hand meta text. (The `Payment Type` field itself is not a RosiFit
field — the image is a reference for the dropdown's look, not for the form's contents.)
