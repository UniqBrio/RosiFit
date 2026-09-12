# BUG REQUEST — something is broken
<!-- Filled by workflows/request.md (/request) · Consumed by Track C: /bug requests/<this-file> -->
<!-- Root cause comes before any fix - always. Stated fields are BINDING; "unknown" is honest. -->

Run **Track C** ([workflows/bug.md](../workflows/bug.md)) with this request.

The requester's words, verbatim, with three Meet exports attached
(`meeting_9-11-2026_8-54-13 AM_zko-zkeo-jts.csv`, `…_8-54-05 AM_uhm-bcbp-qvv.csv`,
`…_8-53-58 AM_bwv-pbdv-krh.csv`):

> "User was unable to upload these 3 file identify the root cause and issue and give fix dont
> apply"

and, on being shown the cause and the fix: *"Go ahead"* — apply the code fix; the duplicate
clean-up it surfaced is a separate ask and is NOT in scope here.

## FIELDS
- WHERE: Attendance upload (`app/upload.tsx`) → Browse → three files picked together → the
  batch preview, which calls the `csv-import` Edge Function.
- WHAT HAPPENS: the batch stops before anything is staged. The person sees the generic failure
  panel — *"Something went wrong. Please try again. Nothing was written."* The function's own
  log says why: `TypeError: Cannot read properties of undefined (reading 'full_name')` at
  `csv-import/index.ts` (the candidate lookup), HTTP 500, six times between 03:47 and 04:10 UTC
  on 12-Sep-2026 — every attempt at this batch.
- WHAT SHOULD HAPPEN: the three files merge into one register for Thu 11 Sep, Postnatal · Main,
  exactly as the three-file batches uploaded a minute earlier for the same day did.
- WHEN IT STARTED: 12-Sep-2026 03:40 UTC. A twelve-file batch uploaded against the wrong course
  created 106 members in one commit and took live members from 935 to 1,041.
- WHO IS AFFECTED: **only a file that names a member outside the first 1,000 rows of the
  members table.** The 10:53, 16:02 and 18:27 batches for the same day succeeded at 03:46–03:47;
  this one failed at 03:47:36 and on every retry. In these files at least two names hit an alias
  whose member sits past the cap: "Ruby nancy" and "saranya ramasamy". That selectivity is the
  clue — see the root cause.
- REPRO STEPS: 1) An academy with more than 1,000 live members 2) Upload a Meet file naming a
  member whose row is not among the first 1,000 returned 3) Preview throws.
- WAS WORKING BEFORE?: yes — until the member count crossed 1,000. No external dependency is
  degraded (C0 checked: the function's other calls in the same minute returned 200).
- CORRECTION ROUND: 1 on this function. It is RC-039's class — the API's 1,000-row cap — which
  was fixed for the client in `src/data/pageAll.ts` (RC-039, RC-041) and never swept into the
  Edge Functions, because they run on the service-role client and "bypasses RLS" was read as
  "bypasses the cap".

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

## ANSWERS TAKEN AT INTAKE
- **Scope of "Go ahead"** — asked, because it could mean two things. Answer: apply the code fix.
  The 106 duplicate members the wrong-course batch left behind are reported, not touched.

## NOT IN SCOPE, stated so it is not lost
- The 106 members created at 03:40 UTC on 12-Sep-2026 on General · Main from a batch later
  reverted. Many duplicate Postnatal members ("32 J.Sharmila", "Kasthuri Ganesan", …) and will
  make those names `ambiguous` on the next upload. A data clean-up is its own request.
- The client's own "Something went wrong" wording for a 500. The message was not the bug here.
