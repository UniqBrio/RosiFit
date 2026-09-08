# DEFECT REPORT — something that already exists is wrong
<!-- Consumed by Track C: /bug requests/<this-file> -->
<!-- Stated fields are BINDING; "unknown" is honest and the track MUST ask it. -->

Run **Track C** ([workflows/bug.md](../workflows/bug.md)) with this request.

> **Why DEFECT and not CHANGE.** The back arrow on course detail is already built, already
> the one back control on that screen, and already does the right thing on the path it was
> written for. It stops answering on a path nobody walked when it was written.

## FIELDS

- **ONE-LINE GOAL:** the back arrow on a course's attendance screen always goes somewhere —
  including when the browser was refreshed on it.
- **THE ASK, in the requester's words:** *"back button from attendnace screen is not working
  after sometime and after refresh fix that"*, with a screenshot of **Gentle Yoga** — the
  course detail screen (`/course/<id>`), the Attendance tab, the arrow left of the course name.
- **WHERE:** `app/course/[id].tsx`, the `course-back` control.

## THE DEFECT

`course-back` called a bare `router.back()`. That is correct on the ONE path it was written
for — the Courses tab **pushes** this screen, so there is an entry to pop — and it is a
**silent no-op on an empty stack**. This repo has already been bitten by exactly that once:
`set-pin` accepted a new PIN and then sat there for every first login (ROOT_CAUSE_REGISTER,
07-Sep-2026, `router.back()` after a `replace`).

The stack is empty here whenever the screen is the app's FIRST route rather than its second:

| how the screen is reached | stack | old arrow |
|---|---|---|
| Courses tab → course card (`push`) | `[(tabs), course/[id]]` | works |
| **browser refresh / reload on `/course/<id>`** | `[course/[id]]` | **dead** |
| a bookmark, a pasted link, a PWA relaunch on that URL | `[course/[id]]` | **dead** |

`app/_layout.tsx` declares no `initialRouteName`, so a cold load at `/course/<id>` builds a
root Stack holding that one route and nothing beneath it. "After sometime" is the same state
by another door: a reload the person did not ask for — a PWA/service-worker refresh, or a tab
restored — leaves the screen looking untouched with its history gone.

## MUST-HAVE

- The arrow pops when there is genuinely something to pop — the Courses-tab path is unchanged,
  including the scroll position and filter state the tab was left in.
- When there is not, it goes to a **real** screen (`/courses`) instead of doing nothing.
- It `replace`s in that case rather than pushing, so the dead entry is spent, not stacked.
- The decision is a **pure function** (`backFrom` in `src/data/nav.ts`), tested, not a
  condition written inline in a screen where the next screen can write it differently.
- Any `?from=` is validated by the existing `safeBackTarget`: a back button that follows
  whatever a link said is an open redirect wearing an arrow icon.

## MUST NOT CHANGE

- The arrow's look, size, position, `testID` (`course-back`) or accessibility label. This is a
  behaviour fix; the header is untouched.
- The other back control on the screen: the week strip's day arrows stay square, smaller and
  inside the strip — the two must not read alike.
- `afterPinChange` and its callers. `backFrom` sits beside it and reuses `safeBackTarget`;
  nothing already using `nav.ts` changes.
- The three header actions, the week strip, the roster, and every dialog on this screen.

## RESOLVED AT INTAKE

- **Where does a cold arrival go — `/courses` or Overview?** `/courses`. It is the screen that
  lists the thing you are looking at, and the one the in-app path came from, so both doors lead
  to the same place.
- **Why not `canGoBack()` for the whole app's back buttons?** Because inside the tab group it
  answers about the stack the TABS sit in — that is why Weekly review, Members and Attendance
  name their origin instead (`?from=`, FEATURE_TRUTH "where back goes"). `course/[id]` is a
  root Stack screen, not a tab, so there the answer is about its own stack and is correct.

## STILL `unknown`

- Whether the same dead arrow should be closed on the OTHER pushed screens that call a bare
  `router.back()` — `branches`, `audit`, `profile`, `help`, `appearance`, `staff/index`, and
  the dialogs (`member/[id]`, `upload`, `send`). Each is dead on a refresh for the same reason.
  Not assumed: the request named the attendance screen, and `backFrom` makes each of those a
  one-line decision when it is asked for.

## STANDING INSTRUCTIONS (do not edit)
- Stated fields are BINDING and cannot be overridden by an assumption downstream.
- Every backend change is an additive migration with tests; test files are append-only.
- Before applying any migration to PROD: show the requester the raw SQL and wait for an
  explicit go-ahead. Production is never touched automatically.
