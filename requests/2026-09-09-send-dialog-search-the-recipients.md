# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

## FIELDS

- FEATURE / SCREEN: **The send communication dialog** — `app/send/index.tsx` (route `/send`, a
  dialog over the screen that opened it), reached from `course-send` in the course header, from
  the weekly follow-up screen, and from `member-reach-out` on a member's own record. The list of
  flagged members with a tick box each, its one row of chrome (`send-select-all` and the
  `N of M selected` label), and the `Excluded · N · counted, not dropped` panel under it.
  The list is derived by `recipientSplit` (`src/data/followup.ts`) from the flagged set.

- CURRENT BEHAVIOUR (read in the file, 09-Sep-2026):
  1. **Every flagged recipient is drawn, always.** No way to narrow the list. The requester's
     screenshot shows the Postnatal draft for 7–13 Sep 2026 reading **456 of 456 selected** —
     finding one member in it is a scroll through 456 rows.
  2. **One bulk control, whole-list only.** `send-select-all` reads *Select all* / *Clear all*
     and sets `chosen` to `recipientIds` or `[]`.
  3. **The chrome scrolls with the list.** The bulk button and the count are in the dialog body,
     so on a 456-row list they are 456 rows above whichever row is being read. `FormDialog`
     already has a `subheader` slot for exactly this (pinned under the title, above the scroll);
     this dialog did not use it.
  4. **The excluded panel** lists every member with no address, unnarrowed.

- DESIRED BEHAVIOUR: requester's exact words —

  *"Enable search bar to select and deselect easily in the attached dialog refer image"*

  Read as: a search box on this dialog that narrows the member list, so that selecting and
  deselecting members no longer requires scrolling the whole of it.

- WHY: `unknown` — not stated. The evidence is the screenshot: 456 rows, and the two words the
  requester used are *select* and *deselect*, so the search is wanted in service of the ticking,
  not for reading.

- MUST NOT CHANGE: everything not named above. Named explicitly because the ask touches their
  edges: **guardrail 1** — the list stays DERIVED from the member source and the saved rule, and
  the search adds no second list; **C-76** — a member with no address is still excluded AND
  named; **guardrail 5** — no free-form send path, `template_id` still comes from the course's
  resolved message; the follow-up trigger panel; the already-sent mark and the empty default it
  implies; the confirmation and its caveat line; the footer count and what `send` actually posts.

- CORRECTION ROUND: **1** — first round on this surface's list controls. Prior rounds on this
  dialog: `2026-09-05-…-as-dialog` (page → dialog), `2026-09-06-…` (template preview removed),
  `2026-09-07-reach-out-already-sent-and-rule-label.md` (one-member draft),
  `2026-09-08-follow-up-trigger-on-send-and-reach-out.md` (the trigger panel). None of them
  touched the search or the bulk control; nothing here reverses any of them.

## ANSWERS TAKEN AT INTAKE

None — the ask was one sentence and a screenshot, and no questions were put back. Everything
below is a reading, recorded as such.

## OPEN QUESTIONS — readings taken, not settled by the requester

- **Q1. What does the search match?** Not stated. Reading: **name or any address on file**,
  substring, case-insensitive, surrounding space trimmed — the same rule the course roster's
  search box already uses (`app/course/[id].tsx`), so the app has one search behaviour and not
  two. Any address, not only the primary one: a member is findable by an address she owns.
- **Q2. Does the search change what is SENT?** Not stated, and this is the load-bearing one.
  Reading: **no.** The search narrows what is DRAWN. Ticks on rows the query hides are kept,
  and the footer still counts everybody who will be written to. The alternative — a search that
  quietly unticks what it scrolls past — is the "second, disagreeing list" guardrail 1 exists to
  prevent, and there is no undo on a send.
- **Q3. What do the bulk controls act on under a query?** Not stated. Reading: **on what is on
  screen**, and they ADD to or SUBTRACT from the selection rather than replacing it. That is the
  half of "select and deselect easily" the search alone does not deliver. Their labels change to
  say so (*Select these 12* / *Clear these 12*) — *Clear all* over a list showing three of 456
  would untick 456 rows the person cannot see.
- **Q4. What states both numbers?** Reading: the chrome carries a line, whenever a query is on,
  giving how many are shown of how many and how many the send will reach. A list reading "2
  shown" over a button reading "Send to 456" has to explain itself.
- **Q5. Is the excluded panel narrowed too?** Not stated. Reading: **yes, by the same query** —
  half a filtered screen is a claim about the list that is only true of part of it. Its heading
  keeps the TRUE total (`N of M matching`), because those members are counted in every figure
  whether the box is hiding them or not.
- **Q6. Where does the box sit?** Reading: **`FormDialog`'s `subheader`**, pinned above the
  scroll, with the bulk control and the count moving up with it — they are chrome for the list
  and are about the search result. That slot exists for this and its own comment says why.
- **Q7. Is it drawn on every draft?** Reading: **only where there is a list worth narrowing** —
  omitted when the draft has fewer than two members, so the one-member Reach out draft and the
  empty draft get the card they had.
- **Q8. Permissions.** Not mentioned. Reading: unchanged.

## DESIGN SURFACE

- VISUAL?: **yes** — a new pinned row on the dialog, moved chrome, changed control labels, a new
  empty state.
- SCREENS & STATES TOUCHED: `/send` only. New: the pinned search row (`send-search`,
  `send-search-clear`), the "shown of" line, the no-match empty state. Altered: the
  `send-select-all` labels under a query, the excluded heading under a query. Untouched and
  verified untouched: loading, `memberUnsendable`, the error card, `nothingToSend`, the
  confirmation, the footer, the trigger panel.
  Both themes, semantic tokens throughout. **Guardrail 3**: the clear control carries a spoken
  word (`Clear the search`) beside its glyph, and no state here is signalled by colour.
- STRINGS ADDED: the placeholder *Search by name or email* (verbatim from the course roster);
  *Clear the search*; *Select these N* / *Clear these N*; the shown-of line; the no-match empty
  state. Everything else on the dialog is frozen — in particular *Select all*, *Clear all* and
  `N of M selected`, which are unchanged when no query is typed.
- PERMISSIONS: **no**.
- USAGE: the screenshot is the only evidence — one course, one week, 456 flagged.
- RUN MODE: `auto`.
- SCALE: micro-plus — one screen, one new pure module with its spec.
