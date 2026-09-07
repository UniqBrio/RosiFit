# BUG REQUEST — something is broken
<!-- Filled by workflows/request.md (/request) · Consumed by Track C: /bug requests/<this-file> -->
<!-- Root cause comes before any fix - always. Stated fields are BINDING; "unknown" is honest. -->

Run **Track C** ([workflows/bug.md](../../workflows/bug.md)) with this request.

## FIELDS
- WHERE: Course detail → Attendance tab → **No email** section, on the member card's two
  actions: "Add as new member" and "Add display name to existing member".
- WHAT HAPPENS: `"nitha i added as new member but still apeaing under no mail section"` — the
  card stays in the No email group after she was added as a new member. And, in the
  requester's words, `"issue appearing when adding the no email member as display to existing
  member"` — the second button raises an error instead of folding her in. The exact toast
  wording was not quoted; unknown.
- WHAT SHOULD HAPPEN: after either action the row leaves the No email group, and the register
  holds one row for one person, with her attendance on it.
- WHEN IT STARTED: unknown. The screenshot is of today's build; the twin that keeps her listed
  was written before commit cc9438c the same day.
- WHO IS AFFECTED: the members the attendance import created from a Google Meet display name —
  "Ani" and "nitha" on the screenshot. Members who arrived with an address are unaffected.
  Live data only; the requester's screenshot is the live academy.
- REPRO STEPS:
  1) Open the course, Attendance tab, scroll to **No email**.
  2) On "nitha", tap "Add as new member" → her record opens → save it.
  3) She is still listed under No email.
  4) On the same card, tap "Add display name to existing member" and pick a member.
  5) An error appears and nothing is merged.
- WAS WORKING BEFORE?: no.
- CORRECTION ROUND: 2 — previous attempt commit `cc9438c` ("Add as new member" completes her
  record instead of writing a twin). No request file was written for that round.

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
