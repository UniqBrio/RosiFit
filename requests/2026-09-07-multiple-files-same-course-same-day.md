# ENHANCEMENT REQUEST — an existing feature, modified
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- Stated fields are BINDING; "unknown" is honest. -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

## FIELDS
- WHAT EXISTS TODAY: the CSV upload — `app/upload.tsx`, the per-day press on the course week
  strip (`app/course/[id].tsx`), `supabase/functions/csv-import` and `commit_csv_import`
  (0014 → 0024 → 0037 → 0042).
- WHAT SHOULD CHANGE: requester's exact words —
  *"Enable multiple CSV files to be uploaded for the same course and the same day. For example, a
  user should be able to upload multiple attendance CSV files for Prenatal on the same date. The
  files should be processed independently and their attendance data consolidated correctly ...
  Make sure this does not create duplicate attendance records or overwrite unrelated data."*
- WHAT MUST NOT CHANGE: the corrected-re-export override (0037) reaches its own earlier version in
  full; a mark made by hand outranks any file (0035); one session per offering per day
  (`sessions_unique_live`); one live attendance row per member per session
  (`attendance_unique_live`); the identical file is still recognised as already imported.
- WHO ASKED: the repo owner, 07-Sep-2026.

## WHAT WAS ACTUALLY IN THE WAY
Inspected in the four places the request names. Three of them were already correct, and saying so
matters as much as the fix — the change is small because most of this was already built.

1. **Database constraints — nothing prevents it, and they are what makes it safe.**
   `sessions_unique_live (offering_id, session_date)` lands N files for a day on ONE session, so a
   second file cannot create a rival one. `attendance_unique_live (session_id, member_id) where
   deleted_at is null` makes "no duplicate attendance record" structural rather than bookkeeping.
   `csv_imports_sha_completed` is unique on the FINGERPRINT — it recognises the byte-identical file
   again, which is a different fact from a second, distinct file for the same day.

2. **Backend validation (`csv-import` preview) — nothing refuses a second file.** The only guard on
   the path is the fingerprint one above. `supersedes` is information for the screen, not a block.

3. **Import logic (`commit_csv_import`) — THE ONE REAL DEFECT.** 0037 made a second file for a day
   a full override: everyone due whose row an earlier file wrote and this file does not name goes
   back to `absent`, and an un-expected `extra` in the same position is soft-deleted. 0042 correctly
   narrowed that to files carrying the same MEETING CODE — but the code is the Meet *link*, not the
   call. A course that keeps one link writes the same code on every export, so two genuine meetings
   on one day read as a file and its correction and **the second erased the first**. Files whose
   export carries no code line at all were worse: `is not distinct from` makes null match null, so
   every code-less file overrode every other code-less file for that day. In both cases the
   reverted member really attended — her class ran, her file said so, and a later file about a
   different call took it away. That is the "overwrite unrelated data" the request forbids.

4. **Frontend — a missing route, not a validation.** The week strip's per-day press is gated on the
   day being `awaiting`, and a day leaves that state the moment its FIRST file lands, so the second
   export had nowhere to go from the day it is about. `fetchPendingSessions` reads only
   `status = 'scheduled'`, so an imported day also drops out of the upload screen's "Waiting for a
   file" list. The undated **Upload Session** in the course bar always worked, so this was
   reachable — but only by throwing the date away, and with it the check that ASKS when the file
   turns out to be from another day (0024).

## THE CHANGE
- `supabase/migrations/0044_override_scoped_by_meeting_instance.sql` — re-issues
  `commit_csv_import` from 0042 with the override scoped to the meeting **instance**: the code AND
  the created-on timestamp `csv_imports.meeting_started_at` has recorded since 0024. Two calls on
  one link have two created-on lines; a re-export of one call has the same one, so a correction
  still corrects its own earlier version in full. Three hunks, one per reconciling statement
  (`kept_by_hand`, `reverted`, `removed`). No column, index, constraint or grant moves.
- `supabase/functions/csv-import/index.ts` — the `supersedes` lookup scoped to the same pair, so
  the "this file OVERRIDES that register" dialog is asked exactly when an override will happen.
- `app/course/[id].tsx` — a day that already has a register carries an **Add file** press
  (`course-day-add-<iso>`), gated on the same `d.canUpload` window as the awaiting one so there is
  still only one answer to "may this day take a file". It keeps the date, which is the point of a
  press that lives on a day.

## TESTS
- `supabase/tests/34_multiple_files_same_day.sql` — five files on one course on one day: same link
  twice, no code twice, then a corrected re-export of the first. Asserts the union, no member with
  two live rows, the correction reaching only inside its own call, and a different day untouched.
- `src/components/multipleFilesSameDay.test.ts` — the three places outside the database that have
  to agree with it: the override's scope, the question the operator is asked, and the way in from
  the day.

## VERIFICATION (run, not assumed)
Every migration replayed from scratch against a fresh **PostgreSQL 16.14** and the whole spec suite
run against it — the pre-flight the process layer asks for. The local harness scripts are
psql-driven and no psql is installed on this machine, so the server was driven through a stand-in
that speaks the same contract (fresh database per spec, statement at a time, stop at the first
error, `\echo` and `\gset`). Nothing in the repo depends on it.

- **All 48 migrations apply clean in order**, 0044 included.
- `34_multiple_files_same_day.sql` — **23 / 23**.
- `29_import_override.sql` — **29 / 29**. `31_override_scoped_by_meeting_code.sql` — **19 / 19**.
  The correction behaviour 0037 and 0042 were asked for is untouched.
- **The spec has teeth.** Replayed with 0044's three clauses removed, its third assertion fails:
  `a second call on the same meeting link reverts nobody -- got 2 want 0`. Those two are the
  morning class, erased by the evening class's file. That is the defect, reproduced.
- **Attribution, measured rather than argued.** The suite was run twice — once with the change,
  once with it stripped out — and diffed. **Exactly one spec's result moves, and it is this one**
  (FAIL(2) → ok(23)). 548 assertions pass. Eleven other specs fail byte-identically in both runs;
  they belong to other work in flight in this tree (`0043_audit_remarks`, `0044_delete_member`,
  `0045_member_inactive_from`, `0045_import_change_counts` and their specs) and none is touched
  here.
- The `Created on` line is sent to PostgREST as a `timestamptz` filter. Every shape Meet writes —
  `2026-08-22 17:55:00`, `Aug 22, 2026, 5:55 PM`, `22 Aug 2026, 17:55`, with or without an offset —
  was cast against the live server and all six parse, so the filter and the insert compare as
  instants and not as text.
- App side: `test:unit` 937 / 937, `check:icons` 75 / 75, `check:contrast` 2840 / 2840,
  `audit:testids` and `audit:colors` no new violations.

### NOT verified, and it matters
`supabase/functions/csv-import` is **not deployed and not run**. There is no Deno step in
`ci/github-actions-ci.yml`, so the change there is checked by inspection and a parser pass only.

### The ordering hazard
`0045_import_change_counts.sql` (another session, uncommitted) re-issues `commit_csv_import` too
and applies AFTER this one, so it is the definition that wins. It currently carries all three
instance clauses, which is why the suite above is green. Regenerate it from 0042 and the scoping is
silently lost — `34_multiple_files_same_day.sql` is what would catch that.
