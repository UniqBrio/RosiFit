# NEW REQUEST — something that does not exist yet
<!-- Filled by workflows/request.md (/request) · Consumed by Track A: /feature requests/<this-file> -->
<!-- Stated fields are BINDING; "unknown" is honest. -->

Run **Track A** ([workflows/feature.md](../../workflows/feature.md)) with this request.

## FIELDS
- ONE-LINE GOAL: inside each course, show which members' email cannot currently be used and why, so staff can act on it.
- MUST-HAVE:
  - a collapsible **Email issues** section on the course screen, immediately **below** the existing "No email" section and never merged with it;
  - a total count, and per-reason groups in the order **Bounced · Unsubscribed · Spam Reported**, each with its own count;
  - per member: name, address, status badge, a short title and explanation;
  - **bounced** carries an action into the existing Edit Member flow; **unsubscribed** and **complained** carry NO action — no send, no reinstatement, nothing that overrides the member's decision;
  - counts derived from the same dataset the rows are drawn from;
  - per course, respecting existing branch/search/roster filtering; never a member from another course;
  - a suppression that has been SOFT-DELETED is still recognised, and a newly-created `unknown` row for the same address must not hide it.
- EXPLICITLY OUT:
  - any change to suppression rules, unsubscribe semantics, or email-sending logic;
  - `update_member`;
  - a new WhatsApp/SMS integration (none exists to reuse; none was created);
  - a second definition of bounced / unsubscribed / complained / reachable / sendable — the existing `src/data/emailStatus.ts` is the only one;
  - any new visual design system; the section reuses the course screen's existing typography, spacing, badges, icons and accessibility patterns.
- USAGE PROFILE: staff open a course and want one place that answers "whose email is not working, and what do I do". Occasional rather than per-session; read-only.
- CORRECTION ROUND: 1 · RUN MODE: auto (not stated; default).

## DESIGN SURFACE
`app/course/[id].tsx` — one new collapsible section after the "No email" block. Both themes. Word AND icon for every status, colour never the only carrier (guardrail 3). The heading is a real control with an `expanded` state; each row is one accessible unit naming member, address, badge, title and explanation.

## THE ONE THING THIS FEATURE CANNOT DECIDE FOR ITSELF, recorded rather than buried
A member whose suppressed address was removed and re-added as a fresh `unknown` row is **shown here as an issue and is still SENDABLE** — `isReachable` and the send path are deliberately untouched, because this request put them out of scope. The Edit form has refused that re-entry since RC-107, but the bulk import does not go through the Edit form, so the shape remains reachable. Closing it means changing what the send does, which is a decision for the academy, not for a reporting section.

## STANDING INSTRUCTIONS (do not edit)
- Surgical discipline: every changed line traces to MUST-HAVE.
- Derived, never stored twice: a count and the rows it counts come from one pass (guardrail 1, CP-011).
- Both themes, verified not assumed.
