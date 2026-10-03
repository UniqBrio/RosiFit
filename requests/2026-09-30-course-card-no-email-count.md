# BUG REQUEST — Postnatal no-email count differs between screens
<!-- Filled by workflows/request.md (/request) · Consumed by Track C -->

Run **Track C** ([workflows/bug.md](../workflows/bug.md)) with this request. Triage: one of four items reported together on 30-Sep-2026 (items 3 and 4 share this file where noted).

## FIELDS
- WHERE: Attendance tab course card (Postnatal) vs the Postnatal course screen's Show filter
- WHAT HAPPENS: "Under Postnatal course the no of member under no emails are 59 in attendance screen but under courses screen the count appears to be 79" — card: "247 members need follow-up · 79 without email"; course screen: "426 with email · 59 without · 19 with an email issue", No email 59.
- WHAT SHOULD HAPPEN: the two counts agree (implied by "find root cause").
- WHEN IT STARTED: unknown
- WHO IS AFFECTED: Postnatal as reported; other courses unknown
- REPRO STEPS: compare the two screens (screenshots attached to the report)
- WAS WORKING BEFORE?: unknown
- CORRECTION ROUND: 1
- RUN MODE: auto (default — none stated)

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
