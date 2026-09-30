# BUG REQUEST — a merged no-email member leaves the real member Absent; display name not reflecting
<!-- Filled by workflows/request.md (/request) · Consumed by Track C -->

Run **Track C** ([workflows/bug.md](../workflows/bug.md)) with this request. Triage: one of four items reported together on 30-Sep-2026 (items 3 and 4 share this file where noted).

## FIELDS
- WHERE: course screen → a no-email member's card → "Add display name to existing member" (merge); and adding a display name to an existing member
- WHAT HAPPENS: "if we add them under existing member who were under no email with status as present it still shows absent and again we cannot upload same meeting file as it will say already imported"; "Adding display name or adding no email member exisying member display name is not reflecting".
- WHAT SHOULD HAPPEN: "update their attendance with value of display name under no email as present if they are present".
- WHEN IT STARTED: unknown
- WHO IS AFFECTED: members merged from a no-email member the import created (as reported)
- REPRO STEPS: 1) upload a Meet file with an unmatched display name → it becomes a no-email member marked present, the real member absent 2) add that no-email member to the existing member 3) the existing member still reads Absent
- WAS WORKING BEFORE?: no — the merge rule was corrected once already (T-139, 0080, 26-Sep-2026)
- CORRECTION ROUND: 2 — previous attempt RC-118 / migration 0080 (fixed the attendance row only)
- "Adding display name" via the Edit form (not the merge): what should reflect is `unknown` — see the run report.
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
