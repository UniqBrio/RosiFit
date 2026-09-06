# BUG REQUEST — something is broken
<!-- Filled by workflows/request.md (/request) · Consumed by Track C: /bug requests/<this-file> -->
<!-- Root cause comes before any fix - always. Stated fields are BINDING; "unknown" is honest. -->

Run **Track C** ([workflows/bug.md](../../workflows/bug.md)) with this request.

## FIELDS
- WHERE: Course detail screen, MEMBERS section — the pencil (edit) button on a member card. Screenshot supplied: the roster rows `Aliya`, `Anita`, `Asma`, each with an email and an `Active` pill, each with a pencil at the right.
- WHAT HAPPENS: "on click of edit button it is opening add member form instead of edit member" — the dialog that opens is the ADD form.
- WHAT SHOULD HAPPEN: The Edit form for the member whose pencil was tapped, carrying her record.
- WHEN IT STARTED: unknown
- WHO IS AFFECTED: unknown — no selectivity stated. The screenshot shows members WITH an email on a course roster.
- REPRO STEPS: 1) Open a course from the courses list 2) Scroll to MEMBERS 3) Tap the pencil on a member row.
- WAS WORKING BEFORE?: unknown — the same symptom was reported once before and corrected on 04-Sep-2026.
- CORRECTION ROUND: 2 — previous attempt: RC-012 in `docs/registers/ROOT_CAUSE_REGISTER.md` (04-Sep-2026), commit `2d2877a` "Four corrections: the member lookup, one dialog shell, More's back, the code". No request file exists for that round; the register entry is the record.

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
