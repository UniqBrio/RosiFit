# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

> **Origin.** One message from the requester on 06-Sep-2026, sent with a
> screenshot of `/member/import` as it ships today. Five changes to the same
> screen and the template it builds; nothing else in the app is in scope.

## FIELDS
- FEATURE / SCREEN: Bulk import members — `app/member/import.tsx`, and the two
  pure modules behind it, `src/data/memberXlsx.ts` (the template and the
  parser) and `src/data/memberImport.ts` (the rules).
- CURRENT BEHAVIOUR:
  - The Member Data sheet carries six columns — Full Name, Email, Course,
    Branch, Display Names, Joined On. Only Course, Branch and Joined On carry
    an Excel rule; Full Name, Email and Display Names carry none, so a name of
    one character or `not-an-address` lands in the cell and only fails once the
    file reaches RosiFit.
  - Display Names are separated by a SEMICOLON, said in the on-screen help and
    in the instructions sheet but nowhere in the data sheet's own header.
  - The Branch column is always built, including for an academy that runs
    everything at one branch, where the dropdown has exactly one entry.
  - Joined On is a date column, ISO only (`YYYY-MM-DD`), blank meaning today.
  - "THE FILE" — a paragraph and a six-row table of what each column means —
    sits inline on the screen, above the two buttons, and is the first thing
    on it after the course banner.
- DESIRED BEHAVIOUR:
  1. "add validation for all fields in excel" — every column on the Member
     Data sheet carries an Excel rule that STOPS a bad cell, not only Course
     and Branch.
  2. "for adding display name allow users to add it such that names are
     seperated by commas and show the same in template format in header beside
     display name in bracket" — commas are the separator, and the data sheet's
     own header cell says so in brackets.
  3. "Show branch column only if more than one branch is present" — an academy
     with a single branch gets a five-column sheet with no Branch on it.
  4. "same as course user cannot add new branch instead they should be
     selecting" — the Branch rule refuses a typed-in branch, as Course already
     does.
  5. "remove joined date on import keep it as current date by default" — the
     Joined On column goes, and every imported member is dated today.
     Confirmed by the requester against the alternative of keeping the column
     in `dd-mmm-yyyy`: **remove it entirely.** The `dd-mmm-yyyy` half of the
     original message therefore has no column left to apply to and is not
     built.
  6. "remove all this info and make it appear as pop up with background
     overlay as other pop ups same as upload attendance pop up" — the file
     description and the column table leave the page body and open as a dialog
     over it, drawn the way `app/upload.tsx` draws its own.
- WHY: `unknown` for 1, 2 and 6 — the requester stated the change, not the
  problem behind it. For 3, a dropdown of one is a question with one answer.
  For 5, the joining date of a bulk-imported member is the day she was
  imported.
- MUST NOT CHANGE: the import's shape — file, validate, preview, confirm, one
  RPC for the whole file, every row judged on its own, a duplicate skipped
  never overwritten, the error report. The 500-row and 5 MB ceilings. The
  OWNER-ONLY gate and its refusal state. The "add a course first" empty state.
  The course-is-per-row rule and the blank-Course fallback to the course the
  import was opened from. The screen stays under the shell (`headerShown:
  false` in `app/_layout.tsx`) — item 6 is about the INFO, not the screen.
  No migration: `bulk_import_members` already reads a missing `joined_on` as
  null and `create_member` already coalesces null to `current_date`.
- CORRECTION ROUND: 2 — round 1 is above, and shipped. Round 2 is one further
  message from the requester on 06-Sep-2026, sent with two screenshots of the
  reference implementation's own import (its "Import Multiple Students" sheet
  and its "Import complete" card):
  7. "On uploading the file just import data ... no many approvals jus import
     and on upload import done" — choosing the file IS the import. The preview
     of every row and the "Import N members" button under it are removed; the
     file is read, judged, written and reported on one tap.
  8. "show it like this" — the result is the reference's four counts:
     Imported, Skipped (already exist), Failed, No course. "No course" is new;
     it was folded into Failed before, and it is the one refusal fixed in
     RosiFit rather than in the file.
  9. "make sure email is mandatory while uploading member" — a row with no
     address is refused. It is counted under Failed, named with its reason,
     and carried into the downloadable report.
  Kept from round 1 and NOT part of round 2's ask, so left standing: the
  error-report download. It is not an approval — the import has already
  happened when it appears — and it is the only thing that scales to a
  five-hundred-row file whose refusal list is longer than the card.
  Also not asked for and not built: making the address mandatory anywhere
  else. `create_member` still accepts a member with no address, and a member
  already on the register without one is untouched — C-76 stands.

## DESIGN SURFACE
- VISUAL?: yes
- SCREENS & STATES TOUCHED: `/member/import` in its file-choosing state — the
  info block is removed from it and a new dialog state is added over it. The
  preview, results and error-report states are unchanged. The generated
  workbook is the other visual surface: its header row and its column count.
- STRINGS ADDED OR ALTERED: the Member Data header cell for Display Names
  (gains "(separate with commas)"); the help line for Display Names (semicolon
  becomes comma); the help line and instruction line for Joined On (removed);
  the new dialog's title, subtitle and the control that opens it; the Excel
  error titles and messages for the four new rules. Every other string on the
  screen is frozen.
- PERMISSIONS: no — the OWNER-ONLY gate is untouched.
- RUN MODE: auto

## STANDING INSTRUCTIONS (do not edit)
- Track B is SURGICAL: minimum change for the ask; every changed line traces to
  this request. MUST NOT CHANGE seeds the plan's "deliberately NOT changing"
  list.
- Definition of done: `npm run check` green. No DB change, so no harness run.
