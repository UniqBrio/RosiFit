# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

## THE ASK, VERBATIM

> Improve the feedback when a user uploads the same CSV again without any changes.
>
> Currently, the system does not provide enough information.
>
> If the CSV was already imported and all attendance is already marked, clearly tell the user
> that there is nothing new to update.
>
> For example:
>
> "File already imported. Attendance is already marked and there is nothing to update."
>
> If a file contains a combination of existing and new records, provide useful feedback about
> what was added, skipped, or updated.
>
> Do not create duplicate attendance records.
>
> Inspect the existing import/deduplication logic and implement the messaging based on the
> actual import result.
>
> Add regression tests for duplicate, partially duplicate, and new CSV uploads.

## FIELDS

- FEATURE / SCREEN: **The upload attendance dialog** — [app/upload.tsx](../app/upload.tsx)
  (route `/upload`), reached from the course header, the course week strip and the Attendance
  tab. Behind it: [supabase/functions/csv-import/index.ts](../supabase/functions/csv-import/index.ts)
  (`preview` / `commit`) and `public.commit_csv_import()`.

- CURRENT BEHAVIOUR (read in the files, 07-Sep-2026):
  1. **The same file, byte for byte.** `preview` counts completed imports carrying the same
     `file_sha256` and throws `409 · "This file has already been imported."` (index.ts:74-76).
     `stage()`'s catch appends `"Nothing was written."` and renders it in the RED failure
     panel — so the operator who re-sent the file because she was not sure the first one
     arrived reads a *failure*, and still does not know whether the attendance was marked.
     Nothing on the screen says the register exists or what is on it.
  2. **The same class, exported again.** Meet writes a new file each export, so the
     fingerprint differs and the import genuinely runs — over a register that already says
     exactly what the file says. `commit_csv_import` answers `present_or_extra` (how many
     rows the file NAMED), so the result panel says *"12 marked present"* — word for word
     what the first upload said. Nothing distinguishes the two.
  3. **A partly-new file** reports the same one number. Which of those twelve were already
     there, which moved from absent to present, and which were new is not computed anywhere.
  4. **Duplicates were already impossible** and stay so: `attendance_unique_live` (0008) is
     one live row per (session, member), every write goes through that upsert, and
     `csv_imports_sha_completed` refuses a second completed import of one fingerprint.

- DESIRED BEHAVIOUR:
  1. The same file again is answered, not refused: which register it landed on, how many are
     marked on it now, and the requester's sentence — *"File already imported. Attendance is
     already marked and there is nothing to update."* — whenever it is true.
  2. A run that moved nothing says so: heading `Nothing to update · <day>` instead of
     `Imported · <day>`.
  3. A file of new and existing rows says what was **added**, **updated** and **skipped**.
  4. No duplicate attendance record, by any path — held by a spec, not by assertion.
  5. Regression tests for duplicate, partially duplicate and new uploads.

- WHY: the only reason anybody uploads the same file twice is that she is not sure the first
  one worked. A refusal does not answer that question; a count identical to the first
  upload's does not answer it either.

- MUST NOT CHANGE: everything not named above. In particular the override confirmation and
  its wording (`src/data/uploadOverride.ts`, [requests/2026-09-07-upload-override-confirm.md](2026-09-07-upload-override-confirm.md)),
  the two With email / No email tiles, the dropped / staff / repeated-name notes, the
  five-outcome matcher, and the rule that a mark made by hand outranks a file (0035/0037).

- CORRECTION ROUND: 1

## DESIGN SURFACE

- VISUAL?: yes
- SCREENS & STATES TOUCHED: the upload dialog's RESULT state only — plus one new result state
  (already imported). The choose, pick, working, confirm and failure states are untouched; a
  real failure still goes to the red panel.
- STRINGS ADDED OR ALTERED: the requester's sentence verbatim, plus the evidence lines,
  the `Nothing to update` heading and the added/updated/skipped summary — all in
  [src/data/uploadOutcome.ts](../src/data/uploadOutcome.ts), where the specs can read them.
  Every other string on the screen is frozen.
- PERMISSIONS: no — same roles, same grants; `commit_csv_import` stays service-role only.
- USAGE: once per class per day, by whoever ran the class. The re-upload is not rare: it is
  what somebody does when the first upload's result was not clear, which is the case here.
- RUN MODE: auto
- SCALE: scoped

## WHAT WAS BUILT

- `supabase/migrations/0045_import_change_counts.sql` — re-issues `commit_csv_import` (from
  0044) with `changes: {added, updated, unchanged, absent_added}`. Counting only; not one
  write moves. **Numbered 0045 deliberately:** `create or replace` means the last migration
  naming the function wins, and a second 0044 would have silently dropped the meeting-instance
  scoping added in `0044_override_scoped_by_meeting_instance.sql`.
- `supabase/functions/csv-import/index.ts` — the 409 becomes a 200 carrying `already_imported`
  (file, register, marked-now, and whether that was even this course), audited as
  `csv_import.already_imported`. It returns above the staging insert, so nothing is written.
- `src/data/uploadOutcome.ts` (+ `.test.ts`) — every sentence, as pure functions.
- `app/upload.tsx` — the already-imported result panel, the `Nothing to update` heading, and
  the "What this file changed" note.
- `supabase/tests/34_reimport_feedback.sql` — new / duplicate / partly-duplicate uploads, the
  counts each answers with, and one attendance record per member per day throughout.
