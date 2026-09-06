# BUG REQUEST — something is broken
<!-- Filled by workflows/request.md (/request) · Consumed by Track C: /bug requests/<this-file> -->
<!-- Root cause comes before any fix - always. Stated fields are BINDING; "unknown" is honest. -->

Run **Track C** ([workflows/bug.md](../../workflows/bug.md)) with this request.

## FIELDS
- WHERE: Member form — the day row ("Her own days — optional"), on BOTH the Add dialog
  ("Welcome a new member") and the Edit dialog ("Edit member"). The comparison surface named
  by the requester is the Course form's FREQUENCY row ("Edit course").
- WHAT HAPPENS: No day ever shows as selected. On Add, after choosing a course, "the frequency
  days are [not] selected based on course" — nothing lights up. On Edit, "no color for selected
  days": the row's own copy names the days ("she follows the days Postnatal offerings run —
  Mon, Tue, Thu, Fri") while every chip renders unselected. The Course form's FREQUENCY row
  fills its chosen days with the accent; the member row never does.
- WHAT SHOULD HAPPEN: The day chips read the same as the Course form's frequency chips —
  the days in force are filled with the accent. Selecting a course pre-selects that course's
  days; the operator may take days off; she is never asked to re-pick days the course already
  states. Requester's words: "make sure the frequency days are selected based on course if
  they want they can deselect. dont allow user to reselect each time as its set already in
  course" · "It should appear same as in course form and in edit form also no color for
  selected days fix that".
- WHEN IT STARTED: unknown
- WHO IS AFFECTED: unknown (not stated). Observed by the requester on live data — course
  "Postnatal", branch "Main", member "Anita", dark theme.
- REPRO STEPS: 1) Members → Add member 2) Choose a course that runs on some days
  ("Postnatal") 3) Look at the "Her own days" row — no day is filled.
  Edit: 1) Members → open a member → Edit 2) Look at the same row — the copy names her days,
  no chip is filled.
- WAS WORKING BEFORE?: unknown
- CORRECTION ROUND: 1

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
