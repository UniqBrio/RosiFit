# BUG REQUEST — something is broken
<!-- Filled by workflows/request.md (/request) · Consumed by Track C: /bug requests/<this-file> -->
<!-- Root cause comes before any fix - always. Stated fields are BINDING; "unknown" is honest. -->

Run **Track C** ([workflows/bug.md](../../workflows/bug.md)) with this request.

## FIELDS
- WHERE: the app in general — "per main screen"; the 3 most-used screens are to be measured for JS size and Lighthouse. Which screens are the main / most-used ones: unknown.
- WHAT HAPPENS: "The app feels slow even with little data."
- WHAT SHOULD HAPPEN: unknown — no target load time was stated.
- WHEN IT STARTED: unknown
- WHO IS AFFECTED: users in India (stated as the user location to compare regions against). Role / device / network selectivity: unknown.
- REPRO STEPS: unknown
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

## REQUESTED MEASUREMENTS — binding, verbatim from the requester
"Measure before fixing, report numbers:"
1. "Supabase project region and Vercel function region vs users in India"
2. "per main screen: number of database/API calls, whether they run one after another, total time (network waterfall)"
3. "initial JS size and Lighthouse on mobile throttling for the 3 most-used screens"
4. "Supabase performance advisors: unindexed foreign keys, RLS auth.uid() per-row calls, missing indexes on list filters/sorts"

"Rank the causes by measured cost. Fix the top ones only after I see the numbers."

## NOTES — not binding fields
- RUN MODE: `confirm` for the fix — stated: "Fix the top ones only after I see the numbers."
  Measurement runs now; no fix is written until the requester has seen the ranked numbers.
- Classified BUG, not CHANGE: the ask is diagnosis-first (Track C's root cause before fix), and
  Track B's default auto mode would apply a plan the requester said must wait.
