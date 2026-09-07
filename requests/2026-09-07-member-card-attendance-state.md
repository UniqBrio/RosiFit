# NEW FEATURE REQUEST
<!-- Filled by workflows/request.md (/request) · Consumed by Track A: /feature requests/<this-file> -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - the Gate 1 questionnaire covers it. -->

Run **Track A** ([workflows/feature.md](../workflows/feature.md)) with this request.

> **Why NEW and not CHANGE.** The ask lands on a card that ships, so it reads like a
> CHANGE — but marking one member present or absent does not exist anywhere in this app,
> at any level. Read from the files on 07-Sep-2026: `src/data/repository.ts` has
> `fetchAttendance` and no attendance WRITE of any kind, and the only path that has ever
> created an attendance row is `import_session`
> (`supabase/migrations/0024_import_session.sql`), fed by an uploaded session file. The
> card's three labels are the visible half of a capability — a per-member attendance
> write — that has to be designed and migrated before any label can be selected. Run as a
> CHANGE, that half gets no design pass and no migration plan.

## FIELDS
- FEATURE NAME: Attendance state on the member card
- ONE-LINE GOAL: On a member card, see whether her attendance has been added — Present, Absent, or yet to be marked — and select the correct state there.
- WHO USES IT: `unknown`
- MUST-HAVE in v1 — *requester signalled no priority, so everything stated lands here; requester to trim at Gate 1*:
  1. Three small labels/chips on the member card, for the three states the requester named:
     **Present**, **Absent**, **Yet to mark attendance**.
  2. The labels **denote whether the attendance is added** — which of the three the member is
     currently in.
  3. The correct state can be **selected** on the card — "select the correct state, absent or
     present etc".
- EXPLICITLY OUT of v1: `unknown`
- KNOWN CONSTRAINTS: none stated
- MARKET / REGION: `unknown`
- RUN MODE: auto (default — the description did not say how to run)

## USAGE PROFILE
- PRIMARY OBJECTIVE: `unknown` — evident from the ask: put a member into the right attendance state without leaving the roster.
- PRIMARY WORKFLOW: `unknown`
- FREQUENCY OF USE: `unknown`
- OPERATING ENVIRONMENT: `unknown`. The screenshot is `rosi-fit.vercel.app/course/049f25ad-…` in a desktop browser, dark theme — that is where it was SHOWN, not a stated environment.
- ESSENTIAL INFO (visible immediately): the member's current attendance state, as one of the three named labels (stated).
- OPTIONAL INFO (progressively disclosed): `unknown`
- FREQUENT ACTIONS (immediate access): selecting the correct state on the card (stated — it is the ask).
- OCCASIONAL ACTIONS (secondary access): `unknown`
- AUTOMATE (no interaction wanted): `unknown`
- MUST STAY MANUAL: `unknown`

## OPEN QUESTIONS — the requester did not settle these; Gate 1 asks them
Recorded, not answered. Each is a decision the build would otherwise make silently.

- **Q1. Which DATE is the state about?** The single most binding unknown. The ask says "the
  attendance" with no date. The screenshot shows the week strip above the roster with
  **31 Aug (Mon)** selected, which suggests the selected day — but the card's own third line
  currently reports the WEEK ("Missed 31 Aug – 6 Sep 2026: 0"). Selected day, today, or the
  week are three different features.
- **Q2. Is "Yet to mark attendance" selectable, or display-only?** Three labels were asked
  for; two of them are states a person can set. Whether tapping the third UNMARKS an
  attendance that was already recorded is not stated.
- **Q3. What happens when the session was already uploaded?** Attendance today arrives from
  a session file. Whether a tap may overwrite an uploaded row, and what is shown when it
  cannot, is not stated.
- **Q4. Who may set it?** Staff, super admin, or both — not stated.
- **Q5. A day the course does not run, or a date still to come.** The strip already
  distinguishes *Not expected* and *scheduled*; what the three card labels do on such a
  date is not stated.
- **Q6. Does this card appear elsewhere?** The ask says "member card". Whether the member
  detail screen and the Attendance tab carry the same three labels is not stated.

## DESIGN SURFACE
- SCREENS / ENTRY POINTS: the **member card on the course detail screen** — `MemberCard` in
  `app/course/[id].tsx:698`, rendered for both the with-email and no-email rosters. Shown in
  the requester's screenshot, dark theme. Any other screen: `unknown` (Q6).
- STATES REQUESTER CARES ABOUT: `unknown`. Several matter and are not stated: mid-save,
  save failed, offline / mock data source, a card whose week could not be loaded
  (`attendance.state === 'error'` already renders under the strip).
- VISIBLE STRINGS STATED: **"Present"**, **"Absent"**, **"Yet to mark attendance"** — the
  requester's words for the three labels. Note the day-strip legend on the same screen
  already reads *Present · Absent · Awaiting upload · Not expected*; the requester's third
  string is not one of those four, and Gate 1 settles which vocabulary wins.

## WHAT ALREADY EXISTS (dedupe, 07-Sep-2026 — read from the files, not from memory)
- **No attendance write path anywhere.** `src/data/repository.ts` exposes `fetchAttendance`
  (line 1514) and no setter; the only creator of attendance rows is `import_session`
  (`supabase/migrations/0024_import_session.sql`), driven by an uploaded file. A per-member
  write is net-new, and by CLAUDE.md it reaches the database only as an additive migration
  with tests in `supabase/tests/`.
- **The three states already exist as data**, under other names:
  `AttendanceStatus = 'present' | 'absent' | 'extra'` with an `expected` flag
  (`src/data/mock.ts:591`), and "yet to mark" is the ABSENCE of a row — which the day strip
  already derives as `awaiting` (`app/course/[id].tsx:151–207`).
- **The card's right-hand side is already occupied**: an Active/Inactive status pill that is
  also the control that sets it (0031), plus an Edit button. Guardrail 3 binds — every status
  carries its own word AND icon — and a second pill row next to the first is a layout the
  design pass owns, not a detail the build guesses.
- **The follow-up rule reads attendance.** Guardrail 1: the follow-up list is DERIVED from
  members and the saved rule. Marking a member absent from a card feeds `missed` and
  `streak` on that same card and the dashboard count — so the feasibility pass must state
  what a manual mark does to the follow-up numbers.

## STANDING INSTRUCTIONS (do not edit)
- Follow Track A end-to-end: Gate 1 questions → Gate 2 feasibility → Gate 3 design → Gate 4
  plan → build → test gate. **Confirm mode stops at every gate; auto mode (default) logs each
  checkpoint's decisions to the ASSUMPTIONS ledger and proceeds — hard stops and the
  mechanical test gate bind in every mode.**
- Anything stated in FIELDS is binding and overrides assumptions; every `unknown` becomes a
  Gate 1 question with a reasoned recommendation — never a silent assumption.
- Ground first (Step 0): `CLAUDE.md`, `docs/registers/KNOWN_LIMITATIONS.md`,
  `docs/registers/CANONICAL_PATTERNS.md`, `docs/registers/ROOT_CAUSE_REGISTER.md`.
- The USAGE PROFILE is the information hierarchy: essential/frequent renders on the primary
  screen with the primary action immediately reachable; optional/occasional is progressively
  disclosed; automatable steps are eliminated, not rendered. The design translates it via
  docs/24 §3b — never invents what it does not state.
- **No application scaffolded yet (NEW-APP)?** Initialization runs first —
  `docs/02-PROJECT-INITIALIZATION.md`, `npm run new:app` — then this file moves into the new
  app's `requests/` and Track A runs **inside the new app**, scoped to the first shippable
  slice named above.
