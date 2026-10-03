# BUG REQUEST — the unsubscribe link shows HTML source
<!-- Filled by workflows/request.md (/request) · Consumed by Track C -->

Run **Track C** ([workflows/bug.md](../workflows/bug.md)) with this request. Triage: one of four items reported together on 30-Sep-2026 (items 3 and 4 share this file where noted).

## FIELDS
- WHERE: the unsubscribe link in a follow-up email → `functions/v1/unsubscribe`
- WHAT HAPPENS: "On clicking unsubscribe link its leading to html file" — screenshot shows the page's markup (`<!doctype html> … You are unsubscribed …`) as text.
- WHAT SHOULD HAPPEN: a readable confirmation page (implied by the report).
- WHEN IT STARTED: unknown
- WHO IS AFFECTED: members clicking the link (as reported; other browsers/clients unknown)
- REPRO STEPS: 1) open a follow-up email 2) click the unsubscribe link
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
