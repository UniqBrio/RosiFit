# CHANGE REQUEST — modify something that ships
<!-- Filled by workflows/request.md (/request) · Consumed by Track B: /enhance requests/<this-file> -->
<!-- For something that WORKS today but should behave or look different. Broken behaviour is a BUG (REQUEST_BUG.md). -->
<!-- Stated fields are BINDING. "unknown" is honest and welcome - Track B's B3 asks about it. -->

Run **Track B** ([workflows/enhance.md](../../workflows/enhance.md)) with this request.

## FIELDS
- FEATURE / SCREEN: **The upload attendance journey** — `app/upload.tsx` (route `/upload`, the
  four-step dialog Course · File · Process · Summary) and `app/match.tsx` (route `/match`, the
  per-row match review), plus the **No email** group on the course screen
  (`app/course/[id].tsx`) where the requester wants the leftovers to land.

- CURRENT BEHAVIOUR (verified in the files, 2026-09-06):
  1. `/upload` runs four steps. Step 1 pick the course/offering, step 2 choose the Meet CSV
     (with the "Mapped to this session" panel, the repeated-name warning and the
     already-has-a-file warning), step 3 a progress ring, step 4 a summary that says
     **"Nothing has been imported yet"** and offers *Review N rows*.
  2. That leads to a SECOND dialog, `/match`, which walks the operator through **one row at a
     time**. Every row that is not a clean A · Matched needs a decision — B · No email,
     C · Possible member, D · Ambiguous, E · Not found — and C, D and E BLOCK the import
     (`OUTCOME_META`, `src/data/mock.ts`). Only after every row is decided does *Import the
     file* run `csvCommit`, which writes the whole file at once.
  3. The **No email** group already exists on the course screen and already carries the two
     buttons *Add as new member* and *Add display name to existing member*
     (`app/course/[id].tsx`, working tree — see CORRECTION ROUND).
  4. *Add display name to existing member* opens `SearchPicker`, which is a **bottom sheet**
     (`src/components/Sheet.tsx`, `justifyContent: 'flex-end'`), and it saves the alias the
     **instant a member is tapped** — there is no confirm button.

