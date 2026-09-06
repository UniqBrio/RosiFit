# BUG REQUEST — something is broken
<!-- Filled by workflows/request.md (/request) · Consumed by Track C: /bug requests/<this-file> -->
<!-- Root cause comes before any fix - always. Stated fields are BINDING; "unknown" is honest. -->

Run **Track C** ([workflows/bug.md](../../workflows/bug.md)) with this request.

## FIELDS
- WHERE: Add a course form (dialog) — the email template / wording card, then Add Course
- WHAT HAPPENS: Saving fails with an error panel in the dialog: "Something went wrong" /
  `new row for relation "course_communication" violates check constraint
  "course_communication_subject_check". Nothing has been saved.` /
  "Nothing was changed. You can try again safely." with a **Try again** button.
  The course is not created.
- WHAT SHOULD HAPPEN: The course saves with the edited email template.
- WHEN IT STARTED: unknown
- WHO IS AFFECTED: as stated — happens when the email template is edited in the Add a course
  form and the course is then saved. Whether it also happens without editing the template,
  and for which roles/environments, is `unknown`.
- REPRO STEPS: 1) Open Add a course 2) Edit the email template 3) Press Add Course.
  (Stated at this level only — the exact template text entered is `unknown`.)
- WAS WORKING BEFORE?: unknown
- CORRECTION ROUND: 1
- RUN MODE: auto (default — the description said nothing about approvals)

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
