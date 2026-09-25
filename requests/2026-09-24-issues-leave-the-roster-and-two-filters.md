# CHANGE REQUEST — something that exists, asked to behave differently
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- Stated fields are BINDING; "unknown" is honest. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## THE ASK, as it arrived (24-Sep-2026, with a screenshot of a course roster)

> "This person has unsubscribed but she is stilll showing under person with
> email section. Instead she should be coming under email issues
> In dropdown show two options as bounced and unsubscribed"

Two asks in one message, and they are the same fact asked for twice: once as
a list and once as a filter.

## FIELDS
- ONE-LINE GOAL: a member whose address cannot be used is listed under **Email
  issues** and NOT also among the members with email, and the roster's dropdown
  can narrow to **Bounced** or **Unsubscribed** on demand.
- MUST-HAVE:
  - the course roster partitions into exactly three sections — no address,
    an address with an issue, an address that works. Every member is in
    **exactly one**: nobody twice, nobody lost;
  - a member moved into Email issues **keeps the attendance card**. The day's
    reading, the status pill and the day's tick are what the screen is for, and
    moving a member down the page must not cost them;
  - the line under the name on such a card names **which** address is the
    problem and the app's **existing word** for its state, rather than printing
    the address exactly as a working one — that printing is what the academy
    saw and reported;
  - the dropdown gains **Bounced** and **Unsubscribed**, worded letter for
    letter as the section's own group headings;
  - both filters are answered by the **same derivation** the section renders
    (`emailIssueFor`), so the filter and the section can never show different
    people (guardrail 1).
- EXPLICITLY OUT:
  - `update_member`;
  - unsubscribe semantics, suppression rules, and the email-sending path —
    `isReachable` and the send are untouched, exactly as the 23-Sep request
    that built the section required;
  - a second definition of bounced / unsubscribed / complained / reachable /
    sendable — `src/data/emailStatus.ts` remains the only one;
  - any send or reinstatement offered from this section, in any wording;
  - a **Spam Reported** dropdown option. The academy asked for two, and two is
    what ships. Such a member is still LISTED, under Spam Reported in the
    section itself, so nobody disappears — they are simply not reachable by a
    filter nobody asked for.
- USAGE PROFILE: staff reading a course roster, daily. The filters are
  occasional; the partition is on every render.
- CORRECTION ROUND: 2 (on the 23-Sep section) · RUN MODE: auto (not stated).

## WHY THE FIRST HALF WAS A DEFECT AND NOT A PREFERENCE

The section shipped on 23-Sep as a pure **addition**: it listed the members
whose address could not be used and changed nothing above it. A spec pinned
exactly that (`emailIssues.test.ts` case 15, `withEmail = shown.filter(m =>
m.emails.length > 0)`). The consequence is what the academy reported: an
unsubscribed member appeared **twice** — once among the members with email,
address printed in the ordinary muted grey as though a follow-up would reach
it, and once under Email issues. The first of those two is a screen stating
something untrue, and the count beside it ("N with email") was counting it.

That spec is re-pointed rather than appended to, because the owner reversed
the behaviour it asserted. It is recorded as an amendment in TEST_SUMMARY.md.

## DESIGN SURFACE
`app/course/[id].tsx` — the roster partition, the Email issues section's
layout, `MemberCard`'s address line, and two rows in the filter menu.
`src/data/emailIssues.ts` gains `emailIssueIds`, the one derivation both the
section and the exclusion read. `src/data/rosterFilter.ts` gains the two keys
and asks `emailIssueFor` for the answer. Both themes. Word AND icon, colour
never the only carrier (guardrail 3).

## THE GAP THIS CHANGE DOES NOT CLOSE, recorded rather than buried
Unchanged from 23-Sep and repeated here so it is not lost: a member whose
suppressed address was removed and re-added as a fresh `unknown` row is shown
as an issue, is now correctly kept out of the members-with-email list, and is
**still SENDABLE** — the send path is out of scope by the academy's own
instruction. Closing that means changing what the send does.

## STANDING INSTRUCTIONS (do not edit)
- Surgical discipline: every changed line traces to MUST-HAVE.
- Derived, never stored twice: a count and the rows it counts come from one
  pass (guardrail 1, CP-011).
- Both themes, verified not assumed.
