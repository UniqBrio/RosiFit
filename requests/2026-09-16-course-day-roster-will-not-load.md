# BUG REQUEST — something is broken
<!-- Filled by workflows/request.md (/request) · Consumed by Track C: /bug requests/<this-file> -->
<!-- Root cause comes before any fix - always. Stated fields are BINDING; "unknown" is honest. -->

Run **Track C** ([workflows/bug.md](../../workflows/bug.md)) with this request.

## FIELDS
- WHERE: Course screen → Postnatal → **Attendance** tab — the roster cards under the day strip
- WHAT HAPPENS: every member card on the roster reads `"Attendance for this week could not be loaded."` in place of its Present / Absent / Yet to mark reading. The cards themselves render — name, email, `Missed 14–20 Sep 2026: N`, the Active pill and the two buttons are all present and correct.
- WHAT SHOULD HAPPEN: each card shows that member's reading for the selected day.
- WHEN IT STARTED: unknown
- WHO IS AFFECTED: as seen: Postnatal, day **Tue, Sep 15**, **every** card on the screen — not some. Whether other courses or other days are affected was not stated: unknown. The rest of the screen is unaffected — the roster list itself, the joined-after and inactive lines, and the missed counts all load.
- REPRO STEPS: 1) Open Courses → Postnatal → Attendance 2) the day strip has Tue, Sep 15 selected 3) every card under it carries the sentence.
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

## NOTES — not binding fields
- RUN MODE: not stated → default `auto`.
- The run log could not be opened for this run: `scripts/run-log.mjs` permits one open run at a
  time and a **different session's** CHANGE run (inactive-members pop-up) has been open in this
  shared worktree since 12:24. Closing it would have falsified that session's row, so it was
  left alone and this run is unlogged. Recorded here rather than silently skipped.
