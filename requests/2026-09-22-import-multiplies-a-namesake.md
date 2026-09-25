# BUG REQUEST — something is broken
<!-- Filled by workflows/request.md (/request) · Consumed by Track C: /bug requests/<this-file> -->
<!-- Root cause comes before any fix - always. Stated fields are BINDING; "unknown" is honest. -->

Run **Track C** ([workflows/bug.md](../workflows/bug.md)) with this request.

The requester's words, verbatim, with a screenshot of the course register attached (three
cards, each "vishnu priya · No email on file · not in follow-up", each with a different
"Missed … in a row since" line):

> "What is this issue is it a logic missed issue or technical issue. Same display name
> appearing thrice?"

and, on being shown the cause: *"apply fix"*.

## FIELDS
- WHERE: the course register (`app/course/[id].tsx`, No email section) shows the symptom; the
  records are made by the attendance upload (`app/upload.tsx` → `csv-import` →
  `commit_csv_import`).
- WHAT HAPPENS: three live member records share the display name "vishnu priya" in one course.
  Each is a separate row keyed by its own id, with its own attendance history; the oldest has
  the longest missed streak. Every further upload naming that person adds one more record.
- WHAT SHOULD HAPPEN: one person, one record. A name the matcher attributes to two or more
  members already in this course is not "somebody new"; the import must not invent a third.
- WHEN IT STARTED: unknown to the day. The three records date from around 11, 14 and 15 Sep
  2026 by their streak lines.
- WHO IS AFFECTED: any member whose name is held by two or more live members of the same
  course. Once a pair exists, every upload naming that name creates another record and the
  present mark lands on the newest one, so the older records go absent.
- REPRO STEPS: 1) two live members named alike in one course, neither with an email 2) upload
  a Meet file naming that person 3) the preview files the row `ambiguous` 4) the commit
  creates a third member and marks it present.
- WAS WORKING BEFORE?: no. `autoDecisions` has filed every non-clean row as `add_as_new` since
  the row-by-row review was removed. Not an outage (C0: the import is completing, and writing).
- CORRECTION ROUND: 1.

## STANDING INSTRUCTIONS (do not edit)
- Track C order is binding: search `docs/registers/ROOT_CAUSE_REGISTER.md` for the same class;
  state the ROOT CAUSE, distinct from the symptom, BEFORE any fix; reproduce with a failing
  test, fix at the root, make it pass; if the cause is a pattern, sweep EVERY sibling site;
  append the root-cause entry; then the test gate.
- WHO IS AFFECTED is evidence — a fix whose mechanism does not explain the stated selectivity
  has not found the root cause.
- Data-store-level cause → STOP, propose the change, wait for approval. Production is never
  touched automatically.

## ANSWERS TAKEN AT INTAKE
- **Scope of "apply fix"** — read as: stop the import creating further namesakes, and tell the
  operator which rows were held back and what to do. Folding the three existing records into
  one is the operator's act ("Add display name to existing member", 0032) and is not done here.

## NOT IN SCOPE, stated so it is not lost
- The three existing "vishnu priya" records. Reported, not touched; production is never an
  automated target.
- How the FIRST pair was born. Three routes exist (the pre-12-Sep 1,000-row cap, RC-043; a
  namesake at another branch of the same course, which `splitByCourse` scopes by offering while
  `is_in_course` scopes by course; or two genuine people). Only the data says which.
- A server-side refusal in `commit_csv_import` for `add_as_new` on an `ambiguous` row. It
  belongs in a migration, and production's copy of that function already differs from the
  harness (T-120); filed in the root-cause entry as the recurrence risk.
