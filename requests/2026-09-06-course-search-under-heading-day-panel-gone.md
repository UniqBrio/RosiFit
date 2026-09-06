# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: **The course screen** — `app/course/[id].tsx`, shown in the requester's
  screenshot of `/course/<id>` ("Postnatal", Attendance tab). Two things on it: the card that
  opens under the week strip when a day is tapped (`course-day-upload` inside it), and the
  members search box (`course-member-search`).

- CURRENT BEHAVIOUR (read in the file, 2026-09-06):
  1. Tapping a day on the week strip renders a tinted card under the strip: the day's status
     word, a sentence about it ("This course does not run on this day, so nobody is expected
     and nobody is missing."), the date, and an **Upload session** button that opens
     `/upload?courseId=…&date=…`. The course header already carries **Upload Session**
     (`course-upload`) beside Send Communication.
  2. The members search box exists and filters the roster by **name or email address**
     (`shown`, line ~140). On a desktop (≥ 1024) it sits on the heading row at the far right,
     300pt wide; below that width it is full width under the heading. In the requester's
     screenshot the desktop placement is cut off at the right edge of the window.

- DESIRED BEHAVIOUR: requester's exact words — *"Add search bar under this section where user
  can search by name email and also remove that extra upload session dialog appearing with a
  message as we already have a upload session button on top beside send communication"*.

  Read as: (1) the day card under the strip — message and button together — goes; the header
  button is the one way to upload from this screen. (2) The search box sits **under** the
  Members heading, full width, at every size, and says what it searches by.

- WHY: the header already has Upload Session, so a second one under the strip wrapped in a
  message reads as a dialog in the way. The search was at the far right of a wide row, easy
  to miss and cut off in the screenshot.

- MUST NOT CHANGE: the week strip itself (seven cells, each speaking its date and status —
  guardrail 3), the tapped-day highlight, week stepping, what the search matches (name or
  email, case-insensitive, trimmed), the "No member matches that" empty state with its Clear
  search action, the header actions, the upload route and its date parameter.

- CORRECTION ROUND: 1 on this surface for the day card (it was widened to every day earlier
  today — `requests/2026-09-06-upload-imports-on-pick.md`); 0 for the search placement.

## OPEN QUESTIONS — the requester did not settle these; taken at the gate
- **Q1. Does tapping a day still do anything?** Without the card, the only visible effect is
  the highlight. **Taken: keep the tap and the highlight** — the cell still tells a screen
  reader its status, and the selected state is honest about which day was tapped. Removing
  selection would be a second change nobody asked for.
- **Q2. Search placement on desktop.** "Under this section" is read as under the Members
  heading, full width, the same as the phone layout already was. **Taken: one layout at every
  width.**
- **Q3. Placeholder.** "Search members" did not say it also matches an address. **Taken:**
  "Search by name or email".
