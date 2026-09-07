# BUG REQUEST — something is broken
<!-- Filled by workflows/request.md (/request) · Consumed by Track C: /bug requests/<this-file> -->
<!-- Root cause comes before any fix - always. Stated fields are BINDING; "unknown" is honest. -->

Run **Track C** ([workflows/bug.md](../../workflows/bug.md)) with this request.

## FIELDS
- WHERE: the Enter PIN screen (sign-in), the Change PIN screen reached from both staff login
  and super admin login, and the Registration screen's submit button.
- WHAT HAPPENS:
  1. On the Enter PIN screen in mobile view "only two number boxes appearing in a row".
  2. On the Change PIN screen, mobile view: "its overlappping enter pin fields" — the four PIN
     boxes are drawn on top of the keypad keys. Screenshot supplied by the requester.
  3. "when user changes pin it stucks there and doesnt navigate to respective dashboard same
     issue is with staff login and super admin for first time log in".
  4. Registration screen: "the button name is register and issue pin it should be register and
     set pin".
- WHAT SHOULD HAPPEN:
  1. The keypad shows three number boxes per row in mobile view.
  2. Nothing on the Change PIN screen overlaps anything else at mobile width.
  3. Changing the PIN lands the person on the dashboard for her role.
  4. The registration button reads "Register & set PIN".
- WHEN IT STARTED: unknown
- WHO IS AFFECTED: mobile view. Items 2 and 3 stated for BOTH staff login and super admin
  login — both, not one of them. Item 3 stated specifically for "first time log in".
- REPRO STEPS: stated only as "in mobile view"; for item 3, sign in for the first time as
  either role and complete the PIN change.
- WAS WORKING BEFORE?: unknown
- CORRECTION ROUND: 1

## RUN MODE
auto (default — the description did not say how to run)

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
