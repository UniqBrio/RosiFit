# 020 — Reach out sends to the member whose record is open

**Status:** Accepted · **Date:** 07-Sep-2026
**Request:** `requests/2026-09-07-reach-out-already-sent-and-rule-label.md`

## Context

"Reach out" is pinned in the footer of the member pop-up — it is what the record is opened
for. It pushed `/send` with **no member and no course id**, which meant two things nobody had
written down:

1. It opened the follow-up draft for the whole academy and left you to find her in it.
2. Because no course id reached `useCourseMessage`, it resolved `null`, and `!message.data` is
   `send/index.tsx`'s error branch — so in practice the button rendered *"The draft could not
   be loaded. Nothing has been sent."* Confirmed in a browser, not inferred.

The request asked for a pop-up when "the email has sent already", and for a member emailed
"using the reach out button" to be ignored "when sending multiple emails at once". Neither
sentence has a meaning while Reach out is an academy-wide action: there is no *her* send to
distinguish from the batch.

## Decision

**Reach out opens a draft scoped to that member** — `/send?member=<id>` — and the wording is
resolved from **her own course**.

The requester was asked before this was applied, because narrowing the button removes a route
that ships today, and a capability removal is a hard stop in any run mode. They chose it over
leaving the button academy-wide.

Nothing about *how* a send happens changed: the same dialog, the same stored template, the same
tick, the same "this cannot be recalled" confirmation, the same per-member result. The draft
narrows **who is listed** and nothing else.

## Options rejected

- **Leave Reach out opening the all-courses draft, and put the pop-up in front of it.** The
  offered alternative. Rejected by the requester. It would also have left the pop-up incoherent:
  a warning about *her* duplicate, followed by a list of everybody, in which she is unticked
  anyway.
- **Make Reach out send immediately, with the pop-up as its only confirmation.** Never
  proposed as a default. An email cannot be recalled; the draft's existing confirmation is the
  place that decision belongs, and a one-tap send from a record screen is how the wrong person
  gets written to.
- **Resolve the wording from the academy's default template when a member's course has none.**
  Rejected: guardrail 5 says the wording belongs to the course. Sending course A's message to a
  member of course B because B had no row is worse than not sending, so that case is now its own
  answer — *"There is no wording to send"* — rather than a silent substitution.

## Consequences

- The member pop-up no longer reaches the all-courses draft. Weekly and the course screen still
  do, and the course screen's path works.
- **The weekly screen's own "Reach out to N members" is still dead** for the same null-course
  reason, and is deliberately not fixed here — an all-courses send has no single course wording
  to use, which is a product question, not a UI fix. **TD-033.**
- A member with no resolvable course (renamed, removed, or an ended enrolment leaving `course`
  as `—`) gets a named answer instead of an error card that offers a pointless retry.
