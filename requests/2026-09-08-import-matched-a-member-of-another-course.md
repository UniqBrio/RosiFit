# BUG REQUEST — something is broken
<!-- Filled by workflows/request.md (/request) · Consumed by Track C: /bug requests/<this-file> -->
<!-- Root cause comes before any fix - always. Stated fields are BINDING; "unknown" is honest. -->

Run **Track C** ([workflows/bug.md](../workflows/bug.md)) with this request.

> **Why BUG and not CHANGE.** Nothing is being asked for that the app does not already claim to
> do. `set_attendance` (0035) already refuses to mark a woman present in a course she is not
> enrolled in — "% was not enrolled in a course on %" — because one active enrolment (0006)
> means a member belongs to exactly one course and there is nothing to choose. The CSV import
> is the one write in the app that does not ask. That is a defect, not a missing feature.

## FIELDS
- WHERE: the attendance upload — `/upload`, opened from a course (Postnatal). The Google Meet
  participant CSV, not the member workbook.
- WHAT HAPPENS: requester's exact words —
  "I uploaded a csv file containing member in postnnatal course and there was a name which was
  included in prenatal course as well when i uploaded it in postanatal it update attendance of
  person in prenatal instead of bringing her as new member in postnatal"
  Read as: a participant name in the Postnatal file matched, by name alone, a member enrolled
  in **Prenatal**. The import treated that woman as the same person: an attendance row was
  written for the Prenatal member on the Postnatal session, her `last_present_date` moved, and
  no member was added to Postnatal. Nothing on the result screen said a woman from another
  course had been marked.
- WHAT SHOULD HAPPEN: a name that resolves only to a member of a **different** course is not
  her. The row is filed as somebody new on the course being imported into — added with no
  email, listed under **No email** on that course — and the result screen NAMES her and says
  which course the collision was with, so an operator who meant the same woman can fold her in
  with "Add display name to existing member" (0032).
- WHEN IT STARTED: always. The matcher has never consulted the offering; the harm became
  silent on 06-Sep-2026, when the row-by-row review was removed and `matched` rows began
  importing without anybody being asked (`autoDecisions`, app/upload.tsx).
- WHO IS AFFECTED: only a name that appears in two courses. A file whose names are all members
  of the course it is uploaded into imports correctly, which is why this has not been seen
  before — and it is the selectivity the fix has to explain: the wrong write happens exactly
  when the single confident candidate is enrolled somewhere else.
- REPRO STEPS:
  1. A member "Divya Ramesh" is enrolled in Prenatal.
  2. Open Postnatal → upload a Google Meet export whose participant list contains
     "Divya Ramesh" (a different woman, or the same one who has moved course).
  3. The Postnatal register shows the **Prenatal** member marked (status `extra`), and
     Postnatal gains no member.
- WAS WORKING BEFORE?: no. Not a dependency outage — no external service is involved in the
  match; C0 does not apply.
- CORRECTION ROUND: 1.

## STANDING INSTRUCTIONS (do not edit)
- Track C order is binding: search `docs/registers/ROOT_CAUSE_REGISTER.md` for the same class;
  state the ROOT CAUSE, distinct from the symptom, BEFORE any fix; reproduce with a failing
  test, fix at the root, make it pass; if the cause is a pattern, sweep EVERY sibling site;
  append the root-cause entry; then the test gate.
- WHO IS AFFECTED is evidence — a fix whose mechanism does not explain the stated selectivity
  has not found the root cause.
- CORRECTION ROUND ≥ 2: before proposing anything, read the previous attempt and state what it
  missed and why. A recurring "fixed" bug is a process finding — flag `/framework-update`.
- Data-store-level cause → STOP, propose the change, wait for approval. Production is never
  touched automatically.
