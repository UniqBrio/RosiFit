# CHANGE REQUEST — any roster filter but Inactive hides the Inactive section — 13-Nov-2026
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

**Said (verbatim):** "On filtering no email the inactive member list is also showing up investigate
why?" — then, given the choice between hiding the section and narrowing it: "hide it, and apply the
same rule to all filters"

**Class:** CHANGE. The section stayed on screen by an earlier, written decision
(`showsInactive` in `src/data/rosterFilter.ts`: "every other choice leaves it whole"), so this
reverses a decision rather than repairing a defect.

## FIELDS
- FEATURE / SCREEN: Course → Attendance tab → roster filter, and the Inactive section at the foot of the roster
- CURRENT BEHAVIOUR: Ticking No email (or Present, Absent, Yet to mark, Bounced, Unsubscribed) narrows the register above, but the Inactive section below still lists every inactive member. Only *Active* (without *Inactive*) hides it.
- DESIRED BEHAVIOUR: Hide the Inactive section whenever any filter is ticked, unless *Inactive* is one of them. The section shows only when no filter is ticked or when *Inactive* is ticked.
- WHY: Filtering No email showed 344 inactive members (with addresses) under a filter that asked for members with no email.
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR — including the filter's counts, the register's own narrowing, the search box (which still narrows the section when it is shown), and the Inactive section's contents and cards.
- CORRECTION ROUND: 1

## DESIGN SURFACE
- VISUAL?: yes — the section disappears under more filter choices.
- SCREENS & STATES TOUCHED: Course detail, Attendance tab — the Inactive section; the empty state "Nobody was on the register on …" (whose body says the members are listed under Inactive below, which is no longer true while a filter hides the section).
- STRINGS ADDED OR ALTERED: none stated by the requester. One string is needed for the empty state above while a filter hides the section; everything else is frozen.
- PERMISSIONS: no
- USAGE: unknown
- RUN MODE: auto (default)
- SCALE: scoped (`app/course/[id].tsx` is a hotspot file, so not micro)

## STANDING INSTRUCTIONS (do not edit)
- Track B is SURGICAL: read the actual current files first (B1), run the impact analysis with
  the sibling call-site sweep (B2) BEFORE proposing, produce the plan with regression risks
  (B4) — confirm mode waits for approval; auto mode (default) logs it and applies — touching
  only what DESIRED BEHAVIOUR requires. Every changed line must trace to this request.
- MUST NOT CHANGE seeds the plan's "deliberately NOT changing" list; the plan may add to it,
  never subtract.
- If VISUAL?=yes, the plan carries the correction design pass (B4), scoped to the touched
  area: states, both themes in semantic tokens, the string table, the permission answer.
- CORRECTION ROUND ≥ 2: before proposing anything, read the previous attempt and state what it
  missed and why (B1). If the miss was the process's fault, flag `/framework-update` too.
- Close out with `checklists/DEFINITION_OF_DONE.md`, then the test gate. Nothing merges
  without a PASS.
