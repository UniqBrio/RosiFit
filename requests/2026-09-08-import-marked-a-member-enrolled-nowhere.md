# BUG REQUEST — something is broken
<!-- Filled by workflows/request.md (/request) · Consumed by Track C: /bug requests/<this-file> -->
<!-- Root cause comes before any fix - always. Stated fields are BINDING; "unknown" is honest. -->

Run **Track C** ([workflows/bug.md](../workflows/bug.md)) with this request.

> **Why BUG and not CHANGE.** The app already claims this. `set_attendance` (0035) refuses to
> mark a woman present in a course she is not enrolled in — "% was not enrolled in a course on
> %" — and the round-1 fix below made the CSV import agree for a member enrolled ELSEWHERE.
> A member enrolled NOWHERE still gets marked, on a register that then cannot list her. The
> claim exists; the import does not honour it on this branch.

## FIELDS

- **WHERE:** the attendance upload — `/upload`, opened from a course (Yoda Advance · Main).
  The Google Meet participant CSV. The damage SHOWS on `app/course/[id].tsx`.
- **WHAT HAPPENS:** requester's exact words —
  "i uploaded attendance which has 3 member they might be in other coutse dont update it there
  bring them as new member without main in same course as we are uploading for couse"
  ("without main" read as *without mail* — with no email — which is how the app already files
  an imported name it does not know.)
- **DIAGNOSED AGAINST PRODUCTION** (read-only, 08-Sep-2026). Import
  `f6551732-93b1-459f-8d2d-9694f645aa82`, file
  `attendance_format_meeting_31-08-2026_20-12-56_gzj-yhru-ehp.csv`, Yoda Advance · Main,
  `session_date` 2026-09-08: `row_count` 3, `missing_email_count` 3, `unmatched_count` 0,
  `other_course_names` `[]`. All three rows — Rani, Rossy, UniqBotz Infotech — matched an
  EXISTING member on a confirmed display-name alias, each with `course_name` `"—"`: members
  `1562727e-9300-4ef8-95b9-7ae57d2667a9`, `5d316b6e-f5a3-494d-b58f-abe4e622af65`,
  `61bd1866-7438-49b6-8263-4d61e24231b3`, all with **no enrolment row at all**. Three `extra`
  attendance rows landed on the Yoda Advance 8 Sep session; the roster, built from enrolments,
  still reads **Members (1)**.
- **ROOT CAUSE (stated, not yet fixed):** `splitByCourse`
  (`supabase/functions/_shared/match.ts`) files a candidate with no live enrolment as `here`,
  deliberately — "A member with NO live enrolment is `here`. Nothing contradicts this course
  for her." She therefore classifies `noEmail` (an existing member of THIS course) rather than
  `unmatched` (somebody new), and `commit_csv_import` creates an enrolment ONLY on the
  `add_as_new` path (`0014_csv_import_commit.sql:140`). So she is marked present and never
  enrolled — present on a register that cannot list her.
- **WHAT SHOULD HAPPEN:** a name whose only member is enrolled in no course is either enrolled
  into the course being imported into, or filed as somebody new there — the requester's words,
  "bring them as new member … in same course as we are uploading for". Either way the register
  and the roster must agree afterwards.
- **WHO IS AFFECTED — the selectivity, which is the root-cause clue:** only a name matching a
  member with NO active enrolment. A file whose names are all enrolled in the course imports
  correctly; a file whose names are enrolled ELSEWHERE has been correct since round 1. The
  fix's mechanism must explain exactly that middle case.
- **WHEN IT STARTED:** always, on this branch. Round 1 narrowed the enrolled-elsewhere case on
  08-Sep-2026 and left this one, which its own comment states as intended behaviour — so the
  fix must say why that reasoning does not hold once the roster is derived from enrolments.
- **WAS WORKING BEFORE?:** no. No external service is involved in the match; C0 does not apply.
- **CORRECTION ROUND: 2.** Round 1 is
  `requests/2026-09-08-import-matched-a-member-of-another-course.md`, and it IS deployed —
  csv-import v13 in project `lhpzhkzbnquwjljmbylo` contains `splitByCourse`.
  **What round 1 missed:** it treated "not a member of this course" as meaning "a member of a
  DIFFERENT course", and split the candidates on that. A member of no course is neither, and
  fell through to the branch that assumes she belongs here. The `here` / `elsewhere` split has
  no third bucket, and needed one.
- **REPRO STEPS:**
  1. A member exists with an alias matching a name in the file and **no enrolment row**.
  2. Upload a Meet export naming her into any course.
  3. The register gains an `extra` row for her; the course roster count does not move.

## STANDING INSTRUCTIONS (do not edit)
- Track C order is binding: search `docs/registers/ROOT_CAUSE_REGISTER.md` for the same class;
  state the ROOT CAUSE, distinct from the symptom, BEFORE any fix; reproduce with a failing
  test, fix at the root, make it pass; if the cause is a pattern, sweep EVERY sibling site;
  append the root-cause entry; then the test gate.
- WHO IS AFFECTED is evidence — a fix whose mechanism does not explain the stated selectivity
  has not found the root cause.
- CORRECTION ROUND ≥ 2: the account of what round 1 missed is above and is binding.
- Data-store-level cause → STOP, propose the change, wait for approval. Production is never
  touched automatically.
