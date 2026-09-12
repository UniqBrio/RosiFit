# DEFECT REPORT — something that already exists is wrong
<!-- Consumed by Track C: /bug requests/<this-file> -->
<!-- Stated fields are BINDING; "unknown" is honest and the track MUST ask it. -->

Run **Track C** ([workflows/bug.md](../workflows/bug.md)) with this request.

> **Why DEFECT and not CHANGE.** Uploading a file for a day the course is not timetabled on is
> built (0024), resetting a day's register is built (0056, 0057), and the week strip's
> "Awaiting upload" press is built (ADR-036). Each works on its own. Put together, in the one
> order a person actually uses them — upload on an unscheduled day, then reset — the day comes
> back as a dash with nothing to press, while the Attendance tab's own list still says that
> session is waiting for a file. Two screens disagreeing about one day is the defect shape
> guardrail 1 names.

## FIELDS

- **ONE-LINE GOAL:** a day that has been uploaded and then reset offers "Awaiting upload"
  again, whether or not the course is timetabled on that weekday.
- **THE ASK, in the requester's words:** *"when i upload a file on day when its not scheduled
  then since for that day attendance was upload hen we should be able to reset aattendance and
  show that upload again button right"* — answered with the finding below and *"yes"* to the
  fix as proposed.
- **WHERE:** `course_week_day_status` (0067) — the `runs` column, which the course week strip
  (`app/course/[id].tsx`, via `dayStatusKey` in `src/data/dayLoad.ts`) reads to decide whether
  an un-uploaded day is *Awaiting upload* or *Not expected*.
- **WHICH BUTTON:** the same **Awaiting upload** press a timetabled day shows — chosen at intake
  over a distinct "Upload again" wording, because it falls out of the client's existing rule
  with no client change, and because a session waiting for a file is one state, however the
  session came to exist.

## THE DEFECT

The strip asks one question of an un-uploaded day: *does this course run on this weekday?*
(`runs`, computed from `offering_schedules`). Yes → `awaiting`, and the day carries the press.
No → `none`, the dash, nothing to press.

An upload on an unscheduled day creates a session for it (`commit_csv_import`, 0024,
`expectation_mode = 'all_enrolled'`). While the marks are there the day reads *Present* or
*Absent* — `uploaded` is true and `runs` is never consulted — so the tick, the counts, the
Reset button and the "Upload again" press all work. **Reset** soft-deletes the marks and
returns the session to `scheduled` (0056). Now `uploaded` is false and the strip falls back to
`runs`, which says the course does not run on that weekday. The day becomes a dash. The session
row is still there, still `scheduled`, still listed by `fetchPendingSessions` on the Attendance
tab as awaiting a file — the strip simply has no way to know about it, because `runs` reads
the timetable and only the timetable.

| the day | timetabled? | session? | live marks | strip says | Attendance tab says |
|---|---|---|---|---|---|
| ordinary class, uploaded | yes | yes | > 0 | Present / Absent | — |
| ordinary class, reset | yes | yes | 0 | **Awaiting upload** | awaiting |
| ad-hoc class, uploaded | no | yes | > 0 | Present / Absent | — |
| **ad-hoc class, reset** | no | yes | 0 | **Not expected (dash)** | **awaiting** |

Live example, production, 12-Sep-2026: **Prenatal, Tue 8 Sep** — Prenatal runs Mon/Wed/Fri;
a file was uploaded for the Tuesday, then reset. `sessions` holds it as `scheduled`, `source =
'import'`, `expectation_mode = 'all_enrolled'`, zero live marks. The strip draws a dash.

**Root cause, as a sentence:** `runs` answers "is this weekday on the timetable" when the
strip is using it to answer "can a file be uploaded for this day", and a session that was
held off the timetable is a day a file can be uploaded for.

## MUST-HAVE

- `runs` is true for a day on which a LIVE session exists that a register can be uploaded
  against — `status in ('scheduled','completed')`, `deleted_at is null` — as well as for a
  timetabled weekday. Cancelled and holiday sessions do not count: 0056 states they "never
  held a register", and neither is listed as awaiting anywhere.
- Scoped exactly as the rest of the function is: one course, the branches in scope, sessions
  on live offerings only.
- **No client change.** `dayStatusKey` already turns `runs && !uploaded` into `awaiting`, and
  the strip already draws the press on an `awaiting` day of the current week that has arrived
  (`uploadWindow`). The fix lives in the one place the answer is computed (CP-023).
- One migration, `create or replace`, same signature, same return type — so the ACL 0068/0069
  set is preserved (PostgreSQL keeps a function's ACL across `create or replace`).
- A spec that FAILS against 0067 and passes against the new definition.

## MUST NOT CHANGE

- The other five columns. `uploaded` stays the existence of live records (RC-039); the counts
  stay the counts.
- A timetabled weekday with no session: still `runs = true`, still *Awaiting upload*.
- A weekday the course does not run, with no session: still `runs = false`, still the dash.
- SECURITY INVOKER, STABLE, seven rows always, the grants — every property 48 asserts.
- The reset itself (0056/0057), `fetchPendingSessions`, the upload window, the roster's
  *Not expected* reading (which is computed client-side from the offerings, not from `runs`).

## STILL `unknown`

- Nothing blocking. Whether the roster card under such a day should read *Yet to mark* rather
  than *Not expected* for members on an ad-hoc session is a separate question about
  `dayAttendance`, not raised here.
