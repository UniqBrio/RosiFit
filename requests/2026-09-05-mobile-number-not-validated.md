# BUG REQUEST — something is broken
<!-- Filled by workflows/request.md (/request) · Consumed by Track C: /bug requests/<this-file> -->
<!-- Root cause comes before any fix - always. Stated fields are BINDING; "unknown" is honest. -->

Run **Track C** ([workflows/bug.md](../../workflows/bug.md)) with this request.

## FIELDS
- WHERE: Sign-in flow — the mobile number entry screen, on **Continue**, and the PIN screen it leads to.
- WHAT HAPPENS: "On entering mobile number its not validating mobile number on continue for any random mobile number its leading us to pin screen." Any arbitrary number entered is accepted and the flow advances straight to the PIN screen.
- WHAT SHOULD HAPPEN: On Continue, the number is validated against the existing accounts — **super admin and staff** — and Continue decides the destination:
  - **Recognised** (super admin or staff) → the **PIN screen**, unchanged. The PIN is still required; Continue never signs anyone in.
  - **Not recognised** → the **registration screen**, unconditionally — including after the academy is already registered (requester confirmed at the Track C gate on 05-Sep-2026, having been shown that registration is a one-time bootstrap and the screen will say "This academy is already registered. Sign in instead.").
  - After a correct PIN, routing is unchanged and already correct: super admin → `/(tabs)`; staff signing in for the first time (`must_change_pin`) → change PIN, then `/(tabs)`; staff who already set their PIN → `/(tabs)`.
  - CONFIRMED AT GATE: the requester chose "validate on Continue, exactly as the canvas does" over keeping the server-decides flow, accepting that this ships a public phone-lookup endpoint and with it a staff-enumeration oracle. Rate-limiting that lookup was offered as a third option and NOT chosen.
- WHEN IT STARTED: always — the behaviour has been in place since the sign-in screen was built.
- WHO IS AFFECTED: every person reaching the sign-in screen. No selectivity stated; the behaviour is unconditional.
- REPRO STEPS:
  1. Open the sign-in mobile number entry screen.
  2. Enter a mobile number that belongs to neither the super admin nor any staff record.
  3. Tap **Continue**.
  4. Observed: the PIN screen opens. Expected: the registration screen.
- WAS WORKING BEFORE?: no — Continue has never validated. `src/data/signin.ts` documents the divergence from the canvas as deliberate. Root cause at C1.
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
