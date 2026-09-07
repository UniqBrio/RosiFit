# BUG REQUEST — something is broken
<!-- Filled by workflows/request.md (/request) · Consumed by Track C: /bug requests/<this-file> -->
<!-- Root cause comes before any fix - always. Stated fields are BINDING; "unknown" is honest. -->

Run **Track C** ([workflows/bug.md](../workflows/bug.md)) with this request.

## FIELDS
- WHERE: The course screen's week strip — `app/course/[id].tsx`, the seven date cards under the
  course bar (`course-day-<iso>`) and the per-day upload button on them
  (`course-day-upload-<iso>`), added by
  [`2026-09-07-awaiting-upload-button-on-each-day.md`](2026-09-07-awaiting-upload-button-on-each-day.md).
- WHAT HAPPENS: the "Awaiting upload" button is drawn on **every** day the course runs that has
  no attendance rows, in **every** week the strip can step to — 26 weeks either way. Step the
  strip forward and each of next week's cards offers to upload a file for a class that has not
  happened.
- WHAT SHOULD HAPPEN: requester's exact words —
  *"It should only be shown for dates in the current week. It must not appear on future weeks."*
  Read against the upload path the button leads into: the current week, and within it only as
  far as today.
- WHEN IT STARTED: 07-Sep-2026, with round 3 of the per-day upload button. The button had no
  week condition when it was put back on the day.
- WHO IS AFFECTED: everyone who steps the strip off the current week. The current week's past
  days are unaffected and were always correct — which is the clue: the defect is entirely in
  WHICH days are offered, never in what the press then does.
- REPRO STEPS:
  1. Open a course with an offering that runs on a weekday, e.g. `/course/c2`.
  2. Press the `course-week-next` arrow once.
  3. Every day the course runs in that week shows a pressable "Awaiting upload".
  4. Press one. `/upload` opens scoped to that course and date, matches nothing, and answers
     *"That session is no longer waiting for a file — it may already have been uploaded"* about
     a session that has not started.
- WAS WORKING BEFORE?: no. The condition has never existed on this button.
- CORRECTION ROUND: **4 on this surface.** Round 3 is
  `requests/2026-09-07-awaiting-upload-button-on-each-day.md`; what it missed is that it gated
  the button on the day's STATUS (`d.key === 'awaiting'`) and the strip gives an un-uploaded day
  that status whether the date has passed or not (0034) — so "awaiting a file" and "a file can
  be attached to it" were treated as one claim when they are two.

## ROOT CAUSE (stated before the fix, per Track C)
Two derivations of "is this session waiting for a file", and only one of them consulted the
calendar.

`fetchPendingSessions` — the one place the app decides what is actually pending — queries
`sessions … .lte('session_date', today)`. The week strip's own derivation in `app/course/[id].tsx`
asked only whether the offering runs that weekday and whether rows exist. So the strip claimed a
pending session the upload screen would not list, and the button led to `scopeSessions`' empty
case, whose wording ("no longer waiting … may already have been uploaded") describes the
opposite of a future date.

The fix is not a condition in the render body. `src/data/uploadWindow.ts` states the window
once — the current Monday-start week (`period.weekStart`, matching
`follow_up_config.week_start_day = 1`), as far as today (`dayIso <= todayIso`, the same local-date
string comparison `dayAttendance` already makes) — and the day cell carries the answer as
`canUpload`. The status `key` is untouched: a future day still wears the cloud and still says
"Awaiting upload" to a screen reader, it simply has nothing to press, as an uploaded day does.

## MUST NOT CHANGE
Everything not named above. Specifically: seven cards at every width; the four legend states and
their icons and words; the `awaiting` status itself on future days; tapping a card still selects
the day; the week arrows and their 26-week limit; the course bar's undated `course-upload`;
`/upload`'s own list of pending sessions, which is where a past week's awaiting session is
reached and which reaches back further than the strip does.
