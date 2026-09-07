# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: Overview tab — `app/(tabs)/index.tsx`: the Course / Period / Branch
  filter row, and the four chart sections below it (Attendance, Based on member, Based on
  course, Based on period).
- CURRENT BEHAVIOUR: Verified by rendering the built app at 1440×900, not from memory.
  - The filter row scrolls away with the page. By the time "Based on course" is on screen,
    the Course / Period / Branch fields are gone.
  - "Based on course" exists and does carry course names, but it is the third section, below
    the fold, and each course is a small donut showing only a percentage, the course name and
    `"1 of 9 present"`. It does not carry the `scheduled · attended · missed` line the member
    bars carry.
  - "Based on member" lists member names and their session counts, and says nothing about
    which course or branch each member belongs to.
  - The Attendance card is short and stretches to match the taller "Based on member" card
    beside it, leaving a large empty area under its three facts.
- DESIRED BEHAVIOUR: Requester's words — `"show course details under overview section"`;
  `"the current graphs has no details of courses and others"`; `"there are no course name and
  others graph should have full info"`; `"freeze the dropdown section in overview"`.
  Read as two asks:
  1. The Overview graphs should carry full information, course name included — the course
     breakdown reachable and detailed under Overview rather than a percentage below the fold.
  2. The Course / Period / Branch filter row stays fixed in place while the sections below it
     scroll.
- WHY: unknown — not stated. (The requester was shown the existing "Based on course" section
  and replied that the graphs have no course name and should have full info; the underlying
  goal was not given.)
- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. Specifically named by the
  binding architecture rules rather than the requester: every figure still counted from the one
  narrowed member list (guardrail 1 / C-84–87), so no section may total anything of its own.
- CORRECTION ROUND: 2 — `requests/2026-09-06-overview-two-per-row-donuts.md` is the previous
  attempt on this exact surface. It replaced the by-course dot plot and the by-period line with
  donuts (ADR-026 is cited in the screen's header comment). The present complaint is that those
  donuts do not carry enough detail. Track B must read that request and state what it missed
  before proposing anything.

## DESIGN SURFACE
- VISUAL?: yes
- SCREENS & STATES TOUCHED: Overview (`app/(tabs)/index.tsx`) only — its loading skeleton,
  its error state, and the "no member matches these filters" / "no course matches these
  filters" empty states. Offline and permission-denied unaffected. Shared components at risk:
  `src/components/Dropdown.tsx` (the frozen row), `src/components/AttendanceRings.tsx` and
  `src/components/AttendanceBars.tsx` (the detail), each of which has other call sites — the
  B2 sweep must enumerate them.
- STRINGS ADDED OR ALTERED: unknown — the requester named no wording. Everything currently on
  the screen is frozen; any new label is a B3/B4 question.
- PERMISSIONS: no — Overview is already super-admin only (`useAdminRedirect`), and nothing
  here changes who sees it.
- USAGE: unknown — not stated.
- RUN MODE: auto (nothing said about approvals; the default applies)
- SCALE: `<left blank — the track decides at B0; micro is refused for CORRECTION ROUND >= 2>`

## OPEN QUESTIONS — the requester did not settle these; taken in auto mode

- **Q1. What the previous attempt missed (B1, correction round 2).**
  `2026-09-06-overview-two-per-row-donuts.md` replaced the by-course dot plot and the
  by-period line with rings, and settled its own Q2 in auto mode: one ring per course, the
  percentage in the hole. What went with the marks it replaced was their DETAIL — the dot plot
  carried a shared axis and the sections were full-width, and the ring that replaced it had a
  132px-narrower column and a count line shortened to "1 of 9 present". Two-per-row then moved
  the course section below the fold on a desktop. So the section did not disappear; it got
  smaller, terser and lower, which is exactly the complaint. **The miss was detail traded for
  compactness without anyone deciding that trade.** Not a process fault — the request asked for
  "minimal" and got it — so no `/framework-update`.

- **Q2. Which graphs lack "details of courses and others"?** `unknown` — the requester named
  no section. **Taken:** all of them, in the two ways detail was missing. Every ring (course AND
  period — the "others") now writes `reportMeta`, the same *scheduled · attended · missed*
  line the member bars already wrote. And the member bars, which named six people and never
  said which course any of them was in, now carry the course and branch under the name.

- **Q3. Where does the course name belong on the member chart?** `unknown`. **Taken:** a muted
  line under the member's name, before the bar — not a colour, not a chip. A course is not a
  status, and colour on this screen already means Present/Absent (guardrail 3). Two members
  with one name in different courses get no line: naming one course beside a bar counted from
  both would caption a population it does not describe.

- **Q4. Freeze the filters where, and for whom?** `unknown` beyond "in overview". **Taken:**
  the Overview only, through the Screen's existing `header` slot — not by pinning
  `DropdownRow`, which eight screens draw. The header needed a `zIndex` it did not have, or
  a panel opened from a pinned row would paint behind the first card it overlapped; verified in
  a browser rather than assumed.

- **Q5. Strings.** `unknown` — none were given. **Taken:** no new label. The two altered
  strings are consequences of reusing `reportMeta`: "1 of 9 present" → "9 scheduled · 1
  attended · 8 missed", and "No sessions scheduled" → "No sessions scheduled — nothing to
  measure". Everything else on the screen is frozen.

- **NOT DONE, and deliberately.** The Attendance card stretches to match the taller card beside
  it, leaving a large empty area under its three facts — it is part of why the course section
  starts below the fold. Filling or reflowing it is a layout change nobody asked for, and
  MUST NOT CHANGE covers it. Flagged to the requester instead.

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
