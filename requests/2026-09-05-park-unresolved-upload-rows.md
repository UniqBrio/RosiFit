# NEW FEATURE REQUEST — parking unresolved upload rows and resolving them later
<!-- Written by workflows/request.md (/request) after Track 0 triage of a LIST -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome. -->

Run **Track A** ([workflows/feature.md](../../workflows/feature.md)) with this request.

Triage note: the ask arrived as a list of seven items (2026-09-05). Two were closed as
already shipping (see CLOSED below). The five that survive are **not independently
shippable** — each depends on the parking concept in T2 — so they are one feature here
rather than five request files that could not be built in isolation.

## FIELDS
- FEATURE: A row the attendance upload cannot resolve is **parked** rather than discarded, and
  is resolved afterwards from the **No email** group on the course screen.
- WHY: Requester's words — a row is currently lost if the dialog is closed ("coming to screen by
  miss if they close dialog"), and the only way to resolve an unknown name is during the import.

### MUST-HAVE (requester to trim at Gate 1)
1. **"Later" replaces the discard action** on the match dialog's unresolved rows.
   Requester's words: "replace discard with later and place them under no email section".
2. **Parked rows reach the No email group.** Requester: "place them under no email section",
   and when asked which section: "its already there" / "there is no email member in member
   section there i am adding button".
3. **Closing the match dialog saves the resolved rows.** Requester: "if they close dialog save
   attendance and members with no email bring them under no email section", confirmed at the
   triage gate as "Yes — save the resolved rows on close", and then softened by their own
   follow-up: **"when the hit on close ask for confirmation"**. So: close → confirmation →
   on confirm, attendance for every resolved row is written and the rest are parked.
4. **Two buttons replace "Add email"** in that group. Requester: "there where there is add
   email button replace with two button one is add as new member and add display name to
   existing member".
5. **"Add as new member" opens the member dialog with the name prefilled.** Requester:
   "add member opens add member dialog with prefilled name".
6. **"Add display name to existing member" opens a dropdown of every member; the choice is
   saved as an alias.** Requester: "add as existing opens a dialog with a drop down containg
   all members name on select it is saved as alias name".

### CLOSED AT TRIAGE — already ships, do not rebuild
- **"Update attendance of existing members"** — this is what the import already does. Outcome
  B already states "Her attendance will still be recorded", and `csvCommit` writes present/extra
  for matched and no-email rows.
- **"Dropdown of all members, saved as an alias"** — already ships INSIDE the match dialog:
  `SearchPicker` ("Link to an existing member") lists every member and `link_existing` carries
  `remember_alias: true` (`app/match.tsx`, `src/data/api.ts`). MUST-HAVE 6 is therefore the
  same behaviour relocated to the No email group, not a new mechanism — reuse it.

### ASSUMPTIONS — stated because the requester did not settle them; Gate 1 must confirm
- **A1. The rows are outcome E · Not found, not B · No email.** The requester described "3
  buttons: add to an existing member, add as new member and discard". Outcome B has TWO
  actions (*Add email to existing member*, *Continue without email*) and no discard; outcome E
  has exactly those THREE (*Link to an existing member*, *Add as new member*, *Skip this row*).
  This was put to them and they answered about where the BUTTON goes, not which row. Read as E.
- **A2. A parked row becomes a PROVISIONAL member with no email.** This is the only reading
  under which the ask is coherent. The No email group on the course screen
  (`app/course/[id].tsx`, the group headed "No email" whose cards carry *Add email*) lists
  people who are ALREADY members — so "Add as new member" on a genuine member would duplicate
  somebody already on the register. Read as: the two new buttons belong on PARKED entries;
  a genuine member with no address keeps her existing *Add email* affordance. This was put to
  the requester and not resolved; Gate 1 must.

## MUST NOT CHANGE
- Everything not named above. In particular: the four upload steps, the CSV parsing and its
  refusals, dedupe, the "Mapped to this session" panel, the match dialog's other outcomes
  (A, C, D), the alias mechanism itself, and the follow-up rule.
- The one member source (guardrail 1): parked rows must be DERIVED from the member list and
  the import, never kept as a second parallel list of people.

## ACCEPTED CONSEQUENCE — an architecture guarantee is being reversed
Today the import is **atomic**: "Nothing has been imported yet", the whole file imports
together, enforced server-side in `csv-import` (C-79), with the staged rows held in memory only
(`src/data/pending.ts`) so a close writes nothing. MUST-HAVE 3 reverses that — a register can
be half-imported. **The requester was shown this and chose it deliberately** ("Yes — save the
resolved rows on close"), then added the confirmation prompt that stops it happening by
accident. Track A must therefore carry: a decision record for the reversal, the server change
in `csv-import`, and the copy that currently PROMISES atomicity ("Nothing has been imported
yet", "the whole file imports together") rewritten to tell the truth.

## DESIGN SURFACE
- VISUAL?: yes.
- SCREENS & STATES TOUCHED: the match dialog (`app/match.tsx`) — its unresolved-row actions and
  a new close-confirmation; the course screen's No email group (`app/course/[id].tsx`); the
  member dialog (`app/member/edit.tsx`), which today accepts only `id` and needs a prefilled
  name; and a new alias-picker entry point reusing `SearchPicker`.
  Empty (nothing parked) · loading · error (the save-on-close fails partway) · offline ·
  permission-denied: all `unknown`, Gate 1 to specify. The error state matters most — a
  partial write that fails is now possible where it was not before.
- STRINGS ADDED OR ALTERED: "Later" (replacing "Skip this row"); the two button labels, the
  requester's own words being "add as new member" and "add display name to existing member";
  the close-confirmation copy; and the atomicity copy that must stop promising what will no
  longer be true. Everything else on the touched screens is frozen.
- PERMISSIONS: `unknown`. Creating a member is owner-only in places
  (`courses-add-member` is gated on `isSuperAdmin`), and parking a row creates a provisional
  member — so who may park, and who may resolve, needs the five RBAC questions at Gate 1.

## STANDING INSTRUCTIONS (do not edit)
- Track A runs its four gates. Gate 1 restates these FIELDS for confirmation before anything
  else — A1 and A2 above are the two that most need it.
- Close out with `checklists/DEFINITION_OF_DONE.md`, then the test gate. Nothing merges
  without a PASS.
