# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

## FIELDS

- FEATURE / SCREEN: **The send communication dialog** — `app/send/index.tsx`. One thing only:
  **where the search row sits**. Round 1 of this surface
  (`requests/2026-09-09-send-dialog-search-the-recipients.md`) put it in `FormDialog`'s
  `subheader` slot; this round moves it.

- CURRENT BEHAVIOUR (as round 1 shipped it, read in the file 09-Sep-2026): the search box, the
  `send-select-all` control and the `N of M selected` label are passed as `subheader`, so they
  are **pinned under the dialog title, above the scroll**. The follow-up trigger panel is the
  first thing in the scrolling body, then the member list. Reading top to bottom, the order on
  screen is: title · **search · Clear all · count** · trigger panel · members.

- DESIRED BEHAVIOUR: requester's exact words, with a screenshot of the shipped round-1 dialog —

  *"bring search bar next to follow up trigger just above members list"*

  Read as: the search row moves **out of the pinned subheader and into the scrolling body**,
  below the follow-up trigger panel and immediately above the member list. New order: title ·
  trigger panel · **search · Clear all · count** · members.

- WHY: `unknown` — not stated. The reading the build takes: the order now follows the order of
  the decision — this is the rule, this is how to find somebody in what the rule returned, these
  are the members — and the count sits against the rows it counts rather than with a trigger
  card between them.

- MUST NOT CHANGE: everything round 1 settled other than position. Named because the move touches
  their edges and none of them shifts: the search still narrows **what is drawn, never what is
  sent**; ticks on hidden rows are still kept; the bulk control still acts on what is on screen
  and still ADDS rather than replaces; the *Select these N* / *Clear these N* labels; the
  `Showing N of M … Send goes to all P` line; the excluded panel's narrowing and its true-total
  heading; the no-match empty state; `send-search`, `send-search-clear` and `send-select-all`
  keep their testIDs. **Guardrails 1, 3 and 5** unchanged — nothing here touches derivation,
  signalling or the send path.

- CORRECTION ROUND: **2** on this surface, against
  `requests/2026-09-09-send-dialog-search-the-recipients.md`.
  **What round 1 missed, and whose fault it was.** Round 1's **Q6 was an open question** —
  where the box sits was never stated by the requester — and the reading taken was the pinned
  `subheader`, on the argument that a box which scrolls out of reach of a 435-row list is the
  complaint it was built to answer. That reasoning still holds and is not withdrawn; the
  requester has simply now settled Q6 the other way, and their answer governs. This is an
  **intake gap made good**, not a build defect: the request recorded the choice as a reading
  rather than a decision, which is exactly what made it correctable in one line.

## ANSWERS TAKEN AT INTAKE

None put back — the instruction was unambiguous about the destination.

## OPEN QUESTIONS — readings taken

- **Q1. Does the bulk control and the count move with the box, or only the box?** The words say
  *"search bar"*. Reading: **the whole row moves.** The button and the count are chrome FOR the
  search result — *Clear these 12* is meaningless away from the box that produced the 12 — and
  the requester's own destination, *"just above members list"*, is where they already were
  relative to the list before round 1 pinned them.
- **Q2. Is the pinning behaviour wanted anywhere else on this dialog?** Not stated. Reading: no.
  `FormDialog`'s `subheader` prop stays, unused by this screen and still used by
  `app/member/[id].tsx`; nothing is removed from the shared component.
- **Q3. Is the trade-off accepted?** On a 435-member list the box now scrolls away, and getting
  back to it is a scroll to the top. That is the cost of the position the requester chose. It is
  **stated in the code comment** rather than silently absorbed, so the next round has it.

## DESIGN SURFACE

- VISUAL?: **yes** — one block changes position; nothing else on the dialog changes.
- SCREENS & STATES TOUCHED: `/send`, the list branch only. The pinned band under the title is
  gone, so the card is the header · scroll · footer it was before round 1. Untouched: loading,
  `memberUnsendable`, the error card, `nothingToSend`, the confirmation, the footer.
  Both themes, semantic tokens — the block loses the `theme.shell` background and bottom border
  it needed as a pinned band and inherits the body's own padding.
- STRINGS: **none added, none altered, none removed.**
- PERMISSIONS: **no**.
- RUN MODE: `auto`.
- SCALE: micro — one JSX block re-parented, one guard carried with it.
