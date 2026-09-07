# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->

Run **Track B** ([workflows/enhance.md](../workflows/enhance.md)) with this request.

> **Why CHANGE and not BUG.** Nothing here is broken against its spec: the three chips do
> exactly what `requests/2026-09-07-member-card-attendance-state.md` asked for and ADR-021
> decided. The requester has changed the ask. Filed as a CHANGE so the decision it reverses is
> superseded on the record rather than contradicted quietly.

## FIELDS
- FEATURE / SCREEN: the attendance chips on a member card — `MemberCard` in
  [app/course/[id].tsx](../app/course/%5Bid%5D.tsx), the roster of the course detail screen.
  Both the with-email and the no-email sections draw the same card.
- CURRENT BEHAVIOUR: three chips — **Present · Absent · Yet to mark** — for the day the week
  strip has selected. Present and Absent are CONTROLS: tapping one calls `setAttendance`
  (`src/data/repository.ts`), which calls the `set_attendance` RPC (0035). *Yet to mark* is
  already display-only. `dayAttendance` decides which chip is filled and which of the other two
  may be tapped. 0035 is not applied to production (TD-033), so in production a tap answers
  *"The academy database cannot record attendance by hand yet — migration 0035 has not been
  applied. Nothing has been saved."* — the message in the requester's screenshot.
- DESIRED BEHAVIOUR: requester's exact words —
  "on member card there is present absent and yet to mark they are not button they are just
  status and when there is session on that day and no attendance uploaded yet then show yet to
  mark highlighter if uploaded attendnace show whether present or absent dont make is clickable
  and manual action"
  Read as: all three are READINGS. Nothing on the row is tappable and there is no manual mark.
  Which one is filled is derived: a row was uploaded → Present or Absent as recorded; a session
  on that day with nothing uploaded → *Yet to mark*, highlighted.
- WHY: not stated as a problem. Stated as an instruction, twice in one sentence
  ("they are not button", "dont make is clickable and manual action"), which is the whole of the
  ask and is binding.
- MUST NOT CHANGE: the three words the requester named; the day strip and its selection, which
  is what the row is about; the Active/Inactive pill beside it and its write (`set_member_status`,
  0031); the Edit button; the no-email actions; `dayAttendance` and its 13 specs — the derivation
  was already right and its tests are append-only; `commit_csv_import` / `import_session` as the
  way attendance arrives; the follow-up rule, which reads attendance and is untouched by this;
  every string not listed below.
- CORRECTION ROUND: 1 for this behaviour. It is a REVERSAL of a shipped decision — ADR-021
  weighed the write path and accepted it on a delegated choice ("you decide best approach as
  super senior dev"). The requester has now made the choice directly, so ADR-021's *client
  control* half is superseded rather than argued with. Its server half is not in scope.

## DESIGN SURFACE
- VISUAL?: yes — the row stops being controls and becomes a status reading.
- SCREENS & STATES TOUCHED: `/course/[id]`, the roster card. States: week loading, week failed,
  a day with a row (present / absent / extra), a day expected with no row, a day the course does
  not run, a future day. Both themes.
- STRINGS ADDED OR ALTERED: no new strings authored. **Not expected** — for a day the course does
  not run — comes from `STATUS.none` in `src/theme/tokens.ts`, the word and icon the day strip
  already uses one line above for the same fact. The three sentences a tap used to produce
  (marked / not saved / database not configured) go with the tap.
- PERMISSIONS: nothing gained. One capability is GIVEN UP from the client: `set_attendance`
  keeps its grants and its tests, and nothing in the app calls it. RBAC_MATRIX's row for it is
  amended to say there is no control any more.
- USAGE: stated by implication — the register is read on this screen far more often than it
  would ever be corrected, and correcting it is not something the requester wants offered here.
- RUN MODE: `auto` (not stated — the default applies).

## OPEN — settled by the request itself, recorded because the previous run had to ask them
- **Q2 of the earlier request** — is *Yet to mark* selectable? Settled: nothing is.
- **Q3** — what happens when the session was already uploaded? Settled: it is shown, and it
  cannot be argued with from here.
- **Q4** — who may set it? Settled: nobody, from this screen.
- **Q5** — a day the course does not run. NOT stated. The requester's condition is "when there
  is session on that day"; the build reads a day with no session as **Not expected**, because
  *Yet to mark* there promises an upload that is never coming. Logged as an assumption, not a
  statement.
- **Q1/Q6** unchanged from the earlier request: the row is about the day the strip has selected,
  and it exists on this card only.

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
