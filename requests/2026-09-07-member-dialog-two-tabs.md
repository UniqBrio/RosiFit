# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

> **Why CHANGE and not NEW.** The member pop-up exists and shows all of this already
> (`requests/2026-09-06-member-detail-as-popup.md`). The ask is a re-organisation of one
> shipping surface into two tabs, plus one new panel of facts the record already holds.
> Nothing here is broken, so it is not a BUG.

## FIELDS
- FEATURE / SCREEN: the member pop-up — [app/member/[id].tsx](../app/member/%5Bid%5D.tsx),
  the `FormDialog` that opens over the roster when a member is tapped. The requester attached
  a screenshot of it (Ranjani) and wrote on it: *"Add member details in reach out"*.
- CURRENT BEHAVIOUR: one scrolling card, four sections in a fixed order — her figures strip
  (Expected · Attended · Missed · Missed streak, with *Attendance this week*), **Her sessions
  this week**, the email panel, and the reach-out rule label; **Edit** and **Reach out** pinned
  in the footer.
- DESIRED BEHAVIOUR: requester's exact words —
  "in this dialog add two tabs one with details what is shown in the image another tab with
  member details".
  Read as: the card gains a two-tab switch. Tab 1 holds **exactly** what is on the card today,
  unchanged and in the same order. Tab 2 is a new panel showing her record's own details. The
  footer buttons stay put and belong to the dialog, not to a tab.
- WHY: not stated. Implied by the note on the screenshot — her details are wanted at the point
  of reaching out, and today the only way to see them is to leave for the Edit form.
- MUST NOT CHANGE: every fact and every string on the card today — the four figures and their
  labels, *Attendance this week* and its percentage, the sessions list with each row's word,
  icon and "why it does not count" line, the email panel including the excluded-from-sends
  sentence and *Last contacted*, the rule label and its `member-rule-label` testID; the footer
  **Edit** / **Reach out** pair, the already-sent confirmation and where Reach out goes
  (`/send?member=<id>`); the loading and missing branches, which open before any tab exists;
  the data sources (`useMembers`, `useRules`, `useSentForPeriod`, `flagged`) — no new read;
  the dialog's own close control and its `member-close` testID.
- CORRECTION ROUND: 1

## DESIGN SURFACE
- VISUAL?: yes.
- SCREENS & STATES TOUCHED: `/member/[id]` only. States: loading and error/missing (untouched —
  they render before the tabs), a member with sessions, a member with none, a member with an
  email, a member with none, a member whose rule has not arrived. Both themes. Tab 2 has its own
  empty readings — no aliases, no second address, no weekdays of her own.
- STRINGS ADDED OR ALTERED: the two tab labels, and the labels of the detail rows in tab 2.
  Nothing already on the screen is reworded (the freeze rule).
- PERMISSIONS: no. Tab 2 shows facts the Edit form already shows to the same people; nothing is
  writable from it.
- USAGE: the pop-up is the most-opened surface on the roster and is opened to decide whether to
  reach out; details are read there, not edited.
- RUN MODE: `auto` (not stated — the default applies).
- SCALE: `scoped`.

## UNKNOWN — not covered by the description
- **Which facts belong in "member details".** The requester named none. The build takes them
  from the `Member` record itself (`src/data/mock.ts`) — status, course, branch, joined,
  her weekdays (own or the offering's), every email address with the primary marked, her
  aliases, and last contacted — because those are the fields the record actually holds and the
  Edit form already writes. Recorded as an ASSUMPTION, not a statement; trim at the gate.
- **Which tab opens first.** Not stated. The build opens on tab 1, the card as it is today,
  so nothing about the current first impression changes.
- **Whether the tabs should persist between openings.** Not stated; the build does not persist —
  each opening starts on tab 1.

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
