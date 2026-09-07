# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

> **Why CHANGE, and not BUG or a triage LIST.** One session per offering per
> day is a DECISION, not a defect — `sessions_unique_live` (0007:33) makes it a
> database invariant and 0024 states it out loud: *"a second file for the same
> day updates that session; it cannot create a rival one."* The requester is
> revisiting that decision, and her words are "should be able", "only if",
> "not other" — the CHANGE markers, not the BUG ones. Nothing is erroring.
> It is not a triage LIST either: every clause names one boundary — what
> identifies the register a file writes to — and moving that boundary is one
> decision. Not Track F: the invariant was deliberate and documented, so the
> process did not misbehave; the requirement did not exist until now.

## FIELDS

- FEATURE / SCREEN: What identifies the register an attendance CSV writes to —
  `sessions_unique_live (offering_id, session_date)` (0007:33), the supersede
  check in `supabase/functions/csv-import/index.ts:84-87`, and
  `commit_csv_import` (re-issued by 0037). No screen is named by the requester;
  see MUST NOT CHANGE.

- CURRENT BEHAVIOUR: measured from the files on 07-Sep-2026, not from memory.
  One session per offering per calendar date, and the meeting code is kept as
  evidence only — `csv_imports.meeting_code` (0024:26), indexed but **not**
  unique (0024:36-37), and absent from `sessions` entirely. So every file for a
  course on a day lands on the SAME session row. Since 0037 that is destructive
  for this workflow: a second file REVERTS to `absent` everybody who is due,
  whose row an earlier file wrote, and whom the new file does not name. Six
  files for Postnatal on one day therefore leave **only the sixth file's
  members present; the other five cohorts are all marked absent.** The
  supersede check keys on `(offering_id, session_date)`, so files 2-6 each warn
  "this replaces the register" — correctly, by today's rules.

- DESIRED BEHAVIOUR: the requester's words, verbatim —
  *"i should be able to upload any number of csv files with different meetind
  code and the attendance should be update only for the persons in that csv not
  other, and override only if i am uploading csv with same meeting code and
  date. Note sometimes meeting code can stay same but date changes but it means
  attendance is considered for that day"*

  and, on the shape of the data —
  *"each course has multiple sessions each day for different member different
  meeting ids different time"* · *"member doesnt move between the meetings and
  its not fixed as six they can be n number of meeting"*

  Read as four rules:
  1. Any number of CSVs, each with its own meeting code, for the same course on
     the same day.
  2. A file updates ONLY the people it names, plus who was due **in that
     meeting**. Members of the day's other meetings are untouched.
  3. The register is overridden only when the incoming file carries the same
     meeting code AND the same date.
  4. The same meeting code on a different date is that date's attendance — a
     recurring link, not a repeat.

- WHY: the requester uploads one file per meeting, as each meeting ends
  (*"i upload eacj after completion of that meeting"*). Under today's rules
  that sequence destroys each earlier meeting's register. Beyond that operating
  fact, no incident, deadline or affected-person count was stated: `unknown`.

- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. Four consequences
  of that line, stated because the requester named them herself and each is a
  thing this change could break by accident:

  1. **The per-member counting rule.** *"each day they have meeting for course
     n number for 7 days total if they worke don 6 then total count is 6
     irrespective of how many meetings in each day"* — a member's count is
     DAYS ATTENDED, never meetings attended. `member_period_metrics` (0008)
     must keep returning 7 expected / 6 attended for that member, whatever N is.
  2. **One course per member at a time.** *"Only one member per day no two
     courses at once for now"* — the academy-wide `exclude using gist` on
     `member_enrollments` (0006:94-98) stays exactly as it is. It is not
     loosened, not scoped per-course, not dropped.
  3. **The UI is not affected.** *"make sure ui is not affected"* — see
     DESIGN SURFACE, which records the one place this collides with an open
     decision.
  4. Not named by the requester and therefore frozen: the four architecture
     guardrails in CLAUDE.md; the frozen-expectation model
     (`session_expectations`, 0007); `absent_must_be_expected` (0008); the
     hand-mark protection in 0037 (`corrected_at` outranks a file); holidays
     (0017, C-91); and the follow-up rule itself.

- CORRECTION ROUND: 1 — the description says nothing like "still", "again", or
  "after the last fix", and points at no previous attempt. It lands ADJACENT to
  a round that closed the same day —
  `requests/2026-09-07-upload-override-confirm.md`, delivered as 0037 — and
  Track B should read that file at B1, because this request does not overturn
  it: 0037 is correct for the case it was written for (a corrected export for
  the same class) and this request scopes WHICH register it may reach.

