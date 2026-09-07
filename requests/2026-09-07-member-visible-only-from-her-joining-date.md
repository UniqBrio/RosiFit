# BUG REPORT — something that ships is wrong against its spec
<!-- Filled by workflows/request.md (/request) · Consumed by Track C: /bug requests/<this-file> -->

Run **Track C** ([workflows/bug.md](../workflows/bug.md)) with this report.

> **Why BUG and not CHANGE.** The record already carries the fact: `members.joined_on` (0006),
> and `create_member` (0026) starts her enrolment at `coalesce(p_joined_on, current_date)` so the
> DATABASE has always known she was not there before that date —
> `expected_members_for_session` (0007) filters on `member_enrollments.effective_from`. The app
> reads the column, formats it as "Mar 2026" for a subtitle, and then throws the date away. Every
> date-scoped screen in the client therefore shows every member on every date. Nothing here is a
> new rule; it is the client failing to apply one the schema has enforced since 0006.

## FIELDS
- FEATURE / SCREEN: every screen that shows members FOR A DATE OR A PERIOD —
  the course roster and its attendance chips ([app/course/[id].tsx](../app/course/%5Bid%5D.tsx)),
  the Overview ([app/(tabs)/index.tsx](../app/%28tabs%29/index.tsx)), Reports
  ([app/(tabs)/reports.tsx](../app/%28tabs%29/reports.tsx)), and the attendance register the
  offline fixture generates ([src/data/mock.ts](../src/data/mock.ts)).
- EXPECTED: a member added on **7 Sep 2026** is not among the students shown for **6 Sep 2026**
  or any earlier date, on any date-based view. She appears from 7 Sep onward.
- ACTUAL: she appears on every date, including dates before she existed on the register. On the
  course roster for a past day her card reads *Yet to mark*, which claims the academy failed to
  record a session she could not have been at. On the offline register she has generated
  attendance rows for Mon/Wed/Fri going back weeks.
- REPRODUCE: add a member today (7 Sep 2026) · open her course · step the week strip back to a
  day before today · she is on the roster with an attendance reading for that day. Then Reports
  → period "Last month" → she is a row with 0 expected, 0 attended.
- WHO IS AFFECTED: every member added after the academy started using the app — which, after the
  bulk import, is most of them. It is worst on the two screens people act from: a roster that
  lists somebody for a class she was never enrolled in, and a report whose member count for a
  past month counts members the academy did not have that month.
- WHEN IT STARTED: it has never worked. `fetchMembers` has formatted `joined_on` into a display
  string since the column was first read; no caller has ever had the date itself.
- ERROR WORDING: none. Nothing fails; the screens answer confidently and wrongly. That is what
  makes it S2 rather than S3.
- CORRECTION ROUND: 1.
- MUST NOT CHANGE: the Members tab and the course's own member list — the requester's words,
  "without hiding the student from the normal course member list". A member is a member the day
  she is added, and the register is not a date-scoped view. Also unchanged: `members.joined_on`
  and every migration; `create_member` / `update_member`; `expected_members_for_session`, which
  is already right; the `joined` subtitle string ("Mar 2026", memberDialog); the follow-up rule
  and its thresholds; `dayAttendance` and its 13 specs.
- RUN MODE: `auto`.

## ROOT CAUSE (stated before the fix — C1)
**The client has the joining date and drops it at the repository boundary.** `fetchMembers`
selects `joined_on` and maps it straight to a *formatted month* — `joined: "Mar 2026"` — so the
only thing downstream of the repository is a subtitle. No derivation can compare it to a date,
so every date-scoped view in the app renders the whole member list regardless of the date it
claims to be about.

This is one cause with four symptoms, not four defects (C1: *N failures clustered on one API is
one cause with N symptoms*). Fixing them one screen at a time would produce four slightly
different date comparisons and leave the cause — a lossy mapping — in place.

Class match in the register: **RC-014** (a joining date that was cast without being checked) and
**RC-012** (a derivation that could not be tested because it imported the fixture). Both say the
same thing about this column: the date is data, and the rule that reads it belongs in a pure
module with specs, not in a render body.

## FIX SHAPE
1. `Member.joinedOn: string | null` — the ISO column, carried beside the display string.
2. One pure module, `src/data/joined.ts`, holding the whole rule: `hasJoinedBy`, `membersOnDay`,
   `membersInPeriod`. No screen compares dates itself.
3. Applied at the date-scoped views only. A missing `joined_on` is read as *"no date on record"*
   and never hides anybody — the column is nullable and rows predate it.
4. The offline attendance generator stops inventing rows for a member before she joined, which is
   what makes the fixture register and the live one tell the same story.

## STANDING INSTRUCTIONS (do not edit)
- Root cause before fix (C1); a failing test before the fix (C2) — no scale skips those two.
- SCALE is **not** micro: more than two source files, and the cause is a pattern with sibling
  call sites, which FP-6 says must all be fixed.
- Close out with `checklists/DEFINITION_OF_DONE.md`, then the test gate.
