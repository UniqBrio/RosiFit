# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

> **Why CHANGE, and not BUG.** Nothing is broken: the headers render and the
> pages scroll as built. The requester wants the headers to stay put while
> the content scrolls — "freeze", "so that on scroll … we will know which
> screen we are in" — a different behaviour, not a failed one. One boundary
> (what stays pinned above a scrolling body) across every screen, so it is
> one request and not a triage list.

## FIELDS

- FEATURE / SCREEN: The header that sits **below** the academy header's
  Overview · Attendance row, on every screen that scrolls: the screen's own
  title block (`ScreenHeader` — "Attendance · 3 courses · 1 branch …",
  "Reports · …", "Members", "More") on the tabbed screens, and the purple
  course bar ("Postnatal · 1 branch · Main: Mon, Tue, Thu, Fri" with Send
  Communication · Upload Session · Add Member) on `/course/[id]`.

- CURRENT BEHAVIOUR: measured from the files on 07-Sep-2026. The brand row
  and the Overview · Attendance tab row are `AcademyHeader`
  (`src/components/AppShell.tsx:91`), drawn by the Tabs navigator as its
  `header` (`app/(tabs)/_layout.tsx:25`) and, on pushed screens, by
  `ShellScreen` above a `flex: 1` body (`AppShell.tsx:367-369`) — in both
  cases OUTSIDE the scrolling container. The screen's own header is not: on
  every tabbed screen `ScreenHeader` is the first child inside `Screen`,
  which is a `ScrollView` (`src/components/ui.tsx:13-15`), and on
  `/course/[id]` the `DeepBackground` course bar is the first child inside
  the screen's `ScrollView` (`app/course/[id].tsx:307-323`). So the title
  block and the course bar scroll off the top with the content, and once
  they have, only the tab underline says where you are.

- DESIRED BEHAVIOUR: the requester's words — *"In all screen freeze the
  header below overview and attendance so that on scroll on viewing course
  member and graphs we will know which screen we are in."* Read as: on every
  scrolling screen, the screen's own header (title block, or the course bar)
  stays pinned beneath the Overview · Attendance row while the body — member
  cards, course cards, the Overview graphs, the report bars — scrolls under
  it.

- WHY: so that mid-scroll the screen still says which screen it is. Beyond
  that sentence, `unknown` — no incident and no device was named.

- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. Named, because
  each is adjacent and easy to widen into:
  1. The academy header itself — brand, bell, gear, the two tabs — is not
     touched. It is already outside the scroll.
  2. No string on any screen changes (the freeze rule).
  3. The floating Home · Reports · More pill and the 96pt bottom padding
     every scrolling screen keeps to clear it.
  4. What each header CONTAINS: the same title, subtitle, back button and
     actions, in the same order. This moves a block; it does not redesign it.
  5. Dialogs (`FormDialog` routes) — they render over the screen and have no
     header of this kind.
  6. Both themes and the contrast gate: nothing new is coloured.

- CORRECTION ROUND: 1 — nothing in the description says "still" or "again",
  and no earlier request pinned a header.

## DESIGN SURFACE

- VISUAL?: **yes** — a header that stays on screen where it used to scroll
  away is a visible change on every screen it touches, even though nothing
  it contains changes.

- SCREENS & STATES TOUCHED:
  - `app/(tabs)/courses.tsx`, `reports.tsx`, `members.tsx`, `weekly.tsx`,
    `attendance.tsx`, `more.tsx` — the `ScreenHeader` block on each.
  - `app/(tabs)/index.tsx` (Overview) — has no `ScreenHeader`; the thing
    that says "Overview" there is the tab underline, already pinned. Its
    Course · Period · Branch filter row is the only per-screen header it
    has; the plan decides whether it pins with the same mechanism.
  - `app/course/[id].tsx` — the `DeepBackground` course bar. The week strip
    under it scrolls with the roster unless the plan finds a reason not to.
  - States: LOADING and ERROR renders on these screens return a bare
    `Screen` with a skeleton or an `ErrorState` and no header — unchanged.
    EMPTY renders keep their header and gain the pin like the loaded state.
    Offline / permission-denied: N/A, no distinct render on these screens.

- STRINGS ADDED OR ALTERED: none. Freeze rule.
- PERMISSIONS: no.
- USAGE: `unknown` beyond the requester's own framing — the course roster,
  member list and Overview graphs are the long scrolls she named.
- RUN MODE: auto (default).
- SCALE: `<blank — B0 decides>` (not micro: seven screens, two shared
  components).

## WHAT ALREADY EXISTS (dedupe, 07-Sep-2026 — read from the files, not from memory)

- **The pin already exists for the academy header**, and its mechanism is
  the one to reuse: a `flex: 1` column with the pinned block as a sibling
  ABOVE the scrolling body, never a child inside it (`ShellScreen`,
  `AppShell.tsx:366-379`). No `position: sticky` and no
  `stickyHeaderIndices` anywhere in the app — both heavier than the sibling
  pattern that is already the house style.
- **`Screen` is the one seam for the six tabbed screens**
  (`src/components/ui.tsx:8-18`): every one renders
  `<Screen><ScreenHeader …/>…</Screen>`. An optional slot on `Screen`
  rendered above its `ScrollView` pins all six with one change each, and
  leaves `scroll={false}` callers untouched.
- **The course screen composes its own scroll** (`app/course/[id].tsx:305-
  308`, wrapped by `ShellScreen` at `:1173`). Its course bar is the first
  child of that `ScrollView`; moving it to a sibling above is the same
  pattern as `ShellScreen` one level up.
- **The web root is already height-constrained**: `app/+html.tsx:44`
  applies `ScrollViewStyleReset`, so the document does not scroll and only
  `ScrollView`s do — a sibling-above pin works on web without
  `position: fixed`.
- Verification on this machine: a fixtures build with Playwright (memory:
  harness-scripts-are-linux-only), scrolled, both themes.

## STANDING INSTRUCTIONS (do not edit)
- Track B is SURGICAL: read the actual current files first (B1), run the impact
  analysis with the sibling call-site sweep (B2) BEFORE proposing, produce the
  plan with regression risks (B4) — confirm mode waits for approval; auto mode
  (default) logs it and applies — touching only what DESIRED BEHAVIOUR requires.
  Every changed line must trace to this request.
- MUST NOT CHANGE seeds the plan's "deliberately NOT changing" list; the plan
  may add to it, never subtract.
- If VISUAL?=yes, the plan carries the correction design pass (B4), scoped to
  the touched area: states, both themes in semantic tokens, the string table,
  the permission answer.
- CORRECTION ROUND ≥ 2: before proposing anything, read the previous attempt and
  state what it missed and why (B1). If the miss was the process's fault, flag
  `/framework-update` too.
- Close out with `checklists/DEFINITION_OF_DONE.md`, then the test gate. Nothing
  merges without a PASS.
