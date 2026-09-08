# BUG REQUEST — something is broken
<!-- Filled by workflows/request.md (/request) · Consumed by Track C: /bug requests/<this-file> -->
<!-- Root cause comes before any fix - always. Stated fields are BINDING; "unknown" is honest. -->

Run **Track C** ([workflows/bug.md](../../workflows/bug.md)) with this request.

## FIELDS
- WHERE: bulk member import — the member file uploaded from Members / a course's **Bulk Import**, and the joining date the imported member is then shown to have ("Joined on" on her record, `Joined` in the register).
- WHAT HAPPENS: the requester states the expectation only: *"when member is imported from bulk import then joined on should be default as the current uploaded date"*. No error text was quoted. **Observed in the source, not yet confirmed against a live import:** the member file has carried no Joined On column since 0029, so `bulk_import_members` passes `null`, and `create_member` (0016/0026) inserts that raw null into `members.joined_on` — only the *enrolment* gets `coalesce(p_joined_on, current_date)`. Her joining date is therefore left blank and reads `—`.
- WHAT SHOULD HAPPEN: a member created by a bulk import has her joining date set to the date of that upload, with no cell for it in the file.
- WHEN IT STARTED: unknown — the shape has been this way since the Joined On column was removed from the template (0029, 07-Sep-2026); the blank only became visible on screen once RC-029/RC-031 started showing and using the stored date.
- WHO IS AFFECTED: unknown — the requester named no selectivity. From the source, the null can only arrive from a caller that passes no date, and the bulk import is the only one that does: the Add Member form always sends a date.
- REPRO STEPS: unknown — not stated. (Expected: upload a member file with a new name → open her record → "Joined on".)
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
