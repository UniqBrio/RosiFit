# BUG REQUEST — something is broken
<!-- Filled by workflows/request.md (/request) · Consumed by Track C: /bug requests/<this-file> -->
<!-- Root cause comes before any fix - always. Stated fields are BINDING; "unknown" is honest. -->

Run **Track C** ([workflows/bug.md](../../workflows/bug.md)) with this request.

RUN MODE: auto

## FIELDS
- WHERE: Attendance tab → course list → the edit (pencil) icon on a course row → the "Edit course" sheet
- WHAT HAPPENS: "on clicking edit course icon the form is opening with empty values". Per the requester's screenshot of the sheet opened from the course row "hhhhh" (Main Branch, 4 days/week, 3 members): the sheet header reads "Edit course" with the subtitle "hhhhh", but COURSE NAME is empty (showing the placeholder "e.g. Gentle Recovery Yoga"), BRANCH reads "Choose a branch", FREQUENCY has no day selected and shows "Required" plus "At least one day is required — with none, nothing is expected of anyone.", and the footer reads "A course name is required" with Save Changes unusable. FOLLOW-UP TRIGGER shows 4 with "4 missed sessions in a week" selected.
- WHAT SHOULD HAPPEN: The Edit course form opens prefilled with that course's saved values.
- WHEN IT STARTED: unknown
- WHO IS AFFECTED: unknown — the screenshot shows the course "hhhhh"; the requester did not state whether other courses or other roles differ
- REPRO STEPS: 1) Open the Attendance tab 2) Click the edit (pencil) icon on a course row (screenshot: "hhhhh") 3) The Edit course sheet opens with empty values
- WAS WORKING BEFORE?: unknown
- CORRECTION ROUND: 2 — corrected at intake. This surface was fixed on 06-Sep-2026 as part of
  RC-021 ("not loaded yet" and "not on the register" both rendered as the ADD form, commit
  78a4444), whose sweep names `app/course/edit.tsx` and the blank Edit form by that exact
  description. The requester did not know of that round; the register did.

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