## DESIGN SURFACE

- VISUAL?: **not visual — as stated by the requester** (*"make sure ui is not
  affected"*), and achievable: see the table below. But this claim has one open
  edge, recorded rather than resolved, because resolving it silently would be
  the invented value this template warns about:

  > **The collision.** If an unseen meeting code is allowed to create a group
  > on its own, a mistyped or one-off code silently creates a group and splits
  > a class in two. The natural guard is a line in the upload preview — *"this
  > code is new; it will create a new group from these N members"* — and that
  > line is a STRING, which makes the change visual and contradicts MUST NOT
  > CHANGE item 3. The alternative (create silently) honours the constraint and
  > accepts the risk. **The requester has not chosen. B3 must ask, and must not
  > pick for her.**

- SCREENS & STATES TOUCHED: none, if the silent option is chosen. Verified on
  07-Sep-2026 by reading every read path that touches `course_offerings`:

  | Read path | Effect of adding per-meeting offerings | What it needs |
  |---|---|---|
  | `fetchCourses` — [repository.ts:285](../src/data/repository.ts#L285) — feeds the upload picker, Courses tab, enrolment | groups would appear as extra offerings | `.is('meet_code', null)` |
  | `fetchOfferings` — [repository.ts:741](../src/data/repository.ts#L741) — a course's offerings screen | same | same one line |
  | `fetchPendingSessions` — [repository.ts:1294](../src/data/repository.ts#L1294) | **none** — filters `status='scheduled'`; an import-created session is flipped to `completed` in the same transaction, and a group with no `offering_schedules` row generates nothing | nothing |
  | Branch course counts — [repository.ts:606-609](../src/data/repository.ts#L606-L609) | **none** — already counts distinct COURSES, not offerings, by an explicit earlier decision | nothing |
  | Reports / attendance rows — [repository.ts:1558](../src/data/repository.ts#L1558), [:1585](../src/data/repository.ts#L1585) | **none** — resolves offering → course NAME, so a group still reads "Postnatal" | nothing |

  B2's sibling sweep must confirm this list is complete before the plan relies
  on it; it was read, not remembered, but it was read by intake and not by B2.

- STRINGS ADDED OR ALTERED: none, under the silent option. The freeze rule
  applies. Under the confirm option, one new line in the upload preview,
  wording `unknown` — the requester has not given words for it.

- PERMISSIONS: no. Nothing here changes who may see or do anything; the RPCs
  keep their existing `SECURITY DEFINER` checks and the subscription gate.

- USAGE: partly stated. Postnatal runs six meetings a day *as the requester's
  example*, and N is explicitly variable (*"its not fixed as six"*). `unknown`:
  how many courses have this shape, the typical and maximum N, how many members
  per meeting, and whether every meeting runs every day.

- RUN MODE: auto (default — the description says nothing about approvals). This
  does NOT relax the standing rule that a migration reaches PROD only after its
  raw SQL is shown and an explicit go-ahead is given (CLAUDE.md).

- SCALE: `<blank — B0 decides>`

## WHAT ALREADY EXISTS (dedupe, 07-Sep-2026 — read from the files, not from memory)

- **The container for a per-meeting group already exists and is unused.**
  `course_offerings` is unique on `(course_id, branch_id, batch_label)`
  (0005:66-67), so N groups per course at a branch is already legal, each with
  its own `start_time`/`end_time`, its own `offering_schedules`, its own
  `member_enrollments`. **Nothing writes `batch_label`**: `save_course` does
  `insert into course_offerings (course_id, branch_id)` (0022:86) and
  select-else-inserts, so it can only ever produce one. The only occurrences
  outside the schema are in `supabase/seed_demo.sql`.

- **Three of the four rules need no new logic — they are existing invariants
  seen from a new angle**, once a meeting code resolves to an offering:
  - Rule 1 is `sessions_unique_live (offering_id, session_date)` (0007:33).
  - Rule 2 is `expected_members_for_session` (0007:57), which returns only that
    offering's enrolled members — so 0037's override and the absent sweep scope
    themselves to that cohort with no change to either.
  - Rules 3 and 4 are the supersede check and `commit_csv_import`, which
    already key on `offering_id + session_date` — which BECOMES code + date.

  This is the reason to prefer binding the code to an offering over adding a
  discriminator to `sessions`: the latter reaches the frozen-expectation model,
  `member_period_metrics`, `current_streak_for` and `follow_up_candidates`,
  and would need a per-meeting expected set built from nothing.

- **Rule 5 is protected by a constraint that already exists.** Because
  `member_enrollments` allows one offering at a time per member (0006:94-98),
  a member sits in exactly one group, therefore one session per day, therefore
  one `attendance_records` row per day. The day-count rule cannot be violated
  by this design even by mistake — and MUST NOT CHANGE item 2 is what keeps
  that true.

- **The file already carries what is needed.** `parseMeetCsv` returns
  `{ code, created, ended }` (`src/data/meetCsv.ts:20-26`) and the import
  already stores `meeting_code` and `meeting_started_at` (0024:26-27), with a
  non-unique index on `(meeting_code, session_date)` (0024:36-37). The plumbing
  stops one step short of identity, deliberately.

- **The known gap, and the reason this is not a one-line change.** The
  `add_as_new` path enrols only members the import CREATES (0037). An existing
  member matched by name into a group she is not enrolled in falls outside
  `expected_members_for_session`, so she is written `extra`, not `present` —
  and enrolling her needs her previous enrolment CLOSED as the new one opens,
  because of the exclusion constraint MUST NOT CHANGE item 2 freezes. B4 owns
  this; it is the main regression risk.

- **Precedent for the shape of the change.** 0037 itself: a re-issued
  `commit_csv_import` with no schema movement, its diff stated in its own
  header. If the resolution happens in the edge function,
  `commit_csv_import` may need no re-issue at all.

## WHAT SHIPPED, and the two corrections on the way (07-Sep-2026, same day)

The batch design above — one hidden `course_offerings` row per Meet code —
was built, applied to production as 0039, and **withdrawn the same day**
before a single file went through it. Two clarifications from the requester
changed the model:

1. *"meeting code can be different for members ... today different, tomorrow
   different, but same members"* — a code cannot identify a group, so
   binding one to an offering would have made a new group every day and left
   anyone who missed a day never marked absent.
2. *"on each member there are 3 statuses: present, absent, yet to mark. Show
   yet to mark only if for today's date no csv file is uploaded. If the user
   uploads a csv, mark everyone in the file present and the rest absent. When
   they upload again, check the members marked absent: if they are in that
   file, mark them present. Same flow goes on."* and, separately, *"members
   already marked as present should not be affected by a new file upload —
   only it updates attendance of members who are absent."*

**What is live** (`0042_override_scoped_by_meeting_code`, `csv-import` v11):
one session per course per day, exactly as 0007 always had it. The first file
marks its people present and everyone else due absent; each later file flips
its own people from absent to present and touches nothing else. The meeting
code has one job: 0037's override — which reverted everyone an earlier file
marked — now reaches only rows written by an earlier file carrying **the same
code**, so a corrected export still corrects itself and a second meeting's
file never erases the first. "Yet to mark" is a day with no file: a reading,
not a stored status. No groups, no enrolment moves, no schedule, no cron.

The two 0039 functions are dropped; `course_offerings.meet_code` and its
indexes remain, NULL everywhere (TD-041). Verified against production with a
rolled-back run: file A → Chitra absent; file B → Asha still present, Chitra
present, nobody reverted; corrected A' → Bhavani absent, Chitra untouched.

## OPEN QUESTIONS FOR B3 (none of these were answered — do not fill them in)

1. **Silent auto-create, or a confirm line?** The collision recorded under
   VISUAL? above. The requester's own framing — *"i should be able to upload
   any number of csv files"* — leans auto-create; her constraint — *"make sure
   ui is not affected"* — leans silent. Both cannot be maximised.
2. **A file with NO meeting code.** `parseMeetCsv` returns `code: null` when
   the export carries no such line, and the parser's own tests cover that case.
   Such a file cannot resolve to a group. What should happen was not stated.
3. **The existing Postnatal register.** Intake's proposal was that history
   stays on the current offering and only new uploads split; the requester did
   not say. Whether past days must be split retroactively is `unknown`.
4. **Per-meeting times.** The first description says the meetings differ by
   *"different time"*, but no later clause asks for the times to be recorded or
   shown. Whether each group carries its own `start_time`/`end_time` is
   `unknown`.
5. **What names a group.** `unknown` — no words were given.
6. **"Only one member per day".** Read in context as *one meeting per member
   per day*, answering intake's question about two courses at once. The literal
   words admit another reading; B3 confirms.

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
- Every backend change is an ADDITIVE migration with tests in `supabase/tests/`;
  test files are append-only. Rehearse by replaying every migration from scratch
  against the local harness and running the full suite.
- Close out with `checklists/DEFINITION_OF_DONE.md`, then the test gate. Nothing
  merges without a PASS.
