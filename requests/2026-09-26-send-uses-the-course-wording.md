# BUG REQUEST — something is broken
<!-- Filled by workflows/request.md (/request) · Consumed by Track C: /bug requests/<this-file> -->
<!-- Root cause comes before any fix - always. Stated fields are BINDING; "unknown" is honest. -->

Run **Track C** ([workflows/bug.md](../workflows/bug.md)) with this request.

RUN MODE: auto (default — nothing said)

## FIELDS
- WHERE: member pop-up → "Reach out" (single member) and course → "Send communication" (group); the email that is actually delivered.
- WHAT HAPPENS: "When the email is sent to rcflive1@gmail.com (using "Reach out" button) who missed a few(4) sessions in the last week, I sent a message using "Reach out" and it triggers the old email template(content) instead of using the latest corrected email content". Delivered email: subject "We missed you this week, rosi", body "You were down for 4 sessions in Postnatal between 2026-09-21 and 2026-09-27, and made 0. …" — the seeded "Gentle check-in" template. The Postnatal course form shows its saved wording "Live class attendance update" / "Hi Ma, …" (requester: "it is saved as per the UI, the latest content is present").
- WHAT SHOULD HAPPEN: "One template for one course. Every course should follow its own template mentioned in course edit/create form. It is applicable for individual reach out and group communication (Reach out and Send communication buttons)."
- WHEN IT STARTED: unknown
- WHO IS AFFECTED: any member of a course whose form carries its own wording (seen on Postnatal); the from-address is the course's own, only the wording is wrong.
- REPRO STEPS: 1) Save own wording on a course (Postnatal) 2) Open a flagged member of that course 3) Reach out → Send 4) The delivered email carries the template's wording, not the course's.
- WAS WORKING BEFORE?: unknown
- CORRECTION ROUND: 1

## REQUESTER DECISIONS (26-Sep-2026, asked in session)
- Postnatal's stored wording is left exactly as typed ("Hi Ma," and the fixed dates stay).
- Deliverable: branch pushed + PR opened. The live Supabase project is not touched (no Edge Function deploy) until the requester says so.

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
