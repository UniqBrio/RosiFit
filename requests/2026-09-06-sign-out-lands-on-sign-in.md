# BUG REQUEST — something is broken
<!-- Filled by workflows/request.md (/request) · Consumed by Track C: /bug requests/<this-file> -->
<!-- Root cause comes before any fix - always. Stated fields are BINDING; "unknown" is honest. -->

Run **Track C** ([workflows/bug.md](../../workflows/bug.md)) with this request.

## FIELDS
- WHERE: **More → Sign out** (`app/(tabs)/more.tsx`, the *Sign out* row under *App*); the same
  control on the profile screen (`app/profile.tsx`, *Sign Out*).
- WHAT HAPPENS: requester's words, verbatim — *"on clicking signout its going to some other
  screen"*. Read in the code (2026-09-06): the session ends and the app lands on the
  **Overview** tab in its signed-out state ("You are signed out" card), still inside the
  academy shell.
- WHAT SHOULD HAPPEN: requester's words — *"it shoud go to enter number screen"*: the sign-in
  screen (`app/index.tsx`) on its first step, *Welcome back* with the mobile-number field.
- WHEN IT STARTED: unknown — the More screen has called `router.replace('/')` since
  `9f9f66c`; the Overview tab has answered to `/` since the tab group was built.
- WHO IS AFFECTED: every signed-in account (both roles) that signs out from inside the tab
  shell. Not stated by the requester; taken from the mechanism (see C1).
- REPRO STEPS: 1) Sign in 2) More 3) Sign out. Observe the Overview tab's "You are signed
  out" card rather than the number field.
- WAS WORKING BEFORE?: unknown. Nothing external is involved — no Supabase call decides the
  destination; the session does end (`supabase.auth.signOut()` is awaited) — so C0 is N/A.
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
