# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: **The course screen's week strip** — `app/course/[id].tsx`, the seven
  date cards under the course bar (`course-day-<iso>`), shown in the requester's screenshot of
  `/course/<id>` ("Postnatal", Attendance tab, desktop width).
- CURRENT BEHAVIOUR (read in the working tree, 07-Sep-2026): each date card shows the month,
  the number, the weekday and ONE status icon at the bottom — tick, cross, cloud or dash — with
  the legend above the strip naming the four. Tapping a card selects the day for the roster
  below. **Nothing on a card can be pressed to upload.** The one upload control on the screen is
  `course-upload` ("Upload Session") in the course bar, which opens `/upload?courseId=…` with no
  date. The clock (`STATUS.scheduled`) the screenshot shows on days still to come is ALREADY
  gone in the working tree — an un-uploaded day the course runs wears the amber cloud whether
  the date has passed or not (FEATURE_TRUTH, "Every icon on the course week strip is in its
  legend"). That half needs no further work here; it is stated so the two do not get confused.
- DESIRED BEHAVIOUR: requester's exact words, across three messages —
  1. *"bring awaiting upload button as earlier for each day if uplaoded on top of each day show
     tick mark and what is that clock icon its not clear it should be awaiting upload icon only"*
  2. *"There should be awaiting uplaod text like a notification i said"*
  3. *"Its a button with text on click of it user should be able to uplaod"*

  Read together: on EVERY day of the strip that is awaiting a file, the card carries a **button
  that says "Awaiting upload"** (icon and word, notification-like), and **pressing it opens the
  upload for that exact date**. A day whose file has arrived shows the **tick** on the card and
  no button. The clock is not to appear anywhere on the strip.
- WHY: the earlier per-day upload button was removed with the day card on 06-Sep-2026; the
  requester wants a per-day way to upload back, on the day itself, without the card and its
  message. Not stated beyond that.
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. Specifically: seven cards at every
  width; tapping a card still selects the day and the roster still says *Attendance for …*; the
  week arrows; the legend and its four states; the course bar's `course-upload` beside Send
  Communication (it stays — this adds a dated path, it does not move the undated one); the
  upload route and its `courseId` / `date` parameters (0024 — the file's own date still names
  the session); no day card, no message and no sentence under the strip come back.
- CORRECTION ROUND: **3 on this surface.** Round 1: `requests/2026-09-06-upload-imports-on-pick.md`
  widened the day card's `course-day-upload` button to every day. Round 2:
  `requests/2026-09-06-course-search-under-heading-day-panel-gone.md` (commit `2b4c516`) removed
  the day card, button and message together, on the requester's ask — "we already have a upload
  session button on top". Track B must state what round 2 missed before proposing anything.

## DESIGN SURFACE
- VISUAL?: yes
- SCREENS & STATES TOUCHED: the course screen's week strip only. Loading: the strip is a
  skeleton, no button. Error: the strip is not drawn (the arrows and the error state are), no
  button. Empty (a week with nothing awaiting — every day uploaded or not expected): no button
  on any card, which is the "if uploaded show tick" half. Offline / permission-denied: unchanged
  — the button opens the same upload route the course bar already does, which handles both.
- STRINGS ADDED OR ALTERED: **none.** The button's word is `STATUS.awaiting.word`, "Awaiting
  upload", exactly the word the legend already uses for the same state. Everything else on the
  screen is frozen.
- PERMISSIONS: no — whoever can reach the course screen already has `course-upload` in its bar;
  this is the same destination with a date.
- USAGE: unknown — not stated.
- RUN MODE: auto (nothing said about approvals; the default applies)
- SCALE: scoped — micro is refused for CORRECTION ROUND ≥ 2

## OPEN QUESTIONS — the requester settled the shape; the rest taken in auto mode

- **Q1. Button or text?** Asked; first answered *"You decide best approach as senior design
  engineer"*, then corrected twice by the requester: text like a notification, then "a button
  with text, on click the user can upload". **Settled by the requester: a labelled button.**
- **Q2. Where does the word go on a phone?** `unknown`. At 360pt the strip keeps seven cards on
  an earlier request, which leaves each card about 33pt wide — narrower than the word "Awaiting"
  at any legible size. **Taken:** below 768pt the button on an awaiting card is the cloud alone,
  with the same press, 26pt tall and the card's width, and the same accessibility label; the
  word stays in the legend one line above, exactly as it does for the other three icons today.
  From 768pt up the button carries icon and word. Nothing is truncated with an ellipsis.
- **Q3. Is the button nested inside the card's own press?** A button inside a button is invalid
  for a screen reader and ambiguous for a finger. **Taken:** the card becomes a plain frame
  holding two siblings — the date block, which selects the day and keeps `course-day-<iso>`,
  and the status slot, which is the upload button on an awaiting day and the plain icon
  otherwise. Selecting and uploading are two controls, side by side, never one inside the other.
- **Q4. Where does the upload land?** **Taken:** `/upload` with `courseId` and `date=<iso>`,
  the parameters round 1 introduced and 0024 reads — the same push the removed
  `course-day-upload` made. The testID returns as `course-day-upload-<iso>`, one per awaiting day.

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