- DESIRED BEHAVIOUR: requester's exact words —
  *"The upload attendance flow is very lengthy. Once user uplaod the attendance csv file based
  on the records if email is present mark their attendance and if not bring them under no email
  section. Under no email section where member with no emails are present there give two button
  one add as new member and another add as display to existing member. On click of add as
  disaply name to existing member it open as pop up dialog on top of screen with am option to
  select existing member where user can select the member and a but add as display name it is
  appended as display to that selected person. Keep it minimal think as senior dev and senior
  design engineer and bring the best ui and flow which makes user work mininal."*

  Read as six parts:
  1. **The journey gets SHORTER.** The four steps plus the row-by-row review are the thing
     being complained about. How much shorter, and which steps survive, is `unknown` — Q1.
  2. **Upload writes attendance straight away** for every row that resolves ("if email is
     present mark their attendance"). No review step in between for those rows.
  3. **Everything that does not resolve lands in the No email section** instead of blocking
     the import.
  4. **Two buttons in that section** — *add as new member* and *add as display name to
     existing member*. Already built (see CORRECTION ROUND); restated here so the track checks
     what shipped against what was asked.
  5. **The alias picker becomes a popup dialog ON TOP of the screen with an explicit
     "add as display name" button** — select the member, THEN press the button. Today it is a
     bottom sheet that saves on tap, so both halves change.
  6. **"Keep it minimal … best UI and flow … user work minimal"** — the requester delegated
     the design to the implementer, as they did on `2026-09-05-upload-attendance-as-dialog.md`
     ("you decide as senior dev"). It is a standing quality instruction, not a licence to
     widen scope: everything not named above still needs an answer at the gate.

- WHY: requester's words — *"The upload attendance flow is very lengthy"*, and the flow should
  make *"user work mininal"*. No further motivation stated.

- MUST NOT CHANGE: everything not named in DESIRED BEHAVIOUR. In particular the requester said
  nothing about, and therefore froze: the CSV parsing and its refusals, the Meet header lines
  the parser reads past, the de-duplication of repeated names, which session a file lands on
  (the date comes from the file), the already-has-a-file correction rule, the audit log, the
  follow-up rule and its threshold, and the alias mechanism itself. Guardrail 1 also binds: the
  No email section must stay DERIVED from the member list — never a second parallel list of
  people.

- CORRECTION ROUND: **2**, on two separate surfaces. Track B must read both before proposing.
  - The No email two buttons and the member picker: previous attempt is
    `requests/2026-09-05-park-unresolved-upload-rows.md` (assumption A2, resolved by the
    requester on 2026-09-05). It shipped as an **uncommitted working-tree change** to
    `app/course/[id].tsx` with `src/data/alias.ts`. The requester is asking for it AGAIN, which
    means either they have not seen it or it does not match what they meant — the picker being
    a bottom sheet that saves on tap, where they asked for a popup with a button, is the
    visible discrepancy. B1 must state what the previous attempt missed.
  - The shape of the journey: previous attempt is
    `requests/2026-09-05-upload-attendance-as-dialog.md`, which turned `/upload` and `/match`
    from pages into dialogs but kept all four steps and the whole row-by-row review ("the
    four-step bar and every word inside the steps stay"). That decision is what this request
    reopens.
  - `requests/2026-09-05-park-unresolved-upload-rows.md` is still OPEN for its MUST-HAVEs 1–3
    (park-instead-of-discard, parked rows reaching No email, save-on-close with a
    confirmation). Those three are the same ground this request covers from the other
    direction. **They must be reconciled into ONE plan, not built twice.**

## ANSWERED AT TRACK B's FIRST GATE (2026-09-06) — BINDING
- **The row-by-row review is replaced by ONE screen.** `/upload` becomes Course · File ·
  Import. Every row that needs a person is listed together on the import screen, each a single
  tap, and the file imports from there. `/match` and its per-row walkthrough go.
- **E · Not found auto-resolves to a new member** with no email; attendance is marked; she
  appears in the No email group where the two buttons resolve her. No decision asked.
- **C · Possible pre-selects its one candidate**, shown on screen and changeable in one tap.
  **D · Ambiguous still refuses to guess** — it is the one thing that holds the Import button,
  because two members share that name and picking wrong marks the wrong woman present.
- **"Add display name to existing member" becomes a REAL MERGE.** It saves the alias AND moves
  the stray record's attendance onto the chosen member, then retires the stray. This is what
  the requester chose over alias-only, and it is what stops the register being wrong: without
  it, an auto-created "Rani Sham" keeps the attendance and the real Rani stays marked absent.
  Needs a migration and specs. The dialog states what it will do before it is confirmed.
- **The picker opens as a dialog at the TOP of the screen with an "Add as display name"
  button**, for this caller only — `SearchPicker` gains opt-in props and its other five callers
  are untouched.

## OPEN QUESTIONS — the requester did not settle these; Track B's first gate must
- **Q1. Which steps survive?** "Very lengthy" names no specific step. Course choice, file
  choice, the "Mapped to this session" panel, the progress ring and the summary are five
  things the flow does today; the requester said only that it is too long.
- **Q2. What does "if email is present" mean?** The Meet CSV **has no email column** — the
  screen says so out loud (`CSV_COLUMNS`, "There is no email column"). So this cannot be read
  off the file. The only coherent reading is: the row matched a member, and **that member has
  an email on file** → attendance is marked; no email on her record → the No email section.
  Recorded as a reading, not as fact — it is the most load-bearing `unknown` here.
- **Q3. Where do rows that match NO member go?** The requester's two buttons (*add as new
  member*, *add as display name*) are the actions for an UNRECOGNISED name, which suggests
  outcome E · Not found lands in No email too. But E rows are not members, and the No email
  section lists members. Same unresolved tension as assumption A2 in the parking request.
- **Q4. What happens to outcomes C · Possible member and D · Ambiguous?** These BLOCK the
  import today, deliberately: C is the prompt that stops a duplicate being created, D is the
  refusal to guess between two members with the same name. Marking attendance without asking
  removes both guards. Not mentioned by the requester either way.
- **Q5. Does `/match` still exist?** If every row is either auto-marked or parked, the
  row-by-row review has nothing left to review. Removing a whole route is not something the
  requester asked for in words.
- **Q6. CORRECTED AT B1 — atomicity is NOT reversed by this request.** Intake wrote that it was.
  Reading `commit_csv_import` (0014) shows the opposite: the write is one transaction either
  way, so "the whole file imports together" stays true. What this request removes is the
  row-by-row REVIEW, not the all-or-nothing write. The copy that must change is therefore only
  the copy describing a review that no longer happens — "Nothing has been imported yet",
  "Review N rows", "Nothing is written until they are decided". The parking request's
  ACCEPTED CONSEQUENCE (a half-imported register) belongs to *that* request's save-on-close,
  not to this one.
  What IS reversed is **C-79's blocking rule** — recorded in
  `docs/RosiFit_Implementation_Plan_V2.2.md` §6.2 as a client requirement: outcomes
  C · Possible, D · Ambiguous and E · Not found **block the import**. A flow with no review
  has nothing left to block. That is a capability removal and a hard stop in any run mode.
- **Q7. Which No email section?** The course screen's (`app/course/[id].tsx`) is the one that
  exists and the one the requester screenshotted last time. Whether the upload should land
  somewhere reachable from the Attendance tab too is not stated.
- **Q8. Permissions.** Creating a member is owner-only in places (`courses-add-member` is gated
  on `isSuperAdmin`). Auto-marking attendance and resolving a parked name are both writes; who
  may do each is `unknown`.

## DESIGN SURFACE
<!-- Filled whenever anything the user sees changes. "not visual" is a claim the diff will be checked against. -->
- VISUAL?: **yes** — the shape of the flow is the whole of the ask.
- SCREENS & STATES TOUCHED:
  - `/upload` (`app/upload.tsx`) in every state that must survive whatever is cut: step 1
    loading (`Skeleton`), step 1 error with retry, step 1 empty ("No course to upload for"),
    step 2 file-read failure banner, step 3 progress, step 4 summary.
  - `/match` (`app/match.tsx`) — its per-row screens, its "Ready to import" end state, its
    email `Sheet` and its member `SearchPicker`. In scope by consequence of Q5.
  - The course screen's **No email** group (`app/course/[id].tsx`) — its two buttons, its
    explanatory note, and the empty case (nothing unresolved).
  - The alias picker, which must become a **popup dialog at the top of the screen with a
    confirm button** — today `SearchPicker` in `src/components/Sheet.tsx`, a bottom sheet
    SHARED with other callers, so the blast radius of changing it in place is real.
  - NEW states this creates: the import **partially failed** (possible for the first time once
    writes happen during upload), and **offline** mid-import. Both `unknown`, gate to specify.
  - Both themes, as always.
- STRINGS ADDED OR ALTERED: the requester gave button wording only — *"add as new member"*,
  *"add as display name to existing member"*, and the picker's confirm button *"add as display
  name"* (their words; capitalisation is the implementer's). Everything else on every touched
  screen is FROZEN, with one forced exception: the copy that promises atomicity ("Nothing has
  been imported yet", "the whole file imports together", "Nothing is written until they are
  decided") must stop saying something that is no longer true — see Q6.
- PERMISSIONS: `unknown` — see Q8.
- RUN MODE: `auto` (not stated by the requester; the default applies).

<!-- Intake notes, NOT stated by the requester:
     1. Parts 3 and 4 of the ask ALREADY SHIP in the working tree (app/course/[id].tsx,
        src/data/alias.ts, testIDs course-member-add-new-* and course-member-add-alias-*),
        uncommitted at the time of writing. The two differences from what was asked are real
        and small: the picker is a bottom sheet, not a dialog at the top of the screen, and it
        saves on tap rather than behind an "add as display name" button.
     2. requests/2026-09-05-park-unresolved-upload-rows.md is OPEN and overlaps this file
        heavily. Do not run both tracks independently.
     3. requests/2026-09-05-dialog-opens-at-top.md settled that bottom sheets and pickers were
        scoped OUT of the dialog-placement change ("The six form dialogs only"). This request
        pulls one picker back in, for this one caller. Recorded so the two files do not read as
        contradicting each other.
     4. docs/registers/FEATURE_TRUTH.md:138-154 records the CURRENT decision about the upload
        and match dialogs. If the journey is restructured, that register is updated as part of
        the change rather than left describing an app that no longer exists. -->

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

---

## AS BUILT — 06-Sep-2026

- `/upload` is **Course · File · Import**. The progress ring and the summary step are gone;
  the rows that need a person are one list on the last step, one tap each.
- **06-Sep-2026, requester's follow-up — "why again user have to click on process".** The
  Process button is gone: the file is read the moment it is chosen. "Mapped to this session"
  moved onto the import step, above the Import button, and is still shown on the file step for
  the one file that cannot be processed at all (no `Created on` line).
- `app/match.tsx`, its route in `app/_layout.tsx`, its three `.harness/` route entries and
  `pending.ts`'s `StagedImport` hand-off are **deleted**.
- **Added back on review, not asked for and not optional:** a third chip, **Not a member**.
  Without it the only answers were "link her" or "create her", so the academy would have
  grown a new member every week for the instructor, who is in every Meet file.
- `merge_member_into` (migration `0032`) + `supabase/tests/25_merge_member.sql`;
  `mergeMemberInto` in `src/data/repository.ts` with a fixture path; `MERGE_FAILED` in
  `src/data/alias.ts`.
- `SearchPicker` gained opt-in `placement`, `confirmLabel`, `confirmNote` and `busy`. The
  other five callers pass none of them and are byte-for-byte unchanged in behaviour.
- Decision record `docs/decisions/013-import-resolves-itself-and-the-merge-is-real.md`,
  DECISION_LOG row 021, FEATURE_TRUTH amended in three places, CHANGELOG entry.

### NOT VERIFIED — the migration has not been rehearsed
`bash db/harness/test.sh` **was not run**: this machine has no `psql` and no local Postgres
(`db/harness/start.sh` cannot bring a cluster up). So `0032` and its 16 assertions are
**written and reviewed but unproven**. Per CLAUDE.md the harness replay is the whole of the
pre-flight check, so `0032` must NOT be applied to the live project until it runs green.
Everything else in this change is client-side and is covered by the checks that did run.
